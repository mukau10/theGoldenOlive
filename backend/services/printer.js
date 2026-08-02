/**
 * Network thermal printer (ESC/POS over TCP)
 */

import net from 'net';
import { query } from '../config/database.js';

const ESC = '\x1B';
const GS = '\x1D';

function encodeText(text) {
  // Prefer Latin-1 for thermal printers; fall back to UTF-8
  try {
    return Buffer.from(String(text ?? ''), 'latin1');
  } catch {
    return Buffer.from(String(text ?? ''), 'utf8');
  }
}

function line(text = '', width = 42) {
  const s = String(text ?? '');
  return s.length > width ? s.slice(0, width) : s;
}

function pair(left, right, width = 42) {
  const l = String(left ?? '');
  const r = String(right ?? '');
  const space = Math.max(1, width - l.length - r.length);
  return l + ' '.repeat(space) + r;
}

function formatAddress(order) {
  if (order.delivery_type !== 'delivery' || !order.street) return null;
  const street = `${order.street} ${order.house_number}${order.bus ? ` ${order.bus}` : ''}`.trim();
  const city = `${order.postal_code || ''} ${order.city || ''}`.trim();
  return { street, city };
}

/**
 * Build ESC/POS receipt buffer for an order
 */
export function buildOrderTicket(order, restaurant = {}) {
  const chunks = [];
  const push = (s) => chunks.push(encodeText(s));

  // Init + code page
  push(`${ESC}@`);
  push(`${ESC}t\x00`); // PC437 / Latin
  push(`${ESC}a\x01`); // center
  push(`${ESC}!\x18`); // double height/width-ish
  push(`${line(restaurant.name || 'The Golden Olive')}\n`);
  push(`${ESC}!\x00`);
  push(`${line(restaurant.address || '')}\n`);
  if (restaurant.phone) push(`${line(restaurant.phone)}\n`);
  push(`\n`);

  push(`${ESC}a\x00`); // left
  push(`${pair('Bestelling', order.order_number)}\n`);
  push(`${pair('Type', order.delivery_type === 'delivery' ? 'BEZORGEN' : 'AFHALEN')}\n`);
  push(`${pair('Status', String(order.status || '').toUpperCase())}\n`);
  push(`${pair('Tijd', new Date(order.created_at || Date.now()).toLocaleString('nl-BE'))}\n`);
  push(`${'-'.repeat(42)}\n`);

  push(`${ESC}!\x08`); // emphasized
  push(`${line(order.customer_name)}\n`);
  push(`${ESC}!\x00`);
  if (order.customer_phone) push(`${line(order.customer_phone)}\n`);
  if (order.customer_email) push(`${line(order.customer_email)}\n`);

  const addr = formatAddress(order);
  if (addr) {
    push(`\n${ESC}!\x08${line('ADRES')}${ESC}!\x00\n`);
    push(`${line(addr.street)}\n`);
    push(`${line(addr.city)}\n`);
  }

  push(`${'-'.repeat(42)}\n`);
  push(`${ESC}!\x08${line('ITEMS')}${ESC}!\x00\n`);

  const items = Array.isArray(order.items) ? order.items : [];
  for (const item of items) {
    const qty = Number(item.quantity || 1);
    const name = item.product_name || item.name || 'Item';
    const price = Number(item.subtotal ?? (Number(item.product_price || item.price || 0) * qty));
    push(`${pair(`${qty}x ${name}`, `€${price.toFixed(2)}`)}\n`);
    if (item.notes) push(`  > ${line(item.notes, 38)}\n`);
  }

  push(`${'-'.repeat(42)}\n`);
  push(`${pair('Subtotaal', `€${Number(order.subtotal || 0).toFixed(2)}`)}\n`);
  if (Number(order.discount_amount || 0) > 0) {
    push(`${pair(`Korting${order.discount_code ? ` (${order.discount_code})` : ''}`, `-€${Number(order.discount_amount).toFixed(2)}`)}\n`);
  }
  if (Number(order.delivery_fee || 0) > 0) {
    push(`${pair('Bezorgkosten', `€${Number(order.delivery_fee).toFixed(2)}`)}\n`);
  }
  push(`${ESC}!\x08`);
  push(`${pair('TOTAAL', `€${Number(order.total || 0).toFixed(2)}`)}\n`);
  push(`${ESC}!\x00`);

  if (order.notes) {
    push(`\n${ESC}!\x08${line('NOTITIES')}${ESC}!\x00\n`);
    push(`${line(order.notes)}\n`);
  }

  push(`\n\n`);
  push(`${ESC}a\x01`);
  push(`${line('Bedankt!')}\n\n\n`);
  // Cut
  push(`${GS}V\x00`);

  return Buffer.concat(chunks);
}

/**
 * Send raw data to a network printer
 */
export function sendToPrinter({ host, port = 9100, data, timeoutMs = 8000 }) {
  return new Promise((resolve, reject) => {
    if (!host) {
      reject(new Error('Printer IP ontbreekt'));
      return;
    }

    const socket = new net.Socket();
    let settled = false;

    const fail = (err) => {
      if (settled) return;
      settled = true;
      try { socket.destroy(); } catch {}
      reject(err instanceof Error ? err : new Error(String(err)));
    };

    const ok = () => {
      if (settled) return;
      settled = true;
      resolve(true);
    };

    socket.setTimeout(timeoutMs);
    socket.once('error', fail);
    socket.once('timeout', () => fail(new Error('Printer timeout')));

    socket.connect(Number(port) || 9100, host, () => {
      socket.write(data, (writeErr) => {
        if (writeErr) return fail(writeErr);
        socket.end(ok);
      });
    });
  });
}

/**
 * Load printer settings and print an order ticket if enabled
 */
export async function printOrderToNetwork(order) {
  const settings = await query(
    "SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('printer_enabled','printer_ip','printer_port','restaurant_name','restaurant_address','restaurant_phone')"
  );
  const map = {};
  settings.forEach((s) => { map[s.setting_key] = s.setting_value; });

  const enabled = map.printer_enabled === true || map.printer_enabled === 'true' || map.printer_enabled === '1';
  if (!enabled) {
    return { printed: false, reason: 'disabled' };
  }

  const host = String(map.printer_ip || '').trim();
  if (!host) {
    return { printed: false, reason: 'no_ip' };
  }

  const port = parseInt(map.printer_port || '9100', 10) || 9100;
  const ticket = buildOrderTicket(order, {
    name: map.restaurant_name || 'The Golden Olive',
    address: map.restaurant_address || '',
    phone: map.restaurant_phone || ''
  });

  await sendToPrinter({ host, port, data: ticket });
  return { printed: true, host, port };
}
