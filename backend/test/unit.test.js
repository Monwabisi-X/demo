'use strict';

/**
 * Offline unit tests (no DB/Redis/AWS). Covers the security-critical logic:
 * RBAC matrix, Koisa guardrails (mode gating, PII redaction, sensitive-input detection),
 * encryption round-trip, and financial frequency normalisation.
 *
 * Run: npm test
 */

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_012345678901234567890123456789';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef';

const { test } = require('node:test');
const assert = require('node:assert');

const rbac = require('../src/services/auth/rbac.service');
const guardrails = require('../src/services/koisa/guardrails');
const koisa = require('../src/services/koisa/koisa.service');
const encryption = require('../src/services/encryption/encryption.service');
const financial = require('../src/services/financial/financial.service');

test('RBAC: ADVISER cannot read medical or banking by default', () => {
  assert.equal(rbac.can(['ADVISER'], 'MEDICAL_READ'), false);
  assert.equal(rbac.can(['ADVISER'], 'BANKING_READ'), false);
  assert.equal(rbac.can(['ADVISER'], 'CLIENT_READ'), true);
});

test('RBAC: CLIENT is limited to self-service permissions', () => {
  assert.equal(rbac.can(['CLIENT'], 'CLIENT_READ_SELF'), true);
  assert.equal(rbac.can(['CLIENT'], 'CLIENT_READ'), false);
  assert.equal(rbac.can(['CLIENT'], 'AUDIT_READ'), false);
});

test('RBAC: PLATFORM_ADMIN holds every permission', () => {
  const all = Object.values(rbac.PERMISSIONS);
  assert.ok(all.every((p) => rbac.can(['PLATFORM_ADMIN'], p)));
});

test('Koisa: public mode never exposes authenticated tools', () => {
  const pub = guardrails.toolsForMode('public');
  const auth = guardrails.toolsForMode('authenticated');
  assert.ok(!pub.includes('get_client_dashboard_summary'));
  assert.ok(!pub.includes('get_policy_details'));
  assert.ok(auth.includes('get_client_dashboard_summary'));
  assert.equal(pub.filter((t) => auth.includes(t)).length, 0);
});

test('Koisa: assertToolAllowed blocks cross-mode tool use', () => {
  assert.throws(
    () => guardrails.assertToolAllowed('public', 'get_policy_details'),
    /not permitted/
  );
});

test('Koisa: redaction masks denied PII but keeps allowed fields', () => {
  const clean = guardrails.redactDenied({
    id_number: '8001015009087',
    policy_number_masked: '****3421',
    nested: { bank_account_number: '12345678901', cover_amount: '2000000.00' },
  });
  assert.equal(clean.id_number, '[REDACTED]');
  assert.equal(clean.nested.bank_account_number, '[REDACTED]');
  assert.equal(clean.policy_number_masked, '****3421');
  assert.equal(clean.nested.cover_amount, '2000000.00');
});

test('Koisa: sensitive-input detection flags PII and never echoes it', () => {
  const r = guardrails.detectSensitiveInput('my id number is 8001015009087');
  assert.equal(r.sensitive, true);
  assert.ok(!JSON.stringify(r).includes('8001015009087'));
  assert.equal(guardrails.detectSensitiveInput('what products do you offer?').sensitive, false);
});

test('Koisa: chat stops and warns on sensitive input', async () => {
  const res = await koisa.chat({ principal: null, message: 'here is my password: hunter2' });
  assert.ok(res.warning);
  assert.equal(res.mode, 'public');
  assert.deepEqual(res.toolResults, []);
});

test('Koisa: anonymous chat is public mode; authenticated principal is dashboard mode', () => {
  assert.equal(koisa.modeFor(null), 'public');
  assert.equal(koisa.modeFor({ clientId: 'abc' }), 'authenticated');
});

test('Koisa: authenticated tool refuses without a client principal', async () => {
  await assert.rejects(
    () => koisa.runTool({ principal: { userId: 'u1' }, mode: 'authenticated', toolName: 'navigate_to_tab', input: { tab: 'overview' } }),
    /authenticated client/
  );
});

test('Encryption: AES-256-GCM round-trips and masking hides the value', () => {
  const packed = encryption.encryptLocal('sensitive-value-123');
  assert.equal(encryption.decryptLocal(packed), 'sensitive-value-123');
  assert.notEqual(packed, 'sensitive-value-123');
  assert.equal(encryption.mask('1234567890').endsWith('7890'), true);
});

test('Financial: frequency normalisation to monthly', () => {
  assert.equal(financial.toMonthly(1200, 'annual'), 100);
  assert.equal(financial.toMonthly(300, 'quarterly'), 100);
  assert.equal(financial.toMonthly(100, 'monthly'), 100);
});


test('Medical: service refuses when the medical module is disabled', async () => {
  // ENABLE_MEDICAL_MODULE is unset in this test env, so the feature flag is false.
  const medical = require('../src/services/medical/medical.service');
  await assert.rejects(
    () => medical.getForClient({ clientId: '11111111-1111-1111-1111-111111111111' }),
    /disabled/
  );
});

test('RBAC: MEDICAL_READ is not implied by CLIENT_READ (adviser)', () => {
  assert.equal(rbac.can(['ADVISER'], 'CLIENT_READ'), true);
  assert.equal(rbac.can(['ADVISER'], 'MEDICAL_READ'), false);
});
