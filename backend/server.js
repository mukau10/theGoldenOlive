/**
 * The Golden Olive - Delivery & Order System
 * Main Server Entry Point
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import categoryRoutes from './routes/categories.js';
import orderRoutes from './routes/orders.js';
import paymentRoutes from './routes/payments.js';
import adminRoutes from './routes/admin.js';
import antiBotRoutes from './routes/antibot.js';
import menuRoutes from './routes/menu.js';
import integrationRoutes from './routes/integrations.js';
import printerRoutes from './routes/printers.js';
import companyRoutes from './routes/companies.js';
import billingRoutes from './routes/billing.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { requestContextMiddleware, metricsHandler } from './middleware/observability.js';
import { attachPrintBridgeHub, getBridgeStats } from './services/print/bridgeHub.js';
import { startPrintQueueWorker } from './services/print/queue.js';
import { getRedisStatus } from './services/print/redisQueue.js';
import { query, testConnection } from './config/database.js';
import { assertProductionSecurity } from './utils/securityBootstrap.js';
import { logger } from './utils/logger.js';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

assertProductionSecurity();

// Initialize Express app
const app = express();

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Request ID + metrics timing (before routes)
app.use(requestContextMiddleware);

// Security middleware — CSP allowlist for admin HTML (CDN Bootstrap/Leaflet)
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://unpkg.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://unpkg.com'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      fontSrc: ["'self'", 'https://cdn.jsdelivr.net', 'data:'],
      connectSrc: ["'self'", 'https://cdn.jsdelivr.net', 'https://unpkg.com', 'ws:', 'wss:'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
const corsOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001',
  'https://the-goldenolive.be',
  'https://thegoldenolive.be',
  'http://192.168.0.55:5087'
].filter(Boolean);

app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Admin-Pin',
    'X-Api-Key',
    'X-Company-Id',
    'X-Request-Id'
  ],
  exposedHeaders: ['X-Request-Id']
}));

// Rate limiting — public endpoints
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: 'Te veel verzoeken, probeer het later opnieuw.' } }
});

// Auth has its own stricter login limiter in routes/auth.js.
// Skip heavy polling paths for authenticated dashboards.
app.use('/api/', (req, res, next) => {
  const p = req.path || '';
  if (
    p.startsWith('/admin') ||
    p.startsWith('/auth') ||
    p.startsWith('/integrations') ||
    p.startsWith('/companies') ||
    p.startsWith('/billing') ||
    p.startsWith('/printers') ||
    p.startsWith('/printer-agents') ||
    p.startsWith('/print-jobs') ||
    p.startsWith('/printer-rules') ||
    p.startsWith('/orders/') ||
    p === '/health' ||
    p === '/metrics'
  ) return next();
  return limiter(req, res, next);
});

// Body parsing middleware (keep raw body for webhook signature verification)
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve admin HTML without browser cache so UI updates show up immediately
app.get(['/admin', '/admin/', '/admin/index.html'], (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.sendFile(path.join(__dirname, 'public/admin/index.html'));
});

// Serve static files for admin panel
app.use('/admin', express.static(path.join(__dirname, 'public/admin'), {
  etag: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-store');
    }
  }
}));
// Serve shared public images (logo/favicon) for admin UI
app.use('/img', express.static(path.join(__dirname, '../public/img')));

// Health + metrics before /api catch-all routers (printers mounts authenticate on /api)
app.get('/api/health', async (req, res) => {
  let dbOk = false;
  let dbError = null;
  try {
    await query('SELECT 1 AS ok');
    dbOk = true;
  } catch (e) {
    dbError = e.message;
  }

  const redis = await getRedisStatus();
  const bridge = getBridgeStats();
  const status = dbOk ? 'ok' : 'degraded';
  res.status(dbOk ? 200 : 503).json({
    status,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    checks: {
      database: dbOk ? 'up' : 'down',
      database_error: dbError,
      redis: redis.enabled
        ? (redis.ready ? 'up' : 'down')
        : 'disabled',
      redis_error: redis.error || undefined,
      print_bridge: {
        online_agents: bridge.online_agents,
        agent_ids: bridge.agents
      }
    }
  });
});

app.get('/api/metrics', metricsHandler);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/antibot', antiBotRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api', printerRoutes);

// Serve admin panel for any /admin route
app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/index.html'));
});

// 404 handler
app.use(notFound);

// Error handler
app.use(errorHandler);

// HTTP + WebSocket Print Bridge Hub
const PORT = process.env.PORT || 5087;
const server = http.createServer(app);
attachPrintBridgeHub(server);
startPrintQueueWorker();

server.listen(PORT, async () => {
  await testConnection();
  logger.info('Server started', { port: PORT, env: process.env.NODE_ENV || 'development' });
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║     The Golden Olive - Delivery & Order System            ║
╠═══════════════════════════════════════════════════════════╣
║  Server running on port ${PORT}                              ║
║  Environment: ${process.env.NODE_ENV || 'development'}                            ║
║  API: http://localhost:${PORT}/api                           ║
║  Admin: http://localhost:${PORT}/admin                       ║
║  Print Bridge WS: ws://localhost:${PORT}/ws/print-bridge     ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

function shutdown(signal) {
  logger.info('Graceful shutdown', { signal });
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
