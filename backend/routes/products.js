/**
 * Products Routes
 */

import express from 'express';
import { query } from '../config/database.js';
import { authenticate, isAdmin } from '../middleware/auth.js';
import { validateProduct, validateId } from '../middleware/validate.js';
import { AppError } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * GET /api/products
 * Get all products (public)
 */
router.get('/', async (req, res, next) => {
  try {
    const { category, available, featured, search } = req.query;
    
    let sql = `
      SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    // Filter by category
    if (category) {
      sql += ' AND (c.slug = ? OR c.id = ?)';
      params.push(category, category);
    }

    // Filter by availability (default: only available)
    if (available !== 'all') {
      sql += ' AND p.is_available = 1';
    }

    // Filter by featured
    if (featured === 'true') {
      sql += ' AND p.is_featured = 1';
    }

    // Search
    if (search) {
      sql += ' AND (p.name LIKE ? OR p.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // Only active categories
    sql += ' AND c.is_active = 1';

    // Order
    sql += ' ORDER BY c.sort_order, p.sort_order, p.name';

    const products = await query(sql, params);

    // Parse allergens JSON
    products.forEach(p => {
      if (typeof p.allergens === 'string') {
        p.allergens = JSON.parse(p.allergens);
      }
    });

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/products/grouped
 * Get products grouped by category (public)
 */
router.get('/grouped', async (req, res, next) => {
  try {
    // Get categories
    const categories = await query(`
      SELECT * FROM categories 
      WHERE is_active = 1 
      ORDER BY sort_order, name
    `);

    // Get products
    const products = await query(`
      SELECT p.*, c.slug as category_slug
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE p.is_available = 1 AND c.is_active = 1
      ORDER BY p.sort_order, p.name
    `);

    // Parse allergens
    products.forEach(p => {
      if (typeof p.allergens === 'string') {
        p.allergens = JSON.parse(p.allergens);
      }
    });

    // Group products by category
    const grouped = categories.map(cat => ({
      ...cat,
      products: products.filter(p => p.category_slug === cat.slug)
    }));

    res.json({
      success: true,
      data: grouped
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/products/:id
 * Get single product (public)
 */
router.get('/:id', validateId, async (req, res, next) => {
  try {
    const products = await query(`
      SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `, [req.params.id]);

    if (products.length === 0) {
      throw new AppError('Product niet gevonden', 404);
    }

    const product = products[0];
    if (typeof product.allergens === 'string') {
      product.allergens = JSON.parse(product.allergens);
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/products (Admin only)
 * Create new product
 */
router.post('/', authenticate, isAdmin, validateProduct, async (req, res, next) => {
  try {
    const { name, category_id, description, price, image_url, allergens, is_available, is_featured } = req.body;

    // Create slug
    const slug = name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Date.now();

    const result = await query(`
      INSERT INTO products (category_id, name, slug, description, price, image_url, allergens, is_available, is_featured)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      category_id,
      name,
      slug,
      description || null,
      price,
      image_url || null,
      JSON.stringify(allergens || []),
      is_available !== false,
      is_featured === true
    ]);

    res.status(201).json({
      success: true,
      data: { id: result.insertId },
      message: 'Product succesvol aangemaakt'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/products/:id (Admin only)
 * Update product
 */
router.put('/:id', authenticate, isAdmin, validateId, async (req, res, next) => {
  try {
    const { name, category_id, description, price, image_url, allergens, is_available, is_featured, sort_order } = req.body;

    // Check if product exists
    const existing = await query('SELECT id FROM products WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      throw new AppError('Product niet gevonden', 404);
    }

    await query(`
      UPDATE products SET
        category_id = COALESCE(?, category_id),
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        price = COALESCE(?, price),
        image_url = COALESCE(?, image_url),
        allergens = COALESCE(?, allergens),
        is_available = COALESCE(?, is_available),
        is_featured = COALESCE(?, is_featured),
        sort_order = COALESCE(?, sort_order)
      WHERE id = ?
    `, [
      category_id,
      name,
      description,
      price,
      image_url,
      allergens ? JSON.stringify(allergens) : null,
      is_available,
      is_featured,
      sort_order,
      req.params.id
    ]);

    res.json({
      success: true,
      message: 'Product succesvol bijgewerkt'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/products/:id (Admin only)
 * Delete product
 */
router.delete('/:id', authenticate, isAdmin, validateId, async (req, res, next) => {
  try {
    const result = await query('DELETE FROM products WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      throw new AppError('Product niet gevonden', 404);
    }

    res.json({
      success: true,
      message: 'Product succesvol verwijderd'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
