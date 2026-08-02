/**
 * Backend smoke tests (no external test framework)
 * Run: npm test
 */

import assert from 'assert';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const API = `http://127.0.0.1:${process.env.PORT || 5087}/api`;
let serverProc = null;
let startedByUs = false;

async function api(path, { method = 'GET', token, body, headers = {} } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    },
    body: body != null ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

async function waitForHealth(timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const { res, data } = await api('/health');
      if (res.ok && data.status === 'ok') return data;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error('Server health timeout');
}

async function ensureServer() {
  try {
    await waitForHealth(2000);
    return;
  } catch {
    // start local server
  }
  startedByUs = true;
  const { spawn } = await import('child_process');
  serverProc = spawn('node', ['server.js'], {
    cwd: ROOT,
    env: { ...process.env },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  await waitForHealth(25000);
}

async function run() {
  const results = [];
  const ok = (name) => { results.push({ name, pass: true }); console.log('✓', name); };
  const fail = (name, err) => { results.push({ name, pass: false, err }); console.error('✗', name, err); };

  await ensureServer();

  try {
    const health = await api('/health');
    assert.equal(health.res.status, 200);
    assert.equal(health.data.checks.database, 'up');
    assert.ok(['up', 'down', 'disabled'].includes(health.data.checks.redis));
    ok('health includes database + redis');

    const metricsRes = await fetch(`${API}/metrics`);
    assert.equal(metricsRes.status, 200);
    const metricsText = await metricsRes.text();
    assert.ok(metricsText.includes('http_request_duration') || metricsText.includes('# HELP'));
    ok('metrics endpoint');

    const badLogin = await api('/auth/login', {
      method: 'POST',
      body: { email: 'nobody@example.com', password: 'wrong' }
    });
    assert.equal(badLogin.res.status, 401);
    ok('login rejects bad credentials');

    const login = await api('/auth/login', {
      method: 'POST',
      body: {
        email: process.env.ADMIN_EMAIL || 'admin@thegoldenolive.be',
        password: process.env.ADMIN_PASSWORD || 'admin123'
      }
    });
    assert.equal(login.res.status, 200);
    const token = login.data?.data?.token || login.data?.token;
    assert.ok(token);
    assert.ok(login.data?.data?.user?.company_id);
    ok('admin login with company_id');

    const meCompany = await api('/companies/me', { token });
    assert.equal(meCompany.res.status, 200);
    assert.equal(meCompany.data.data.active_company_id, login.data.data.user.company_id);
    ok('companies/me');

    const billing = await api('/billing/status', { token });
    assert.equal(billing.res.status, 200);
    assert.ok(billing.data.data?.billing_status);
    ok('billing status');

    const readiness = await api('/integrations/readiness', { token });
    assert.equal(readiness.res.status, 200);
    assert.ok(Array.isArray(readiness.data.data?.platforms));
    ok('integrations readiness');

    const settings = await api('/admin/settings', { token });
    assert.equal(settings.res.status, 200);
    const secret = (settings.data.data || []).find((s) => /secret|api_key/i.test(s.setting_key) && s.setting_value);
    if (secret) {
      assert.ok(String(secret.setting_value).includes('********') || secret.is_secret === true);
      ok('settings secrets masked');
    } else {
      ok('settings secrets masked (no secret values set)');
    }

    // Force-enable check: when integration is enabled without secret => 401
    // Current default is disabled => 200 ignored (expected)
    const unsigned = await api('/integrations/uber-eats/webhook', {
      method: 'POST',
      body: { event_type: 'orders.notification', meta: { resource_id: 'x' } }
    });
    assert.ok([200, 401].includes(unsigned.res.status));
    ok(`webhook endpoint responds (${unsigned.res.status})`);

    // Readiness fail-closed: enable platform without secrets → 401
    await api('/admin/settings/uber_eats_enabled', {
      method: 'PUT',
      token,
      body: { value: true }
    });
    const blocked = await api('/integrations/uber-eats/webhook', {
      method: 'POST',
      body: { event_type: 'orders.notification', meta: { resource_id: 'x' } }
    });
    assert.equal(blocked.res.status, 401);
    ok('webhook blocked when enabled but incomplete');
    await api('/admin/settings/uber_eats_enabled', {
      method: 'PUT',
      token,
      body: { value: false }
    });

    // Signature helper fail-closed
    const { verifyUberSignature } = await import('../services/integrations/uberEats.js');
    assert.equal(verifyUberSignature('{}', 'sig', ''), false);
    ok('webhook signature fail-closed without secret');

    const printers = await api('/printers', { token });
    assert.equal(printers.res.status, 200);
    ok('printers list authenticated');

    const unauth = await api('/printers');
    assert.equal(unauth.res.status, 401);
    ok('printers require auth');

    const privacy = await api('/admin/privacy/export?email=nobody@example.com', { token });
    assert.equal(privacy.res.status, 200);
    assert.ok(Array.isArray(privacy.data.data.orders));
    ok('gdpr export endpoint');

    // --- Tenant isolation: register company B ---
    const suffix = Date.now();
    const reg = await api('/companies/register', {
      method: 'POST',
      body: {
        company_name: `Tenant B ${suffix}`,
        name: 'Owner B',
        email: `owner-b-${suffix}@example.com`,
        password: 'TestPass123!'
      }
    });
    assert.equal(reg.res.status, 201);
    const tokenB = reg.data?.data?.token;
    const companyB = reg.data?.data?.company?.id;
    assert.ok(tokenB);
    assert.ok(companyB);
    ok('register company B');

    // Write a unique setting on B
    const markerKey = `iso_test_${suffix}`;
    await api(`/admin/settings/${markerKey}`, {
      method: 'PUT',
      token: tokenB,
      body: { value: `secret-b-${suffix}` }
    });
    const settingsA2 = await api('/admin/settings', { token });
    const settingsB2 = await api('/admin/settings', { token: tokenB });
    const foundOnA = (settingsA2.data.data || []).find((s) => s.setting_key === markerKey);
    const foundOnB = (settingsB2.data.data || []).find((s) => s.setting_key === markerKey);
    assert.ok(!foundOnA, 'tenant A must not see B setting');
    assert.ok(foundOnB, 'tenant B must see own setting');
    ok('tenant isolation settings');

    // Orders list isolation: B should not see A's order ids
    const ordersA = await api('/admin/orders?limit=50', { token });
    const ordersB = await api('/admin/orders?limit=50', { token: tokenB });
    assert.equal(ordersA.res.status, 200);
    assert.equal(ordersB.res.status, 200);
    const idsA = new Set((ordersA.data.data?.orders || []).map((o) => o.id));
    const leak = (ordersB.data.data?.orders || []).some((o) => idsA.has(o.id));
    assert.equal(leak, false);
    ok('tenant isolation orders');

  } catch (e) {
    fail('suite', e.message || e);
  } finally {
    if (startedByUs && serverProc) {
      serverProc.kill('SIGTERM');
    }
  }

  const failed = results.filter((r) => !r.pass).length;
  console.log(`\nSmoke: ${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
}

run();
