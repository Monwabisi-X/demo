'use strict';

const workflow = require('../services/workflow/workflow.service');
const approval = require('../services/workflow/approval.service');
const { ok } = require('../utils/respond');

async function start(req, res) {
  return ok(res, await workflow.start(req.body), 201);
}
async function advance(req, res) {
  return ok(res, await workflow.advance({ workflowInstanceId: req.params.workflowInstanceId }));
}
async function status(req, res) {
  return ok(res, await workflow.statusFor({
    entityType: req.params.entityType,
    entityId: req.params.entityId,
  }));
}

async function submitApproval(req, res) {
  const row = await approval.submitForApproval({ tenantId: req.principal.tenantId, ...req.body });
  res.locals.auditEntityId = row.id;
  return ok(res, row, 201);
}
async function listPending(req, res) {
  return ok(res, await approval.listPending({ tenantId: req.principal.tenantId }));
}
async function approve(req, res) {
  return ok(res, await approval.approve({
    id: req.params.entityId,
    reviewerId: req.principal.userId,
    adviserEdits: req.body && req.body.adviserEdits,
  }));
}
async function reject(req, res) {
  return ok(res, await approval.reject({
    id: req.params.entityId,
    reviewerId: req.principal.userId,
    reason: req.body && req.body.reason,
  }));
}
async function approvalStatus(req, res) {
  return ok(res, await approval.getStatus({ id: req.params.entityId }));
}

module.exports = { start, advance, status, submitApproval, listPending, approve, reject, approvalStatus };
