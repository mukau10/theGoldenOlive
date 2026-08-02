/**
 * GDPR helpers: export + anonymize customer PII
 */

import { query, transaction } from '../config/database.js';

export async function findOrdersByEmail(email, companyId = null) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return [];
  const cid = companyId != null ? Number(companyId) : null;
  const sql = cid
    ? `SELECT o.*, a.street, a.house_number, a.bus, a.postal_code, a.city
       FROM orders o
       LEFT JOIN addresses a ON a.id = o.address_id
       WHERE o.company_id = ? AND LOWER(o.customer_email) = ?
       ORDER BY o.created_at DESC`
    : `SELECT o.*, a.street, a.house_number, a.bus, a.postal_code, a.city
       FROM orders o
       LEFT JOIN addresses a ON a.id = o.address_id
       WHERE LOWER(o.customer_email) = ?
       ORDER BY o.created_at DESC`;
  const params = cid ? [cid, normalized] : [normalized];
  return query(sql, params);
}

export async function exportCustomerData(email, companyId = null) {
  const orders = await findOrdersByEmail(email, companyId);
  const orderIds = orders.map((o) => o.id);
  let items = [];
  let payments = [];
  if (orderIds.length) {
    const placeholders = orderIds.map(() => '?').join(',');
    items = await query(
      `SELECT * FROM order_items WHERE order_id IN (${placeholders})`,
      orderIds
    );
    payments = await query(
      `SELECT id, order_id, amount, status, created_at
       FROM payments WHERE order_id IN (${placeholders})`,
      orderIds
    ).catch(() => []);
  }

  return {
    exported_at: new Date().toISOString(),
    email: String(email || '').trim().toLowerCase(),
    orders: orders.map((o) => ({
      ...o,
      // strip huge payloads from export unless needed
      external_payload: undefined
    })),
    order_items: items,
    payments
  };
}

export async function eraseCustomerData(email, companyId = null) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) throw new Error('E-mail is verplicht');
  const cid = companyId != null ? Number(companyId) : null;

  return transaction(async (conn) => {
    const orderSql = cid
      ? `SELECT id, address_id FROM orders WHERE company_id = ? AND LOWER(customer_email) = ?`
      : `SELECT id, address_id FROM orders WHERE LOWER(customer_email) = ?`;
    const orderParams = cid ? [cid, normalized] : [normalized];
    const [orders] = await conn.execute(orderSql, orderParams);
    const orderIds = orders.map((o) => o.id);
    const addressIds = [...new Set(orders.map((o) => o.address_id).filter(Boolean))];

    if (orderIds.length) {
      const placeholders = orderIds.map(() => '?').join(',');
      const updateSql = cid
        ? `UPDATE orders SET
            customer_name = 'ANONYMIZED',
            customer_email = CONCAT('erased+', id, '@invalid.local'),
            customer_phone = NULL,
            notes = NULL,
            external_payload = NULL
           WHERE company_id = ? AND id IN (${placeholders})`
        : `UPDATE orders SET
            customer_name = 'ANONYMIZED',
            customer_email = CONCAT('erased+', id, '@invalid.local'),
            customer_phone = NULL,
            notes = NULL,
            external_payload = NULL
           WHERE id IN (${placeholders})`;
      await conn.execute(updateSql, cid ? [cid, ...orderIds] : orderIds);
    }

    if (addressIds.length) {
      const placeholders = addressIds.map(() => '?').join(',');
      await conn.execute(
        `UPDATE addresses SET
          street = 'REDACTED',
          house_number = '0',
          bus = NULL,
          postal_code = '0000',
          city = 'REDACTED',
          extra_info = NULL
         WHERE id IN (${placeholders})`,
        addressIds
      );
    }

    return { anonymized_orders: orderIds.length, anonymized_addresses: addressIds.length };
  });
}

/**
 * Soft retention: anonymize orders older than N days (completed/cancelled only)
 */
export async function purgeOldOrderPii(days = 730, companyId = null) {
  const d = Math.max(30, Math.min(Number(days) || 730, 3650));
  const cid = companyId != null ? Number(companyId) : null;
  const companyClause = cid ? ' AND company_id = ?' : '';
  const params = cid ? [cid] : [];
  const result = await query(
    `UPDATE orders SET
      customer_name = 'ANONYMIZED',
      customer_email = CONCAT('retained+', id, '@invalid.local'),
      customer_phone = NULL,
      notes = NULL,
      external_payload = NULL
     WHERE created_at < (NOW() - INTERVAL ${d} DAY)
       AND status IN ('delivered', 'cancelled')
       AND customer_email NOT LIKE 'erased+%'
       AND customer_email NOT LIKE 'retained+%'${companyClause}`,
    params
  );
  return { days: d, affected: result.affectedRows || 0 };
}
