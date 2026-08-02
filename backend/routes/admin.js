/**
 * Admin Routes - Complete Dashboard API
 * Includes: Dashboard, Orders, Products, Categories, Payments, Settings, Logs
 */

import express from 'express';
import bcrypt from 'bcryptjs';
import PDFDocument from 'pdfkit';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../config/database.js';
import { authenticate, isAdmin } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { printOrderToNetwork } from '../services/printer.js';
import { readWebsiteMenu, writeWebsiteMenu } from './menu.js';
import {
  isFoodCategory,
  isAdminOnlyToggleCategory,
  categoryRequiresPin,
  parseJsonSetting
} from '../utils/productPermissions.js';
import { sanitizeSettingsForUser, isSensitiveSettingKey, maskSecretValue } from '../utils/secrets.js';
import { exportCustomerData, eraseCustomerData, purgeOldOrderPii } from '../utils/privacy.js';
import { logger } from '../utils/logger.js';
import { attachTenant, requireActiveSubscription, companyIdFrom } from '../middleware/tenant.js';
import {
  listCompanySettings,
  upsertCompanySetting,
  getCompanySetting
} from '../utils/companySettings.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORT_LOGO_PATH = path.join(__dirname, '../../public/img/logo.png');

// =====================================================
// MIDDLEWARE - Apply auth + tenant to all routes
// =====================================================
router.use(authenticate, attachTenant, requireActiveSubscription);

// Helper to check permissions
const hasPermission = (user, permission) => {
  if (user.role === 'admin') return true;
  if (!user.permissions) return false;
  try {
    const perms = typeof user.permissions === 'string' 
      ? JSON.parse(user.permissions) 
      : user.permissions;
    return perms.includes(permission);
  } catch {
    return false;
  }
};

// Middleware to check specific permission
const requirePermission = (permission) => (req, res, next) => {
  if (!hasPermission(req.user, permission)) {
    return next(new AppError('Geen toegang tot deze functie', 403));
  }
  next();
};

async function getSettingsMap(keys = null, companyId = null) {
  if (companyId) {
    const sql = keys?.length
      ? `SELECT setting_key, setting_value, setting_type FROM company_settings WHERE company_id = ? AND setting_key IN (${keys.map(() => '?').join(',')})`
      : 'SELECT setting_key, setting_value, setting_type FROM company_settings WHERE company_id = ?';
    const params = keys?.length ? [companyId, ...keys] : [companyId];
    const rows = await query(sql, params);
    const map = {};
    rows.forEach((s) => {
      if (s.setting_type === 'json') {
        map[s.setting_key] = parseJsonSetting(s.setting_value, {});
      } else if (s.setting_type === 'boolean') {
        map[s.setting_key] = s.setting_value === 'true' || s.setting_value === true || s.setting_value === '1';
      } else if (s.setting_type === 'number') {
        map[s.setting_key] = parseFloat(s.setting_value);
      } else {
        map[s.setting_key] = s.setting_value;
      }
    });
    return map;
  }

  const sql = keys?.length
    ? `SELECT setting_key, setting_value, setting_type FROM settings WHERE setting_key IN (${keys.map(() => '?').join(',')})`
    : 'SELECT setting_key, setting_value, setting_type FROM settings';
  const rows = await query(sql, keys || []);
  const map = {};
  rows.forEach((s) => {
    if (s.setting_type === 'json') {
      map[s.setting_key] = parseJsonSetting(s.setting_value, {});
    } else if (s.setting_type === 'boolean') {
      map[s.setting_key] = s.setting_value === 'true' || s.setting_value === true || s.setting_value === '1';
    } else if (s.setting_type === 'number') {
      map[s.setting_key] = parseFloat(s.setting_value);
    } else {
      map[s.setting_key] = s.setting_value;
    }
  });
  return map;
}

async function upsertSetting(key, value, type = 'string', description = null) {
  let stringValue;
  switch (type) {
    case 'json': stringValue = JSON.stringify(value); break;
    case 'boolean': stringValue = value ? 'true' : 'false'; break;
    default: stringValue = String(value ?? '');
  }

  const [existing] = await query('SELECT id FROM settings WHERE setting_key = ?', [key]);
  if (existing) {
    await query('UPDATE settings SET setting_value = ? WHERE setting_key = ?', [stringValue, key]);
  } else {
    await query(
      'INSERT INTO settings (setting_key, setting_value, setting_type, description) VALUES (?, ?, ?, ?)',
      [key, stringValue, type, description]
    );
  }
}

async function verifyAdminPin(req) {
  const pin = req.headers['x-admin-pin'] || req.body?.admin_pin;
  if (!pin) {
    throw new AppError('Pincode vereist voor dit product', 403, { code: 'PIN_REQUIRED' });
  }

  const settings = await getSettingsMap(['admin_pin'], companyIdFrom(req));
  const stored = settings.admin_pin;
  if (!stored) {
    throw new AppError('Er is nog geen pincode ingesteld. Stel eerst een pincode in via Instellingen.', 400, { code: 'PIN_NOT_SET' });
  }

  const ok = stored.startsWith('$2')
    ? await bcrypt.compare(String(pin), stored)
    : String(pin) === String(stored);

  if (!ok) {
    throw new AppError('Ongeldige pincode', 403, { code: 'PIN_INVALID' });
  }
}

async function assertPinForCategorySlug(req, categorySlug) {
  const settings = await getSettingsMap(['pin_protected_categories', 'admin_pin'], companyIdFrom(req));
  if (!categoryRequiresPin(categorySlug, settings)) return;
  await verifyAdminPin(req);
}

async function getProductWithCategory(productId, companyId) {
  const [row] = await query(`
    SELECT p.*, c.slug as category_slug, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id AND c.company_id = p.company_id
    WHERE p.id = ? AND p.company_id = ?
  `, [productId, companyId]);
  return row || null;
}

// =====================================================
// REPORT HELPERS (shared by JSON + PDF + email)
// =====================================================
const round2 = (n) => Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
const eur = (n) => `€${round2(n).toFixed(2)}`;
const isoDate = (d = new Date()) => new Date(d).toISOString().slice(0, 10);

function computeVatBreakdown(grossInclVat, taxRatePct) {
  const gross = round2(grossInclVat);
  const taxRate = Number(taxRatePct || 0);
  if (!taxRate || taxRate <= 0) {
    return { gross, net: gross, vat: 0 };
  }
  // Round net first, then vat = gross - net so the displayed amounts always add up perfectly.
  const net = round2(gross / (1 + taxRate / 100));
  const vat = round2(gross - net);
  return { gross, net, vat };
}

async function getReportSettings(companyId) {
  const keys = ['tax_rate', 'restaurant_name', 'restaurant_address', 'restaurant_phone', 'restaurant_email'];
  const settings = companyId
    ? await query(
        `SELECT setting_key, setting_value FROM company_settings WHERE company_id = ? AND setting_key IN (${keys.map(() => '?').join(',')})`,
        [companyId, ...keys]
      )
    : await query(
        "SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('tax_rate','restaurant_name','restaurant_address','restaurant_phone','restaurant_email')"
      );
  const map = {};
  settings.forEach((s) => (map[s.setting_key] = s.setting_value));

  const taxRate = parseFloat(map.tax_rate || 21);
  const restaurant = {
    name: map.restaurant_name || 'The Golden Olive',
    address: map.restaurant_address || '',
    phone: map.restaurant_phone || '',
    email: map.restaurant_email || ''
  };

  return { taxRate, restaurant };
}

async function getOrderTotals({ whereSql, params, companyId }) {
  const [totals] = await query(
    `
    SELECT
      COUNT(*) as orders,
      COALESCE(SUM(o.total), 0) as revenue,
      COALESCE(SUM(o.subtotal), 0) as subtotal,
      COALESCE(SUM(o.delivery_fee), 0) as delivery_fees,
      COALESCE(SUM(CASE WHEN o.delivery_type = 'delivery' THEN 1 ELSE 0 END), 0) as delivery_orders,
      COALESCE(SUM(CASE WHEN o.delivery_type = 'pickup' THEN 1 ELSE 0 END), 0) as pickup_orders
    FROM orders o
    WHERE ${whereSql} AND o.status != 'cancelled' AND o.company_id = ?
    `,
    [...params, companyId]
  );

  return {
    orders: Number(totals.orders || 0),
    delivery_orders: Number(totals.delivery_orders || 0),
    pickup_orders: Number(totals.pickup_orders || 0),
    subtotal: round2(parseFloat(totals.subtotal || 0)),
    delivery_fees: round2(parseFloat(totals.delivery_fees || 0)),
    revenue: round2(parseFloat(totals.revenue || 0))
  };
}

async function getOrdersWithItems({ whereSql, params, companyId }) {
  const orders = await query(
    `
    SELECT
      o.id,
      o.order_number,
      o.customer_name,
      o.customer_email,
      o.customer_phone,
      o.customer_vat_number,
      o.delivery_type,
      o.status,
      o.created_at,
      o.subtotal,
      o.delivery_fee,
      o.total,
      a.street, a.house_number, a.bus, a.postal_code, a.city,
      p.status as payment_status,
      p.method as payment_method
    FROM orders o
    LEFT JOIN addresses a ON o.address_id = a.id
    LEFT JOIN payments p ON o.id = p.order_id
    WHERE ${whereSql} AND o.status != 'cancelled' AND o.company_id = ?
    ORDER BY o.created_at ASC
    `,
    [...params, companyId]
  );

  if (!orders.length) return [];

  const ids = orders.map((o) => o.id);
  const items = await query(
    `
    SELECT order_id, product_name, quantity, product_price, subtotal, notes
    FROM order_items
    WHERE order_id IN (${ids.map(() => '?').join(',')})
    ORDER BY order_id, id
    `,
    ids
  );

  const byOrder = new Map();
  items.forEach((it) => {
    if (!byOrder.has(it.order_id)) byOrder.set(it.order_id, []);
    byOrder.get(it.order_id).push({
      product_name: it.product_name,
      quantity: Number(it.quantity),
      product_price: round2(it.product_price),
      subtotal: round2(it.subtotal),
      notes: it.notes || null
    });
  });

  return orders.map((o) => ({
    id: Number(o.id),
    order_number: o.order_number,
    customer_name: o.customer_name,
    customer_email: o.customer_email,
    customer_phone: o.customer_phone,
    customer_vat_number: o.customer_vat_number || null,
    delivery_type: o.delivery_type,
    status: o.status,
    created_at: o.created_at,
    payment_status: o.payment_status || null,
    payment_method: o.payment_method || null,
    address:
      o.delivery_type === 'delivery'
        ? {
            street: o.street || '',
            house_number: o.house_number || '',
            bus: o.bus || null,
            postal_code: o.postal_code || '',
            city: o.city || ''
          }
        : null,
    totals: {
      subtotal: round2(o.subtotal),
      delivery_fee: round2(o.delivery_fee),
      total: round2(o.total)
    },
    items: byOrder.get(o.id) || []
  }));
}

async function buildDailyReportPayload(date, companyId) {
  const d = date || isoDate();
  const { taxRate, restaurant } = await getReportSettings(companyId);
  const base = await getOrderTotals({ whereSql: 'DATE(o.created_at) = ?', params: [d], companyId });
  const bd = computeVatBreakdown(base.revenue, taxRate);
  const orders = await getOrdersWithItems({ whereSql: 'DATE(o.created_at) = ?', params: [d], companyId });

  return {
    date: d,
    restaurant,
    totals: {
      ...base,
      tax_rate: taxRate,
      net_amount: bd.net,
      vat_amount: bd.vat
    },
    orders
  };
}

async function buildRangeReportPayload(dateFrom, dateTo, companyId) {
  if (!dateFrom || !dateTo) throw new AppError('date_from en date_to zijn verplicht (YYYY-MM-DD)', 400);
  const { taxRate, restaurant } = await getReportSettings(companyId);
  const base = await getOrderTotals({
    whereSql: 'DATE(o.created_at) >= ? AND DATE(o.created_at) <= ?',
    params: [dateFrom, dateTo],
    companyId
  });
  const bd = computeVatBreakdown(base.revenue, taxRate);
  const orders = await getOrdersWithItems({
    whereSql: 'DATE(o.created_at) >= ? AND DATE(o.created_at) <= ?',
    params: [dateFrom, dateTo],
    companyId
  });

  return {
    date_from: dateFrom,
    date_to: dateTo,
    restaurant,
    totals: {
      ...base,
      tax_rate: taxRate,
      net_amount: bd.net,
      vat_amount: bd.vat
    },
    orders
  };
}

// Helper to log admin actions (tenant-scoped)
const logAction = async (userId, action, entityType, entityId, details, req) => {
  try {
    const companyId = req?.companyId || req?.user?.company_id || null;
    await query(`
      INSERT INTO admin_logs (company_id, user_id, action, entity_type, entity_id, details, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      companyId,
      userId,
      action,
      entityType,
      entityId,
      JSON.stringify(details),
      req.ip || req.connection?.remoteAddress,
      req.headers['user-agent']?.substring(0, 500)
    ]);
  } catch (error) {
    console.error('Failed to log action:', error);
  }
};

// =====================================================
// DASHBOARD
// =====================================================

/**
 * GET /api/admin/dashboard
 * Main dashboard statistics
 */
router.get('/dashboard', async (req, res, next) => {
  try {
    const cid = companyIdFrom(req);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Today's stats
    const [todayStats] = await query(`
      SELECT 
        COUNT(*) as orders,
        COALESCE(SUM(total), 0) as revenue,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) as pending
      FROM orders 
      WHERE company_id = ? AND created_at >= ? AND created_at < ? AND status != 'cancelled'
    `, [cid, today.toISOString(), tomorrow.toISOString()]);

    // Week stats
    const [weekStats] = await query(`
      SELECT COUNT(*) as orders, COALESCE(SUM(total), 0) as revenue
      FROM orders WHERE company_id = ? AND created_at >= ? AND status != 'cancelled'
    `, [cid, weekStart.toISOString()]);

    // Month stats
    const [monthStats] = await query(`
      SELECT COUNT(*) as orders, COALESCE(SUM(total), 0) as revenue
      FROM orders WHERE company_id = ? AND created_at >= ? AND status != 'cancelled'
    `, [cid, monthStart.toISOString()]);

    // Orders by status
    const statusCounts = await query(`
      SELECT status, COUNT(*) as count 
      FROM orders WHERE company_id = ? AND created_at >= ? GROUP BY status
    `, [cid, weekStart.toISOString()]);

    // Payment stats
    const [paymentStats] = await query(`
      SELECT 
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid,
        COUNT(CASE WHEN status IN ('open', 'pending') THEN 1 END) as pending,
        COUNT(CASE WHEN status IN ('failed', 'canceled', 'expired') THEN 1 END) as failed
      FROM payments WHERE company_id = ? AND created_at >= ?
    `, [cid, weekStart.toISOString()]);

    // Recent orders
    const recentOrders = await query(`
      SELECT o.id, o.order_number, o.customer_name, o.customer_phone, 
             o.delivery_type, o.total, o.status, o.created_at, o.source,
             p.status as payment_status
      FROM orders o
      LEFT JOIN payments p ON o.id = p.order_id
      WHERE o.company_id = ?
      ORDER BY o.created_at DESC
      LIMIT 15
    `, [cid]);

    // Hourly distribution (for chart)
    const hourlyOrders = await query(`
      SELECT HOUR(created_at) as hour, COUNT(*) as orders, SUM(total) as revenue
      FROM orders 
      WHERE company_id = ? AND created_at >= ? AND status != 'cancelled'
      GROUP BY HOUR(created_at)
      ORDER BY hour
    `, [cid, today.toISOString()]);

    // Popular products today
    const popularProducts = await query(`
      SELECT oi.product_name, SUM(oi.quantity) as qty, SUM(oi.subtotal) as revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.company_id = ? AND o.created_at >= ? AND o.status != 'cancelled'
      GROUP BY oi.product_name
      ORDER BY qty DESC
      LIMIT 10
    `, [cid, weekStart.toISOString()]);

    res.json({
      success: true,
      data: {
        today: {
          orders: Number(todayStats.orders),
          revenue: parseFloat(todayStats.revenue),
          pending: Number(todayStats.pending)
        },
        week: {
          orders: Number(weekStats.orders),
          revenue: parseFloat(weekStats.revenue)
        },
        month: {
          orders: Number(monthStats.orders),
          revenue: parseFloat(monthStats.revenue)
        },
        statusCounts,
        paymentStats,
        recentOrders,
        hourlyOrders,
        popularProducts
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/dashboard/live
 * Live stats for real-time updates (polling)
 */
router.get('/dashboard/live', async (req, res, next) => {
  try {
    const cid = companyIdFrom(req);
    const lastCheck = req.query.since ? new Date(req.query.since) : new Date(Date.now() - 60000);
    
    // New orders since last check
    const newOrders = await query(`
      SELECT o.id, o.order_number, o.customer_name, o.total, o.status, o.created_at,
             o.delivery_type, o.source, o.external_order_id,
             a.street, a.house_number, a.bus, a.postal_code, a.city
      FROM orders o
      LEFT JOIN addresses a ON o.address_id = a.id
      WHERE o.company_id = ? AND o.created_at > ?
      ORDER BY o.created_at DESC
    `, [cid, lastCheck.toISOString()]);

    // Updated orders since last check
    const updatedOrders = await query(`
      SELECT o.id, o.order_number, o.status, o.updated_at
      FROM orders o
      WHERE o.company_id = ? AND o.updated_at > ? AND o.created_at <= ?
    `, [cid, lastCheck.toISOString(), lastCheck.toISOString()]);

    // Pending count
    const [{ pending }] = await query(`
      SELECT COUNT(*) as pending FROM orders WHERE company_id = ? AND status IN ('pending', 'paid')
    `, [cid]);

    res.json({
      success: true,
      data: {
        newOrders,
        updatedOrders,
        pendingCount: Number(pending),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

// =====================================================
// ORDERS
// =====================================================

/**
 * GET /api/admin/orders
 * Get all orders with filters
 */
router.get('/orders', requirePermission('view_orders'), async (req, res, next) => {
  try {
    const { status, payment_status, delivery_type, date_from, date_to, search, page = 1, limit = 25 } = req.query;
    
    let sql = `
      SELECT o.*, 
             a.street, a.house_number, a.bus, a.postal_code, a.city,
             p.status as payment_status, p.method as payment_method, p.mollie_payment_id
      FROM orders o
      LEFT JOIN addresses a ON o.address_id = a.id
      LEFT JOIN payments p ON o.id = p.order_id
      WHERE o.company_id = ?
    `;
    const params = [companyIdFrom(req)];

    if (status) {
      sql += ' AND o.status = ?';
      params.push(status);
    }
    if (payment_status) {
      sql += ' AND p.status = ?';
      params.push(payment_status);
    }
    if (delivery_type) {
      sql += ' AND o.delivery_type = ?';
      params.push(delivery_type);
    }
    if (date_from) {
      sql += ' AND DATE(o.created_at) >= ?';
      params.push(date_from);
    }
    if (date_to) {
      sql += ' AND DATE(o.created_at) <= ?';
      params.push(date_to);
    }
    if (search) {
      sql += ' AND (o.order_number LIKE ? OR o.customer_name LIKE ? OR o.customer_phone LIKE ? OR o.customer_email LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Count total
    const countSql = sql.replace(/SELECT o\.\*,[\s\S]*?FROM orders o/, 'SELECT COUNT(*) as total FROM orders o');
    const countResult = await query(countSql, [...params]);
    const total = Number(countResult[0]?.total || 0);

    // Pagination
    const limitNum = Math.min(parseInt(limit) || 25, 100);
    const pageNum = parseInt(page) || 1;
    const offset = (pageNum - 1) * limitNum;
    
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
 * GET /api/admin/orders/:id
 * Get single order with full details
 */
router.get('/orders/:id', requirePermission('view_orders'), async (req, res, next) => {
  try {
    const cid = companyIdFrom(req);
    const [order] = await query(`
      SELECT o.*, 
             a.street, a.house_number, a.bus, a.postal_code, a.city, a.country,
             a.latitude, a.longitude,
             p.id as payment_id, p.mollie_payment_id, p.amount as payment_amount,
             p.status as payment_status, p.method as payment_method, p.paid_at, p.metadata as payment_metadata
      FROM orders o
      LEFT JOIN addresses a ON o.address_id = a.id
      LEFT JOIN payments p ON o.id = p.order_id
      WHERE o.id = ? AND o.company_id = ?
    `, [req.params.id, cid]);

    if (!order) {
      throw new AppError('Bestelling niet gevonden', 404);
    }

    // Get order items
    const items = await query(`
      SELECT oi.*, pr.image_url, pr.allergens
      FROM order_items oi
      LEFT JOIN products pr ON oi.product_id = pr.id AND pr.company_id = ?
      WHERE oi.order_id = ?
    `, [cid, order.id]);

    // Get status history
    const statusHistory = await query(`
      SELECT sh.*, u.name as changed_by_name
      FROM order_status_history sh
      LEFT JOIN users u ON sh.changed_by = u.id
      WHERE sh.order_id = ?
      ORDER BY sh.created_at DESC
    `, [order.id]);

    // Parse JSON fields
    items.forEach(item => {
      if (typeof item.allergens === 'string') {
        try { item.allergens = JSON.parse(item.allergens); } catch { item.allergens = []; }
      }
    });

    if (order.payment_metadata && typeof order.payment_metadata === 'string') {
      try { order.payment_metadata = JSON.parse(order.payment_metadata); } catch { }
    }

    // Restaurant location (for map)
    const [restaurant] = await query(
      'SELECT id, name, address, latitude, longitude FROM restaurant WHERE company_id = ? LIMIT 1',
      [cid]
    );

    res.json({
      success: true,
      data: {
        ...order,
        restaurant: restaurant
          ? {
              id: Number(restaurant.id),
              name: restaurant.name,
              address: restaurant.address,
              latitude: Number(restaurant.latitude),
              longitude: Number(restaurant.longitude),
            }
          : null,
        items,
        statusHistory
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/admin/orders/:id/vat-number
 * Set customer VAT number on an order (for invoices).
 */
router.patch('/orders/:id/vat-number', isAdmin, async (req, res, next) => {
  try {
    const cid = companyIdFrom(req);
    const { vat_number } = req.body || {};
    const vat = (vat_number || '').toString().trim();
    if (!vat || vat.length < 2 || vat.length > 50) {
      throw new AppError('Ongeldig BTW-nummer (2-50 tekens)', 400);
    }

    const result = await query(
      'UPDATE orders SET customer_vat_number = ? WHERE id = ? AND company_id = ?',
      [vat, req.params.id, cid]
    );
    if (result.affectedRows === 0) throw new AppError('Bestelling niet gevonden', 404);

    res.json({ success: true, data: { customer_vat_number: vat } });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/reports/daily
 * Print-friendly daily report data.
 */
router.get('/reports/daily', requirePermission('view_orders'), async (req, res, next) => {
  try {
    const cid = companyIdFrom(req);
    const date = req.query.date ? String(req.query.date) : isoDate();
    const payload = await buildDailyReportPayload(date, cid);

    res.json({
      success: true,
      data: {
        ...payload
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/reports/range
 * Report data for a date range (inclusive).
 */
router.get('/reports/range', requirePermission('view_orders'), async (req, res, next) => {
  try {
    const cid = companyIdFrom(req);
    const dateFrom = req.query.date_from ? String(req.query.date_from) : null; // YYYY-MM-DD
    const dateTo = req.query.date_to ? String(req.query.date_to) : null; // YYYY-MM-DD
    const payload = await buildRangeReportPayload(dateFrom, dateTo, cid);

    res.json({
      success: true,
      data: {
        ...payload
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/revenue
 * Returns chart points + summary for a revenue period.
 * period: today | week | month
 */
router.get('/revenue', requirePermission('view_orders'), async (req, res, next) => {
  try {
    const cid = companyIdFrom(req);
    const period = String(req.query.period || 'today');
    const { taxRate, restaurant } = await getReportSettings(cid);

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    let title = 'Omzet';
    let whereSql = 'DATE(o.created_at) = ?';
    let params = [isoDate(today)];
    let seriesSql = '';
    let seriesParams = [];

    if (period === 'today') {
      title = 'Omzet Vandaag';
      whereSql = 'DATE(o.created_at) = ?';
      params = [isoDate(today)];
      seriesSql = `
        SELECT HOUR(o.created_at) as label, COUNT(*) as orders, COALESCE(SUM(o.total),0) as revenue
        FROM orders o
        WHERE o.company_id = ? AND DATE(o.created_at) = ? AND o.status != 'cancelled'
        GROUP BY HOUR(o.created_at)
        ORDER BY label
      `;
      seriesParams = [cid, ...params];
    } else if (period === 'week') {
      title = 'Omzet Deze Week';
      const from = new Date(today);
      from.setDate(from.getDate() - 6); // last 7 days inclusive
      const dateFrom = isoDate(from);
      const dateTo = isoDate(today);
      whereSql = 'DATE(o.created_at) >= ? AND DATE(o.created_at) <= ?';
      params = [dateFrom, dateTo];
      seriesSql = `
        SELECT DATE(o.created_at) as label, COUNT(*) as orders, COALESCE(SUM(o.total),0) as revenue
        FROM orders o
        WHERE o.company_id = ? AND DATE(o.created_at) >= ? AND DATE(o.created_at) <= ? AND o.status != 'cancelled'
        GROUP BY DATE(o.created_at)
        ORDER BY label
      `;
      seriesParams = [cid, ...params];
    } else if (period === 'month') {
      title = 'Omzet Deze Maand';
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      const to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const dateFrom = isoDate(from);
      const dateTo = isoDate(to);
      whereSql = 'DATE(o.created_at) >= ? AND DATE(o.created_at) <= ?';
      params = [dateFrom, dateTo];
      seriesSql = `
        SELECT DATE(o.created_at) as label, COUNT(*) as orders, COALESCE(SUM(o.total),0) as revenue
        FROM orders o
        WHERE o.company_id = ? AND DATE(o.created_at) >= ? AND DATE(o.created_at) <= ? AND o.status != 'cancelled'
        GROUP BY DATE(o.created_at)
        ORDER BY label
      `;
      seriesParams = [cid, ...params];
    } else {
      throw new AppError('Onbekende periode', 400);
    }

    const baseTotals = await getOrderTotals({ whereSql, params, companyId: cid });
    const bd = computeVatBreakdown(baseTotals.revenue, taxRate);

    const rows = await query(seriesSql, seriesParams);
    const points = rows.map((r) => ({
      label: String(r.label),
      orders: Number(r.orders || 0),
      revenue: round2(parseFloat(r.revenue || 0)),
    }));

    res.json({
      success: true,
      data: {
        period,
        title,
        restaurant,
        totals: {
          ...baseTotals,
          tax_rate: taxRate,
          net_amount: bd.net,
          vat_amount: bd.vat,
        },
        points,
      },
    });
  } catch (error) {
    next(error);
  }
});

function buildReportPdf(doc, { title, subtitle, restaurant, totals, orders = [], generatedAt }) {
  // Theme (print-friendly)
  const C = {
    primary: '#D4AF37', // gold
    dark: '#0B1220',
    text: '#111827',
    muted: '#6B7280',
    border: '#E5E7EB',
    bg: '#F6F7FB',
    card: '#FFFFFF'
  };

  const pageW = doc.page.width;
  const pageH = doc.page.height;
  const left = doc.page.margins.left;
  const right = doc.page.margins.right;
  const contentW = pageW - left - right;

  // Background + header bar
  doc.save();
  doc.rect(0, 0, pageW, pageH).fill(C.bg);
  doc.rect(0, 0, pageW, 92).fill(C.dark);
  doc.rect(0, 88, pageW, 4).fill(C.primary);
  doc.restore();

  // Optional logo (if present locally)
  if (fs.existsSync(REPORT_LOGO_PATH)) {
    try {
      doc.image(REPORT_LOGO_PATH, left, 18, { fit: [52, 52] });
    } catch {
      // ignore logo errors
    }
  }

  // Header text
  const headerX = left + (fs.existsSync(REPORT_LOGO_PATH) ? 62 : 0);
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(16).text(restaurant?.name || 'The Golden Olive', headerX, 18, {
    width: contentW - (headerX - left) - 220
  });

  doc.font('Helvetica').fontSize(9).fillColor('#C7CBD5');
  const contactLines = [restaurant?.address, restaurant?.phone, restaurant?.email].filter(Boolean);
  doc.text(contactLines.join(' • '), headerX, 40, { width: contentW - (headerX - left) - 220 });

  doc.font('Helvetica-Bold').fontSize(14).fillColor(C.primary).text(title, pageW - right - 220, 18, {
    width: 220,
    align: 'right'
  });
  doc.font('Helvetica').fontSize(9).fillColor('#C7CBD5').text(subtitle || '', pageW - right - 220, 40, {
    width: 220,
    align: 'right'
  });

  // Content cards
  let y = 112;

  const drawCard = (cardTitle, height, render) => {
    // simple page-break
    if (y + height > pageH - 48) {
      doc.addPage();
      y = 42;
    }
    doc.save();
    doc.roundedRect(left, y, contentW, height, 12).fill(C.card).stroke(C.border);
    doc.restore();
    doc.font('Helvetica-Bold').fontSize(11).fillColor(C.text).text(cardTitle, left + 16, y + 14);
    render(left + 16, y + 38, contentW - 32);
    y += height + 14;
  };

  const labelValue = (x, yy, w, label, value, opts = {}) => {
    doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(opts.size || 10).fillColor(opts.labelColor || C.muted).text(label, x, yy, {
      width: w * 0.62
    });
    doc.font(opts.valueBold ? 'Helvetica-Bold' : 'Helvetica').fontSize(opts.size || 10).fillColor(opts.valueColor || C.text).text(value, x, yy, {
      width: w,
      align: 'right'
    });
  };

  const totalsSafe = {
    orders: Number(totals.orders || 0),
    delivery_orders: Number(totals.delivery_orders || 0),
    pickup_orders: Number(totals.pickup_orders || 0),
    subtotal: round2(totals.subtotal || 0),
    delivery_fees: round2(totals.delivery_fees || 0),
    revenue: round2(totals.revenue || 0),
    tax_rate: Number(totals.tax_rate || 0),
    net_amount: round2(totals.net_amount || 0),
    vat_amount: round2(totals.vat_amount || 0)
  };

  drawCard('Overzicht', 120, (x, yy, w) => {
    labelValue(x, yy, w, 'Bestellingen', String(totalsSafe.orders), { bold: true, valueBold: true, size: 11, labelColor: C.text });
    labelValue(x, yy + 18, w, 'Bezorgen', String(totalsSafe.delivery_orders), { valueBold: true });
    labelValue(x, yy + 36, w, 'Afhalen', String(totalsSafe.pickup_orders), { valueBold: true });

    doc.save();
    doc.roundedRect(x, yy + 62, w, 38, 10).fill('#F9FAFB').stroke(C.border);
    doc.restore();
    doc.font('Helvetica').fontSize(9).fillColor(C.muted).text('Omzet (incl. BTW)', x + 12, yy + 74, { width: w - 24 });
    doc.font('Helvetica-Bold').fontSize(14).fillColor(C.text).text(eur(totalsSafe.revenue), x + 12, yy + 70, {
      width: w - 24,
      align: 'right'
    });
  });

  drawCard('Bedragen', 170, (x, yy, w) => {
    labelValue(x, yy, w, 'Subtotaal', eur(totalsSafe.subtotal), { valueBold: true });
    labelValue(x, yy + 18, w, 'Bezorgkosten', eur(totalsSafe.delivery_fees), { valueBold: true });

    doc.save();
    doc.moveTo(x, yy + 44).lineTo(x + w, yy + 44).strokeColor(C.border).stroke();
    doc.restore();

    // Highlight total row
    doc.save();
    doc.roundedRect(x, yy + 54, w, 36, 10).fill('#FFF7DC').stroke('#F3E2AA');
    doc.restore();
    labelValue(x + 12, yy + 66, w - 24, 'Totaal (incl. BTW)', eur(totalsSafe.revenue), {
      bold: true,
      valueBold: true,
      size: 12,
      labelColor: C.text,
      valueColor: C.text
    });

    labelValue(x, yy + 104, w, 'Netto (excl. BTW)', eur(totalsSafe.net_amount), { valueBold: true });
    labelValue(x, yy + 122, w, `BTW (${totalsSafe.tax_rate}%)`, eur(totalsSafe.vat_amount), { valueBold: true });

    doc.font('Helvetica').fontSize(8).fillColor(C.muted).text(
      'Bedragen zijn afgerond op 2 decimalen. Netto + BTW = Totaal (incl. BTW).',
      x,
      yy + 146,
      { width: w }
    );
  });

  // Orders detail section (can span multiple pages)
  const ordersSafe = Array.isArray(orders) ? orders : [];
  const fmtType = (t) => (t === 'delivery' ? 'Bezorgen' : 'Afhalen');
  const fmtStatus = (s) => {
    const map = {
      pending: 'Nieuw',
      paid: 'Betaald',
      preparing: 'In bereiding',
      ready: 'Klaar',
      delivering: 'Onderweg',
      delivered: 'Geleverd',
      cancelled: 'Geannuleerd'
    };
    return map[s] || s || '-';
  };
  const fmtPay = (s) => {
    const map = {
      open: 'Open',
      pending: 'In behandeling',
      paid: 'Betaald',
      failed: 'Mislukt',
      canceled: 'Geannuleerd',
      expired: 'Verlopen'
    };
    return map[s] || s || '-';
  };

  const drawOrdersHeader = () => {
    // If we're too close to bottom, add a page.
    if (y + 90 > pageH - 48) {
      doc.addPage();
      y = 42;
    }
    doc.save();
    doc.roundedRect(left, y, contentW, 42, 12).fill(C.card).stroke(C.border);
    doc.restore();
    doc.font('Helvetica-Bold').fontSize(11).fillColor(C.text).text('Bestellingen (details)', left + 16, y + 14);
    doc.font('Helvetica').fontSize(9).fillColor(C.muted).text(`${ordersSafe.length} bestelling(en)`, left + 16, y + 28);
    y += 56;
  };

  const truncate = (text, maxWidth, font = 'Helvetica', size = 9) => {
    const raw = String(text || '');
    if (!raw) return '';
    doc.font(font).fontSize(size);
    if (doc.widthOfString(raw) <= maxWidth) return raw;
    const ell = '…';
    if (doc.widthOfString(ell) > maxWidth) return '';
    let lo = 0;
    let hi = raw.length;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      const candidate = raw.slice(0, mid) + ell;
      if (doc.widthOfString(candidate) <= maxWidth) lo = mid;
      else hi = mid - 1;
    }
    return raw.slice(0, lo) + ell;
  };

  const drawOrderRow = (o) => {
    const rowH = 68;
    if (y + rowH > pageH - 48) {
      doc.addPage();
      y = 42;
    }
    doc.save();
    doc.roundedRect(left, y, contentW, rowH, 10).fill(C.card).stroke(C.border);
    doc.restore();

    const padX = left + 14;
    const col1 = 140; // order / time
    const col2 = 210; // customer
    const col3 = 150; // type/status/pay
    const col4 = Math.max(96, contentW - (col1 + col2 + col3) - 28); // amounts

    const created = o.created_at ? new Date(o.created_at) : null;
    const when = created ? created.toLocaleString('nl-BE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';

    const orderNo = o.order_number || `#${o.id}`;
    doc.font('Helvetica-Bold').fontSize(10).fillColor(C.text).text(truncate(orderNo, col1, 'Helvetica-Bold', 10), padX, y + 12, {
      width: col1,
      lineBreak: false
    });
    doc.font('Helvetica').fontSize(8).fillColor(C.muted).text(truncate(when, col1, 'Helvetica', 8), padX, y + 30, {
      width: col1,
      lineBreak: false
    });

    const customerName = o.customer_name || '—';
    doc.font('Helvetica-Bold').fontSize(10).fillColor(C.text).text(truncate(customerName, col2, 'Helvetica-Bold', 10), padX + col1, y + 12, {
      width: col2,
      lineBreak: false
    });
    const contact = [o.customer_phone, o.customer_email].filter(Boolean).join(' • ');
    doc.font('Helvetica').fontSize(8).fillColor(C.muted).text(truncate(contact, col2, 'Helvetica', 8), padX + col1, y + 30, {
      width: col2,
      lineBreak: false
    });

    const s1 = `${fmtType(o.delivery_type)} • ${fmtStatus(o.status)}`;
    const s2 = `Betaling: ${fmtPay(o.payment_status)}${o.payment_method ? ` (${o.payment_method})` : ''}`;
    doc.font('Helvetica').fontSize(9).fillColor(C.text).text(truncate(s1, col3, 'Helvetica', 9), padX + col1 + col2, y + 12, {
      width: col3,
      lineBreak: false
    });
    doc.font('Helvetica').fontSize(8).fillColor(C.muted).text(truncate(s2, col3, 'Helvetica', 8), padX + col1 + col2, y + 30, {
      width: col3,
      lineBreak: false
    });

    const t = o.totals || {};
    doc.font('Helvetica').fontSize(8).fillColor(C.muted).text('Totaal', padX + col1 + col2 + col3, y + 12, { width: col4, align: 'right' });
    doc.font('Helvetica-Bold').fontSize(12).fillColor(C.text).text(eur(t.total ?? 0), padX + col1 + col2 + col3, y + 26, { width: col4, align: 'right' });

    y += rowH + 10;
  };

  const drawOrderItems = (o) => {
    const items = Array.isArray(o.items) ? o.items : [];
    if (!items.length) return;

    // Fixed height based on what we actually render (max 14 lines)
    const lines = Math.min(14, items.length);
    const estH = Math.min(260, 34 + lines * 14 + (items.length > 14 ? 18 : 0));
    if (y + estH > pageH - 48) {
      doc.addPage();
      y = 42;
    }

    doc.save();
    doc.roundedRect(left, y, contentW, estH, 10).fill('#FFFFFF').stroke(C.border);
    doc.restore();
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.text).text(`Items — ${o.order_number || `#${o.id}`}`, left + 14, y + 10);

    let yy = y + 28;
    items.slice(0, 14).forEach((it) => {
      const lineLeftRaw = `${it.quantity}× ${it.product_name}`;
      const lineRight = eur(it.subtotal ?? 0);
      const leftW = contentW - 28 - 90;
      const lineLeft = truncate(lineLeftRaw, leftW, 'Helvetica', 9);
      doc.font('Helvetica').fontSize(9).fillColor(C.text).text(lineLeft, left + 14, yy, { width: leftW, lineBreak: false });
      doc.font('Helvetica').fontSize(9).fillColor(C.text).text(lineRight, left + 14, yy, { width: contentW - 28, align: 'right' });
      yy += 14;
    });

    if (items.length > 14) {
      doc.font('Helvetica').fontSize(8).fillColor(C.muted).text(`+ ${items.length - 14} meer item(s)`, left + 14, yy + 2);
    }

    y += estH + 12;
  };

  drawOrdersHeader();
  ordersSafe.forEach((o) => {
    drawOrderRow(o);
    drawOrderItems(o);
  });

  // Footer
  doc.font('Helvetica').fontSize(8).fillColor('#9AA3B2').text(
    `Gegenereerd: ${generatedAt || new Date().toLocaleString('nl-BE')}`,
    left,
    pageH - 28,
    { width: contentW }
  );
}

/**
 * GET /api/admin/reports/pdf
 * Download a PDF report.
 */
router.get('/reports/pdf', requirePermission('view_orders'), async (req, res, next) => {
  try {
    const cid = companyIdFrom(req);
    const type = String(req.query.type || 'daily');

    let title = 'Rapport';
    let subtitle = '';
    let payload = null;

    if (type === 'daily') {
      const date = req.query.date ? String(req.query.date) : isoDate();
      const daily = await buildDailyReportPayload(date, cid);

      title = 'Dagrapport';
      subtitle = `Datum: ${date}`;
      payload = daily;
      res.setHeader('Content-Disposition', `attachment; filename="dagrapport-${date}.pdf"`);
    } else if (type === 'range') {
      const dateFrom = req.query.date_from ? String(req.query.date_from) : null;
      const dateTo = req.query.date_to ? String(req.query.date_to) : null;
      title = 'Periode rapport';
      subtitle = `Periode: ${dateFrom} → ${dateTo}`;
      payload = await buildRangeReportPayload(dateFrom, dateTo, cid);
      res.setHeader('Content-Disposition', `attachment; filename="periode-${dateFrom}-tot-${dateTo}.pdf"`);
    } else {
      throw new AppError('Onbekend report type', 400);
    }

    res.setHeader('Content-Type', 'application/pdf');
    const doc = new PDFDocument({ margin: 42, size: 'A4' });
    doc.pipe(res);
    buildReportPdf(doc, {
      title,
      subtitle,
      restaurant: payload.restaurant,
      totals: payload.totals,
      orders: payload.orders || [],
      generatedAt: new Date().toLocaleString('nl-BE')
    });
    doc.end();
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/reports/email
 * Email a PDF report as attachment.
 */
router.post('/reports/email', requirePermission('view_orders'), async (req, res, next) => {
  try {
    const cid = companyIdFrom(req);
    const { type, to, date, date_from, date_to } = req.body || {};
    const toEmail = (to || '').toString().trim();
    if (!toEmail) throw new AppError('E-mailadres is verplicht', 400);

    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    if (!host || !port || !user || !pass || !from) {
      throw new AppError('SMTP is niet geconfigureerd (SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM)', 500);
    }

    const reportType = String(type || 'daily');
    let title = 'Rapport';
    let subtitle = '';
    let payload = null;
    let filename = 'rapport.pdf';

    if (reportType === 'daily') {
      const d = (date || isoDate()).toString();
      payload = await buildDailyReportPayload(d, cid);
      title = 'Dagrapport';
      subtitle = `Datum: ${d}`;
      filename = `dagrapport-${d}.pdf`;
    } else if (reportType === 'range') {
      const df = (date_from || '').toString();
      const dt = (date_to || '').toString();
      payload = await buildRangeReportPayload(df, dt, cid);
      title = 'Periode rapport';
      subtitle = `Periode: ${df} → ${dt}`;
      filename = `periode-${df}-tot-${dt}.pdf`;
    } else {
      throw new AppError('Onbekend report type', 400);
    }

    const pdfBuffer = await new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 42, size: 'A4' });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      buildReportPdf(doc, {
        title,
        subtitle,
        restaurant: payload.restaurant,
        totals: payload.totals,
        orders: payload.orders || [],
        generatedAt: new Date().toLocaleString('nl-BE')
      });
      doc.end();
    });

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });

    await transporter.sendMail({
      from,
      to: toEmail,
      subject: `${title} - The Golden Olive`,
      text: `In bijlage vind je het ${title.toLowerCase()}.\n\n${subtitle}`,
      attachments: [{ filename, content: pdfBuffer, contentType: 'application/pdf' }]
    });

    res.json({ success: true, message: 'Rapport verzonden' });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/admin/orders/:id/status
 * Update order status
 */
router.patch('/orders/:id/status', requirePermission('update_order_status'), async (req, res, next) => {
  try {
    const cid = companyIdFrom(req);
    const { status, notes } = req.body;
    const validStatuses = ['pending', 'paid', 'preparing', 'ready', 'delivering', 'delivered', 'cancelled'];

    if (!validStatuses.includes(status)) {
      throw new AppError('Ongeldige status', 400);
    }

    // Get current order
    const [order] = await query('SELECT id, status FROM orders WHERE id = ? AND company_id = ?', [req.params.id, cid]);
    if (!order) {
      throw new AppError('Bestelling niet gevonden', 404);
    }

    const previousStatus = order.status;

    // Update order
    await query('UPDATE orders SET status = ? WHERE id = ? AND company_id = ?', [status, req.params.id, cid]);

    // Log status change
    await query(`
      INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by, notes)
      VALUES (?, ?, ?, ?, ?)
    `, [req.params.id, previousStatus, status, req.user.id, notes || null]);

    // Log admin action
    await logAction(req.user.id, 'update_order_status', 'order', req.params.id, {
      previousStatus,
      newStatus: status,
      notes
    }, req);

    res.json({
      success: true,
      message: `Status bijgewerkt naar: ${status}`,
      data: { previousStatus, newStatus: status }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/orders/:id/print
 * Mark order as printed + send via Print Bridge (preferred) or legacy TCP
 */
router.post('/orders/:id/print', requirePermission('view_orders'), async (req, res, next) => {
  try {
    const cid = companyIdFrom(req);
    const [order] = await query(`
      SELECT o.*,
             a.street, a.house_number, a.bus, a.postal_code, a.city
      FROM orders o
      LEFT JOIN addresses a ON o.address_id = a.id
      WHERE o.id = ? AND o.company_id = ?
    `, [req.params.id, cid]);

    if (!order) {
      throw new AppError('Bestelling niet gevonden', 404);
    }

    const items = await query(
      'SELECT product_name, quantity, product_price, subtotal, notes FROM order_items WHERE order_id = ? ORDER BY id',
      [req.params.id]
    );
    order.items = items;

    await logAction(req.user.id, 'print_order', 'order', req.params.id, {}, req);

    let network = { printed: false };
    try {
      const { printOrderViaBridge } = await import('../services/print/queue.js');
      const bridge = await printOrderViaBridge(req.params.id);
      network = { printed: true, bridge, via: 'print_bridge' };
    } catch (bridgeErr) {
      try {
        if (req.body?.network === true || req.query.network === '1') {
          const settings = await getSettingsMap(['printer_ip', 'printer_port', 'restaurant_name', 'restaurant_address', 'restaurant_phone'], cid);
          const { sendToPrinter, buildOrderTicket } = await import('../services/printer.js');
          const host = String(settings.printer_ip || '').trim();
          if (!host) throw new AppError('Printer IP is niet ingesteld', 400);
          const ticket = buildOrderTicket(order, {
            name: settings.restaurant_name || 'The Golden Olive',
            address: settings.restaurant_address || '',
            phone: settings.restaurant_phone || ''
          });
          await sendToPrinter({ host, port: settings.printer_port || 9100, data: ticket });
          network = { printed: true, host, port: settings.printer_port || 9100, via: 'legacy_tcp' };
        } else {
          network = await printOrderToNetwork(order);
          if (network?.printed) network.via = 'legacy_tcp';
        }
      } catch (printErr) {
        network = { printed: false, error: printErr.message, bridge_error: bridgeErr.message };
      }

      // Legacy / mark-only path: increment print metadata here
      // (Print Bridge already updates print_count inside printOrderViaBridge)
      await query(
        `UPDATE orders SET print_count = print_count + 1, printed_at = NOW() WHERE id = ? AND company_id = ?`,
        [req.params.id, cid]
      );
    }

    res.json({
      success: true,
      message: network.printed
        ? (network.via === 'print_bridge' ? 'Order naar Print Bridge queue gestuurd' : 'Order geprint op netwerkprinter')
        : 'Order gemarkeerd als geprint',
      data: { network }
    });
  } catch (error) {
    next(error);
  }
});

// =====================================================
// PRODUCTS
// =====================================================

/**
 * GET /api/admin/products
 * Get all products for admin
 */
router.get('/products', requirePermission('view_products'), async (req, res, next) => {
  try {
    const cid = companyIdFrom(req);
    const { category, available, search } = req.query;
    
    let sql = `
      SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id AND c.company_id = p.company_id
      WHERE p.company_id = ?
    `;
    const params = [cid];

    if (category) {
      sql += ' AND p.category_id = ?';
      params.push(category);
    }
    if (available !== undefined) {
      sql += ' AND p.is_available = ?';
      params.push(available === 'true' ? 1 : 0);
    }
    if (search) {
      sql += ' AND (p.name LIKE ? OR p.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY c.sort_order, p.sort_order, p.name';
    const products = await query(sql, params);

    // Parse allergens
    products.forEach(p => {
      if (typeof p.allergens === 'string') {
        try { p.allergens = JSON.parse(p.allergens); } catch { p.allergens = []; }
      }
    });

    res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/products
 * Create new product
 */
router.post('/products', isAdmin, async (req, res, next) => {
  try {
    const cid = companyIdFrom(req);
    const { name, category_id, description, price, image_url, allergens, is_available, is_featured, sort_order } = req.body;

    if (!name || !category_id || price === undefined) {
      throw new AppError('Naam, categorie en prijs zijn verplicht', 400);
    }

    const [category] = await query('SELECT id, slug FROM categories WHERE id = ? AND company_id = ?', [category_id, cid]);
    if (!category) throw new AppError('Categorie niet gevonden', 404);
    await assertPinForCategorySlug(req, category.slug);

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();

    const result = await query(`
      INSERT INTO products (company_id, category_id, name, slug, description, price, image_url, allergens, is_available, is_featured, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      cid, category_id, name, slug, description || null, price, image_url || null,
      JSON.stringify(allergens || []), is_available !== false ? 1 : 0, is_featured ? 1 : 0, sort_order || 0
    ]);

    await logAction(req.user.id, 'create_product', 'product', result.insertId, { name, price }, req);

    res.status(201).json({
      success: true,
      data: { id: result.insertId },
      message: 'Product aangemaakt'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/admin/products/:id
 * Update product
 */
router.put('/products/:id', isAdmin, async (req, res, next) => {
  try {
    const cid = companyIdFrom(req);
    const { name, category_id, description, price, image_url, allergens, is_available, is_featured, sort_order } = req.body;

    const existing = await getProductWithCategory(req.params.id, cid);
    if (!existing) {
      throw new AppError('Product niet gevonden', 404);
    }

    await assertPinForCategorySlug(req, existing.category_slug);

    if (category_id && Number(category_id) !== Number(existing.category_id)) {
      const [category] = await query('SELECT id, slug FROM categories WHERE id = ? AND company_id = ?', [category_id, cid]);
      if (!category) throw new AppError('Categorie niet gevonden', 404);
      await assertPinForCategorySlug(req, category.slug);
    }

    await query(`
      UPDATE products SET
        name = COALESCE(?, name),
        category_id = COALESCE(?, category_id),
        description = COALESCE(?, description),
        price = COALESCE(?, price),
        image_url = COALESCE(?, image_url),
        allergens = COALESCE(?, allergens),
        is_available = COALESCE(?, is_available),
        is_featured = COALESCE(?, is_featured),
        sort_order = COALESCE(?, sort_order)
      WHERE id = ? AND company_id = ?
    `, [
      name, category_id, description, price, image_url,
      allergens ? JSON.stringify(allergens) : null,
      is_available !== undefined ? (is_available ? 1 : 0) : null,
      is_featured !== undefined ? (is_featured ? 1 : 0) : null,
      sort_order, req.params.id, cid
    ]);

    await logAction(req.user.id, 'update_product', 'product', req.params.id, { name, price }, req);

    res.json({ success: true, message: 'Product bijgewerkt' });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admin/products/:id
 * Delete product
 */
router.delete('/products/:id', isAdmin, async (req, res, next) => {
  try {
    const cid = companyIdFrom(req);
    const existing = await getProductWithCategory(req.params.id, cid);
    if (!existing) {
      throw new AppError('Product niet gevonden', 404);
    }

    await assertPinForCategorySlug(req, existing.category_slug);

    await query('DELETE FROM products WHERE id = ? AND company_id = ?', [req.params.id, cid]);
    await logAction(req.user.id, 'delete_product', 'product', req.params.id, { name: existing.name }, req);

    res.json({ success: true, message: 'Product verwijderd' });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/admin/products/:id/toggle
 * Toggle product availability
 * - Admin: alle producten (PIN voor beschermde categorieën)
 * - Staff: alleen eten; mocktails nooit
 */
router.patch('/products/:id/toggle', requirePermission('toggle_availability'), async (req, res, next) => {
  try {
    const cid = companyIdFrom(req);
    const product = await getProductWithCategory(req.params.id, cid);
    if (!product) {
      throw new AppError('Product niet gevonden', 404);
    }

    const slug = product.category_slug;

    if (isAdminOnlyToggleCategory(slug) && req.user.role !== 'admin') {
      throw new AppError('Alleen een admin kan mocktails actief/inactief zetten', 403);
    }

    if (req.user.role !== 'admin' && !isFoodCategory(slug)) {
      throw new AppError('Medewerkers kunnen alleen beschikbaarheid van eten wijzigen', 403);
    }

    if (req.user.role === 'admin') {
      await assertPinForCategorySlug(req, slug);
    }

    const newStatus = !product.is_available;
    await query('UPDATE products SET is_available = ? WHERE id = ? AND company_id = ?', [newStatus ? 1 : 0, req.params.id, cid]);

    await logAction(req.user.id, 'toggle_product', 'product', req.params.id, { is_available: newStatus }, req);

    res.json({ success: true, data: { is_available: newStatus } });
  } catch (error) {
    next(error);
  }
});

// =====================================================
// CATEGORIES
// =====================================================

/**
 * GET /api/admin/categories
 * Get all categories with product counts
 */
router.get('/categories', async (req, res, next) => {
  try {
    const cid = companyIdFrom(req);
    const categories = await query(`
      SELECT c.*, COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND p.company_id = c.company_id
      WHERE c.company_id = ?
      GROUP BY c.id
      ORDER BY c.sort_order, c.name
    `, [cid]);

    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/categories
 */
router.post('/categories', isAdmin, async (req, res, next) => {
  try {
    const cid = companyIdFrom(req);
    const { name, description, image_url, sort_order, is_active } = req.body;
    if (!name) throw new AppError('Naam is verplicht', 400);

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const result = await query(`
      INSERT INTO categories (company_id, name, slug, description, image_url, sort_order, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [cid, name, slug, description || null, image_url || null, sort_order || 0, is_active !== false ? 1 : 0]);

    await logAction(req.user.id, 'create_category', 'category', result.insertId, { name }, req);

    res.status(201).json({ success: true, data: { id: result.insertId }, message: 'Categorie aangemaakt' });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/admin/categories/:id
 */
router.put('/categories/:id', isAdmin, async (req, res, next) => {
  try {
    const cid = companyIdFrom(req);
    const { name, description, image_url, sort_order, is_active } = req.body;

    await query(`
      UPDATE categories SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        image_url = COALESCE(?, image_url),
        sort_order = COALESCE(?, sort_order),
        is_active = COALESCE(?, is_active)
      WHERE id = ? AND company_id = ?
    `, [name, description, image_url, sort_order, is_active !== undefined ? (is_active ? 1 : 0) : null, req.params.id, cid]);

    await logAction(req.user.id, 'update_category', 'category', req.params.id, { name }, req);

    res.json({ success: true, message: 'Categorie bijgewerkt' });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admin/categories/:id
 */
router.delete('/categories/:id', isAdmin, async (req, res, next) => {
  try {
    const cid = companyIdFrom(req);
    const [{ count }] = await query(
      'SELECT COUNT(*) as count FROM products WHERE category_id = ? AND company_id = ?',
      [req.params.id, cid]
    );
    if (count > 0) {
      throw new AppError('Kan niet verwijderen: categorie bevat nog producten', 400);
    }

    const result = await query('DELETE FROM categories WHERE id = ? AND company_id = ?', [req.params.id, cid]);
    if (result.affectedRows === 0) throw new AppError('Categorie niet gevonden', 404);
    await logAction(req.user.id, 'delete_category', 'category', req.params.id, {}, req);

    res.json({ success: true, message: 'Categorie verwijderd' });
  } catch (error) {
    next(error);
  }
});

// =====================================================
// PAYMENTS
// =====================================================

/**
 * GET /api/admin/payments
 * Get all payments
 */
router.get('/payments', isAdmin, async (req, res, next) => {
  try {
    const cid = companyIdFrom(req);
    const { status, date_from, date_to, page = 1, limit = 50 } = req.query;
    
    let sql = `
      SELECT p.*, o.order_number, o.customer_name, o.customer_email
      FROM payments p
      JOIN orders o ON p.order_id = o.id
      WHERE p.company_id = ?
    `;
    const params = [cid];

    if (status) {
      sql += ' AND p.status = ?';
      params.push(status);
    }
    if (date_from) {
      sql += ' AND DATE(p.created_at) >= ?';
      params.push(date_from);
    }
    if (date_to) {
      sql += ' AND DATE(p.created_at) <= ?';
      params.push(date_to);
    }

    const limitNum = Math.min(parseInt(limit) || 50, 100);
    const pageNum = parseInt(page) || 1;
    const offset = (pageNum - 1) * limitNum;

    sql += ` ORDER BY p.created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;
    const payments = await query(sql, params);

    // Parse metadata
    payments.forEach(p => {
      if (p.metadata && typeof p.metadata === 'string') {
        try { p.metadata = JSON.parse(p.metadata); } catch { }
      }
    });

    res.json({ success: true, data: payments });
  } catch (error) {
    next(error);
  }
});

// =====================================================
// SETTINGS
// =====================================================

/**
 * GET /api/admin/settings
 * Secrets are always masked. Staff only sees operational (non-secret) keys.
 */
router.get('/settings', async (req, res, next) => {
  try {
    const cid = companyIdFrom(req);
    let settings = await listCompanySettings(cid);
    // Fallback: if empty, mirror legacy global settings once
    if (!settings.length) {
      const legacy = await query('SELECT * FROM settings ORDER BY setting_key');
      for (const s of legacy) {
        await upsertCompanySetting(cid, s.setting_key, s.setting_value, s.setting_type, s.description);
      }
      settings = await listCompanySettings(cid);
    }

    const parsed = settings.map((s) => {
      let setting_value = s.setting_value;
      if (s.is_encrypted || String(setting_value || '').startsWith('enc:')) {
        // leave encrypted; sanitizeSettingsForUser will mask secrets
        setting_value = '********';
      } else if (s.setting_type === 'json') {
        setting_value = parseJsonSetting(s.setting_value, {});
      } else if (s.setting_type === 'number') {
        setting_value = parseFloat(s.setting_value);
      } else if (s.setting_type === 'boolean') {
        setting_value = s.setting_value === 'true';
      }
      return { ...s, setting_key: s.setting_key, setting_value, setting_type: s.setting_type };
    });

    const sanitized = sanitizeSettingsForUser(parsed, req.user);
    res.json({ success: true, data: sanitized });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/admin/settings/:key
 */
router.put('/settings/:key', isAdmin, async (req, res, next) => {
  try {
    const { value } = req.body;
    const { key } = req.params;
    const cid = companyIdFrom(req);

    // Prevent accidental overwrite with masked UI values
    if (isSensitiveSettingKey(key)) {
      const raw = value == null ? '' : String(typeof value === 'object' ? JSON.stringify(value) : value);
      if (!raw || raw.includes('********') || raw.endsWith('…********')) {
        return res.json({ success: true, message: 'Secret ongewijzigd' });
      }
    }

    // Special handling: hash admin PIN
    if (key === 'admin_pin') {
      const pin = String(value || '').trim();
      if (pin && !/^\d{4,8}$/.test(pin)) {
        throw new AppError('Pincode moet 4 tot 8 cijfers zijn', 400);
      }
      const hashed = pin ? await bcrypt.hash(pin, 10) : '';
      await upsertCompanySetting(cid, 'admin_pin', hashed, 'string', 'Pincode voor beheer van beschermde producten (gehashed)');
      await logAction(req.user.id, 'update_setting', 'setting', null, { key: 'admin_pin', value: pin ? '***' : '' }, req);
      return res.json({ success: true, message: pin ? 'Pincode opgeslagen' : 'Pincode gewist' });
    }

    if (key === 'pin_protected_categories') {
      const cats = Array.isArray(value)
        ? value
        : String(value || '')
            .split(',')
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean);
      await upsertCompanySetting(cid, 'pin_protected_categories', cats, 'json', 'Categorie-slugs die een pincode vereisen');
      await logAction(req.user.id, 'update_setting', 'setting', null, { key, value: cats }, req);
      return res.json({ success: true, message: 'Instelling opgeslagen' });
    }

    const type = typeof value === 'boolean' ? 'boolean' : typeof value === 'number' ? 'number' : Array.isArray(value) || typeof value === 'object' ? 'json' : 'string';
    await upsertCompanySetting(cid, key, value, type);
    // dual-write legacy settings for compatibility during transition
    try { await upsertSetting(key, value, type); } catch { /* ignore */ }

    await logAction(
      req.user.id,
      'update_setting',
      'setting',
      null,
      { key, value: isSensitiveSettingKey(key) ? '***' : value },
      req
    );

    res.json({ success: true, message: 'Instelling opgeslagen' });
  } catch (error) {
    next(error);
  }
});

// =====================================================
// PRIVACY / GDPR (Admin only)
// =====================================================

/**
 * GET /api/admin/privacy/export?email=
 */
router.get('/privacy/export', isAdmin, async (req, res, next) => {
  try {
    const cid = companyIdFrom(req);
    const email = String(req.query.email || '').trim();
    if (!email) throw new AppError('Query parameter email is verplicht', 400);
    const data = await exportCustomerData(email, cid);
    await logAction(req.user.id, 'privacy_export', 'customer', null, { email }, req);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/privacy/erase
 * Body: { email }
 */
router.post('/privacy/erase', isAdmin, async (req, res, next) => {
  try {
    const cid = companyIdFrom(req);
    const email = String(req.body?.email || '').trim();
    if (!email) throw new AppError('email is verplicht', 400);
    const result = await eraseCustomerData(email, cid);
    await logAction(req.user.id, 'privacy_erase', 'customer', null, { email, ...result }, req);
    logger.info('GDPR erase', { email, ...result, by: req.user.id });
    res.json({ success: true, data: result, message: 'Klantgegevens geanonimiseerd' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/privacy/purge-old
 * Body: { days?: number } default 730
 */
router.post('/privacy/purge-old', isAdmin, async (req, res, next) => {
  try {
    const cid = companyIdFrom(req);
    const days = Number(req.body?.days || 730);
    const result = await purgeOldOrderPii(days, cid);
    await logAction(req.user.id, 'privacy_purge_old', 'orders', null, result, req);
    res.json({ success: true, data: result, message: `PII geanonimiseerd voor orders ouder dan ${result.days} dagen` });
  } catch (error) {
    next(error);
  }
});

// =====================================================
// USERS (Admin only)
// =====================================================

/**
 * GET /api/admin/users
 */
router.get('/users', isAdmin, async (req, res, next) => {
  try {
    const users = await query(`
      SELECT id, email, name, role, is_active, last_login, created_at
      FROM users ORDER BY created_at DESC
    `);
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/users
 */
router.post('/users', isAdmin, async (req, res, next) => {
  try {
    const { email, password, name, role } = req.body;
    
    if (!email || !password || !name) {
      throw new AppError('Email, wachtwoord en naam zijn verplicht', 400);
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const permissions = role === 'staff' ? '["view_orders", "update_order_status", "view_products", "toggle_availability"]' : null;

    const result = await query(`
      INSERT INTO users (email, password, name, role, permissions)
      VALUES (?, ?, ?, ?, ?)
    `, [email, hashedPassword, name, role || 'staff', permissions]);

    await logAction(req.user.id, 'create_user', 'user', result.insertId, { email, role }, req);

    res.status(201).json({ success: true, data: { id: result.insertId }, message: 'Gebruiker aangemaakt' });
  } catch (error) {
    next(error);
  }
});

// =====================================================
// LOGS
// =====================================================

/**
 * GET /api/admin/logs
 */
router.get('/logs', isAdmin, async (req, res, next) => {
  try {
    const { action, user_id, date_from, limit = 100 } = req.query;
    const cid = companyIdFrom(req);
    
    let sql = `
      SELECT l.*, u.name as user_name, u.email as user_email
      FROM admin_logs l
      LEFT JOIN users u ON l.user_id = u.id
      WHERE (l.company_id = ? OR l.company_id IS NULL)
    `;
    const params = [cid];

    if (action) {
      sql += ' AND l.action = ?';
      params.push(action);
    }
    if (user_id) {
      sql += ' AND l.user_id = ?';
      params.push(user_id);
    }
    if (date_from) {
      sql += ' AND DATE(l.created_at) >= ?';
      params.push(date_from);
    }

    sql += ` ORDER BY l.created_at DESC LIMIT ${parseInt(limit) || 100}`;
    const logs = await query(sql, params);

    // Parse details JSON
    logs.forEach(log => {
      if (log.details && typeof log.details === 'string') {
        try { log.details = JSON.parse(log.details); } catch { }
      }
    });

    res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
});

// =====================================================
// NOTIFICATIONS
// =====================================================

/**
 * GET /api/admin/notifications
 */
router.get('/notifications', async (req, res, next) => {
  try {
    const cid = companyIdFrom(req);
    const notifications = await query(`
      SELECT * FROM notifications 
      WHERE company_id = ? AND (user_id = ? OR user_id IS NULL)
      ORDER BY created_at DESC
      LIMIT 50
    `, [cid, req.user.id]);

    const [{ unread }] = await query(`
      SELECT COUNT(*) as unread FROM notifications 
      WHERE company_id = ? AND (user_id = ? OR user_id IS NULL) AND is_read = 0
    `, [cid, req.user.id]);

    res.json({ success: true, data: { notifications, unreadCount: Number(unread) } });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/notifications/read
 */
router.post('/notifications/read', async (req, res, next) => {
  try {
    const cid = companyIdFrom(req);
    await query(`
      UPDATE notifications SET is_read = 1 
      WHERE company_id = ? AND (user_id = ? OR user_id IS NULL) AND is_read = 0
    `, [cid, req.user.id]);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// =====================================================
// PIN VERIFICATION
// =====================================================

router.post('/pin/verify', isAdmin, async (req, res, next) => {
  try {
    await verifyAdminPin(req);
    res.json({ success: true, message: 'Pincode geldig' });
  } catch (error) {
    next(error);
  }
});

// =====================================================
// WEBSITE MENU (menukaart)
// =====================================================

router.get('/website-menu', isAdmin, async (req, res, next) => {
  try {
    const menu = readWebsiteMenu();
    res.json({ success: true, data: menu });
  } catch (error) {
    next(error);
  }
});

router.put('/website-menu', isAdmin, async (req, res, next) => {
  try {
    const menu = writeWebsiteMenu(req.body?.menu ?? req.body);
    await logAction(req.user.id, 'update_website_menu', 'website_menu', null, {
      categories: Object.keys(menu || {})
    }, req);
    res.json({ success: true, message: 'Website menukaart opgeslagen', data: menu });
  } catch (error) {
    next(error);
  }
});

router.put('/website-menu/:category/:itemId', isAdmin, async (req, res, next) => {
  try {
    const { category, itemId } = req.params;
    const updates = req.body || {};
    const menu = readWebsiteMenu();

    if (!menu[category] || !Array.isArray(menu[category])) {
      throw new AppError('Categorie niet gevonden op menukaart', 404);
    }

    const idx = menu[category].findIndex((item) => String(item.id) === String(itemId));
    if (idx === -1) {
      throw new AppError('Product niet gevonden op menukaart', 404);
    }

    menu[category][idx] = { ...menu[category][idx], ...updates, id: menu[category][idx].id };
    writeWebsiteMenu(menu);
    await logAction(req.user.id, 'update_website_menu_item', 'website_menu', null, { category, itemId }, req);

    res.json({ success: true, message: 'Menukaart item bijgewerkt', data: menu[category][idx] });
  } catch (error) {
    next(error);
  }
});

router.post('/website-menu/:category', isAdmin, async (req, res, next) => {
  try {
    const { category } = req.params;
    const item = req.body || {};
    if (!item.name || !item.price) {
      throw new AppError('Naam en prijs zijn verplicht', 400);
    }

    const menu = readWebsiteMenu();
    if (!menu[category]) menu[category] = [];

    const id = item.id || String(item.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (menu[category].some((i) => String(i.id) === String(id))) {
      throw new AppError('Product met deze id bestaat al in deze categorie', 409);
    }

    const newItem = {
      id,
      name: item.name,
      price: item.price,
      description: item.description || '',
      image: item.image || 'assets/img/favicon11.png',
      alt: item.alt || item.name,
      allergens: Array.isArray(item.allergens) ? item.allergens : []
    };

    menu[category].push(newItem);
    writeWebsiteMenu(menu);
    await logAction(req.user.id, 'create_website_menu_item', 'website_menu', null, { category, id }, req);

    res.status(201).json({ success: true, message: 'Item toegevoegd aan menukaart', data: newItem });
  } catch (error) {
    next(error);
  }
});

router.delete('/website-menu/:category/:itemId', isAdmin, async (req, res, next) => {
  try {
    const { category, itemId } = req.params;
    const menu = readWebsiteMenu();
    if (!menu[category] || !Array.isArray(menu[category])) {
      throw new AppError('Categorie niet gevonden op menukaart', 404);
    }

    const before = menu[category].length;
    menu[category] = menu[category].filter((item) => String(item.id) !== String(itemId));
    if (menu[category].length === before) {
      throw new AppError('Product niet gevonden op menukaart', 404);
    }

    writeWebsiteMenu(menu);
    await logAction(req.user.id, 'delete_website_menu_item', 'website_menu', null, { category, itemId }, req);
    res.json({ success: true, message: 'Item verwijderd van menukaart' });
  } catch (error) {
    next(error);
  }
});

// =====================================================
// DISCOUNTS
// =====================================================

router.get('/discounts', isAdmin, async (req, res, next) => {
  try {
    const cid = companyIdFrom(req);
    const discounts = await query(
      'SELECT * FROM discounts WHERE company_id = ? ORDER BY created_at DESC',
      [cid]
    );
    res.json({ success: true, data: discounts });
  } catch (error) {
    next(error);
  }
});

router.post('/discounts', isAdmin, async (req, res, next) => {
  try {
    const cid = companyIdFrom(req);
    const {
      code, description, discount_type = 'percent', value,
      min_order = 0, max_uses = null, is_active = true,
      valid_from = null, valid_until = null
    } = req.body;

    if (!code || value === undefined || value === null) {
      throw new AppError('Code en waarde zijn verplicht', 400);
    }
    if (!['percent', 'fixed'].includes(discount_type)) {
      throw new AppError('Ongeldig kortingstype', 400);
    }

    const result = await query(`
      INSERT INTO discounts
        (company_id, code, description, discount_type, value, min_order, max_uses, is_active, valid_from, valid_until)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      cid,
      String(code).trim().toUpperCase(),
      description || null,
      discount_type,
      Number(value),
      Number(min_order || 0),
      max_uses === '' || max_uses == null ? null : Number(max_uses),
      is_active ? 1 : 0,
      valid_from || null,
      valid_until || null
    ]);

    await logAction(req.user.id, 'create_discount', 'discount', result.insertId, { code }, req);
    res.status(201).json({ success: true, data: { id: result.insertId }, message: 'Korting aangemaakt' });
  } catch (error) {
    next(error);
  }
});

router.put('/discounts/:id', isAdmin, async (req, res, next) => {
  try {
    const cid = companyIdFrom(req);
    const {
      code, description, discount_type, value,
      min_order, max_uses, is_active, valid_from, valid_until
    } = req.body;

    const [existing] = await query('SELECT id FROM discounts WHERE id = ? AND company_id = ?', [req.params.id, cid]);
    if (!existing) throw new AppError('Korting niet gevonden', 404);

    await query(`
      UPDATE discounts SET
        code = COALESCE(?, code),
        description = COALESCE(?, description),
        discount_type = COALESCE(?, discount_type),
        value = COALESCE(?, value),
        min_order = COALESCE(?, min_order),
        max_uses = ?,
        is_active = COALESCE(?, is_active),
        valid_from = ?,
        valid_until = ?
      WHERE id = ? AND company_id = ?
    `, [
      code ? String(code).trim().toUpperCase() : null,
      description ?? null,
      discount_type || null,
      value !== undefined ? Number(value) : null,
      min_order !== undefined ? Number(min_order) : null,
      max_uses === '' || max_uses == null ? null : Number(max_uses),
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      valid_from || null,
      valid_until || null,
      req.params.id,
      cid
    ]);

    await logAction(req.user.id, 'update_discount', 'discount', req.params.id, { code }, req);
    res.json({ success: true, message: 'Korting bijgewerkt' });
  } catch (error) {
    next(error);
  }
});

router.delete('/discounts/:id', isAdmin, async (req, res, next) => {
  try {
    const cid = companyIdFrom(req);
    const [existing] = await query('SELECT code FROM discounts WHERE id = ? AND company_id = ?', [req.params.id, cid]);
    if (!existing) throw new AppError('Korting niet gevonden', 404);
    await query('DELETE FROM discounts WHERE id = ? AND company_id = ?', [req.params.id, cid]);
    await logAction(req.user.id, 'delete_discount', 'discount', req.params.id, { code: existing.code }, req);
    res.json({ success: true, message: 'Korting verwijderd' });
  } catch (error) {
    next(error);
  }
});

// =====================================================
// PRINTER
// =====================================================

router.post('/printer/test', isAdmin, async (req, res, next) => {
  try {
    const cid = companyIdFrom(req);
    const settings = await getSettingsMap(['printer_ip', 'printer_port', 'restaurant_name', 'restaurant_address', 'restaurant_phone'], cid);
    const host = String(req.body?.ip || settings.printer_ip || '').trim();
    const port = Number(req.body?.port || settings.printer_port || 9100);

    if (!host) throw new AppError('Printer IP is verplicht', 400);

    const { sendToPrinter, buildOrderTicket } = await import('../services/printer.js');
    const sample = buildOrderTicket({
      order_number: 'TEST-PRINT',
      delivery_type: 'pickup',
      status: 'paid',
      created_at: new Date().toISOString(),
      customer_name: 'Test Print',
      customer_phone: settings.restaurant_phone || '',
      subtotal: 0,
      delivery_fee: 0,
      discount_amount: 0,
      total: 0,
      items: [{ product_name: 'Test ticket', quantity: 1, product_price: 0, subtotal: 0 }],
      notes: 'Dit is een testprint vanaf het admin dashboard.'
    }, {
      name: settings.restaurant_name || 'The Golden Olive',
      address: settings.restaurant_address || '',
      phone: settings.restaurant_phone || ''
    });

    await sendToPrinter({ host, port, data: sample });
    res.json({ success: true, message: `Testprint verzonden naar ${host}:${port}` });
  } catch (error) {
    next(error);
  }
});

export default router;
