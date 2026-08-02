/**
 * Uber Eats Marketplace order integration
 * Docs: https://developer.uber.com/docs/eats
 */

import crypto from 'crypto';
import { getIntegrationSettings, ingestExternalOrder, logIntegrationEvent } from './ingest.js';
import { allowUnsignedWebhooks } from '../../utils/securityBootstrap.js';

let cachedToken = { accessToken: null, expiresAt: 0 };

function timingSafeEqualHex(a, b) {
  const aa = Buffer.from(String(a || ''), 'utf8');
  const bb = Buffer.from(String(b || ''), 'utf8');
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

export function verifyUberSignature(rawBody, signatureHeader, secret) {
  if (!secret) return allowUnsignedWebhooks();
  if (!signatureHeader) return false;
  const digest = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return timingSafeEqualHex(digest.toLowerCase(), String(signatureHeader).toLowerCase());
}

async function getUberAccessToken(settings) {
  if (cachedToken.accessToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.accessToken;
  }

  const clientId = settings.uber_eats_client_id;
  const clientSecret = settings.uber_eats_client_secret;
  if (!clientId || !clientSecret) {
    throw new Error('Uber Eats client_id/client_secret ontbreken');
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'client_credentials',
    scope: 'eats.order eats.store orders.notification'
  });

  const resp = await fetch('https://login.uber.com/oauth/v2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error_description || data.error || 'Uber OAuth mislukt');
  }

  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (Number(data.expires_in || 3600) * 1000)
  };
  return cachedToken.accessToken;
}

async function uberFetch(pathOrUrl, settings, options = {}) {
  const token = await getUberAccessToken(settings);
  const url = pathOrUrl.startsWith('http') ? pathOrUrl : `https://api.uber.com${pathOrUrl}`;
  const resp = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const text = await resp.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!resp.ok) {
    throw new Error(data?.message || data?.error || `Uber API ${resp.status}`);
  }
  return data;
}

function mapUberOrder(order) {
  const cart = order?.cart || order?.carts?.[0] || {};
  const itemsRaw = cart.items || order.items || [];
  const items = itemsRaw.map((it) => ({
    name: it.title || it.name || 'Item',
    quantity: Number(it.quantity || 1),
    price: Number(it.price?.amount ?? it.price ?? 0) / (it.price?.amount != null ? 100 : 1),
    notes: it.special_instructions || it.customer_request || null,
    product_id: null
  }));

  const eater = order.eater || order.customer || {};
  const delivery = order.delivery || order.eats_delivery || {};
  const address = delivery.location || eater.delivery?.location || order.delivery_address || null;

  const isPickup = String(order.type || order.fulfillment_type || '').toLowerCase().includes('pickup')
    || String(delivery.type || '').toLowerCase() === 'pickup';

  const totalCents = order.payment?.charges?.total?.amount
    ?? order.order_total?.amount
    ?? null;
  const total = totalCents != null
    ? Number(totalCents) / 100
    : items.reduce((s, i) => s + i.price * i.quantity, 0);

  return {
    source: 'uber_eats',
    external_order_id: order.id || order.order_id,
    external_status: order.current_state || order.state || 'created',
    customer_name: [eater.first_name, eater.last_name].filter(Boolean).join(' ') || eater.name || 'Uber Eats klant',
    customer_email: eater.email || null,
    customer_phone: eater.phone?.number || eater.phone || delivery.phone || '-',
    delivery_type: isPickup ? 'pickup' : 'delivery',
    address: address ? {
      street: address.street_address?.[0] || address.street || address.address1 || '',
      house_number: address.street_address?.[1] || address.unit_number || '-',
      bus: address.unit_number || null,
      postal_code: address.postal_code || address.zipcode || '',
      city: address.city || ''
    } : null,
    items,
    total,
    notes: order.special_instructions || cart.special_instructions || null,
    raw: order
  };
}

export async function acceptUberOrder(externalOrderId, settings) {
  return uberFetch(`/v1/eats/orders/${externalOrderId}/accept_pos_order`, settings, {
    method: 'POST',
    body: JSON.stringify({ reason: 'accepted' })
  });
}

export async function denyUberOrder(externalOrderId, settings, reason = 'Store closed') {
  return uberFetch(`/v1/eats/orders/${externalOrderId}/deny_pos_order`, settings, {
    method: 'POST',
    body: JSON.stringify({ deny_reason: { info: reason, type: 'STORE_CLOSED' } })
  });
}

/**
 * Handle Uber webhook payload
 */
export async function handleUberWebhook({ payload, rawBody, signature }) {
  const settings = await getIntegrationSettings('uber_eats_', Number(process.env.PUBLIC_COMPANY_ID || 1));
  if (!settings.uber_eats_enabled) {
    await logIntegrationEvent({
      platform: 'uber_eats',
      event_type: payload?.event_type,
      status: 'ignored',
      payload,
      error_message: 'Integratie uitgeschakeld'
    });
    return { ok: true, ignored: true };
  }

  const secret = settings.uber_eats_webhook_secret || settings.uber_eats_client_secret;
  if (!verifyUberSignature(rawBody, signature, secret)) {
    await logIntegrationEvent({
      platform: 'uber_eats',
      event_type: payload?.event_type,
      status: 'rejected',
      payload,
      error_message: 'Ongeldige signature'
    });
    const err = new Error('Ongeldige Uber signature');
    err.statusCode = 401;
    throw err;
  }

  const eventType = payload?.event_type || '';
  await logIntegrationEvent({
    platform: 'uber_eats',
    event_type: eventType,
    external_order_id: payload?.meta?.resource_id,
    status: 'received',
    payload
  });

  if (eventType !== 'orders.notification') {
    return { ok: true, handled: false, eventType };
  }

  const orderId = payload?.meta?.resource_id;
  const href = payload?.resource_href || `https://api.uber.com/v2/eats/order/${orderId}`;
  const order = await uberFetch(href, settings);
  const normalized = mapUberOrder(order);

  let alreadyAccepted = false;
  if (settings.uber_eats_auto_accept) {
    try {
      await acceptUberOrder(orderId, settings);
      alreadyAccepted = true;
    } catch (e) {
      await logIntegrationEvent({
        platform: 'uber_eats',
        event_type: 'accept_failed',
        external_order_id: orderId,
        status: 'error',
        error_message: e.message,
        payload: { orderId }
      });
    }
  }

  const result = await ingestExternalOrder({ ...normalized, already_accepted: alreadyAccepted });
  return { ok: true, handled: true, result };
}

export { mapUberOrder };
