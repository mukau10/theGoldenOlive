/**
 * Request ID + Prometheus metrics
 */

import { randomUUID } from 'crypto';
import client from 'prom-client';
import { runWithRequestId } from '../utils/logger.js';

const register = new client.Registry();
client.collectDefaultMetrics({ register });

export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register]
});

export const printJobsGauge = new client.Gauge({
  name: 'print_jobs_pending',
  help: 'Pending print jobs',
  registers: [register]
});

export const bridgeAgentsGauge = new client.Gauge({
  name: 'print_bridge_agents_online',
  help: 'Online print bridge agents',
  registers: [register]
});

export function requestContextMiddleware(req, res, next) {
  const id = req.headers['x-request-id'] || randomUUID();
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    const route = req.route?.path ? `${req.baseUrl}${req.route.path}` : req.path;
    end({ method: req.method, route, status_code: String(res.statusCode) });
  });
  runWithRequestId(id, () => next());
}

export async function metricsHandler(req, res) {
  try {
    const { query } = await import('../config/database.js');
    const { getBridgeStats } = await import('../services/print/bridgeHub.js');
    const [pending] = await query(
      `SELECT COUNT(*) AS c FROM print_jobs WHERE status = 'PENDING'`
    ).catch(() => [{ c: 0 }]);
    printJobsGauge.set(Number(pending?.c || 0));
    bridgeAgentsGauge.set(Number(getBridgeStats().online_agents || 0));
  } catch {
    // ignore metric refresh errors
  }
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
}

export { register as metricsRegistry };
