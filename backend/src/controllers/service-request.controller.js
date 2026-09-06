'use strict';

const requests = require('../services/service-request/service-request.service');
const { enforceClientScope } = require('../middleware/ownership');
const { ok } = require('../utils/respond');

async function list(req, res) {
  return ok(res, await requests.listForClient({
    tenantId: req.principal.tenantId,
    clientId: req.params.clientId,
  }));
}

async function create(req, res) {
  // A client raises a request for their OWN client_id; staff may specify any client in tenant.
  const clientId = req.body.clientId || req.principal.clientId;
  const sr = await requests.create({
    tenantId: req.principal.tenantId,
    clientId,
    createdBy: req.principal.userId,
    data: req.body,
  });
  res.locals.auditEntityId = sr.id;
  return ok(res, sr, 201);
}

async function update(req, res) {
  return ok(res, await requests.updateStatus({
    tenantId: req.principal.tenantId,
    requestId: req.params.requestId,
    status: req.body && req.body.status,
    assignedUserId: req.body && req.body.assignedUserId,
  }));
}

module.exports = { list, create, update, enforceClientScope };
