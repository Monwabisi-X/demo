'use strict';

const clientService = require('../services/client/client.service');
const { ok } = require('../utils/respond');

async function list(req, res) {
  const result = await clientService.list({
    tenantId: req.principal.tenantId,
    limit: Number(req.query.limit) || 50,
    offset: Number(req.query.offset) || 0,
  });
  return ok(res, result);
}

async function getOne(req, res) {
  return ok(res, await clientService.getById({
    tenantId: req.principal.tenantId,
    clientId: req.params.clientId,
  }));
}

async function create(req, res) {
  const client = await clientService.create({ tenantId: req.principal.tenantId, data: req.body });
  res.locals.auditEntityId = client.id;
  return ok(res, client, 201);
}

async function update(req, res) {
  return ok(res, await clientService.update({
    tenantId: req.principal.tenantId,
    clientId: req.params.clientId,
    data: req.body,
  }));
}

async function remove(req, res) {
  return ok(res, await clientService.remove({
    tenantId: req.principal.tenantId,
    clientId: req.params.clientId,
  }));
}

module.exports = { list, getOne, create, update, remove };
