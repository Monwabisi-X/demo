'use strict';

/**
 * Client goals. Advisers create/update goals for a client (individual or household-shared);
 * clients read their own with a computed progress percentage for the dashboard.
 */

const { AppError } = require('../../utils/errors');

function models() {
  return require('../../models');
}

function withProgress(goal) {
  const json = typeof goal.toJSON === 'function' ? goal.toJSON() : goal;
  const target = Number(json.target_amount || 0);
  const current = Number(json.current_amount || 0);
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  return { ...json, progress_pct: pct };
}

async function listForClient({ tenantId, clientId }) {
  const { Goal } = models();
  const goals = await Goal.findAll({
    where: { tenant_id: tenantId, client_id: clientId },
    order: [['created_at', 'DESC']],
  });
  return goals.map(withProgress);
}

async function create({ tenantId, clientId, createdBy, data }) {
  const { Goal } = models();
  const goal = await Goal.create({
    tenant_id: tenantId,
    client_id: clientId,
    household_id: data.householdId || null,
    scope: data.scope || 'individual',
    category: data.category || null,
    name: data.name,
    description: data.description || null,
    target_amount: data.targetAmount ?? 0,
    current_amount: data.currentAmount ?? 0,
    currency_code: data.currencyCode || 'ZAR',
    target_date: data.targetDate || null,
    created_by: createdBy || null,
  });
  return withProgress(goal);
}

async function update({ tenantId, goalId, data }) {
  const { Goal } = models();
  const goal = await Goal.findOne({ where: { id: goalId, tenant_id: tenantId } });
  if (!goal) throw new AppError('NOT_FOUND', 'Goal not found', 404);
  await goal.update({
    name: data.name ?? goal.name,
    description: data.description ?? goal.description,
    category: data.category ?? goal.category,
    target_amount: data.targetAmount ?? goal.target_amount,
    current_amount: data.currentAmount ?? goal.current_amount,
    target_date: data.targetDate ?? goal.target_date,
    status: data.status ?? goal.status,
  });
  return withProgress(goal);
}

async function remove({ tenantId, goalId }) {
  const { Goal } = models();
  const goal = await Goal.findOne({ where: { id: goalId, tenant_id: tenantId } });
  if (!goal) throw new AppError('NOT_FOUND', 'Goal not found', 404);
  await goal.destroy();
  return { id: goalId, deleted: true };
}

module.exports = { listForClient, create, update, remove, withProgress };
