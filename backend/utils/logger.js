/**
 * Lightweight structured logger (JSON lines)
 * Correlates with X-Request-Id via AsyncLocalStorage when set.
 */

import { AsyncLocalStorage } from 'async_hooks';

const requestStore = new AsyncLocalStorage();

export function runWithRequestId(requestId, fn) {
  return requestStore.run({ requestId }, fn);
}

export function getRequestId() {
  return requestStore.getStore()?.requestId;
}

function base(level, message, meta = {}) {
  const requestId = meta.requestId || getRequestId();
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...(requestId ? { requestId } : {}),
    ...meta
  };
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

/** Optional Sentry no-op until SENTRY_DSN is configured */
export function captureException(err, meta = {}) {
  if (!process.env.SENTRY_DSN) {
    logger.error(err?.message || String(err), { ...meta, stack: err?.stack });
    return;
  }
  // Hook for future @sentry/node init
  logger.error(err?.message || String(err), { ...meta, stack: err?.stack, sentry: true });
}

export const logger = {
  info: (message, meta) => base('info', message, meta),
  warn: (message, meta) => base('warn', message, meta),
  error: (message, meta) => base('error', message, meta),
  debug: (message, meta) => {
    if (process.env.LOG_LEVEL === 'debug') base('debug', message, meta);
  }
};

export default logger;
