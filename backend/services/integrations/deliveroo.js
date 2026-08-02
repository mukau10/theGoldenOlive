/**
 * Deliveroo Partner Order integration
 * Docs: https://api-docs.deliveroo.com
 */

import crypto from 'crypto';
import { getIntegrationSettings, ingestExternalOrder, logIntegrationEvent } from './ingest.js';
import { allowUnsignedWebhooks } from '../../utils/securityBootstrap.js';

function timingSafeEqualHex(a, b) {
  const aa = Buffer.from(String(a || ''), 'utf8');
  const bb = Buffer.from(String(b || ''), 'utf8');
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

export function verifyDeliverooSignature(rawBody, guid, signatureHeader, secret) {
  if (!secret) return allowUnsignedWebhooks();
  if (!guid || !signatureHeader) return false;
  const message = `${guid} ${rawBody}`;
  const digest = crypto.createHmac('sha256', secret).update(message).digest('hex');
  return timingSafeEqualHex(digest.toLowerCase(), String(signatureHeader).toLowerCase());
}

let cachedToken = { accessToken: null, expiresAt: 0 };

async function getDeliverooToken(settings) {
  if (cachedToken.accessToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.accessToken;
  }
  const clientId = settings.deliveroo_client_id;
  const clientSecret = settings.deliveroo_client_secret;
  if (!clientId || !clientSecret) {
    throw new Error('Deliveroo client_id/client_secret ontbreken');
  }

  const base = String(settings.deliveroo_base_url || 'https://api.deliveroo.com').replace(/\/$/, '');
  const resp = await fetch(`${base}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret
    })
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    // Some Deliveroo environments use form-urlencoded
    const form = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret
    });
    const resp2 = await fetch(`${base}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form
    });
    const data2 = await resp2.json().catch(() => ({}));
    if (!resp2.ok) {
      throw new Error(data2.error_description || data.error || 'Deliveroo OAuth mislukt');
    }
    cachedToken = {
      accessToken: data2.access_token,
      expiresAt: Date.now() + (Number(data2.expires_in || 3600) * 1000)
    };
    return cachedToken.accessToken;
  }

  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (Number(data.expires_in || 3600) * 1000)
  };
  return cachedToken.accessToken;
}

async function deliverooFetch(path, settings, options = {}) {
  const token = await getDeliverooToken(settings);
  const base = String(settings.deliveroo_base_url || 'https://api.deliveroo.com').replace(/\/$/, '');
  const resp = await fetch(`${base}${path}`, {
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
    throw new Error(data?.message || data?.error || `Deliveroo API ${resp.status}`);
  }
  return data;
}

export function mapDeliverooOrder(order) {
  const body = order?.order || order;
  const itemsRaw = body.items || body.order_items || [];
  const items = itemsRaw.map((it) => ({
    name: it.name || it.menu_item?.name || 'Item',
    quantity: Number(it.quantity || 1),
    price: Number(it.unit_price?.fractional ?? it.price ?? 0) / (it.unit_price?.fractional != null ? 100 : 1),
    notes: it.notes || it.customer_notes || null,
    product_id: null
  }));

  const customer = body.customer || body.consumer || {};
  const delivery = body.delivery || body.fulfillment || {};
  const address = delivery.address || body.delivery_address || null;
  const isPickup = String(body.order_type || body.fulfillment_type || '').toLowerCase().includes('collection')
    || String(body.order_type || '').toLowerCase().includes('pickup');

  const totalFractional = body.total_price?.fractional ?? body.total?.fractional ?? null;
  const total = totalFractional != null
    ? Number(totalFractional) / 100
    : items.reduce((s, i) => s + i.price * i.quantity, 0);

  return {
    source: 'deliveroo',
    external_order_id: String(body.id || body.order_id || body.display_id),
    external_status: body.status || body.current_status || 'placed',
    customer_name: customer.name || [customer.first_name, customer.last_name].filter(Boolean).join(' ') || 'Deliveroo klant',
    customer_email: customer.email || null,
    customer_phone: customer.contact_number || customer.phone || '-',
    delivery_type: isPickup ? 'pickup' : 'delivery',
    address: address ? {
      street: address.street || address.address1 || address.line1 || '',
      house_number: address.number || address.house_number || '-',
      bus: address.flat_number || address.unit || null,
      postal_code: address.postcode || address.postal_code || '',
      city: address.city || address.town || ''
    } : null,
    items,
    total,
    notes: body.notes || body.customer_notes || null,
    raw: order
  };
}

export async function acceptDeliverooOrder(externalOrderId, settings) {
  const siteId = settings.deliveroo_site_id;
  // Tablet-less flow: update order status to accepted
  return deliverooFetch(`/order/v1/orders/${externalOrderId}/status`, settings, {
    method: 'POST',
    body: JSON.stringify({ status: 'accepted', site_id: siteId || undefined })
  });
}

export async function handleDeliverooWebhook({ payload, rawBody, headers }) {
  const settings = await getIntegrationSettings('deliveroo_', Number(process.env.PUBLIC_COMPANY_ID || 1));
  if (!settings.deliveroo_enabled) {
    await logIntegrationEvent({
      platform: 'deliveroo',
      event_type: headers['x-deliveroo-payload-type'] || payload?.event,
      status: 'ignored',
      payload,
      error_message: 'Integratie uitgeschakeld'
    });
    return { ok: true, ignored: true };
  }

  const guid = headers['x-deliveroo-sequence-guid'];
  const signature = headers['x-deliveroo-hmac-sha256'];
  if (!verifyDeliverooSignature(rawBody, guid, signature, settings.deliveroo_webhook_secret)) {
    await logIntegrationEvent({
      platform: 'deliveroo',
      event_type: headers['x-deliveroo-payload-type'],
      status: 'rejected',
      payload,
      error_message: 'Ongeldige signature'
    });
    const err = new Error('Ongeldige Deliveroo signature');
    err.statusCode = 401;
    throw err;
  }

  const payloadType = String(headers['x-deliveroo-payload-type'] || payload?.event || '').toLowerCase();
  const externalId = payload?.order?.id || payload?.id || payload?.order_id;

  await logIntegrationEvent({
    platform: 'deliveroo',
    event_type: payloadType,
    external_order_id: externalId ? String(externalId) : null,
    status: 'received',
    payload
  });

  const isNew = payloadType.includes('order.new') || payloadType.includes('new_order') || payload?.event === 'order.new';
  if (!isNew) {
    return { ok: true, handled: false, eventType: payloadType };
  }

  const normalized = mapDeliverooOrder(payload);
  let alreadyAccepted = false;
  if (settings.deliveroo_auto_accept) {
    try {
      await acceptDeliverooOrder(normalized.external_order_id, settings);
      alreadyAccepted = true;
    } catch (e) {
      await logIntegrationEvent({
        platform: 'deliveroo',
        event_type: 'accept_failed',
        external_order_id: normalized.external_order_id,
        status: 'error',
        error_message: e.message
      });
    }
  }

  const result = await ingestExternalOrder({ ...normalized, already_accepted: alreadyAccepted });
  return { ok: true, handled: true, result };
}
