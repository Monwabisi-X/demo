'use strict';

/**
 * Static load check: require the whole app graph WITHOUT connecting to DB/Redis/AWS or
 * opening a listener. Catches missing files, bad requires, and syntax errors offline.
 *
 * Run: npm run check
 */

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_012345678901234567890123456789';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef';

const results = [];
function tryRequire(label, path) {
  try {
    require(path);
    results.push([true, label]);
  } catch (err) {
    results.push([false, `${label} — ${err.message}`]);
  }
}

tryRequire('config', '../src/config');
tryRequire('config/logger', '../src/config/logger');
tryRequire('config/database', '../src/config/database');
tryRequire('config/redis', '../src/config/redis');
tryRequire('config/aws', '../src/config/aws');
tryRequire('config/encryption', '../src/config/encryption');
tryRequire('models', '../src/models');
tryRequire('middleware/errorHandler', '../src/middleware/errorHandler');
tryRequire('middleware/requestContext', '../src/middleware/requestContext');
tryRequire('middleware/logger', '../src/middleware/logger');
tryRequire('middleware/rateLimiter', '../src/middleware/rateLimiter');
tryRequire('middleware/auth', '../src/middleware/auth');
tryRequire('middleware/rbac', '../src/middleware/rbac');
tryRequire('middleware/validation', '../src/middleware/validation');
tryRequire('middleware/audit', '../src/middleware/audit');
tryRequire('validators', '../src/validators');
tryRequire('services/koisa/koisa.service', '../src/services/koisa/koisa.service');
tryRequire('services/document/document.service', '../src/services/document/document.service');
tryRequire('services/encryption/encryption.service', '../src/services/encryption/encryption.service');
tryRequire('services/medical/medical.service', '../src/services/medical/medical.service');
tryRequire('controllers/medical.controller', '../src/controllers/medical.controller');
tryRequire('routes/medical.routes', '../src/routes/medical.routes');
tryRequire('routes', '../src/routes');
tryRequire('routes/webhook.routes', '../src/routes/webhook.routes');
tryRequire('routes/health.routes', '../src/routes/health.routes');
tryRequire('routes/koisa.routes', '../src/routes/koisa.routes');
tryRequire('app', '../src/app');

let failed = 0;
for (const [ok, label] of results) {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) failed += 1;
}

// Also confirm createApp() builds an Express app instance without listening.
try {
  const { createApp } = require('../src/app');
  const app = createApp();
  const ok = typeof app === 'function' && typeof app.listen === 'function';
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  createApp() returns an Express app`);
  if (!ok) failed += 1;
} catch (err) {
  console.log(`  FAIL  createApp() — ${err.message}`);
  failed += 1;
}

console.log('='.repeat(50));
if (failed) {
  console.log(`RESULT: ${results.length + 1 - failed} passed, ${failed} FAILED`);
  process.exit(1);
}
console.log(`RESULT: all ${results.length + 1} load checks passed`);
