/**
 * Printer Bridge + Printer Management API
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, isAdmin } from '../middleware/auth.js';
import { attachTenant, requireActiveSubscription } from '../middleware/tenant.js';
import { AppError } from '../middleware/errorHandler.js';
import { query } from '../config/database.js';
import { generateApiKey, isAgentOnline, sendToAgent, getBridgeStats } from '../services/print/bridgeHub.js';
import {
  printOrderViaBridge,
  listPrintJobs,
  buildJobContent,
  dispatchJob
} from '../services/print/queue.js';
import {
  getDefaultCompanyId,
  listRules,
  upsertRule,
  deleteRule
} from '../services/print/routing.js';
import { buildOrderTicket } from '../services/printer.js';

const router = express.Router();

// All printer management routes are tenant-scoped
router.use(authenticate, attachTenant, requireActiveSubscription);

const agentRegisterLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, error: { message: 'Te veel registraties, probeer later opnieuw.' } }
});

async function companyIdFromReq(req) {
  if (req.companyId) return Number(req.companyId);
  if (req.user?.company_id) return Number(req.user.company_id);
  return getDefaultCompanyId();
}

async function getPrinterForCompany(printerId, companyId) {
  const [printer] = await query(
    `SELECT p.*, a.name as agent_name, a.status as agent_status, a.device_id, a.last_seen
     FROM printers p
     LEFT JOIN printer_agents a ON a.id = p.agent_id
     WHERE p.id = ? AND p.company_id = ?`,
    [printerId, companyId]
  );
  return printer || null;
}

// =====================================================
// AGENTS
// =====================================================

/**
 * POST /api/printer-agents/register
 * Admin creates/registers a bridge agent and receives plaintext API key once
 */
router.post('/printer-agents/register', isAdmin, agentRegisterLimiter, async (req, res, next) => {
  try {
    const companyId = await companyIdFromReq(req);
    const name = String(req.body?.name || 'Restaurant Print Bridge').trim();
    const deviceId = String(req.body?.device_id || `device-${uuidv4()}`).trim();

    const existing = await query(
      `SELECT id FROM printer_agents WHERE device_id = ? LIMIT 1`,
      [deviceId]
    );
    if (existing.length) {
      throw new AppError('device_id bestaat al. Gebruik rotate-key om een nieuwe API key te maken.', 409);
    }

    const key = generateApiKey();
    const result = await query(
      `INSERT INTO printer_agents (company_id, name, device_id, api_key_hash, api_key_prefix, status)
       VALUES (?, ?, ?, ?, ?, 'OFFLINE')`,
      [companyId, name, deviceId, key.hash, key.prefix]
    );

    res.status(201).json({
      success: true,
      message: 'Print Bridge agent geregistreerd. Bewaar de API key veilig — deze wordt niet opnieuw getoond.',
      data: {
        id: result.insertId,
        company_id: companyId,
        name,
        device_id: deviceId,
        api_key: key.apiKey,
        websocket_url: `${req.protocol === 'https' ? 'wss' : 'ws'}://${req.get('host')}/ws/print-bridge`,
        channel: `company/${companyId}/printers`
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/printer-agents
 */
router.get('/printer-agents', async (req, res, next) => {
  try {
    const companyId = await companyIdFromReq(req);
    const agents = await query(
      `SELECT id, company_id, name, device_id, api_key_prefix, status, last_seen, created_at, updated_at
       FROM printer_agents WHERE company_id = ? ORDER BY created_at DESC`,
      [companyId]
    );
    agents.forEach((a) => {
      a.online = isAgentOnline(a.id);
      if (a.online && a.status !== 'ONLINE') a.status = 'ONLINE';
    });
    res.json({ success: true, data: agents, bridge: getBridgeStats() });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/printer-agents/:id/rotate-key
 */
router.post('/printer-agents/:id/rotate-key', isAdmin, async (req, res, next) => {
  try {
    const companyId = await companyIdFromReq(req);
    const [agent] = await query(
      `SELECT * FROM printer_agents WHERE id = ? AND company_id = ?`,
      [req.params.id, companyId]
    );
    if (!agent) throw new AppError('Agent niet gevonden', 404);

    const key = generateApiKey();
    await query(
      `UPDATE printer_agents SET api_key_hash = ?, api_key_prefix = ?, status = 'DISCONNECTED' WHERE id = ?`,
      [key.hash, key.prefix, agent.id]
    );

    res.json({
      success: true,
      message: 'Nieuwe API key aangemaakt. Update de lokale bridge configuratie.',
      data: {
        id: agent.id,
        device_id: agent.device_id,
        api_key: key.apiKey
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/printer-agents/:id
 */
router.delete('/printer-agents/:id', isAdmin, async (req, res, next) => {
  try {
    const companyId = await companyIdFromReq(req);
    await query(`UPDATE printers SET agent_id = NULL WHERE agent_id = ? AND company_id = ?`, [req.params.id, companyId]);
    await query(`DELETE FROM printer_agents WHERE id = ? AND company_id = ?`, [req.params.id, companyId]);
    res.json({ success: true, message: 'Agent verwijderd' });
  } catch (error) {
    next(error);
  }
});

// =====================================================
// PRINTERS
// =====================================================

/**
 * POST /api/printers
 */
router.post('/printers', isAdmin, async (req, res, next) => {
  try {
    const companyId = await companyIdFromReq(req);
    const {
      name, type = 'RECEIPT', ip_address, port = 9100,
      protocol = 'ESC_POS', agent_id = null, is_default = false, paper_width = 42
    } = req.body || {};

    if (!name || !ip_address) throw new AppError('Naam en IP-adres zijn verplicht', 400);
    const validTypes = ['KITCHEN', 'BAR', 'DELIVERY', 'RECEIPT', 'LABEL'];
    const validProtocols = ['ESC_POS', 'RAW_TCP', 'IPP'];
    if (!validTypes.includes(type)) throw new AppError('Ongeldig printer type', 400);
    if (!validProtocols.includes(protocol)) throw new AppError('Ongeldig protocol', 400);

    if (agent_id) {
      const [agent] = await query(
        `SELECT id FROM printer_agents WHERE id = ? AND company_id = ?`,
        [agent_id, companyId]
      );
      if (!agent) throw new AppError('Agent niet gevonden voor dit bedrijf', 404);
    }

    if (is_default) {
      await query(`UPDATE printers SET is_default = 0 WHERE company_id = ?`, [companyId]);
    }

    const result = await query(
      `INSERT INTO printers
        (company_id, agent_id, name, type, ip_address, port, protocol, status, is_default, paper_width)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'UNKNOWN', ?, ?)`,
      [companyId, agent_id || null, name, type, ip_address, Number(port) || 9100, protocol, is_default ? 1 : 0, paper_width || 42]
    );

    const printer = await getPrinterForCompany(result.insertId, companyId);
    res.status(201).json({ success: true, data: printer, message: 'Printer toegevoegd' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/printers
 */
router.get('/printers', async (req, res, next) => {
  try {
    const companyId = await companyIdFromReq(req);
    const printers = await query(
      `SELECT p.*, a.name as agent_name, a.status as agent_status, a.last_seen, a.device_id
       FROM printers p
       LEFT JOIN printer_agents a ON a.id = p.agent_id
       WHERE p.company_id = ?
       ORDER BY p.type, p.name`,
      [companyId]
    );
    printers.forEach((p) => {
      p.agent_online = p.agent_id ? isAgentOnline(p.agent_id) : false;
    });
    res.json({ success: true, data: printers });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/printers/:id
 */
router.put('/printers/:id', isAdmin, async (req, res, next) => {
  try {
    const companyId = await companyIdFromReq(req);
    const printer = await getPrinterForCompany(req.params.id, companyId);
    if (!printer) throw new AppError('Printer niet gevonden', 404);

    const {
      name, type, ip_address, port, protocol, agent_id, is_default, paper_width
    } = req.body || {};

    if (is_default) {
      await query(`UPDATE printers SET is_default = 0 WHERE company_id = ?`, [companyId]);
    }

    await query(
      `UPDATE printers SET
        name = COALESCE(?, name),
        type = COALESCE(?, type),
        ip_address = COALESCE(?, ip_address),
        port = COALESCE(?, port),
        protocol = COALESCE(?, protocol),
        agent_id = ?,
        is_default = COALESCE(?, is_default),
        paper_width = COALESCE(?, paper_width)
       WHERE id = ? AND company_id = ?`,
      [
        name ?? null,
        type ?? null,
        ip_address ?? null,
        port != null ? Number(port) : null,
        protocol ?? null,
        agent_id === undefined ? printer.agent_id : (agent_id || null),
        is_default === undefined ? null : (is_default ? 1 : 0),
        paper_width != null ? Number(paper_width) : null,
        printer.id,
        companyId
      ]
    );

    const updated = await getPrinterForCompany(printer.id, companyId);
    res.json({ success: true, data: updated, message: 'Printer bijgewerkt' });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/printers/:id
 */
router.delete('/printers/:id', isAdmin, async (req, res, next) => {
  try {
    const companyId = await companyIdFromReq(req);
    await query(`DELETE FROM printer_rules WHERE printer_id = ? AND company_id = ?`, [req.params.id, companyId]);
    await query(`DELETE FROM printers WHERE id = ? AND company_id = ?`, [req.params.id, companyId]);
    res.json({ success: true, message: 'Printer verwijderd' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/printers/test
 * Body: { printer_id }
 */
router.post('/printers/test', async (req, res, next) => {
  try {
    const companyId = await companyIdFromReq(req);
    const printerId = req.body?.printer_id;
    if (!printerId) throw new AppError('printer_id is verplicht', 400);

    const printer = await getPrinterForCompany(printerId, companyId);
    if (!printer) throw new AppError('Printer niet gevonden', 404);
    if (!printer.agent_id) throw new AppError('Koppel eerst een Print Bridge agent aan deze printer', 400);
    if (!isAgentOnline(printer.agent_id)) throw new AppError('Print Bridge agent is offline', 503);

    const testResult = await query(
      `INSERT INTO printer_tests (printer_id, company_id, test_type, status)
       VALUES (?, ?, 'CONNECTION', 'PENDING')`,
      [printer.id, companyId]
    );
    const testId = testResult.insertId;

    const result = await sendToAgent(printer.agent_id, {
      type: 'TEST_CONNECTION',
      test_id: testId,
      printer_id: printer.id,
      payload: {
        ip_address: printer.ip_address,
        port: printer.port,
        protocol: printer.protocol
      }
    }, { wait: true, timeoutMs: 12000 });

    const success = result.success === true;
    await query(
      `UPDATE printer_tests SET status = ?, response_time_ms = ?, error = ? WHERE id = ?`,
      [success ? 'SUCCESS' : 'FAILED', result.response_time_ms ?? null, success ? null : (result.error || 'Test mislukt'), testId]
    );
    await query(
      `UPDATE printers SET status = ? WHERE id = ?`,
      [success ? 'ONLINE' : 'ERROR', printer.id]
    );

    res.json({
      success: true,
      data: {
        test_id: testId,
        connected: success,
        response_time_ms: result.response_time_ms ?? null,
        error: success ? null : (result.error || result.message || null)
      },
      message: success ? 'Verbinding OK' : 'Verbinding mislukt'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/printers/test-print
 */
router.post('/printers/test-print', async (req, res, next) => {
  try {
    const companyId = await companyIdFromReq(req);
    const printerId = req.body?.printer_id;
    if (!printerId) throw new AppError('printer_id is verplicht', 400);

    const printer = await getPrinterForCompany(printerId, companyId);
    if (!printer) throw new AppError('Printer niet gevonden', 404);
    if (!printer.agent_id) throw new AppError('Koppel eerst een Print Bridge agent aan deze printer', 400);
    if (!isAgentOnline(printer.agent_id)) throw new AppError('Print Bridge agent is offline', 503);

    const testResult = await query(
      `INSERT INTO printer_tests (printer_id, company_id, test_type, status)
       VALUES (?, ?, 'PRINT', 'PENDING')`,
      [printer.id, companyId]
    );
    const testId = testResult.insertId;

    const sampleOrder = {
      order_number: 'TEST-PRINT',
      delivery_type: 'pickup',
      status: 'paid',
      created_at: new Date().toISOString(),
      customer_name: 'Test Print',
      customer_phone: '',
      subtotal: 0,
      delivery_fee: 0,
      discount_amount: 0,
      total: 0,
      items: [{ product_name: 'Testticket Print Bridge', quantity: 1, product_price: 0, subtotal: 0 }],
      notes: `Testprint via ${printer.name} (${printer.ip_address}:${printer.port})`
    };

    const restaurantRows = await query(
      `SELECT setting_key, setting_value FROM company_settings
       WHERE company_id = ? AND setting_key IN ('restaurant_name','restaurant_address','restaurant_phone')`,
      [companyId]
    );
    const info = {
      name: restaurantRows.find((r) => r.setting_key === 'restaurant_name')?.setting_value || 'The Golden Olive',
      address: restaurantRows.find((r) => r.setting_key === 'restaurant_address')?.setting_value || '',
      phone: restaurantRows.find((r) => r.setting_key === 'restaurant_phone')?.setting_value || ''
    };

    const ticket = buildOrderTicket(sampleOrder, info);
    const content = buildJobContent({
      order: sampleOrder,
      items: sampleOrder.items,
      ticketKind: 'RECEIPT',
      printer
    });

    let bridgeResult = null;
    try {
      bridgeResult = await sendToAgent(printer.agent_id, {
        type: 'TEST_PRINT',
        test_id: testId,
        printer_id: printer.id,
        payload: {
          ...content,
          payload_base64: ticket.toString('base64'),
          printer: {
            id: printer.id,
            name: printer.name,
            ip_address: printer.ip_address,
            port: printer.port,
            protocol: printer.protocol
          }
        }
      }, { wait: true, timeoutMs: 20000 });
    } catch (e) {
      bridgeResult = { success: false, error: e.message };
    }

    const success = bridgeResult?.success === true;
    await query(
      `UPDATE printer_tests SET status = ?, response_time_ms = ?, error = ? WHERE id = ?`,
      [success ? 'SUCCESS' : 'FAILED', bridgeResult?.response_time_ms ?? null, success ? null : (bridgeResult?.error || 'Testprint mislukt'), testId]
    );
    await query(
      `UPDATE printers SET status = ? WHERE id = ?`,
      [success ? 'ONLINE' : 'ERROR', printer.id]
    );

    res.json({
      success: true,
      data: {
        test_id: testId,
        printed: success,
        response_time_ms: bridgeResult?.response_time_ms ?? null,
        error: success ? null : (bridgeResult?.error || null)
      },
      message: success ? 'Testticket verzonden' : 'Testprint mislukt of timeout'
    });
  } catch (error) {
    next(error);
  }
});

// =====================================================
// PRINT JOBS
// =====================================================

router.get('/print-jobs', async (req, res, next) => {
  try {
    const companyId = await companyIdFromReq(req);
    const jobs = await listPrintJobs(companyId, {
      status: req.query.status || null,
      limit: req.query.limit || 50
    });
    res.json({ success: true, data: jobs });
  } catch (error) {
    next(error);
  }
});

router.post('/print-jobs/:id/retry', async (req, res, next) => {
  try {
    const companyId = await companyIdFromReq(req);
    const [job] = await query(
      `SELECT id FROM print_jobs WHERE id = ? AND company_id = ?`,
      [req.params.id, companyId]
    );
    if (!job) throw new AppError('Print job niet gevonden', 404);
    await query(`UPDATE print_jobs SET status = 'PENDING', error_message = NULL WHERE id = ?`, [job.id]);
    const result = await dispatchJob(job.id);
    res.json({ success: true, data: result, message: 'Job opnieuw verzonden' });
  } catch (error) {
    next(error);
  }
});

// =====================================================
// ORDER PRINT
// =====================================================

router.post('/orders/:id/print', async (req, res, next) => {
  try {
    const companyId = await companyIdFromReq(req);
    const result = await printOrderViaBridge(req.params.id, { companyId });
    res.json({
      success: true,
      data: result,
      message: `Print jobs aangemaakt (${result.job_ids.length})`
    });
  } catch (error) {
    next(error);
  }
});

// =====================================================
// RULES
// =====================================================

router.get('/printer-rules', async (req, res, next) => {
  try {
    const companyId = await companyIdFromReq(req);
    const rules = await listRules(companyId);
    res.json({ success: true, data: rules });
  } catch (error) {
    next(error);
  }
});

router.post('/printer-rules', isAdmin, async (req, res, next) => {
  try {
    const companyId = await companyIdFromReq(req);
    const { category, printer_id, priority = 0 } = req.body || {};
    if (!category || !printer_id) throw new AppError('category en printer_id zijn verplicht', 400);
    const printer = await getPrinterForCompany(printer_id, companyId);
    if (!printer) throw new AppError('Printer niet gevonden', 404);
    await upsertRule({ companyId, category, printerId: printer_id, priority });
    res.status(201).json({ success: true, message: 'Regel opgeslagen' });
  } catch (error) {
    next(error);
  }
});

router.delete('/printer-rules/:id', isAdmin, async (req, res, next) => {
  try {
    const companyId = await companyIdFromReq(req);
    await deleteRule(req.params.id, companyId);
    res.json({ success: true, message: 'Regel verwijderd' });
  } catch (error) {
    next(error);
  }
});

export default router;
