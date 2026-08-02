/**
 * Shared external order ingest for delivery platforms
 */

import { query, transaction } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';

const PLATFORMS = {
  uber_eats: { label: 'Uber Eats', prefix: 'UE' },
  takeaway: { label: 'Takeaway.com', prefix: 'TA' },
  deliveroo: { label: 'Deliveroo', prefix: 'DR' }
};

export function platformLabel(source) {
  return PLATFORMS[source]?.label || source || 'Website';
}

function generateExternalOrderNumber(source) {
  const prefix = PLATFORMS[source]?.prefix || 'EXT';
  const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${datePart}-${randomPart}`;
}

async function logIntegrationEvent({ platform, event_type, external_order_id, status, payload, error_message, company_id = 1 }) {
  try {
    await query(
      `INSERT INTO integration_events (company_id, platform, event_type, external_order_id, status, payload, error_message)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        company_id || 1,
        platform,
        event_type || null,
        external_order_id || null,
        status || 'received',
        payload ? JSON.stringify(payload) : null,
        error_message || null
      ]
    );
  } catch {
    // logging should never break intake
  }
}

export async function getIntegrationSettings(prefix, companyId = 1) {
  try {
    const { getIntegrationSettingsForCompany } = await import('../../utils/companySettings.js');
    const map = await getIntegrationSettingsForCompany(companyId, prefix);
    if (Object.keys(map).length) return map;
  } catch {
    // fallback to legacy global settings
  }
  const rows = await query(
    'SELECT setting_key, setting_value, setting_type FROM settings WHERE setting_key LIKE ?',
    [`${prefix}%`]
  );
  const map = {};
  rows.forEach((r) => {
    const key = r.setting_key;
    if (r.setting_type === 'boolean') {
      map[key] = r.setting_value === 'true' || r.setting_value === true || r.setting_value === '1';
    } else if (r.setting_type === 'number') {
      map[key] = parseFloat(r.setting_value);
    } else {
      map[key] = r.setting_value;
    }
  });
  return map;
}

/**
 * Normalize + insert an external platform order into local DB.
 *
 * @param {object} input
 * @param {'uber_eats'|'takeaway'|'deliveroo'} input.source
 * @param {string} input.external_order_id
 * @param {string} [input.external_status]
 * @param {string} [input.customer_name]
 * @param {string} [input.customer_email]
 * @param {string} [input.customer_phone]
 * @param {'delivery'|'pickup'} [input.delivery_type]
 * @param {object|null} [input.address]
 * @param {Array<{name:string, quantity:number, price:number, notes?:string, product_id?:number|null}>} input.items
 * @param {number} [input.subtotal]
 * @param {number} [input.delivery_fee]
 * @param {number} [input.discount_amount]
 * @param {number} [input.total]
 * @param {string} [input.notes]
 * @param {object} [input.raw]
 * @param {boolean} [input.already_accepted]
 */
export async function ingestExternalOrder(input) {
  const source = input.source;
  const companyId = Number(input.company_id || process.env.PUBLIC_COMPANY_ID || 1);
  if (!PLATFORMS[source]) {
    throw new AppError(`Onbekend platform: ${source}`, 400);
  }
  if (!input.external_order_id) {
    throw new AppError('external_order_id is verplicht', 400);
  }

  const existing = await query(
    'SELECT id, order_number, status FROM orders WHERE company_id = ? AND source = ? AND external_order_id = ? LIMIT 1',
    [companyId, source, String(input.external_order_id)]
  );
  if (existing.length) {
    return { created: false, order: existing[0], duplicate: true };
  }

  const items = Array.isArray(input.items) ? input.items : [];
  if (!items.length) {
    throw new AppError('Bestelling heeft geen items', 400);
  }

  let subtotal = Number(input.subtotal);
  if (!Number.isFinite(subtotal)) {
    subtotal = items.reduce((sum, it) => sum + Number(it.price || 0) * Number(it.quantity || 1), 0);
  }
  subtotal = Math.round((subtotal + Number.EPSILON) * 100) / 100;

  const deliveryFee = Math.round((Number(input.delivery_fee || 0) + Number.EPSILON) * 100) / 100;
  const discountAmount = Math.round((Number(input.discount_amount || 0) + Number.EPSILON) * 100) / 100;
  let total = Number(input.total);
  if (!Number.isFinite(total)) {
    total = Math.max(0, subtotal - discountAmount + deliveryFee);
  }
  total = Math.round((total + Number.EPSILON) * 100) / 100;

  const deliveryType = input.delivery_type === 'pickup' ? 'pickup' : 'delivery';
  const status = input.already_accepted ? 'paid' : 'pending';
  const orderNumber = generateExternalOrderNumber(source);
  const platformName = platformLabel(source);

  const result = await transaction(async (connection) => {
    let addressId = null;
    if (deliveryType === 'delivery' && input.address?.street) {
      const [addressResult] = await connection.execute(
        `INSERT INTO addresses (street, house_number, bus, postal_code, city)
         VALUES (?, ?, ?, ?, ?)`,
        [
          input.address.street || '',
          input.address.house_number || '-',
          input.address.bus || null,
          input.address.postal_code || '',
          input.address.city || ''
        ]
      );
      addressId = addressResult.insertId;
    }

    const [orderResult] = await connection.execute(
      `INSERT INTO orders (
        company_id, order_number, source, external_order_id, external_status, external_payload,
        customer_name, customer_email, customer_phone,
        address_id, delivery_type, subtotal, delivery_fee, discount_amount, total,
        status, notes, estimated_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        companyId,
        orderNumber,
        source,
        String(input.external_order_id),
        input.external_status || null,
        input.raw ? JSON.stringify(input.raw) : null,
        input.customer_name || `${platformName} klant`,
        input.customer_email || `${source}@external.local`,
        input.customer_phone || '-',
        addressId,
        deliveryType,
        subtotal,
        deliveryFee,
        discountAmount,
        total,
        status,
        input.notes || `Bestelling via ${platformName}`,
        deliveryType === 'delivery' ? 45 : 20
      ]
    );

    const orderId = orderResult.insertId;

    for (const item of items) {
      const qty = Number(item.quantity || 1);
      const price = Number(item.price || 0);
      const lineTotal = Math.round((price * qty + Number.EPSILON) * 100) / 100;
      await connection.execute(
        `INSERT INTO order_items (order_id, product_id, product_name, product_price, quantity, subtotal, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          item.product_id || null,
          item.name || 'Item',
          price,
          qty,
          lineTotal,
          item.notes || null
        ]
      );
    }

    await connection.execute(
      `INSERT INTO payments (order_id, amount, status, method, paid_at)
       VALUES (?, ?, 'paid', ?, NOW())`,
      [orderId, total, source]
    );

    return { orderId, orderNumber, total, addressId, status };
  });

  try {
    await query(
      `INSERT INTO notifications (user_id, type, title, message, link, is_read)
       VALUES (NULL, 'order', ?, ?, ?, 0)`,
      [
        `Nieuwe ${platformName} bestelling`,
        `${input.customer_name || 'Klant'} • ${deliveryType === 'delivery' ? 'Bezorgen' : 'Afhalen'} • €${Number(result.total).toFixed(2)}`,
        `order:${result.orderId}`
      ]
    );
  } catch {
    // ignore
  }

  await logIntegrationEvent({
    platform: source,
    event_type: 'order.ingested',
    external_order_id: String(input.external_order_id),
    status: 'success',
    payload: { order_id: result.orderId, order_number: result.orderNumber }
  });

  return { created: true, order: result, duplicate: false };
}

export async function updateExternalOrderStatus(orderId, status, externalStatus = null) {
  await query(
    `UPDATE orders SET status = ?, external_status = COALESCE(?, external_status) WHERE id = ?`,
    [status, externalStatus, orderId]
  );
}

export { logIntegrationEvent, PLATFORMS };
