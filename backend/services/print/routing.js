/**
 * Print routing: category / type -> printer
 */

import { query } from '../../config/database.js';

const DRINK_SLUGS = new Set(['mocktails', 'frisdranken', 'warme-dranken', 'dranken', 'bar']);
const DEFAULT_COMPANY_ID = 1;

export async function getDefaultCompanyId() {
  const [row] = await query(
    "SELECT setting_value FROM settings WHERE setting_key = 'default_company_id' LIMIT 1"
  );
  return Number(row?.setting_value || DEFAULT_COMPANY_ID);
}

/**
 * Resolve which printers should receive an order (or parts of it)
 */
export async function resolvePrintersForOrder(order, items = [], companyId = DEFAULT_COMPANY_ID) {
  const rules = await query(
    `SELECT r.*, p.id as printer_id, p.name as printer_name, p.type as printer_type, p.agent_id, p.status as printer_status
     FROM printer_rules r
     JOIN printers p ON p.id = r.printer_id
     WHERE r.company_id = ?
     ORDER BY r.priority DESC, r.id ASC`,
    [companyId]
  );

  const printers = await query(
    `SELECT * FROM printers WHERE company_id = ? ORDER BY is_default DESC, id ASC`,
    [companyId]
  );

  if (!printers.length) return [];

  const byType = (type) => printers.filter((p) => p.type === type);
  const defaultReceipt = byType('RECEIPT')[0] || printers.find((p) => p.is_default) || printers[0];
  const kitchen = byType('KITCHEN')[0];
  const bar = byType('BAR')[0];
  const delivery = byType('DELIVERY')[0];

  // Rule-based split
  const ruleMap = new Map(); // printerId -> items
  const unmatched = [];

  for (const item of items) {
    const category = String(item.category_slug || item.category || '').toLowerCase();
    const matchedRules = rules.filter((r) => String(r.category).toLowerCase() === category);
    if (matchedRules.length) {
      for (const rule of matchedRules) {
        if (!ruleMap.has(rule.printer_id)) ruleMap.set(rule.printer_id, []);
        ruleMap.get(rule.printer_id).push(item);
      }
    } else {
      unmatched.push(item);
    }
  }

  const jobs = [];

  // Apply explicit rules
  for (const [printerId, jobItems] of ruleMap.entries()) {
    const printer = printers.find((p) => Number(p.id) === Number(printerId));
    if (!printer) continue;
    jobs.push({ printer, items: jobItems, ticket_kind: printer.type === 'BAR' ? 'BAR' : 'KITCHEN' });
  }

  // Fallback heuristic for unmatched items
  if (unmatched.length) {
    const drinkItems = unmatched.filter((i) => DRINK_SLUGS.has(String(i.category_slug || i.category || '').toLowerCase()));
    const foodItems = unmatched.filter((i) => !DRINK_SLUGS.has(String(i.category_slug || i.category || '').toLowerCase()));

    if (foodItems.length && kitchen) {
      jobs.push({ printer: kitchen, items: foodItems, ticket_kind: 'KITCHEN' });
    } else if (foodItems.length && defaultReceipt) {
      jobs.push({ printer: defaultReceipt, items: foodItems, ticket_kind: 'RECEIPT' });
    }

    if (drinkItems.length && bar) {
      jobs.push({ printer: bar, items: drinkItems, ticket_kind: 'BAR' });
    } else if (drinkItems.length && defaultReceipt) {
      // merge into existing receipt job if present
      const existing = jobs.find((j) => j.printer.id === defaultReceipt.id);
      if (existing) existing.items.push(...drinkItems);
      else jobs.push({ printer: defaultReceipt, items: drinkItems, ticket_kind: 'RECEIPT' });
    }
  }

  // Always also print a full receipt/delivery ticket when configured
  if (defaultReceipt && !jobs.some((j) => j.printer.id === defaultReceipt.id && j.ticket_kind === 'RECEIPT')) {
    const receiptPrinter = order.delivery_type === 'delivery' && delivery ? delivery : defaultReceipt;
    jobs.push({ printer: receiptPrinter, items, ticket_kind: order.delivery_type === 'delivery' ? 'DELIVERY' : 'RECEIPT' });
  }

  // Deduplicate identical printer+kind
  const seen = new Set();
  return jobs.filter((j) => {
    const key = `${j.printer.id}:${j.ticket_kind}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function listRules(companyId) {
  return query(
    `SELECT r.*, p.name as printer_name, p.type as printer_type
     FROM printer_rules r
     JOIN printers p ON p.id = r.printer_id
     WHERE r.company_id = ?
     ORDER BY r.category, r.priority DESC`,
    [companyId]
  );
}

export async function upsertRule({ companyId, category, printerId, priority = 0 }) {
  const result = await query(
    `INSERT INTO printer_rules (company_id, category, printer_id, priority)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE priority = VALUES(priority)`,
    [companyId, String(category).toLowerCase(), printerId, priority]
  );
  return result;
}

export async function deleteRule(id, companyId) {
  await query(`DELETE FROM printer_rules WHERE id = ? AND company_id = ?`, [id, companyId]);
}
