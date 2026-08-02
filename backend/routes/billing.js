/**
 * Billing stubs (billing-ready, no full provider UI yet)
 *
 * Hook for later Stripe/Mollie Customer Portal:
 * - Store provider customer id on companies.billing_customer_id
 * - Set BILLING_PORTAL_URL or STRIPE_SECRET_KEY to enable portal-session
 * - On subscription webhook: update companies.plan + billing_status
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { attachTenant } from '../middleware/tenant.js';
import { AppError } from '../middleware/errorHandler.js';
import { query } from '../config/database.js';

const router = express.Router();

router.use(authenticate, attachTenant);

/**
 * GET /api/billing/status
 */
router.get('/status', async (req, res, next) => {
  try {
    const [company] = await query(
      `SELECT id, name, plan, billing_status, billing_customer_id, trial_ends_at, onboarded_at
       FROM companies WHERE id = ?`,
      [req.companyId]
    );
    res.json({ success: true, data: company });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/billing/portal-session
 * Stub until Stripe/Mollie Customer Portal is wired
 */
router.post('/portal-session', async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') throw new AppError('Alleen admins', 403);
    if (!process.env.BILLING_PORTAL_URL && !process.env.STRIPE_SECRET_KEY) {
      return res.status(501).json({
        success: false,
        error: {
          message: 'Billing portal nog niet geconfigureerd. Zet BILLING_PORTAL_URL of STRIPE_SECRET_KEY.',
          code: 'BILLING_NOT_CONFIGURED'
        }
      });
    }
    const url = process.env.BILLING_PORTAL_URL || null;
    res.json({
      success: true,
      data: { url },
      message: 'Portal sessie (stub)'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
