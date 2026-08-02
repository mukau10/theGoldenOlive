/**
 * Print Bridge WebSocket Hub
 * Cloud <-> restaurant local agents
 */

import { WebSocketServer } from 'ws';
import crypto from 'crypto';
import { query } from '../../config/database.js';

/** @type {Map<number, import('ws').WebSocket>} agentId -> socket */
const agentSockets = new Map();

/** @type {Map<string, {resolve:Function, reject:Function, timer:NodeJS.Timeout}>} */
const pendingAcks = new Map();

function log(...args) {
  console.log('[PrintBridge]', ...args);
}

export function hashApiKey(apiKey) {
  return crypto.createHash('sha256').update(String(apiKey)).digest('hex');
}

export function generateApiKey() {
  const raw = `pb_${crypto.randomBytes(24).toString('hex')}`;
  return {
    apiKey: raw,
    prefix: raw.slice(0, 10),
    hash: hashApiKey(raw)
  };
}

async function findAgentByApiKey(apiKey) {
  if (!apiKey) return null;
  const hash = hashApiKey(apiKey);
  const prefix = String(apiKey).slice(0, 10);
  const [agent] = await query(
    `SELECT * FROM printer_agents WHERE api_key_hash = ? AND api_key_prefix = ? LIMIT 1`,
    [hash, prefix]
  );
  return agent || null;
}

async function setAgentStatus(agentId, status) {
  await query(
    `UPDATE printer_agents SET status = ?, last_seen = NOW() WHERE id = ?`,
    [status, agentId]
  );
}

function sendJson(ws, message) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(message));
  }
}

function waitForAck(requestId, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingAcks.delete(requestId);
      reject(new Error('Bridge timeout: geen antwoord van lokale agent'));
    }, timeoutMs);
    pendingAcks.set(requestId, { resolve, reject, timer });
  });
}

function resolveAck(requestId, payload) {
  const pending = pendingAcks.get(requestId);
  if (!pending) return;
  clearTimeout(pending.timer);
  pendingAcks.delete(requestId);
  pending.resolve(payload);
}

/**
 * Attach WebSocket server to existing HTTP server
 */
export function attachPrintBridgeHub(httpServer) {
  const wss = new WebSocketServer({
    server: httpServer,
    path: '/ws/print-bridge'
  });

  wss.on('connection', async (ws, req) => {
    let agent = null;
    try {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const apiKey = url.searchParams.get('api_key')
        || String(req.headers['x-api-key'] || '').trim()
        || String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();

      agent = await findAgentByApiKey(apiKey);
      if (!agent) {
        sendJson(ws, { type: 'ERROR', message: 'Unauthorized' });
        ws.close(1008, 'Unauthorized');
        return;
      }

      // Replace existing socket for this agent
      const existing = agentSockets.get(agent.id);
      if (existing && existing !== ws) {
        try { existing.close(1000, 'Replaced by new connection'); } catch {}
      }

      agentSockets.set(agent.id, ws);
      ws.agentId = agent.id;
      ws.companyId = agent.company_id;
      await setAgentStatus(agent.id, 'ONLINE');
      log(`Agent online #${agent.id} (${agent.name}) company=${agent.company_id}`);

      sendJson(ws, {
        type: 'CONNECTED',
        agent_id: agent.id,
        company_id: agent.company_id,
        channel: `company/${agent.company_id}/printers`
      });

      // Flush pending jobs for this agent's printers
      import('./queue.js').then(({ dispatchPendingForAgent }) => {
        dispatchPendingForAgent(agent.id).catch((e) => log('flush error', e.message));
      });
    } catch (e) {
      log('connection error', e.message);
      ws.close(1011, 'Server error');
      return;
    }

    ws.on('message', async (raw) => {
      let msg;
      try {
        msg = JSON.parse(String(raw));
      } catch {
        return;
      }

      try {
        if (msg.type === 'HEARTBEAT') {
          await setAgentStatus(ws.agentId, 'ONLINE');
          sendJson(ws, { type: 'HEARTBEAT_ACK', ts: Date.now() });
          return;
        }

        if (msg.type === 'ACK' || msg.type === 'JOB_RESULT' || msg.type === 'TEST_RESULT') {
          if (msg.request_id) resolveAck(msg.request_id, msg);
          if (msg.type === 'JOB_RESULT' && msg.job_id) {
            const { applyJobResult } = await import('./queue.js');
            await applyJobResult(msg.job_id, msg);
          }
          if (msg.type === 'TEST_RESULT' && msg.test_id) {
            const { applyTestResult } = await import('./queue.js');
            await applyTestResult(msg.test_id, msg);
          }
          return;
        }

        if (msg.type === 'PRINTER_STATUS' && msg.printer_id) {
          await query(
            `UPDATE printers SET status = ? WHERE id = ? AND company_id = ?`,
            [msg.status || 'UNKNOWN', msg.printer_id, ws.companyId]
          );
        }
      } catch (e) {
        log('message handler error', e.message);
      }
    });

    ws.on('close', async () => {
      if (ws.agentId && agentSockets.get(ws.agentId) === ws) {
        agentSockets.delete(ws.agentId);
        await setAgentStatus(ws.agentId, 'DISCONNECTED');
        log(`Agent disconnected #${ws.agentId}`);
      }
    });

    ws.on('error', (err) => log('socket error', err.message));
  });

  // Mark stale agents offline
  setInterval(async () => {
    try {
      await query(`
        UPDATE printer_agents
        SET status = 'OFFLINE'
        WHERE status = 'ONLINE'
          AND (last_seen IS NULL OR last_seen < (NOW() - INTERVAL 2 MINUTE))
      `);
    } catch (e) {
      log('stale check error', e.message);
    }
  }, 60000);

  log('WebSocket hub listening on /ws/print-bridge');
  return wss;
}

export function isAgentOnline(agentId) {
  const ws = agentSockets.get(Number(agentId));
  return !!(ws && ws.readyState === 1);
}

export function getOnlineAgentIdsForCompany(companyId) {
  const ids = [];
  for (const [agentId, ws] of agentSockets.entries()) {
    if (ws.readyState === 1 && Number(ws.companyId) === Number(companyId)) {
      ids.push(agentId);
    }
  }
  return ids;
}

/**
 * Send a message to a specific agent and optionally wait for ACK/result
 */
export async function sendToAgent(agentId, message, { wait = false, timeoutMs = 20000 } = {}) {
  const ws = agentSockets.get(Number(agentId));
  if (!ws || ws.readyState !== 1) {
    throw new Error('Print Bridge agent is offline');
  }

  const requestId = message.request_id || crypto.randomUUID();
  const payload = { ...message, request_id: requestId };

  if (!wait) {
    sendJson(ws, payload);
    return { sent: true, request_id: requestId };
  }

  const ackPromise = waitForAck(requestId, timeoutMs);
  sendJson(ws, payload);
  return ackPromise;
}

export async function broadcastToCompany(companyId, message) {
  const results = [];
  for (const agentId of getOnlineAgentIdsForCompany(companyId)) {
    try {
      results.push(await sendToAgent(agentId, message, { wait: false }));
    } catch (e) {
      results.push({ error: e.message, agent_id: agentId });
    }
  }
  return results;
}

export function getBridgeStats() {
  return {
    online_agents: agentSockets.size,
    agents: [...agentSockets.keys()]
  };
}
