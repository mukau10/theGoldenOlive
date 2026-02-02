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

const router = express.Router();

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
 * POST /api/orders
 * Create new order
 */
router.post('/', validateOrder, async (req, res, next) => {
  try {
    const {
      customer_name,
      customer_email,
      customer_phone,
      delivery_type,
      address,
      items,
      notes
    } = req.body;

    // Validate items and calculate total
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const products = await query(
        'SELECT id, name, price, is_available FROM products WHERE id = ?',
        [item.product_id]
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
    const settings = await query('SELECT setting_key, setting_value FROM settings');
    const settingsMap = {};
    settings.forEach(s => {
      settingsMap[s.setting_key] = s.setting_value;
    });

    // Calculate delivery fee
    let deliveryFee = 0;
    if (delivery_type === 'delivery') {
      deliveryFee = parseFloat(settingsMap.delivery_fee || 3.50);
    }

    // Check minimum order
    const minimumOrder = parseFloat(settingsMap.minimum_order || 15);
    if (subtotal < minimumOrder) {
      throw new AppError(`Minimum bestelbedrag is €${minimumOrder.toFixed(2)}`, 400);
    }

    const total = subtotal + deliveryFee;
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
          order_number, customer_name, customer_email, customer_phone,
          address_id, delivery_type, subtotal, delivery_fee, total, notes, estimated_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        orderNumber,
        customer_name,
        customer_email,
        customer_phone,
        addressId,
        delivery_type,
        subtotal,
        deliveryFee,
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
        INSERT INTO payments (order_id, amount, status)
        VALUES (?, ?, 'open')
      `, [orderId, total]);

      return { orderId, orderNumber, total };
    });

    // Create Mollie payment
    const payment = await createPayment({
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      amount: result.total,
      description: `The Golden Olive - Bestelling ${result.orderNumber}`,
      customerEmail: customer_email,
      customerName: customer_name
    });

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
    const orders = await query(`
      SELECT o.*, a.street, a.house_number, a.bus, a.postal_code, a.city,
             p.status as payment_status, p.method as payment_method
      FROM orders o
      LEFT JOIN addresses a ON o.address_id = a.id
      LEFT JOIN payments p ON o.id = p.order_id
      WHERE o.order_number = ?
    `, [req.params.orderNumber]);

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
 * GET /api/orders (Admin only)
 * Get all orders
 */
router.get('/', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { status, date_from, date_to, page = 1, limit = 20 } = req.query;
    
    let sql = `
      SELECT o.*, a.street, a.house_number, a.postal_code, a.city,
             p.status as payment_status, p.method as payment_method
      FROM orders o
      LEFT JOIN addresses a ON o.address_id = a.id
      LEFT JOIN payments p ON o.id = p.order_id
      WHERE 1=1
    `;
    const params = [];

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
router.get('/:id', authenticate, isAdmin, validateId, async (req, res, next) => {
  try {
    const orders = await query(`
      SELECT o.*, a.street, a.house_number, a.bus, a.postal_code, a.city,
             p.id as payment_id, p.mollie_payment_id, p.status as payment_status, 
             p.method as payment_method, p.paid_at
      FROM orders o
      LEFT JOIN addresses a ON o.address_id = a.id
      LEFT JOIN payments p ON o.id = p.order_id
      WHERE o.id = ?
    `, [req.params.id]);

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
router.patch('/:id/status', authenticate, isAdmin, validateId, async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'paid', 'preparing', 'ready', 'delivering', 'delivered', 'cancelled'];

    if (!validStatuses.includes(status)) {
      throw new AppError('Ongeldige status', 400);
    }

    const result = await query(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, req.params.id]
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
