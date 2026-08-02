/**
 * Companies: register / me / onboarding
 */

import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { attachTenant, requireActiveSubscription } from '../middleware/tenant.js';
import { AppError } from '../middleware/errorHandler.js';
import { seedDefaultCompanySettings } from '../utils/companySettings.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { success: false, error: { message: 'Te veel registraties, probeer later opnieuw.' } }
});

function slugify(name) {
  return String(name || 'company')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || `company-${Date.now()}`;
}

async function uniqueSlug(base) {
  let slug = slugify(base);
  let i = 0;
  while (true) {
    const candidate = i === 0 ? slug : `${slug}-${i}`;
    const [row] = await query(`SELECT id FROM companies WHERE slug = ? LIMIT 1`, [candidate]);
    if (!row) return candidate;
    i += 1;
  }
}

/**
 * POST /api/companies/register
 */
router.post('/register', registerLimiter, async (req, res, next) => {
  try {
    const { company_name, email, password, name } = req.body || {};
    if (!company_name || !email || !password || !name) {
      throw new AppError('company_name, name, email en password zijn verplicht', 400);
    }
    if (String(password).length < 8) {
      throw new AppError('Wachtwoord moet minimaal 8 tekens zijn', 400);
    }

    const [existingUser] = await query(`SELECT id FROM users WHERE email = ? LIMIT 1`, [email]);
    if (existingUser) throw new AppError('E-mailadres is al in gebruik', 409);

    const slug = await uniqueSlug(company_name);
    const hashed = await bcrypt.hash(password, 12);

    const userResult = await query(
      `INSERT INTO users (email, password, name, role, permissions, is_active)
       VALUES (?, ?, ?, 'admin', ?, 1)`,
      [email, hashed, name, JSON.stringify(['view_orders', 'update_order_status', 'view_products', 'toggle_availability'])]
    );
    const userId = userResult.insertId;

    const trialEnds = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const companyResult = await query(
      `INSERT INTO companies (name, slug, db_name, is_active, plan, billing_status, trial_ends_at, owner_user_id)
       VALUES (?, ?, ?, 1, 'starter', 'trialing', ?, ?)`,
      [company_name, slug, slug.replace(/-/g, ''), trialEnds, userId]
    );
    const companyId = companyResult.insertId;

    await query(
      `UPDATE users SET default_company_id = ? WHERE id = ?`,
      [companyId, userId]
    );

    await query(
      `INSERT INTO company_memberships (company_id, user_id, role, permissions, is_active)
       VALUES (?, ?, 'admin', ?, 1)`,
      [companyId, userId, JSON.stringify(['*'])]
    );

    await seedDefaultCompanySettings(companyId, {
      restaurant_name: { value: company_name, type: 'string' }
    });

    const token = jwt.sign(
      { id: userId, email, role: 'admin', company_id: companyId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    logger.info('Company registered', { companyId, userId, slug });

    res.status(201).json({
      success: true,
      message: 'Bedrijf aangemaakt. 14 dagen trial actief.',
      data: {
        token,
        company: { id: companyId, name: company_name, slug, plan: 'starter', billing_status: 'trialing' },
        user: { id: userId, email, name, role: 'admin' }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/companies/me
 */
router.get('/me', authenticate, attachTenant, async (req, res) => {
  const [company] = await query(`SELECT * FROM companies WHERE id = ?`, [req.companyId]);
  const memberships = await query(
    `SELECT m.company_id, m.role, c.name, c.slug, c.plan, c.billing_status
     FROM company_memberships m
     JOIN companies c ON c.id = m.company_id
     WHERE m.user_id = ? AND m.is_active = 1`,
    [req.user.id]
  );
  res.json({
    success: true,
    data: {
      company,
      memberships,
      active_company_id: req.companyId
    }
  });
});

/**
 * PATCH /api/companies/me
 */
router.patch('/me', authenticate, attachTenant, requireActiveSubscription, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') throw new AppError('Alleen admins', 403);
    const { name, slug } = req.body || {};
    if (name) {
      await query(`UPDATE companies SET name = ? WHERE id = ?`, [name, req.companyId]);
    }
    if (slug) {
      const clean = slugify(slug);
      const [dup] = await query(`SELECT id FROM companies WHERE slug = ? AND id <> ?`, [clean, req.companyId]);
      if (dup) throw new AppError('Slug bestaat al', 409);
      await query(`UPDATE companies SET slug = ? WHERE id = ?`, [clean, req.companyId]);
    }
    const [company] = await query(`SELECT * FROM companies WHERE id = ?`, [req.companyId]);
    res.json({ success: true, data: company });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/companies/me/complete-onboarding
 */
router.post('/me/complete-onboarding', authenticate, attachTenant, async (req, res, next) => {
  try {
    await query(`UPDATE companies SET onboarded_at = COALESCE(onboarded_at, NOW()) WHERE id = ?`, [req.companyId]);
    const { upsertCompanySetting } = await import('../utils/companySettings.js');
    await upsertCompanySetting(req.companyId, 'onboarding_complete', true, 'boolean');
    res.json({ success: true, message: 'Onboarding afgerond' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/companies/switch
 * Body: { company_id } — returns new JWT for that membership
 */
router.post('/switch', authenticate, async (req, res, next) => {
  try {
    const companyId = Number(req.body?.company_id);
    if (!companyId) throw new AppError('company_id verplicht', 400);
    const [membership] = await query(
      `SELECT m.*, c.name FROM company_memberships m
       JOIN companies c ON c.id = m.company_id
       WHERE m.user_id = ? AND m.company_id = ? AND m.is_active = 1`,
      [req.user.id, companyId]
    );
    if (!membership) throw new AppError('Geen toegang tot dit bedrijf', 403);

    await query(`UPDATE users SET default_company_id = ? WHERE id = ?`, [companyId, req.user.id]);

    const token = jwt.sign(
      { id: req.user.id, email: req.user.email, role: membership.role, company_id: companyId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({
      success: true,
      data: { token, company_id: companyId, company_name: membership.name, role: membership.role }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
