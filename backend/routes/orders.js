/**
 * Orders Routes
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '../config/database.js';
import { authenticate, isAdmin, optionalAuth } from '../middleware/auth.js';
import { validateOrder, validateId } from '../middleware/validate.js';
import { AppError } from '../middleware/errorHandler.js';
import { createPayment } from '../services/mollie.js';
import { orderStopsNearestNeighbor, buildStraightPolyline, fetchOsrmRoutePolyline, sumDistanceKm } from '../utils/routePlanner.js';
import { geocodeAddress } from '../utils/geocoding.js';
import { resolveDiscount, incrementDiscountUsage } from '../utils/discounts.js';
import { attachTenant, companyIdFrom, getPublicCompanyId } from '../middleware/tenant.js';
import { listCompanySettings } from '../utils/companySettings.js';

const router = express.Router();

async function getPublicSettingsMap() {
  const publicCid = getPublicCompanyId();
  let rows = await listCompanySettings(publicCid);
  if (!rows.length) {
    rows = await query('SELECT setting_key, setting_value, setting_type FROM settings');
  }
  const settingsMap = {};
  rows.forEach((s) => {
    const key = s.setting_key;
    if (s.setting_type === 'boolean') {
      settingsMap[key] = s.setting_value === 'true' || s.setting_value === true || s.setting_value === '1';
    } else if (s.setting_type === 'number') {
      settingsMap[key] = parseFloat(s.setting_value);
    } else {
      settingsMap[key] = s.setting_value;
    }
  });
  return settingsMap;
}

/**
 * Generate unique order number
 */
const generateOrderNumber = () => {
  const date = new Date();
  const prefix = 'TGO';
  const datePart = date.toISOString().slice(2, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${datePart}-${randomPart}`;
};

/**
 * POST /api/orders/validate-discount
 * Preview a discount code against a subtotal
 */
router.post('/validate-discount', async (req, res, next) => {
  try {
    const { code, subtotal } = req.body || {};
    const resolved = await resolveDiscount(code, Number(subtotal || 0), getPublicCompanyId());
    if (!resolved) {
      throw new AppError('Kortingscode is verplicht', 400);
    }
    res.json({
      success: true,
      data: {
        code: resolved.code,
        discount_type: resolved.discount_type,
        value: resolved.value,
        amount: resolved.amount
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/orders
 * Create new order
 */
router.post('/', validateOrder, async (req, res, next) => {
  try {
    const {
      customer_name,
      customer_email,
      customer_phone,
      customer_vat_number,
      delivery_type,
      address,
      items,
      notes,
      discount_code
    } = req.body;

    const publicCid = getPublicCompanyId();

    // Validate items and calculate total
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const products = await query(
        'SELECT id, name, price, is_available FROM products WHERE id = ? AND company_id = ?',
        [item.product_id, publicCid]
      );

      if (products.length === 0) {
        throw new AppError(`Product niet gevonden: ${item.product_id}`, 400);
      }

      const product = products[0];

      if (!product.is_available) {
        throw new AppError(`Product niet beschikbaar: ${product.name}`, 400);
      }

      const itemSubtotal = parseFloat(product.price) * item.quantity;
      subtotal += itemSubtotal;

      orderItems.push({
        product_id: product.id,
        product_name: product.name,
        product_price: product.price,
        quantity: item.quantity,
        subtotal: itemSubtotal,
        notes: item.notes || null
      });
    }

    // Get settings
    const settingsMap = await getPublicSettingsMap();

    // Respect "is_open" setting (disable ordering when closed)
    const isOpen =
      settingsMap.is_open === true ||
      settingsMap.is_open === 'true' ||
      settingsMap.is_open === 1 ||
      settingsMap.is_open === '1';
    if (!isOpen) {
      throw new AppError('Restaurant is momenteel gesloten voor bestellingen.', 403);
    }

    // Calculate delivery fee
    let deliveryFee = 0;
    if (delivery_type === 'delivery') {
      deliveryFee = parseFloat(settingsMap.delivery_fee || 3.50);
    }

    // Check minimum order (before discount)
    const minimumOrder = parseFloat(settingsMap.minimum_order || 15);
    if (subtotal < minimumOrder) {
      throw new AppError(`Minimum bestelbedrag is €${minimumOrder.toFixed(2)}`, 400);
    }

    let discountAmount = 0;
    let appliedDiscount = null;
    if (discount_code) {
      appliedDiscount = await resolveDiscount(discount_code, subtotal, publicCid);
      discountAmount = appliedDiscount?.amount || 0;
    }

    const total = Math.max(0, subtotal - discountAmount + deliveryFee);
    const orderNumber = generateOrderNumber();

    // Use transaction
    const result = await transaction(async (connection) => {
      // Insert address if delivery
      let addressId = null;
      if (delivery_type === 'delivery' && address) {
        const [addressResult] = await connection.execute(`
          INSERT INTO addresses (street, house_number, bus, postal_code, city)
          VALUES (?, ?, ?, ?, ?)
        `, [
          address.street,
          address.house_number,
          address.bus || null,
          address.postal_code,
          address.city
        ]);
        addressId = addressResult.insertId;
      }

      // Insert order
      const [orderResult] = await connection.execute(`
        INSERT INTO orders (
          company_id, order_number, customer_name, customer_email, customer_phone,
          customer_vat_number,
          address_id, delivery_type, subtotal, delivery_fee, discount_code, discount_amount, total, notes, estimated_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        publicCid,
        orderNumber,
        customer_name,
        customer_email,
        customer_phone,
        customer_vat_number || null,
        addressId,
        delivery_type,
        subtotal,
        deliveryFee,
        appliedDiscount?.code || null,
        discountAmount,
        total,
        notes || null,
        delivery_type === 'delivery' 
          ? parseInt(settingsMap.delivery_time || 45)
          : parseInt(settingsMap.pickup_time || 20)
      ]);

      const orderId = orderResult.insertId;

      // Insert order items
      for (const item of orderItems) {
        await connection.execute(`
          INSERT INTO order_items (order_id, product_id, product_name, product_price, quantity, subtotal, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [orderId, item.product_id, item.product_name, item.product_price, item.quantity, item.subtotal, item.notes]);
      }

      // Create payment record
      await connection.execute(`
        INSERT INTO payments (company_id, order_id, amount, status)
        VALUES (?, ?, ?, 'open')
      `, [publicCid, orderId, total]);

      if (appliedDiscount?.id) {
        await incrementDiscountUsage(appliedDiscount.id, connection, publicCid);
      }

      return { orderId, orderNumber, total, addressId };
    });

    // Auto-geocode delivery address so it never needs manual coordinates
    // (Store in addresses.latitude/longitude)
    if (delivery_type === 'delivery' && result.addressId && address) {
      try {
        const geo = await geocodeAddress({
          street: address.street,
          house_number: address.house_number,
          postal_code: address.postal_code,
          city: address.city
        });
        if (geo) {
          await query(
            'UPDATE addresses SET latitude = ?, longitude = ? WHERE id = ?',
            [geo.latitude, geo.longitude, result.addressId]
          );
        }
      } catch {
        // Geocoding should never block ordering
      }
    }

    // Create Mollie payment
    const payment = await createPayment({
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      amount: result.total,
      description: `The Golden Olive - Bestelling ${result.orderNumber}`,
      customerEmail: customer_email,
      customerName: customer_name,
      companyId: publicCid
    });

    // Create admin notification (for bell icon modal)
    try {
      await query(
        `
        INSERT INTO notifications (company_id, user_id, type, title, message, link, is_read)
        VALUES (?, NULL, 'order', 'Nieuwe bestelling', ?, ?, 0)
        `,
        [
          publicCid,
          `${customer_name || 'Klant'} • ${delivery_type === 'delivery' ? 'Bezorgen' : 'Afhalen'} • €${Number(result.total).toFixed(2)}`,
          `order:${result.orderId}`
        ]
      );
    } catch {
      // Notifications should never block ordering
    }

    res.status(201).json({
      success: true,
      data: {
        order_id: result.orderId,
        order_number: result.orderNumber,
        total: result.total,
        payment_url: payment.checkoutUrl
      },
      message: 'Bestelling succesvol aangemaakt'
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/orders/:orderNumber
 * Get order by order number (public - for customer)
 */
router.get('/track/:orderNumber', async (req, res, next) => {
  try {
    const publicCid = getPublicCompanyId();
    const orders = await query(`
      SELECT o.*, a.street, a.house_number, a.bus, a.postal_code, a.city,
             p.status as payment_status, p.method as payment_method
      FROM orders o
      LEFT JOIN addresses a ON o.address_id = a.id
      LEFT JOIN payments p ON o.id = p.order_id
      WHERE o.company_id = ? AND o.order_number = ?
    `, [publicCid, req.params.orderNumber]);

    if (orders.length === 0) {
      throw new AppError('Bestelling niet gevonden', 404);
    }

    const order = orders[0];

    // Get order items
    order.items = await query(`
      SELECT product_name, product_price, quantity, subtotal, notes
      FROM order_items
      WHERE order_id = ?
    `, [order.id]);

    // Remove sensitive data
    delete order.id;
    delete order.address_id;

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/orders/routes
 * Prototype: delivery route planning for today's active delivery orders.
 *
 * Returns: restaurant + ordered stops + polyline + distance/time
 */
router.get('/routes', authenticate, attachTenant, async (req, res, next) => {
  try {
    const cid = companyIdFrom(req);
    // Allow admin OR staff with view_orders permission
    const perms = Array.isArray(req.user?.permissions) ? req.user.permissions : [];
    const canViewOrders = req.user?.role === 'admin' || perms.includes('view_orders');
    if (!canViewOrders) {
      throw new AppError('Toegang geweigerd', 403);
    }

    // Restaurant location for this tenant
    const [restaurant] = await query(
      'SELECT id, name, address, latitude, longitude FROM restaurant WHERE company_id = ? LIMIT 1',
      [cid]
    );
    if (!restaurant) {
      throw new AppError('Restaurant locatie niet gevonden. Run migrations.', 500);
    }

    // Active delivery orders from today (coords might be missing; we auto-geocode)
    const rows = await query(`
      SELECT
        o.id,
        o.order_number,
        o.customer_name,
        o.status,
        o.total,
        o.address_id,
        a.street, a.house_number, a.bus, a.postal_code, a.city,
        a.latitude, a.longitude
      FROM orders o
      JOIN addresses a ON o.address_id = a.id
      WHERE
        o.company_id = ?
        AND o.delivery_type = 'delivery'
        AND o.status IN ('pending', 'paid', 'preparing', 'ready', 'delivering')
        AND DATE(o.created_at) = CURDATE()
      ORDER BY o.created_at ASC
    `, [cid]);

    const stopsRaw = rows.map((r) => ({
      orderId: Number(r.id),
      orderNumber: r.order_number,
      customerName: r.customer_name,
      address: `${r.street} ${r.house_number}${r.bus ? ` ${r.bus}` : ''}, ${r.postal_code} ${r.city}`,
      latitude: r.latitude !== null && r.latitude !== undefined ? Number(r.latitude) : null,
      longitude: r.longitude !== null && r.longitude !== undefined ? Number(r.longitude) : null,
      status: r.status,
      total: r.total !== undefined ? Number(r.total) : undefined,
      addressId: r.address_id ? Number(r.address_id) : null,
      addressParts: {
        street: r.street,
        house_number: r.house_number,
        postal_code: r.postal_code,
        city: r.city
      }
    }));

    // Auto-geocode missing coordinates (limited per request)
    let geocodedThisRequest = 0;
    const GEOCODE_LIMIT = 5;
    for (const s of stopsRaw) {
      if (geocodedThisRequest >= GEOCODE_LIMIT) break;
      if (Number.isFinite(s.latitude) && Number.isFinite(s.longitude)) continue;
      if (!s.addressId) continue;
      const geo = await geocodeAddress(s.addressParts);
      if (geo) {
        s.latitude = geo.latitude;
        s.longitude = geo.longitude;
        geocodedThisRequest++;
        try {
          await query('UPDATE addresses SET latitude = ?, longitude = ? WHERE id = ?', [
            geo.latitude,
            geo.longitude,
            s.addressId
          ]);
        } catch {
          // ignore db update issues
        }
      }
    }

    // Only include stops we can plot
    const stops = stopsRaw
      .filter((s) => Number.isFinite(s.latitude) && Number.isFinite(s.longitude))
      .map((s) => ({
        orderId: s.orderId,
        orderNumber: s.orderNumber,
        customerName: s.customerName,
        address: s.address,
        latitude: Number(s.latitude),
        longitude: Number(s.longitude),
        status: s.status,
        total: s.total
      }));

    const orderedStops = orderStopsNearestNeighbor(
      { latitude: Number(restaurant.latitude), longitude: Number(restaurant.longitude) },
      stops
    ).map((s, idx) => ({ ...s, sequence: idx + 1 }));

    // Polyline: try OSRM, fallback to straight lines
    const pointsLatLng = [
      [Number(restaurant.latitude), Number(restaurant.longitude)],
      ...orderedStops.map((s) => [s.latitude, s.longitude]),
      [Number(restaurant.latitude), Number(restaurant.longitude)],
    ];

    let polyline = buildStraightPolyline(
      { latitude: Number(restaurant.latitude), longitude: Number(restaurant.longitude) },
      orderedStops,
      true
    );
    let distanceKm = sumDistanceKm(
      { latitude: Number(restaurant.latitude), longitude: Number(restaurant.longitude) },
      orderedStops,
      true
    );
    // simple estimate: 22 km/h average city driving + 3 min per stop
    let durationMin = (distanceKm / 22) * 60 + orderedStops.length * 3;
    let source = 'straight';

    const useOsrm = req.query.osrm !== 'false';
    if (useOsrm && pointsLatLng.length >= 2) {
      try {
        const osrm = await fetchOsrmRoutePolyline(pointsLatLng);
        polyline = osrm.polyline;
        if (typeof osrm.distanceKm === 'number') distanceKm = osrm.distanceKm;
        if (typeof osrm.durationMin === 'number') durationMin = osrm.durationMin;
        source = 'osrm';
      } catch {
        // ignore and keep straight-line fallback
      }
    }

    res.json({
      success: true,
      data: {
        restaurant: {
          id: Number(restaurant.id),
          name: restaurant.name,
          address: restaurant.address,
          latitude: Number(restaurant.latitude),
          longitude: Number(restaurant.longitude),
        },
        stops: orderedStops,
        orderedStopIds: orderedStops.map((s) => s.orderId),
        polyline,
        distanceKm,
        durationMin,
        missingCoordinates: stopsRaw.length - stops.length,
        geocodedThisRequest,
        calculatedAt: new Date().toISOString(),
        source,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/orders (Admin only)
 * Get all orders
 */
router.get('/', authenticate, attachTenant, isAdmin, async (req, res, next) => {
  try {
    const cid = companyIdFrom(req);
    const { status, date_from, date_to, page = 1, limit = 20 } = req.query;
    
    let sql = `
      SELECT o.*, a.street, a.house_number, a.postal_code, a.city,
             p.status as payment_status, p.method as payment_method
      FROM orders o
      LEFT JOIN addresses a ON o.address_id = a.id
      LEFT JOIN payments p ON o.id = p.order_id
      WHERE o.company_id = ?
    `;
    const params = [cid];

    if (status) {
      sql += ' AND o.status = ?';
      params.push(status);
    }

    if (date_from) {
      sql += ' AND o.created_at >= ?';
      params.push(date_from);
    }

    if (date_to) {
      sql += ' AND o.created_at <= ?';
      params.push(date_to);
    }

    // Pagination params
    const limitNum = parseInt(limit) || 20;
    const pageNum = parseInt(page) || 1;
    const offset = (pageNum - 1) * limitNum;

    // Count total (use spread to avoid mutating params)
    const countSql = sql.replace('SELECT o.*, a.street, a.house_number, a.postal_code, a.city, p.status as payment_status, p.method as payment_method', 'SELECT COUNT(*) as total');
    const countResult = await query(countSql, [...params]);
    const total = Number(countResult[0]?.total || 0);

    // Add pagination (directly in SQL to avoid mysql2 type issues)
    sql += ` ORDER BY o.created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;

    const orders = await query(sql, params);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/orders/:id (Admin only)
 * Get order details
 */
router.get('/:id', authenticate, attachTenant, isAdmin, validateId, async (req, res, next) => {
  try {
    const cid = companyIdFrom(req);
    const orders = await query(`
      SELECT o.*, a.street, a.house_number, a.bus, a.postal_code, a.city,
             p.id as payment_id, p.mollie_payment_id, p.status as payment_status, 
             p.method as payment_method, p.paid_at
      FROM orders o
      LEFT JOIN addresses a ON o.address_id = a.id
      LEFT JOIN payments p ON o.id = p.order_id
      WHERE o.id = ? AND o.company_id = ?
    `, [req.params.id, cid]);

    if (orders.length === 0) {
      throw new AppError('Bestelling niet gevonden', 404);
    }

    const order = orders[0];

    // Get order items
    order.items = await query(`
      SELECT * FROM order_items WHERE order_id = ?
    `, [order.id]);

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/orders/:id/status (Admin only)
 * Update order status
 */
router.patch('/:id/status', authenticate, attachTenant, isAdmin, validateId, async (req, res, next) => {
  try {
    const cid = companyIdFrom(req);
    const { status } = req.body;
    const validStatuses = ['pending', 'paid', 'preparing', 'ready', 'delivering', 'delivered', 'cancelled'];

    if (!validStatuses.includes(status)) {
      throw new AppError('Ongeldige status', 400);
    }

    const result = await query(
      'UPDATE orders SET status = ? WHERE id = ? AND company_id = ?',
      [status, req.params.id, cid]
    );

    if (result.affectedRows === 0) {
      throw new AppError('Bestelling niet gevonden', 404);
    }

    res.json({
      success: true,
      message: `Bestellingstatus bijgewerkt naar: ${status}`
    });
  } catch (error) {
    next(error);
  }
});

export default router;
