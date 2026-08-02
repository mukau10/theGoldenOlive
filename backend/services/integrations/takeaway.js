/**
 * Takeaway.com / Just Eat Takeaway partner order integration (Belgium)
 * Docs: https://developers.just-eat.com / partner API
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

export function verifyTakeawaySignature(rawBody, signatureHeader, secret) {
  if (!secret) return allowUnsignedWebhooks();
  if (!signatureHeader) return false;
  const digest = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  // Some JE tenants send sha256=hex
  const incoming = String(signatureHeader).replace(/^sha256=/i, '').toLowerCase();
  return timingSafeEqualHex(digest.toLowerCase(), incoming);
}

function authHeaders(settings) {
  const key = settings.takeaway_api_key;
  return {
    Authorization: `JE-API-KEY ${key}`,
    'Content-Type': 'application/json',
    Accept: 'application/json'
  };
}

async function takeawayFetch(path, settings, options = {}) {
  const base = String(settings.takeaway_base_url || 'https://partnerapi.just-eat.be').replace(/\/$/, '');
  const resp = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      ...authHeaders(settings),
      ...(options.headers || {})
    }
  });
  const text = await resp.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!resp.ok) {
    throw new Error(data?.message || data?.ExceptionMessage || `Takeaway API ${resp.status}`);
  }
  return data;
}

export function mapTakeawayOrder(order) {
  const body = order?.Order || order?.order || order;
  const lines = body.Items || body.items || body.OrderItems || body.Basket?.Items || [];
  const items = (Array.isArray(lines) ? lines : []).map((it) => ({
    name: it.Name || it.name || it.ProductName || 'Item',
    quantity: Number(it.Quantity || it.quantity || 1),
    price: Number(it.UnitPrice || it.Price || it.price || 0),
    notes: it.Comment || it.notes || it.CustomerNotes || null,
    product_id: null
  }));

  const customer = body.Customer || body.customer || body.Consumer || {};
  const address = body.DeliveryAddress || body.Address || customer.Address || body.deliveryAddress || null;
  const serviceType = String(body.OrderType || body.ServiceType || body.fulfillmentType || '').toLowerCase();
  const isPickup = serviceType.includes('collection') || serviceType.includes('pickup') || serviceType.includes('afhaal');

  const total = Number(
    body.TotalPrice ?? body.Total ?? body.PayableAmount ?? body.total
    ?? items.reduce((s, i) => s + i.price * i.quantity, 0)
  );

  return {
    source: 'takeaway',
    external_order_id: String(body.Id || body.OrderId || body.OrderReference || body.id || body.orderReference),
    external_status: body.Status || body.status || 'received',
    customer_name: customer.Name || customer.name || [customer.FirstName, customer.LastName].filter(Boolean).join(' ') || 'Takeaway klant',
    customer_email: customer.Email || customer.email || null,
    customer_phone: customer.PhoneNumber || customer.Phone || customer.phoneNumber || '-',
    delivery_type: isPickup ? 'pickup' : 'delivery',
    address: address ? {
      street: address.Street || address.street || address.Lines?.[0] || '',
      house_number: address.HouseNumber || address.number || address.Lines?.[1] || '-',
      bus: address.Bus || address.ApartmentNumber || null,
      postal_code: address.PostalCode || address.postcode || address.ZipCode || '',
      city: address.City || address.city || ''
    } : null,
    items,
    total,
    notes: body.CustomerNotes || body.Notes || body.Comment || null,
    raw: order
  };
}

export async function acceptTakeawayOrder(externalOrderId, settings, body = {}) {
  // Partner acceptance endpoint (tenant-dependent path)
  return takeawayFetch(`/orders/${encodeURIComponent(externalOrderId)}/accept`, settings, {
    method: 'PUT',
    body: JSON.stringify({
      RestaurantId: settings.takeaway_restaurant_id || undefined,
      ...body
    })
  });
}

export async function rejectTakeawayOrder(externalOrderId, settings, reason = 'Busy') {
  return takeawayFetch(`/orders/${encodeURIComponent(externalOrderId)}/reject`, settings, {
    method: 'PUT',
    body: JSON.stringify({
      RestaurantId: settings.takeaway_restaurant_id || undefined,
      Reason: reason
    })
  });
}

/**
 * Handle Takeaway/Just Eat webhook.
 * Supports sync & async (callback URL) flows.
 */
export async function handleTakeawayWebhook({ payload, rawBody, signature, callbackUrl }) {
  const settings = await getIntegrationSettings('takeaway_', Number(process.env.PUBLIC_COMPANY_ID || 1));
  if (!settings.takeaway_enabled) {
    await logIntegrationEvent({
      platform: 'takeaway',
      event_type: 'webhook',
      status: 'ignored',
      payload,
      error_message: 'Integratie uitgeschakeld'
    });
    return { ok: true, ignored: true, async: Boolean(callbackUrl) };
  }

  if (!verifyTakeawaySignature(rawBody, signature, settings.takeaway_webhook_secret)) {
    await logIntegrationEvent({
      platform: 'takeaway',
      event_type: 'webhook',
      status: 'rejected',
      payload,
      error_message: 'Ongeldige signature'
    });
    const err = new Error('Ongeldige Takeaway signature');
    err.statusCode = 401;
    throw err;
  }

  const normalized = mapTakeawayOrder(payload);
  await logIntegrationEvent({
    platform: 'takeaway',
    event_type: 'order.webhook',
    external_order_id: normalized.external_order_id,
    status: 'received',
    payload
  });

  let alreadyAccepted = false;
  if (settings.takeaway_auto_accept) {
    try {
      await acceptTakeawayOrder(normalized.external_order_id, settings);
      alreadyAccepted = true;
    } catch (e) {
      await logIntegrationEvent({
        platform: 'takeaway',
        event_type: 'accept_failed',
        external_order_id: normalized.external_order_id,
        status: 'error',
        error_message: e.message
      });
    }
  }

  const result = await ingestExternalOrder({ ...normalized, already_accepted: alreadyAccepted });

  // Async webhook callback acknowledgment
  if (callbackUrl) {
    try {
      await fetch(callbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(settings) },
        body: JSON.stringify({
          status: 'Success',
          message: 'Order received',
          data: { orderId: normalized.external_order_id }
        })
      });
    } catch (e) {
      await logIntegrationEvent({
        platform: 'takeaway',
        event_type: 'callback_failed',
        external_order_id: normalized.external_order_id,
        status: 'error',
        error_message: e.message
      });
    }
  }

  return { ok: true, handled: true, result, async: Boolean(callbackUrl) };
}
