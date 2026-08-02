/**
 * Print job queue + dispatch to bridge agents
 */

import { query } from '../../config/database.js';
import { buildOrderTicket } from '../printer.js';
import { isAgentOnline, sendToAgent } from './bridgeHub.js';
import { resolvePrintersForOrder, getDefaultCompanyId } from './routing.js';

function log(...args) {
  console.log('[PrintQueue]', ...args);
}

async function getRestaurantInfo() {
  const rows = await query(
    "SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('restaurant_name','restaurant_address','restaurant_phone')"
  );
  const map = {};
  rows.forEach((r) => { map[r.setting_key] = r.setting_value; });
  return {
    name: map.restaurant_name || 'The Golden Olive',
    address: map.restaurant_address || '',
    phone: map.restaurant_phone || ''
  };
}

export function buildJobContent({ order, items, ticketKind, printer }) {
  return {
    type: 'PRINT_JOB',
    title: ticketKind === 'KITCHEN' ? 'KEUKEN' : ticketKind === 'BAR' ? 'BAR' : ticketKind === 'DELIVERY' ? 'BEZORGING' : 'BON',
    ticket_kind: ticketKind,
    order: {
      id: order.id,
      order_number: order.order_number,
      source: order.source || 'website',
      delivery_type: order.delivery_type,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      customer_email: order.customer_email,
      notes: order.notes,
      subtotal: order.subtotal,
      delivery_fee: order.delivery_fee,
      discount_code: order.discount_code,
      discount_amount: order.discount_amount,
      total: order.total,
      status: order.status,
      created_at: order.created_at,
      street: order.street,
      house_number: order.house_number,
      bus: order.bus,
      postal_code: order.postal_code,
      city: order.city
    },
    items: (items || []).map((it) => ({
      name: it.product_name || it.name,
      quantity: Number(it.quantity || 1),
      price: Number(it.product_price ?? it.price ?? 0),
      subtotal: Number(it.subtotal ?? 0),
      notes: it.notes || null,
      category: it.category_slug || it.category || null
    })),
    printer: {
      id: printer.id,
      name: printer.name,
      type: printer.type,
      ip_address: printer.ip_address,
      port: printer.port,
      protocol: printer.protocol,
      paper_width: printer.paper_width || 42
    }
  };
}

export async function enqueuePrintJob({
  companyId,
  printer,
  orderId = null,
  content,
  jobType = 'ORDER'
}) {
  const restaurant = await getRestaurantInfo();
  const ticketBuffer = buildOrderTicket({
    ...content.order,
    items: content.items,
    notes: content.order?.notes
  }, restaurant);

  const result = await query(
    `INSERT INTO print_jobs
      (company_id, printer_id, order_id, job_type, content, payload_base64, status, attempts)
     VALUES (?, ?, ?, ?, ?, ?, 'PENDING', 0)`,
    [
      companyId,
      printer.id,
      orderId,
      jobType,
      JSON.stringify(content),
      ticketBuffer.toString('base64')
    ]
  );

  const jobId = result.insertId;
  log(`Enqueued job #${jobId} printer=#${printer.id}`);

  // Prefer Redis/BullMQ dispatch when available
  try {
    const { enqueueDispatch } = await import('./redisQueue.js');
    const queued = await enqueueDispatch(jobId, companyId);
    if (queued) return jobId;
  } catch {
    // fall through to immediate dispatch
  }

  // Try immediate dispatch
  try {
    await dispatchJob(jobId);
  } catch (e) {
    log(`Immediate dispatch deferred for #${jobId}: ${e.message}`);
  }

  return jobId;
}

export async function dispatchJob(jobId) {
  const [job] = await query(
    `SELECT j.*, p.agent_id, p.ip_address, p.port, p.protocol, p.name as printer_name, p.type as printer_type, p.paper_width
     FROM print_jobs j
     JOIN printers p ON p.id = j.printer_id
     WHERE j.id = ?`,
    [jobId]
  );
  if (!job) throw new Error('Print job niet gevonden');
  if (job.status === 'PRINTED') return { skipped: true, reason: 'already_printed' };

  if (!job.agent_id) {
    await query(
      `UPDATE print_jobs SET status = 'FAILED', error_message = ?, attempts = attempts + 1 WHERE id = ?`,
      ['Printer heeft geen bridge agent gekoppeld', jobId]
    );
    throw new Error('Printer heeft geen bridge agent gekoppeld');
  }

  if (!isAgentOnline(job.agent_id)) {
    await query(
      `UPDATE print_jobs SET status = 'PENDING', error_message = ? WHERE id = ?`,
      ['Agent offline — wacht op herverbinding', jobId]
    );
    throw new Error('Print Bridge agent is offline');
  }

  await query(
    `UPDATE print_jobs SET status = 'PROCESSING', attempts = attempts + 1, error_message = NULL WHERE id = ?`,
    [jobId]
  );

  let content = job.content;
  if (typeof content === 'string') {
    try { content = JSON.parse(content); } catch { content = {}; }
  }

  const message = {
    type: 'PRINT_JOB',
    job_id: job.id,
    printer_id: job.printer_id,
    company_id: job.company_id,
    payload: {
      ...content,
      payload_base64: job.payload_base64,
      printer: {
        id: job.printer_id,
        name: job.printer_name,
        type: job.printer_type,
        ip_address: job.ip_address,
        port: job.port,
        protocol: job.protocol,
        paper_width: job.paper_width || 42
      }
    }
  };

  // Fire and forget; agent reports JOB_RESULT
  await sendToAgent(job.agent_id, message, { wait: false });
  return { dispatched: true, job_id: jobId };
}

export async function applyJobResult(jobId, result) {
  const success = result.success === true || result.status === 'PRINTED';
  if (success) {
    await query(
      `UPDATE print_jobs SET status = 'PRINTED', printed_at = NOW(), error_message = NULL WHERE id = ?`,
      [jobId]
    );
    const [job] = await query('SELECT printer_id FROM print_jobs WHERE id = ?', [jobId]);
    if (job) {
      await query(`UPDATE printers SET status = 'ONLINE' WHERE id = ?`, [job.printer_id]);
    }
  } else {
    const [job] = await query('SELECT attempts, max_attempts FROM print_jobs WHERE id = ?', [jobId]);
    const failedPermanently = job && Number(job.attempts) >= Number(job.max_attempts);
    await query(
      `UPDATE print_jobs SET status = ?, error_message = ? WHERE id = ?`,
      [failedPermanently ? 'FAILED' : 'PENDING', result.error || result.message || 'Print mislukt', jobId]
    );
  }
}

export async function applyTestResult(testId, result) {
  const success = result.success === true;
  await query(
    `UPDATE printer_tests
     SET status = ?, response_time_ms = ?, error = ?
     WHERE id = ?`,
    [
      success ? 'SUCCESS' : 'FAILED',
      result.response_time_ms ?? null,
      success ? null : (result.error || result.message || 'Test mislukt'),
      testId
    ]
  );

  const [test] = await query('SELECT printer_id FROM printer_tests WHERE id = ?', [testId]);
  if (test) {
    await query(
      `UPDATE printers SET status = ? WHERE id = ?`,
      [success ? 'ONLINE' : 'ERROR', test.printer_id]
    );
  }
}

export async function dispatchPendingForAgent(agentId) {
  const jobs = await query(
    `SELECT j.id
     FROM print_jobs j
     JOIN printers p ON p.id = j.printer_id
     WHERE p.agent_id = ? AND j.status = 'PENDING'
     ORDER BY j.created_at ASC
     LIMIT 50`,
    [agentId]
  );
  for (const job of jobs) {
    try {
      await dispatchJob(job.id);
    } catch (e) {
      log(`Retry failed job #${job.id}: ${e.message}`);
    }
  }
  return jobs.length;
}

/**
 * Create print jobs for an order using routing rules
 */
export async function printOrderViaBridge(orderId, { companyId = null } = {}) {
  const cid = companyId || await getDefaultCompanyId();

  const [order] = await query(
    `SELECT o.*, a.street, a.house_number, a.bus, a.postal_code, a.city
     FROM orders o
     LEFT JOIN addresses a ON o.address_id = a.id
     WHERE o.id = ?`,
    [orderId]
  );
  if (!order) throw new Error('Bestelling niet gevonden');

  const items = await query(
    `SELECT oi.*, c.slug as category_slug, c.name as category_name
     FROM order_items oi
     LEFT JOIN products p ON p.id = oi.product_id
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE oi.order_id = ?
     ORDER BY oi.id`,
    [orderId]
  );

  const targets = await resolvePrintersForOrder(order, items, cid);
  if (!targets.length) {
    throw new Error('Geen printers geconfigureerd. Voeg eerst een printer + bridge agent toe.');
  }

  const jobIds = [];
  for (const target of targets) {
    const content = buildJobContent({
      order,
      items: target.items,
      ticketKind: target.ticket_kind,
      printer: target.printer
    });
    const jobId = await enqueuePrintJob({
      companyId: cid,
      printer: target.printer,
      orderId,
      content,
      jobType: target.ticket_kind
    });
    jobIds.push(jobId);
  }

  // Mark order printed metadata
  await query(
    `UPDATE orders SET print_count = print_count + 1, printed_at = NOW() WHERE id = ?`,
    [orderId]
  );

  return { job_ids: jobIds, printers: targets.map((t) => ({ id: t.printer.id, name: t.printer.name, type: t.printer.type })) };
}

export async function listPrintJobs(companyId, { status = null, limit = 50 } = {}) {
  const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
  let sql = `
    SELECT j.*, p.name as printer_name, p.type as printer_type, o.order_number
    FROM print_jobs j
    JOIN printers p ON p.id = j.printer_id
    LEFT JOIN orders o ON o.id = j.order_id
    WHERE j.company_id = ?
  `;
  const params = [companyId];
  if (status) {
    sql += ' AND j.status = ?';
    params.push(status);
  }
  sql += ` ORDER BY j.created_at DESC LIMIT ${lim}`;
  const rows = await query(sql, params);
  rows.forEach((r) => {
    if (typeof r.content === 'string') {
      try { r.content = JSON.parse(r.content); } catch { /* ignore */ }
    }
  });
  return rows;
}

export async function retryPendingJobs(limit = 100) {
  const lim = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500);
  const jobs = await query(
    `SELECT j.id
     FROM print_jobs j
     JOIN printers p ON p.id = j.printer_id
     JOIN printer_agents a ON a.id = p.agent_id
     WHERE j.status = 'PENDING' AND a.status = 'ONLINE'
     ORDER BY j.created_at ASC
     LIMIT ${lim}`
  );
  let ok = 0;
  for (const job of jobs) {
    try {
      await dispatchJob(job.id);
      ok += 1;
    } catch {
      // remain pending
    }
  }
  return ok;
}

// Background retry loop (MySQL fallback when Redis unavailable)
let retryTimer = null;
export function startPrintQueueWorker() {
  import('./redisQueue.js').then(async ({ startBullPrintWorker, isRedisQueueEnabled }) => {
    if (isRedisQueueEnabled()) {
      const ok = await startBullPrintWorker(dispatchJob);
      if (ok) {
        log('BullMQ worker active (MySQL poller as backup every 60s)');
        if (!retryTimer) {
          retryTimer = setInterval(() => {
            retryPendingJobs(50).catch((e) => log('backup worker error', e.message));
          }, 60000);
        }
        return;
      }
    }
    if (retryTimer) return;
    retryTimer = setInterval(() => {
      retryPendingJobs(50).catch((e) => log('worker error', e.message));
    }, 20000);
    log('Queue worker started (MySQL interval)');
  }).catch(() => {
    if (retryTimer) return;
    retryTimer = setInterval(() => {
      retryPendingJobs(50).catch((e) => log('worker error', e.message));
    }, 20000);
    log('Queue worker started (MySQL interval)');
  });
}
