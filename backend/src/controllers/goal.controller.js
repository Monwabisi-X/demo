'use strict';

const goals = require('../services/goal/goal.service');
const { ok } = require('../utils/respond');

async function list(req, res) {
  return ok(res, await goals.listForClient({
    tenantId: req.principal.tenantId,
    clientId: req.params.clientId,
  }));
}

async function create(req, res) {
  const { clientId, ...data } = req.body;
  const goal = await goals.create({
    tenantId: req.principal.tenantId,
    clientId,
    createdBy: req.principal.userId,
    data,
  });
  res.locals.auditEntityId = goal.id;
  return ok(res, goal, 201);
}

async function update(req, res) {
  return ok(res, await goals.update({
    tenantId: req.principal.tenantId,
    goalId: req.params.goalId,
    data: req.body,
  }));
}

async function remove(req, res) {
  return ok(res, await goals.remove({
    tenantId: req.principal.tenantId,
    goalId: req.params.goalId,
  }));
}

module.exports = { list, create, update, remove };
