/**
 * Admin UI server (port 5088)
 * - Serves the admin dashboard at http://localhost:5088/admin/
 * - Proxies /api/* to the backend server on http://localhost:5087
 *
 * This keeps the backend on 5087 while allowing a separate admin port.
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ADMIN_PORT = process.env.ADMIN_PORT || 5088;
const BACKEND_TARGET = process.env.ADMIN_API_TARGET || 'http://localhost:5087';

const app = express();

// Proxy API calls to backend (so admin can keep using "/api/..." without CORS)
app.use(
  '/api',
  createProxyMiddleware({
    target: BACKEND_TARGET,
    changeOrigin: true,
    xfwd: true,
    // Express strips the mount path (/api) from req.url for this middleware.
    // Add it back so backend still receives /api/...
    pathRewrite: (path) => `/api${path}`,
    // Keep path as-is (/api/...)
    logLevel: 'warn',
  })
);

// Serve shared public images (logo/favicon) for admin UI
app.use('/img', express.static(path.join(__dirname, '../public/img')));

// Serve admin static files under /admin
const adminDir = path.join(__dirname, 'public/admin');
app.use('/admin', express.static(adminDir));

// Ensure /admin loads SPA
app.get('/admin', (req, res) => res.redirect('/admin/'));
app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(adminDir, 'index.html'));
});

app.listen(ADMIN_PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[Admin UI] running at http://localhost:${ADMIN_PORT}/admin/ (API -> ${BACKEND_TARGET})`);
});

