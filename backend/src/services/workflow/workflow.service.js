'use strict';

/**
 * Lightweight workflow/status tracking. In production, long-running processes (claims,
 * provider dispatch) are orchestrated by AWS Step Functions; this service tracks the
 * platform-side status and generated tasks. Kept minimal and provider-agnostic.
 */

const { AppError } = require('../../utils/errors');

function models() {
  return require('../../models');
}

async function start({ entityType, entityId, assignedUserId, clientId, title }) {
  const { Task } = models();
  return Task.create({
    client_id: clientId || null,
    assigned_user_id: assignedUserId || null,
    title: title || `${entityType} workflow`,
    status: 'open',
    entity_type: entityType,
    entity_id: entityId,
  });
}

async function advance({ workflowInstanceId }) {
  const { Task } = models();
  const task = await Task.findByPk(workflowInstanceId);
  if (!task) throw new AppError('NOT_FOUND', 'Workflow instance not found', 404);
  const next = task.status === 'open' ? 'in_progress' : 'completed';
  await task.update({ status: next, completed_at: next === 'completed' ? new Date() : null });
  return task;
}

async function statusFor({ entityType, entityId }) {
  const { Task } = models();
  const tasks = await Task.findAll({
    where: { entity_type: entityType, entity_id: entityId },
    order: [['created_at', 'DESC']],
  });
  return { entity_type: entityType, entity_id: entityId, tasks };
}

module.exports = { start, advance, statusFor };
