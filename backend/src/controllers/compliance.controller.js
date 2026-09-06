'use strict';

const kyc = require('../services/compliance/kyc.service');
const consent = require('../services/compliance/consent.service');
const smileid = require('../services/compliance/smileid.service');
const { ok } = require('../utils/respond');

async function getKyc(req, res) {
  return ok(res, await kyc.getStatus(req.params.clientId));
}
async function submitKyc(req, res) {
  return ok(res, await kyc.submit(req.body), 201);
}
async function getConsent(req, res) {
  return ok(res, await consent.currentState(req.params.clientId));
}
async function recordConsent(req, res) {
  const c = await consent.record(req.body);
  res.locals.auditEntityId = c.id;
  return ok(res, c, 201);
}

// Smile ID identity verification. ID number is sensitive: taken from the body, verified, and
// never persisted in plaintext by the service.
async function verifyIdentity(req, res) {
  return ok(res, await smileid.verifyIdentity({ tenantId: req.principal.tenantId, ...req.body }), 201);
}

module.exports = { getKyc, submitKyc, getConsent, recordConsent, verifyIdentity };
