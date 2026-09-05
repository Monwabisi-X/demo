'use strict';

/**
 * Koisa chat endpoint. Works for both anonymous (public mode) and authenticated (dashboard
 * mode) callers — the mode is derived from the principal by the service. The service enforces
 * input screening, tool gating, and PII redaction regardless of what the model does.
 */

const koisa = require('../services/koisa/koisa.service');
const { ok } = require('../utils/respond');

async function chat(req, res) {
  const result = await koisa.chat({
    principal: req.principal || null, // undefined for anonymous public visitors
    message: req.body.message,
  });
  return ok(res, result);
}

module.exports = { chat };
