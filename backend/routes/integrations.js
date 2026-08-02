/**
 * Platform integration webhooks + admin helpers
 * Uber Eats · Takeaway.com · Deliveroo
 */

import express from 'express';
import { authenticate, isAdmin, requirePermission } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { query } from '../config/database.js';
import { handleUberWebhook, acceptUberOrder, denyUberOrder } from '../services/integrations/uberEats.js';
import { handleDeliverooWebhook, acceptDeliverooOrder } from '../services/integrations/deliveroo.js';
import { handleTakeawayWebhook, acceptTakeawayOrder, rejectTakeawayOrder } from '../services/integrations/takeaway.js';
import {
  ingestExternalOrder,
  getIntegrationSettings,
  platformLabel,
  logIntegrationEvent,
  updateExternalOrderStatus,
  PLATFORMS
} from '../services/integrations/ingest.js';
import { attachTenant, companyIdFrom, getPublicCompanyId } from '../middleware/tenant.js';
import { getPlatformReadiness, assertPlatformReadyOrThrow } from '../services/integrations/readiness.js';

const router = express.Router();
const requireViewOrders = requirePermission('view_orders');

function getRawBody(req) {
  if (req.rawBody) return req.rawBody;
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  return typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
}

function getHeadersLower(req) {
  const out = {};
  Object.entries(req.headers || {}).forEach(([k, v]) => {
    out[String(k).toLowerCase()] = Array.isArray(v) ? v[0] : v;
  });
  return out;
}

/**
 * POST /api/integrations/uber-eats/webhook
 */
router.post('/uber-eats/webhook', async (req, res) => {
  try {
    const publicCid = getPublicCompanyId();
    await assertPlatformReadyOrThrow(publicCid, 'uber_eats');

    const rawBody = getRawBody(req);
    const payload = typeof req.body === 'object' && !Buffer.isBuffer(req.body)
      ? req.body
      : JSON.parse(rawBody || '{}');
    const signature = req.headers['x-uber-signature'];

    // Uber requires fast 200 with empty body
    const result = await handleUberWebhook({ payload, rawBody, signature });
    res.status(200).send('');
    return result;
  } catch (error) {
    console.error('Uber webhook error:', error);
    const code = error.statusCode || 500;
    if (code === 401) return res.status(401).send('');
    // Still 200 for transient processing errors after signature OK to avoid endless retries storms
    // when we intentionally ignore; for signature failures return 401 above.
    return res.status(code >= 500 ? 500 : code).json({ error: error.message });
  }
});

/**
 * POST /api/integrations/deliveroo/webhook
 */
router.post('/deliveroo/webhook', async (req, res) => {
  try {
    const publicCid = getPublicCompanyId();
    await assertPlatformReadyOrThrow(publicCid, 'deliveroo');

    const rawBody = getRawBody(req);
    const payload = typeof req.body === 'object' && !Buffer.isBuffer(req.body)
      ? req.body
      : JSON.parse(rawBody || '{}');
    const headers = getHeadersLower(req);

    await handleDeliverooWebhook({ payload, rawBody, headers });
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Deliveroo webhook error:', error);
    const code = error.statusCode || 500;
    res.status(code).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/integrations/takeaway/webhook
 * Also used by Just Eat Takeaway.com (BE)
 */
router.post('/takeaway/webhook', async (req, res) => {
  try {
    const publicCid = getPublicCompanyId();
    await assertPlatformReadyOrThrow(publicCid, 'takeaway');

    const rawBody = getRawBody(req);
    const payload = typeof req.body === 'object' && !Buffer.isBuffer(req.body)
      ? req.body
      : JSON.parse(rawBody || '{}');
    const signature = req.headers['x-jet-signature']
      || req.headers['x-takeaway-signature']
      || req.headers['x-justeat-signature'];
    const callbackUrl = req.query.callback ? String(req.query.callback) : null;

    const result = await handleTakeawayWebhook({ payload, rawBody, signature, callbackUrl });
    if (result.async) {
      return res.status(202).json({ success: true });
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Takeaway webhook error:', error);
    const code = error.statusCode || 500;
    res.status(code).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/integrations/readiness
 * Platform certification / config readiness for current tenant
 */
router.get('/readiness', authenticate, attachTenant, async (req, res, next) => {
  try {
    const cid = companyIdFrom(req);
    const platforms = await getPlatformReadiness(cid);
    res.json({ success: true, data: { company_id: cid, platforms } });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/integrations/status
 * Public-ish health for configured platforms (no secrets)
 */
router.get('/status', authenticate, attachTenant, async (req, res, next) => {
  try {
    const cid = companyIdFrom(req);
    const uber = await getIntegrationSettings('uber_eats_', cid);
    const takeaway = await getIntegrationSettings('takeaway_', cid);
    const deliveroo = await getIntegrationSettings('deliveroo_', cid);

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    res.json({
      success: true,
      data: {
        platforms: {
          uber_eats: {
            enabled: Boolean(uber.uber_eats_enabled),
            configured: Boolean(uber.uber_eats_client_id && uber.uber_eats_client_secret),
            auto_accept: Boolean(uber.uber_eats_auto_accept),
            webhook_url: `${baseUrl}/api/integrations/uber-eats/webhook`
          },
          takeaway: {
            enabled: Boolean(takeaway.takeaway_enabled),
            configured: Boolean(takeaway.takeaway_api_key),
            auto_accept: Boolean(takeaway.takeaway_auto_accept),
            webhook_url: `${baseUrl}/api/integrations/takeaway/webhook`
          },
          deliveroo: {
            enabled: Boolean(deliveroo.deliveroo_enabled),
            configured: Boolean(deliveroo.deliveroo_client_id && deliveroo.deliveroo_client_secret),
            auto_accept: Boolean(deliveroo.deliveroo_auto_accept),
            webhook_url: `${baseUrl}/api/integrations/deliveroo/webhook`
          }
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/integrations/events
 */
router.get('/events', authenticate, attachTenant, isAdmin, async (req, res, next) => {
  try {
    const cid = companyIdFrom(req);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '50', 10) || 50, 1), 200);
    const platform = req.query.platform || null;
    let sql = 'SELECT * FROM integration_events WHERE company_id = ?';
    const params = [cid];
    if (platform) {
      sql += ' AND platform = ?';
      params.push(platform);
    }
    // LIMIT must be inlined — mysql2 prepared statements reject bound LIMIT params
    sql += ` ORDER BY created_at DESC LIMIT ${limit}`;
    const events = await query(sql, params);
    events.forEach((e) => {
      if (typeof e.payload === 'string') {
        try { e.payload = JSON.parse(e.payload); } catch { /* ignore */ }
      }
    });
    res.json({ success: true, data: events });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/integrations/test-order
 * Simulate an incoming platform order (admin only)
 */
router.post('/test-order', authenticate, attachTenant, isAdmin, async (req, res, next) => {
  try {
    const cid = companyIdFrom(req);
    const source = req.body?.source || 'uber_eats';
    if (!PLATFORMS[source]) throw new AppError('Ongeldig platform', 400);

    const externalId = req.body?.external_order_id || `TEST-${Date.now()}`;
    const result = await ingestExternalOrder({
      company_id: cid,
      source,
      external_order_id: externalId,
      already_accepted: true,
      customer_name: req.body?.customer_name || `Test ${platformLabel(source)}`,
      customer_phone: req.body?.customer_phone || '+32000000000',
      customer_email: req.body?.customer_email || 'test@example.com',
      delivery_type: req.body?.delivery_type || 'delivery',
      address: req.body?.address || {
        street: 'Vlaamsekaai',
        house_number: '65',
        postal_code: '2000',
        city: 'Antwerpen'
      },
      items: req.body?.items || [
        { name: 'Test item', quantity: 1, price: 12.5 }
      ],
      notes: `Testbestelling via ${platformLabel(source)}`,
      raw: { test: true, at: new Date().toISOString() }
    });

    res.status(201).json({ success: true, data: result, message: 'Testbestelling aangemaakt' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/integrations/orders/:id/accept
 * Accept pending external order on the platform + mark paid locally
 */
router.post('/orders/:id/accept', authenticate, attachTenant, requireViewOrders, async (req, res, next) => {
  try {
    const cid = companyIdFrom(req);
    const [order] = await query('SELECT * FROM orders WHERE id = ? AND company_id = ?', [req.params.id, cid]);
    if (!order) throw new AppError('Bestelling niet gevonden', 404);
    if (!order.source || order.source === 'website') {
      throw new AppError('Dit is geen externe platformbestelling', 400);
    }

    if (order.source === 'uber_eats') {
      const settings = await getIntegrationSettings('uber_eats_', cid);
      await acceptUberOrder(order.external_order_id, settings);
    } else if (order.source === 'deliveroo') {
      const settings = await getIntegrationSettings('deliveroo_', cid);
      await acceptDeliverooOrder(order.external_order_id, settings);
    } else if (order.source === 'takeaway') {
      const settings = await getIntegrationSettings('takeaway_', cid);
      await acceptTakeawayOrder(order.external_order_id, settings);
    }

    await updateExternalOrderStatus(order.id, 'paid', 'accepted');
    await logIntegrationEvent({
      company_id: cid,
      platform: order.source,
      event_type: 'manual_accept',
      external_order_id: order.external_order_id,
      status: 'success'
    });

    res.json({ success: true, message: 'Bestelling geaccepteerd op platform' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/integrations/orders/:id/reject
 */
router.post('/orders/:id/reject', authenticate, attachTenant, requireViewOrders, async (req, res, next) => {
  try {
    const cid = companyIdFrom(req);
    const [order] = await query('SELECT * FROM orders WHERE id = ? AND company_id = ?', [req.params.id, cid]);
    if (!order) throw new AppError('Bestelling niet gevonden', 404);
    if (!order.source || order.source === 'website') {
      throw new AppError('Dit is geen externe platformbestelling', 400);
    }

    const reason = req.body?.reason || 'Store unavailable';

    if (order.source === 'uber_eats') {
      const settings = await getIntegrationSettings('uber_eats_', cid);
      await denyUberOrder(order.external_order_id, settings, reason);
    } else if (order.source === 'takeaway') {
      const settings = await getIntegrationSettings('takeaway_', cid);
      await rejectTakeawayOrder(order.external_order_id, settings, reason);
    } else if (order.source === 'deliveroo') {
      // Deliveroo reject via status update when supported
      const settings = await getIntegrationSettings('deliveroo_', cid);
      try {
        const base = String(settings.deliveroo_base_url || 'https://api.deliveroo.com').replace(/\/$/, '');
        // best-effort; acceptDeliverooOrder path inverted
        await fetch(`${base}/order/v1/orders/${order.external_order_id}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'rejected', reason })
        });
      } catch {
        // ignore network reject failures; still cancel locally
      }
    }

    await updateExternalOrderStatus(order.id, 'cancelled', 'rejected');
    await logIntegrationEvent({
      company_id: cid,
      platform: order.source,
      event_type: 'manual_reject',
      external_order_id: order.external_order_id,
      status: 'success',
      payload: { reason }
    });

    res.json({ success: true, message: 'Bestelling geweigerd' });
  } catch (error) {
    next(error);
  }
});

export default router;
