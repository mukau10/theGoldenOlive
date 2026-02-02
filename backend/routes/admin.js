/**
 * Admin Routes - Complete Dashboard API
 * Includes: Dashboard, Orders, Products, Categories, Payments, Settings, Logs
 */

import express from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/database.js';
import { authenticate, isAdmin } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = express.Router();

// =====================================================
// MIDDLEWARE - Apply auth to all routes
// =====================================================
router.use(authenticate);

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

// Helper to log admin actions
const logAction = async (userId, action, entityType, entityId, details, req) => {
  try {
    await query(`
      INSERT INTO admin_logs (user_id, action, entity_type, entity_id, details, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
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
      WHERE created_at >= ? AND created_at < ? AND status != 'cancelled'
    `, [today.toISOString(), tomorrow.toISOString()]);

    // Week stats
    const [weekStats] = await query(`
      SELECT COUNT(*) as orders, COALESCE(SUM(total), 0) as revenue
      FROM orders WHERE created_at >= ? AND status != 'cancelled'
    `, [weekStart.toISOString()]);

    // Month stats
    const [monthStats] = await query(`
      SELECT COUNT(*) as orders, COALESCE(SUM(total), 0) as revenue
      FROM orders WHERE created_at >= ? AND status != 'cancelled'
    `, [monthStart.toISOString()]);

    // Orders by status
    const statusCounts = await query(`
      SELECT status, COUNT(*) as count 
      FROM orders WHERE created_at >= ? GROUP BY status
    `, [weekStart.toISOString()]);

    // Payment stats
    const [paymentStats] = await query(`
      SELECT 
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid,
        COUNT(CASE WHEN status IN ('open', 'pending') THEN 1 END) as pending,
        COUNT(CASE WHEN status IN ('failed', 'canceled', 'expired') THEN 1 END) as failed
      FROM payments WHERE created_at >= ?
    `, [weekStart.toISOString()]);

    // Recent orders
    const recentOrders = await query(`
      SELECT o.id, o.order_number, o.customer_name, o.customer_phone, 
             o.delivery_type, o.total, o.status, o.created_at,
             p.status as payment_status
      FROM orders o
      LEFT JOIN payments p ON o.id = p.order_id
      ORDER BY o.created_at DESC
      LIMIT 15
    `);

    // Hourly distribution (for chart)
    const hourlyOrders = await query(`
      SELECT HOUR(created_at) as hour, COUNT(*) as orders, SUM(total) as revenue
      FROM orders 
      WHERE created_at >= ? AND status != 'cancelled'
      GROUP BY HOUR(created_at)
      ORDER BY hour
    `, [today.toISOString()]);

    // Popular products today
    const popularProducts = await query(`
      SELECT oi.product_name, SUM(oi.quantity) as qty, SUM(oi.subtotal) as revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.created_at >= ? AND o.status != 'cancelled'
      GROUP BY oi.product_name
      ORDER BY qty DESC
      LIMIT 10
    `, [weekStart.toISOString()]);

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
    const lastCheck = req.query.since ? new Date(req.query.since) : new Date(Date.now() - 60000);
    
    // New orders since last check
    const newOrders = await query(`
      SELECT o.id, o.order_number, o.customer_name, o.total, o.status, o.created_at,
             o.delivery_type
      FROM orders o
      WHERE o.created_at > ?
      ORDER BY o.created_at DESC
    `, [lastCheck.toISOString()]);

    // Updated orders since last check
    const updatedOrders = await query(`
      SELECT o.id, o.order_number, o.status, o.updated_at
      FROM orders o
      WHERE o.updated_at > ? AND o.created_at <= ?
    `, [lastCheck.toISOString(), lastCheck.toISOString()]);

    // Pending count
    const [{ pending }] = await query(`
      SELECT COUNT(*) as pending FROM orders WHERE status IN ('pending', 'paid')
    `);

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
      WHERE 1=1
    `;
    const params = [];

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
    const [order] = await query(`
      SELECT o.*, 
             a.street, a.house_number, a.bus, a.postal_code, a.city, a.country,
             p.id as payment_id, p.mollie_payment_id, p.amount as payment_amount,
             p.status as payment_status, p.method as payment_method, p.paid_at, p.metadata as payment_metadata
      FROM orders o
      LEFT JOIN addresses a ON o.address_id = a.id
      LEFT JOIN payments p ON o.id = p.order_id
      WHERE o.id = ?
    `, [req.params.id]);

    if (!order) {
      throw new AppError('Bestelling niet gevonden', 404);
    }

    // Get order items
    const items = await query(`
      SELECT oi.*, pr.image_url, pr.allergens
      FROM order_items oi
      LEFT JOIN products pr ON oi.product_id = pr.id
      WHERE oi.order_id = ?
    `, [order.id]);

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

    res.json({
      success: true,
      data: {
        ...order,
        items,
        statusHistory
      }
    });
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
    const { status, notes } = req.body;
    const validStatuses = ['pending', 'paid', 'preparing', 'ready', 'delivering', 'delivered', 'cancelled'];

    if (!validStatuses.includes(status)) {
      throw new AppError('Ongeldige status', 400);
    }

    // Get current order
    const [order] = await query('SELECT id, status FROM orders WHERE id = ?', [req.params.id]);
    if (!order) {
      throw new AppError('Bestelling niet gevonden', 404);
    }

    const previousStatus = order.status;

    // Update order
    await query('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);

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
 * Mark order as printed
 */
router.post('/orders/:id/print', requirePermission('view_orders'), async (req, res, next) => {
  try {
    await query(`
      UPDATE orders SET print_count = print_count + 1, printed_at = NOW() WHERE id = ?
    `, [req.params.id]);

    await logAction(req.user.id, 'print_order', 'order', req.params.id, {}, req);

    res.json({ success: true, message: 'Order gemarkeerd als geprint' });
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
    const { category, available, search } = req.query;
    
    let sql = `
      SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

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
    const { name, category_id, description, price, image_url, allergens, is_available, is_featured, sort_order } = req.body;

    if (!name || !category_id || price === undefined) {
      throw new AppError('Naam, categorie en prijs zijn verplicht', 400);
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();

    const result = await query(`
      INSERT INTO products (category_id, name, slug, description, price, image_url, allergens, is_available, is_featured, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      category_id, name, slug, description || null, price, image_url || null,
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
    const { name, category_id, description, price, image_url, allergens, is_available, is_featured, sort_order } = req.body;

    const [existing] = await query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!existing) {
      throw new AppError('Product niet gevonden', 404);
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
      WHERE id = ?
    `, [
      name, category_id, description, price, image_url,
      allergens ? JSON.stringify(allergens) : null,
      is_available !== undefined ? (is_available ? 1 : 0) : null,
      is_featured !== undefined ? (is_featured ? 1 : 0) : null,
      sort_order, req.params.id
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
    const [existing] = await query('SELECT name FROM products WHERE id = ?', [req.params.id]);
    if (!existing) {
      throw new AppError('Product niet gevonden', 404);
    }

    await query('DELETE FROM products WHERE id = ?', [req.params.id]);
    await logAction(req.user.id, 'delete_product', 'product', req.params.id, { name: existing.name }, req);

    res.json({ success: true, message: 'Product verwijderd' });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/admin/products/:id/toggle
 * Toggle product availability
 */
router.patch('/products/:id/toggle', isAdmin, async (req, res, next) => {
  try {
    const [product] = await query('SELECT id, is_available FROM products WHERE id = ?', [req.params.id]);
    if (!product) {
      throw new AppError('Product niet gevonden', 404);
    }

    const newStatus = !product.is_available;
    await query('UPDATE products SET is_available = ? WHERE id = ?', [newStatus ? 1 : 0, req.params.id]);
    
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
    const categories = await query(`
      SELECT c.*, COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      GROUP BY c.id
      ORDER BY c.sort_order, c.name
    `);

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
    const { name, description, image_url, sort_order, is_active } = req.body;
    if (!name) throw new AppError('Naam is verplicht', 400);

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const result = await query(`
      INSERT INTO categories (name, slug, description, image_url, sort_order, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [name, slug, description || null, image_url || null, sort_order || 0, is_active !== false ? 1 : 0]);

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
    const { name, description, image_url, sort_order, is_active } = req.body;

    await query(`
      UPDATE categories SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        image_url = COALESCE(?, image_url),
        sort_order = COALESCE(?, sort_order),
        is_active = COALESCE(?, is_active)
      WHERE id = ?
    `, [name, description, image_url, sort_order, is_active !== undefined ? (is_active ? 1 : 0) : null, req.params.id]);

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
    const [{ count }] = await query('SELECT COUNT(*) as count FROM products WHERE category_id = ?', [req.params.id]);
    if (count > 0) {
      throw new AppError('Kan niet verwijderen: categorie bevat nog producten', 400);
    }

    await query('DELETE FROM categories WHERE id = ?', [req.params.id]);
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
    const { status, date_from, date_to, page = 1, limit = 50 } = req.query;
    
    let sql = `
      SELECT p.*, o.order_number, o.customer_name, o.customer_email
      FROM payments p
      JOIN orders o ON p.order_id = o.id
      WHERE 1=1
    `;
    const params = [];

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
 */
router.get('/settings', async (req, res, next) => {
  try {
    const settings = await query('SELECT * FROM settings ORDER BY setting_key');
    
    const parsed = settings.map(s => ({
      ...s,
      setting_value: s.setting_type === 'json' 
        ? JSON.parse(s.setting_value || '{}')
        : s.setting_type === 'number'
          ? parseFloat(s.setting_value)
          : s.setting_type === 'boolean'
            ? s.setting_value === 'true'
            : s.setting_value
    }));

    res.json({ success: true, data: parsed });
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

    const [setting] = await query('SELECT * FROM settings WHERE setting_key = ?', [key]);
    if (!setting) {
      throw new AppError('Instelling niet gevonden', 404);
    }

    let stringValue;
    switch (setting.setting_type) {
      case 'json': stringValue = JSON.stringify(value); break;
      case 'boolean': stringValue = value ? 'true' : 'false'; break;
      default: stringValue = String(value);
    }

    await query('UPDATE settings SET setting_value = ? WHERE setting_key = ?', [stringValue, key]);
    await logAction(req.user.id, 'update_setting', 'setting', null, { key, value: stringValue }, req);

    res.json({ success: true, message: 'Instelling opgeslagen' });
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
    const permissions = role === 'staff' ? '["view_orders", "update_order_status", "view_products"]' : null;

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
    
    let sql = `
      SELECT l.*, u.name as user_name, u.email as user_email
      FROM admin_logs l
      LEFT JOIN users u ON l.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

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
    const notifications = await query(`
      SELECT * FROM notifications 
      WHERE user_id = ? OR user_id IS NULL
      ORDER BY created_at DESC
      LIMIT 50
    `, [req.user.id]);

    const [{ unread }] = await query(`
      SELECT COUNT(*) as unread FROM notifications 
      WHERE (user_id = ? OR user_id IS NULL) AND is_read = 0
    `, [req.user.id]);

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
    await query(`
      UPDATE notifications SET is_read = 1 
      WHERE (user_id = ? OR user_id IS NULL) AND is_read = 0
    `, [req.user.id]);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
