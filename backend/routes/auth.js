/**
 * Authentication Routes
 */

import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { query } from '../config/database.js';
import { validateLogin, handleValidation } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: 'Te veel loginpogingen. Probeer later opnieuw.' } }
});

/**
 * POST /api/auth/login
 * Admin login
 */
router.post('/login', loginLimiter, validateLogin, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user
    const users = await query(
      'SELECT * FROM users WHERE email = ? AND is_active = 1',
      [email]
    );

    if (users.length === 0) {
      logger.warn('Failed login', { email, reason: 'unknown_user' });
      throw new AppError('Ongeldige inloggegevens', 401);
    }

    const user = users[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      logger.warn('Failed login', { email, reason: 'bad_password', userId: user.id });
      throw new AppError('Ongeldige inloggegevens', 401);
    }

    // Update last login
    await query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    let permissions = user.permissions;
    if (permissions && typeof permissions === 'string') {
      try { permissions = JSON.parse(permissions); } catch { permissions = []; }
    }
    if (!Array.isArray(permissions)) permissions = [];

    // Resolve primary company membership
    const preferredCompany = Number(req.body?.company_id || user.default_company_id || 0);
    let membership = null;
    if (preferredCompany) {
      [membership] = await query(
        `SELECT * FROM company_memberships WHERE user_id = ? AND company_id = ? AND is_active = 1 LIMIT 1`,
        [user.id, preferredCompany]
      );
    }
    if (!membership) {
      [membership] = await query(
        `SELECT * FROM company_memberships WHERE user_id = ? AND is_active = 1 ORDER BY id ASC LIMIT 1`,
        [user.id]
      );
    }
    if (!membership) {
      // Bootstrap membership for legacy users
      const companyId = user.default_company_id || 1;
      await query(
        `INSERT INTO company_memberships (company_id, user_id, role, permissions, is_active)
         VALUES (?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE role = VALUES(role)`,
        [companyId, user.id, user.role, JSON.stringify(permissions.length ? permissions : ['*'])]
      );
      [membership] = await query(
        `SELECT * FROM company_memberships WHERE user_id = ? AND company_id = ? LIMIT 1`,
        [user.id, companyId]
      );
    }

    const companyId = membership.company_id;
    let membershipPermissions = membership.permissions;
    if (membershipPermissions && typeof membershipPermissions === 'string') {
      try { membershipPermissions = JSON.parse(membershipPermissions); } catch { membershipPermissions = permissions; }
    }
    if (Array.isArray(membershipPermissions) && membershipPermissions.includes('*')) {
      membershipPermissions = permissions.length
        ? permissions
        : ['view_orders', 'update_order_status', 'view_products', 'toggle_availability'];
    }

    await query('UPDATE users SET default_company_id = ? WHERE id = ?', [companyId, user.id]);

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: membership.role || user.role, company_id: companyId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    logger.info('Login success', { userId: user.id, role: membership.role, companyId });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: membership.role || user.role,
          permissions: membershipPermissions || permissions,
          company_id: companyId
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 * Get current user
 */
router.get('/me', authenticate, (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user
    }
  });
});

/**
 * POST /api/auth/change-password
 * Change password
 */
router.post('/change-password', authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new AppError('Huidig en nieuw wachtwoord zijn verplicht', 400);
    }

    if (newPassword.length < 8) {
      throw new AppError('Nieuw wachtwoord moet minimaal 8 tekens zijn', 400);
    }

    // Get user with password
    const users = await query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    
    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, users[0].password);
    
    if (!isValid) {
      throw new AppError('Huidig wachtwoord is onjuist', 401);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);

    res.json({
      success: true,
      message: 'Wachtwoord succesvol gewijzigd'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
