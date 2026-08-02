/**
 * Startup security checks / warnings
 */

import { logger } from './logger.js';

const WEAK_JWT_EXACT = new Set([
  'secret',
  'changeme',
  'test',
  'jwt-secret',
  'your-super-secret-jwt-key-change-this-in-production'
]);

const WEAK_JWT_PREFIXES = [
  'your-super-secret',
  'changeme',
  'jwt-secret-'
];

export function assertProductionSecurity() {
  const env = process.env.NODE_ENV || 'development';
  const jwt = String(process.env.JWT_SECRET || '');
  const issues = [];

  if (!jwt || jwt.length < 32) {
    issues.push('JWT_SECRET ontbreekt of is korter dan 32 tekens');
  }

  const lower = jwt.toLowerCase();
  if (WEAK_JWT_EXACT.has(lower) || WEAK_JWT_PREFIXES.some((p) => lower.startsWith(p) || lower.includes(p))) {
    issues.push('JWT_SECRET lijkt een placeholder / zwakke waarde');
  }

  if (env === 'production') {
    if (issues.length) {
      logger.error('Security bootstrap failed in production', { issues });
      throw new Error(`Unsafe production config: ${issues.join('; ')}`);
    }
    if (process.env.ALLOW_INSECURE_WEBHOOKS === 'true') {
      throw new Error('ALLOW_INSECURE_WEBHOOKS mag niet true zijn in production');
    }
  } else if (issues.length) {
    logger.warn('Security warnings (development)', { issues });
  } else {
    logger.info('Security bootstrap OK');
  }
}

/**
 * Webhook signature policy:
 * - Production / default: missing secret => reject
 * - Dev only with ALLOW_INSECURE_WEBHOOKS=true: allow
 */
export function allowUnsignedWebhooks() {
  if (process.env.NODE_ENV === 'production') return false;
  return process.env.ALLOW_INSECURE_WEBHOOKS === 'true';
}
