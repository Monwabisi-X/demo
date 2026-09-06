'use strict';

const reminders = require('../services/reminder/reminder.service');
const { ok } = require('../utils/respond');

async function list(req, res) {
  return ok(res, await reminders.list({
    tenantId: req.principal.tenantId,
    clientId: req.query.clientId,
  }));
}

async function create(req, res) {
  const rule = await reminders.create({ tenantId: req.principal.tenantId, data: req.body });
  res.locals.auditEntityId = rule.id;
  return ok(res, rule, 201);
}

async function update(req, res) {
  return ok(res, await reminders.update({
    tenantId: req.principal.tenantId,
    ruleId: req.params.ruleId,
    data: req.body,
  }));
}

// Manual trigger of the scheduler tick (also invoked by EventBridge/worker in prod).
async function run(req, res) {
  return ok(res, await reminders.runDueReminders({}));
}

module.exports = { list, create, update, run };
