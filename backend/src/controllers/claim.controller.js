'use strict';

const claim = require('../services/claim/claim.service');
const { ok } = require('../utils/respond');

async function list(req, res) {
  return ok(res, await claim.listForClient(req.params.clientId));
}
async function submit(req, res) {
  const { clientId, ...data } = req.body;
  const c = await claim.submit(clientId, data);
  res.locals.auditEntityId = c.id;
  return ok(res, c, 201);
}
async function update(req, res) {
  return ok(res, await claim.update(req.params.claimId, req.body));
}
async function status(req, res) {
  return ok(res, await claim.status(req.params.claimId));
}
async function lifecycle(req, res) {
  return ok(res, await claim.lifecycle(req.params.claimId));
}
async function advanceStep(req, res) {
  return ok(res, await claim.advanceStep({
    claimId: req.params.claimId,
    stepKey: req.body.stepKey,
    status: req.body.status,
    detail: req.body.detail,
  }));
}

module.exports = { list, submit, update, status, lifecycle, advanceStep };
