'use strict';

const policy = require('../services/policy/policy.service');
const { ok } = require('../utils/respond');

async function list(req, res) {
  return ok(res, await policy.listForClient(req.params.clientId));
}
async function create(req, res) {
  const { clientId, ...data } = req.body;
  const p = await policy.create(clientId, data);
  res.locals.auditEntityId = p.id;
  return ok(res, p, 201);
}
async function update(req, res) {
  return ok(res, await policy.update(req.params.policyId, req.body));
}
async function remove(req, res) {
  return ok(res, await policy.remove(req.params.policyId));
}

module.exports = { list, create, update, remove };
