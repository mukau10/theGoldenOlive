/**
 * Categories Routes
 */

import express from 'express';
import { query } from '../config/database.js';
import { authenticate, isAdmin } from '../middleware/auth.js';
import { validateId } from '../middleware/validate.js';
import { AppError } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * GET /api/categories
 * Get all categories (public)
 */
router.get('/', async (req, res, next) => {
  try {
    const { active } = req.query;
    
    let sql = 'SELECT * FROM categories';
    
    // Default: only active categories
    if (active !== 'all') {
      sql += ' WHERE is_active = 1';
    }
    
    sql += ' ORDER BY sort_order, name';
    
    const categories = await query(sql);

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/categories/:id
 * Get single category with products (public)
 */
router.get('/:id', validateId, async (req, res, next) => {
  try {
    const categories = await query(
      'SELECT * FROM categories WHERE id = ?',
      [req.params.id]
    );

    if (categories.length === 0) {
      throw new AppError('Categorie niet gevonden', 404);
    }

    const category = categories[0];

    // Get products in category
    const products = await query(`
      SELECT * FROM products 
      WHERE category_id = ? AND is_available = 1
      ORDER BY sort_order, name
    `, [category.id]);

    // Parse allergens
    products.forEach(p => {
      if (typeof p.allergens === 'string') {
        p.allergens = JSON.parse(p.allergens);
      }
    });

    category.products = products;

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/categories (Admin only)
 * Create new category
 */
router.post('/', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { name, description, image_url, sort_order } = req.body;

    if (!name) {
      throw new AppError('Categorienaam is verplicht', 400);
    }

    // Create slug
    const slug = name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const result = await query(`
      INSERT INTO categories (name, slug, description, image_url, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `, [name, slug, description || null, image_url || null, sort_order || 0]);

    res.status(201).json({
      success: true,
      data: { id: result.insertId },
      message: 'Categorie succesvol aangemaakt'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/categories/:id (Admin only)
 * Update category
 */
router.put('/:id', authenticate, isAdmin, validateId, async (req, res, next) => {
  try {
    const { name, description, image_url, is_active, sort_order } = req.body;

    const existing = await query('SELECT id FROM categories WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      throw new AppError('Categorie niet gevonden', 404);
    }

    await query(`
      UPDATE categories SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        image_url = COALESCE(?, image_url),
        is_active = COALESCE(?, is_active),
        sort_order = COALESCE(?, sort_order)
      WHERE id = ?
    `, [name, description, image_url, is_active, sort_order, req.params.id]);

    res.json({
      success: true,
      message: 'Categorie succesvol bijgewerkt'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/categories/:id (Admin only)
 * Delete category (only if no products)
 */
router.delete('/:id', authenticate, isAdmin, validateId, async (req, res, next) => {
  try {
    // Check for products in category
    const products = await query(
      'SELECT COUNT(*) as count FROM products WHERE category_id = ?',
      [req.params.id]
    );

    if (products[0].count > 0) {
      throw new AppError('Kan categorie niet verwijderen: er zijn nog producten in deze categorie', 400);
    }

    const result = await query('DELETE FROM categories WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      throw new AppError('Categorie niet gevonden', 404);
    }

    res.json({
      success: true,
      message: 'Categorie succesvol verwijderd'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
