/**
 * Discount helpers
 */

import { query } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';

const round2 = (n) => Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

/**
 * Validate a discount code against a subtotal and return computed discount amount
 */
export async function resolveDiscount(code, subtotal, companyId = null) {
  if (!code || !String(code).trim()) {
    return null;
  }

  const normalized = String(code).trim().toUpperCase();
  const cid = companyId != null ? Number(companyId) : null;
  const [discount] = cid
    ? await query(
        'SELECT * FROM discounts WHERE company_id = ? AND UPPER(code) = ? LIMIT 1',
        [cid, normalized]
      )
    : await query(
        'SELECT * FROM discounts WHERE UPPER(code) = ? LIMIT 1',
        [normalized]
      );

  if (!discount) {
    throw new AppError('Ongeldige kortingscode', 400);
  }

  if (!discount.is_active) {
    throw new AppError('Deze kortingscode is niet actief', 400);
  }

  const now = new Date();
  if (discount.valid_from && new Date(discount.valid_from) > now) {
    throw new AppError('Deze kortingscode is nog niet geldig', 400);
  }
  if (discount.valid_until && new Date(discount.valid_until) < now) {
    throw new AppError('Deze kortingscode is verlopen', 400);
  }

  if (discount.max_uses != null && Number(discount.used_count) >= Number(discount.max_uses)) {
    throw new AppError('Deze kortingscode is opgebruikt', 400);
  }

  const minOrder = Number(discount.min_order || 0);
  if (Number(subtotal) < minOrder) {
    throw new AppError(`Minimum bestelbedrag voor deze code is €${minOrder.toFixed(2)}`, 400);
  }

  let amount = 0;
  if (discount.discount_type === 'percent') {
    amount = round2((Number(subtotal) * Number(discount.value)) / 100);
  } else {
    amount = round2(Number(discount.value));
  }

  amount = Math.min(amount, round2(Number(subtotal)));
  if (amount < 0) amount = 0;

  return {
    id: discount.id,
    code: discount.code,
    discount_type: discount.discount_type,
    value: Number(discount.value),
    amount
  };
}

export async function incrementDiscountUsage(discountId, connection = null, companyId = null) {
  if (!discountId) return;
  const sql = companyId != null
    ? 'UPDATE discounts SET used_count = used_count + 1 WHERE id = ? AND company_id = ?'
    : 'UPDATE discounts SET used_count = used_count + 1 WHERE id = ?';
  const params = companyId != null ? [discountId, companyId] : [discountId];
  if (connection) {
    await connection.execute(sql, params);
  } else {
    await query(sql, params);
  }
}
