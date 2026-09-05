'use strict';

/**
 * In-process HTTP tests using the real Express app on an ephemeral port. Exercises routes
 * that do not require the database (health liveness, Koisa public chat, 404 + error shape,
 * and auth rejection on a protected route). Uses only Node's http client — no test deps.
 */

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_012345678901234567890123456789';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef';
process.env.KOISA_ENABLED = 'true';

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

const { createApp } = require('../src/app');

let server;
let base;

before(async () => {
  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      base = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const url = new URL(base + path);
    const req = http.request(
      url,
      { method, headers: { 'Content-Type': 'application/json' } },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          let parsed = null;
          try { parsed = raw ? JSON.parse(raw) : null; } catch (_e) { parsed = raw; }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

test('GET /health returns ok', async () => {
  const res = await request('GET', '/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
});

test('unknown route returns the documented 404 error shape', async () => {
  const res = await request('GET', '/api/v1/does-not-exist');
  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, 'NOT_FOUND');
  assert.ok(Array.isArray(res.body.error.details));
});

test('protected route without a token is rejected', async () => {
  const res = await request('GET', '/api/v1/clients');
  assert.equal(res.status, 401);
  assert.equal(res.body.error.code, 'INVALID_TOKEN');
});

test('Koisa public chat works anonymously and gates to public tools', async () => {
  const res = await request('POST', '/api/v1/koisa/chat', { message: 'What products do you offer?' });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.mode, 'public');
  assert.ok(res.body.data.availableTools.includes('get_product_catalog'));
  assert.ok(!res.body.data.availableTools.includes('get_policy_details'));
});

test('Koisa warns and refuses to process sensitive input', async () => {
  const res = await request('POST', '/api/v1/koisa/chat', { message: 'my SA ID is 8001015009087' });
  assert.equal(res.status, 200);
  assert.ok(res.body.data.warning);
  // The response must not echo the ID number back.
  assert.ok(!JSON.stringify(res.body).includes('8001015009087'));
});

test('validation error returns VALIDATION_ERROR with details', async () => {
  const res = await request('POST', '/api/v1/koisa/chat', {}); // missing message
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  assert.ok(res.body.error.details.length > 0);
});


// ── Newly-added auth endpoints (gap-closure verification) ────────────────────────

test('POST /auth/reset-password validates its body', async () => {
  const res = await request('POST', '/api/v1/auth/reset-password', {}); // missing token+newPassword
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
});

test('POST /auth/forgot-password validates email + tenantId', async () => {
  const res = await request('POST', '/api/v1/auth/forgot-password', { email: 'not-an-email' });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
});

test('GET /auth/me requires authentication', async () => {
  const res = await request('GET', '/api/v1/auth/me');
  assert.equal(res.status, 401);
  assert.equal(res.body.error.code, 'INVALID_TOKEN');
});

test('GET /auth/sessions requires authentication', async () => {
  const res = await request('GET', '/api/v1/auth/sessions');
  assert.equal(res.status, 401);
});

test('DELETE /auth/sessions/:id requires authentication (route exists)', async () => {
  const res = await request('DELETE', '/api/v1/auth/sessions/abc123');
  assert.equal(res.status, 401); // 401 (not 404) proves the route is mounted
});

test('POST /auth/users requires authentication (admin route exists)', async () => {
  const res = await request('POST', '/api/v1/auth/users', {});
  assert.equal(res.status, 401);
});

// ── Medical module (gap-closure verification) ────────────────────────────────────

test('GET /medical/:clientId requires authentication (route mounted)', async () => {
  const res = await request('GET', '/api/v1/medical/11111111-1111-1111-1111-111111111111');
  assert.equal(res.status, 401); // mounted + protected (not 404)
  assert.equal(res.body.error.code, 'INVALID_TOKEN');
});

test('POST /medical requires authentication (route mounted)', async () => {
  const res = await request('POST', '/api/v1/medical', {});
  assert.equal(res.status, 401);
});
