/**
 * Tenant resolution middleware
 */

import { query } from '../config/database.js';
import { AppError } from './errorHandler.js';

export function getPublicCompanyId() {
  return Number(process.env.PUBLIC_COMPANY_ID || 1);
}

/**
 * After authenticate: attach req.companyId from JWT / X-Company-Id membership
 */
export async function attachTenant(req, res, next) {
  try {
    if (!req.user) return next(new AppError('Niet geautoriseerd', 401));

    const headerCompany = req.headers['x-company-id']
      ? Number(req.headers['x-company-id'])
      : null;
    const jwtCompany = req.user.company_id ? Number(req.user.company_id) : null;
    const preferred = headerCompany || jwtCompany || req.user.default_company_id || getPublicCompanyId();

    const [membership] = await query(
      `SELECT m.*, c.name as company_name, c.slug as company_slug, c.plan, c.billing_status, c.is_active as company_active
       FROM company_memberships m
       JOIN companies c ON c.id = m.company_id
       WHERE m.user_id = ? AND m.company_id = ? AND m.is_active = 1 AND c.is_active = 1
       LIMIT 1`,
      [req.user.id, preferred]
    );

    if (!membership) {
      // fallback: first active membership
      const [fallback] = await query(
        `SELECT m.*, c.name as company_name, c.slug as company_slug, c.plan, c.billing_status, c.is_active as company_active
         FROM company_memberships m
         JOIN companies c ON c.id = m.company_id
         WHERE m.user_id = ? AND m.is_active = 1 AND c.is_active = 1
         ORDER BY m.id ASC LIMIT 1`,
        [req.user.id]
      );
      if (!fallback) return next(new AppError('Geen actieve company membership', 403));
      req.companyId = fallback.company_id;
      req.membership = fallback;
      req.company = {
        id: fallback.company_id,
        name: fallback.company_name,
        slug: fallback.company_slug,
        plan: fallback.plan,
        billing_status: fallback.billing_status
      };
      // override role/permissions from membership
      req.user.role = fallback.role;
      if (fallback.permissions) {
        req.user.permissions = typeof fallback.permissions === 'string'
          ? JSON.parse(fallback.permissions)
          : fallback.permissions;
      }
      return next();
    }

    req.companyId = membership.company_id;
    req.membership = membership;
    req.company = {
      id: membership.company_id,
      name: membership.company_name,
      slug: membership.company_slug,
      plan: membership.plan,
      billing_status: membership.billing_status
    };
    req.user.role = membership.role;
    if (membership.permissions) {
      req.user.permissions = typeof membership.permissions === 'string'
        ? JSON.parse(membership.permissions)
        : membership.permissions;
    }
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Block write operations when subscription is past_due/canceled
 */
export function requireActiveSubscription(req, res, next) {
  const status = req.company?.billing_status || 'active';
  if (status === 'past_due' || status === 'canceled') {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    return next(new AppError('Abonnement inactief. Vernieuw je plan om wijzigingen te maken.', 402));
  }
  next();
}

export function companyIdFrom(req) {
  return Number(req.companyId || getPublicCompanyId());
}
