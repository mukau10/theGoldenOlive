/**
 * The Golden Olive — Local Print Bridge Agent
 *
 * Run on the restaurant LAN so the cloud VPS can reach local ESC/POS printers.
 *
 * Usage:
 *   PRINT_BRIDGE_URL=wss://your-vps.example/ws/print-bridge \
 *   PRINT_BRIDGE_API_KEY=pb_xxx \
 *   node agent.js
 *
 * Or with config file:
 *   node agent.js --config ./bridge.config.json
 */

import fs from 'fs';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';
import WebSocket from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadConfig() {
  const args = process.argv.slice(2);
  let configPath = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--config' && args[i + 1]) configPath = args[i + 1];
  }

  let fileConfig = {};
  const defaultPath = path.join(__dirname, 'bridge.config.json');
  const resolved = configPath || (fs.existsSync(defaultPath) ? defaultPath : null);
  if (resolved) {
    fileConfig = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  }

  return {
    url: process.env.PRINT_BRIDGE_URL || fileConfig.url || 'ws://localhost:5087/ws/print-bridge',
    apiKey: process.env.PRINT_BRIDGE_API_KEY || fileConfig.api_key || '',
    reconnectMs: Number(process.env.PRINT_BRIDGE_RECONNECT_MS || fileConfig.reconnect_ms || 3000),
    heartbeatMs: Number(process.env.PRINT_BRIDGE_HEARTBEAT_MS || fileConfig.heartbeat_ms || 20000),
    connectTimeoutMs: Number(fileConfig.connect_timeout_ms || 5000)
  };
}

function log(...args) {
  console.log(`[${new Date().toISOString()}]`, ...args);
}

function send(ws, msg) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function tcpConnect({ host, port, timeoutMs = 5000 }) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let settled = false;
    const done = (err, sock) => {
      if (settled) return;
      settled = true;
      if (err) reject(err);
      else resolve(sock);
    };
    socket.setTimeout(timeoutMs);
    socket.once('error', (e) => done(e));
    socket.once('timeout', () => done(new Error('TCP timeout')));
    socket.connect(Number(port) || 9100, host, () => done(null, socket));
  });
}

async function testConnection({ ip_address, port }, timeoutMs) {
  const started = Date.now();
  const socket = await tcpConnect({ host: ip_address, port, timeoutMs });
  socket.destroy();
  return { success: true, response_time_ms: Date.now() - started };
}

async function rawPrint({ ip_address, port }, data, timeoutMs) {
  const started = Date.now();
  const socket = await tcpConnect({ host: ip_address, port, timeoutMs });
  await new Promise((resolve, reject) => {
    socket.write(data, (err) => {
      if (err) reject(err);
      else socket.end(resolve);
    });
  });
  return { success: true, response_time_ms: Date.now() - started };
}

function buildFallbackTicket(payload) {
  const ESC = '\x1B';
  const GS = '\x1D';
  const lines = [];
  const order = payload?.order || {};
  const items = payload?.items || [];
  lines.push(`${ESC}@`);
  lines.push(`${ESC}a\x01${ESC}!\x18${payload?.title || 'BESTELLING'}${ESC}!\x00\n`);
  lines.push(`${ESC}a\x00`);
  lines.push(`Order: ${order.order_number || '-'}\n`);
  lines.push(`Klant: ${order.customer_name || '-'}\n`);
  lines.push(`Type: ${order.delivery_type || '-'}\n`);
  lines.push(`${'-'.repeat(32)}\n`);
  for (const item of items) {
    lines.push(`${item.quantity || 1}x ${item.name || item.product_name || 'Item'}\n`);
    if (item.notes) lines.push(`  > ${item.notes}\n`);
  }
  lines.push(`${'-'.repeat(32)}\n`);
  if (order.total != null) lines.push(`Totaal: €${Number(order.total).toFixed(2)}\n`);
  lines.push(`\n\n${GS}V\x00`);
  return Buffer.from(lines.join(''), 'latin1');
}

async function handlePrintJob(ws, msg, config) {
  const payload = msg.payload || {};
  const printer = payload.printer || {};
  const started = Date.now();
  try {
    let data;
    if (payload.payload_base64) {
      data = Buffer.from(payload.payload_base64, 'base64');
    } else {
      data = buildFallbackTicket(payload);
    }

    const result = await rawPrint(
      { ip_address: printer.ip_address, port: printer.port },
      data,
      config.connectTimeoutMs
    );

    send(ws, {
      type: 'JOB_RESULT',
      request_id: msg.request_id,
      job_id: msg.job_id,
      printer_id: msg.printer_id || printer.id,
      success: true,
      status: 'PRINTED',
      response_time_ms: result.response_time_ms || (Date.now() - started)
    });
    log(`Printed job #${msg.job_id} -> ${printer.ip_address}:${printer.port}`);
  } catch (e) {
    send(ws, {
      type: 'JOB_RESULT',
      request_id: msg.request_id,
      job_id: msg.job_id,
      printer_id: msg.printer_id || printer.id,
      success: false,
      status: 'FAILED',
      error: e.message,
      response_time_ms: Date.now() - started
    });
    log(`Print failed job #${msg.job_id}: ${e.message}`);
  }
}

async function handleTestConnection(ws, msg, config) {
  const payload = msg.payload || {};
  const started = Date.now();
  try {
    const result = await testConnection(payload, config.connectTimeoutMs);
    send(ws, {
      type: 'TEST_RESULT',
      request_id: msg.request_id,
      test_id: msg.test_id,
      printer_id: msg.printer_id,
      success: true,
      response_time_ms: result.response_time_ms
    });
    log(`Connection OK ${payload.ip_address}:${payload.port} (${result.response_time_ms}ms)`);
  } catch (e) {
    send(ws, {
      type: 'TEST_RESULT',
      request_id: msg.request_id,
      test_id: msg.test_id,
      printer_id: msg.printer_id,
      success: false,
      error: e.message,
      response_time_ms: Date.now() - started
    });
    log(`Connection FAIL ${payload.ip_address}:${payload.port}: ${e.message}`);
  }
}

async function handleTestPrint(ws, msg, config) {
  // Same as print job, but also returns TEST_RESULT for UI latency
  await handlePrintJob(ws, msg, config);
  // TEST_RESULT is also emitted for the waiting cloud request
  // Re-run quick ack based on last JOB_RESULT is complex; send explicit test result after print
  const payload = msg.payload || {};
  const printer = payload.printer || {};
  const started = Date.now();
  try {
    let data = payload.payload_base64
      ? Buffer.from(payload.payload_base64, 'base64')
      : buildFallbackTicket(payload);
    // If handlePrintJob already printed, don't double-print — only ack test
    // Actually handlePrintJob already printed. Just send TEST_RESULT success.
    send(ws, {
      type: 'TEST_RESULT',
      request_id: msg.request_id,
      test_id: msg.test_id,
      job_id: msg.job_id,
      printer_id: msg.printer_id || printer.id,
      success: true,
      response_time_ms: Date.now() - started
    });
  } catch (e) {
    send(ws, {
      type: 'TEST_RESULT',
      request_id: msg.request_id,
      test_id: msg.test_id,
      success: false,
      error: e.message,
      response_time_ms: Date.now() - started
    });
  }
}

function connect(config) {
  if (!config.apiKey) {
    console.error('Missing PRINT_BRIDGE_API_KEY / api_key in config');
    process.exit(1);
  }

  const url = new URL(config.url);
  url.searchParams.set('api_key', config.apiKey);

  log(`Connecting to ${url.origin}${url.pathname} ...`);
  const ws = new WebSocket(url.toString());

  let heartbeatTimer = null;

  ws.on('open', () => {
    log('Connected to cloud Print Bridge hub');
    heartbeatTimer = setInterval(() => {
      send(ws, { type: 'HEARTBEAT', ts: Date.now() });
    }, config.heartbeatMs);
  });

  ws.on('message', async (raw) => {
    let msg;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      return;
    }

    if (msg.type === 'CONNECTED') {
      log(`Authenticated agent #${msg.agent_id} company=#${msg.company_id}`);
      return;
    }
    if (msg.type === 'HEARTBEAT_ACK') return;

    if (msg.type === 'PRINT_JOB') {
      await handlePrintJob(ws, msg, config);
      return;
    }
    if (msg.type === 'TEST_CONNECTION') {
      await handleTestConnection(ws, msg, config);
      return;
    }
    if (msg.type === 'TEST_PRINT') {
      // Print once, then report test result (avoid double print)
      const payload = msg.payload || {};
      const printer = payload.printer || {};
      const started = Date.now();
      try {
        const data = payload.payload_base64
          ? Buffer.from(payload.payload_base64, 'base64')
          : buildFallbackTicket(payload);
        const result = await rawPrint(
          { ip_address: printer.ip_address, port: printer.port },
          data,
          config.connectTimeoutMs
        );
        send(ws, {
          type: 'JOB_RESULT',
          request_id: msg.request_id,
          job_id: msg.job_id,
          printer_id: msg.printer_id || printer.id,
          success: true,
          status: 'PRINTED',
          response_time_ms: result.response_time_ms
        });
        send(ws, {
          type: 'TEST_RESULT',
          request_id: msg.request_id,
          test_id: msg.test_id,
          job_id: msg.job_id,
          printer_id: msg.printer_id || printer.id,
          success: true,
          response_time_ms: result.response_time_ms || (Date.now() - started)
        });
      } catch (e) {
        send(ws, {
          type: 'JOB_RESULT',
          request_id: msg.request_id,
          job_id: msg.job_id,
          success: false,
          error: e.message
        });
        send(ws, {
          type: 'TEST_RESULT',
          request_id: msg.request_id,
          test_id: msg.test_id,
          success: false,
          error: e.message,
          response_time_ms: Date.now() - started
        });
      }
      return;
    }

    log('Unknown message', msg.type);
  });

  ws.on('close', (code, reason) => {
    log(`Disconnected (${code}) ${reason || ''}. Reconnecting in ${config.reconnectMs}ms`);
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    setTimeout(() => connect(config), config.reconnectMs);
  });

  ws.on('error', (err) => {
    log('WebSocket error:', err.message);
  });
}

const config = loadConfig();
log('Print Bridge Agent starting...');
log(`Hub: ${config.url}`);
connect(config);
