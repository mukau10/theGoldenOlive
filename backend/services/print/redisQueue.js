/**
 * Optional BullMQ print dispatch (Redis). Falls back when REDIS_URL missing.
 */

import { logger } from '../../utils/logger.js';

let connection = null;
let queue = null;
let worker = null;
let redisReady = false;

export function isRedisQueueEnabled() {
  return Boolean(process.env.REDIS_URL);
}

export async function getRedisStatus() {
  if (!process.env.REDIS_URL) return { enabled: false, ready: false };
  try {
    if (!connection) {
      const Redis = (await import('ioredis')).default;
      connection = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
        lazyConnect: true
      });
      await connection.connect();
    }
    const pong = await connection.ping();
    redisReady = pong === 'PONG';
    return { enabled: true, ready: redisReady };
  } catch (e) {
    redisReady = false;
    return { enabled: true, ready: false, error: e.message };
  }
}

export async function enqueueDispatch(jobId, companyId) {
  if (!process.env.REDIS_URL) return false;
  try {
    const { Queue } = await import('bullmq');
    if (!connection) {
      const Redis = (await import('ioredis')).default;
      connection = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
    }
    if (!queue) {
      queue = new Queue('print-dispatch', { connection });
    }
    await queue.add('dispatch', { jobId, companyId }, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: 200
    });
    return true;
  } catch (e) {
    logger.warn('Redis enqueue failed, using MySQL poller', { error: e.message, jobId });
    return false;
  }
}

export async function startBullPrintWorker(dispatchJobFn) {
  if (!process.env.REDIS_URL) {
    logger.info('REDIS_URL not set — BullMQ print worker disabled');
    return false;
  }
  try {
    const { Worker } = await import('bullmq');
    if (!connection) {
      const Redis = (await import('ioredis')).default;
      connection = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
    }
    worker = new Worker(
      'print-dispatch',
      async (job) => {
        const { jobId } = job.data || {};
        if (!jobId) return;
        await dispatchJobFn(jobId);
      },
      { connection, concurrency: 5 }
    );
    worker.on('failed', (job, err) => {
      logger.warn('BullMQ print job failed', { jobId: job?.data?.jobId, error: err.message });
    });
    redisReady = true;
    logger.info('BullMQ print worker started');
    return true;
  } catch (e) {
    logger.warn('BullMQ worker failed to start', { error: e.message });
    return false;
  }
}
