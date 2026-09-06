'use strict';

/**
 * Financial position: assets, liabilities, income, expenses, and derived net worth /
 * monthly cashflow. Frequency is normalised to a monthly figure for cashflow.
 */

const { AppError } = require('../../utils/errors');

function models() {
  return require('../../models');
}

const MONTHLY_FACTOR = {
  once: 0,
  weekly: 52 / 12,
  monthly: 1,
  quarterly: 1 / 3,
  biannual: 1 / 6,
  annual: 1 / 12,
};

function toMonthly(amount, frequency) {
  const f = MONTHLY_FACTOR[frequency] ?? 1;
  return Number(amount) * f;
}

async function listAssets(clientId) {
  return models().Asset.findAll({ where: { client_id: clientId }, order: [['created_at', 'DESC']] });
}
async function addAsset(clientId, data) {
  return models().Asset.create({ client_id: clientId, ...data });
}
async function updateAsset(assetId, data) {
  const asset = await models().Asset.findByPk(assetId);
  if (!asset) throw new AppError('NOT_FOUND', 'Asset not found', 404);
  return asset.update(data);
}
async function deleteAsset(assetId) {
  const n = await models().Asset.destroy({ where: { id: assetId } });
  if (!n) throw new AppError('NOT_FOUND', 'Asset not found', 404);
  return { id: assetId, deleted: true };
}

async function listLiabilities(clientId) {
  return models().Liability.findAll({ where: { client_id: clientId }, order: [['created_at', 'DESC']] });
}
async function addLiability(clientId, data) {
  return models().Liability.create({ client_id: clientId, ...data });
}

async function netWorth(clientId, options = {}) {
  const { Asset, Liability } = models();
  const queryOptions = { transaction: options.transaction };
  const [assets, liabilities] = await Promise.all([
    Asset.findAll({
      where: { client_id: clientId, status: 'active' },
      attributes: ['current_value'],
      ...queryOptions,
    }),
    Liability.findAll({
      where: { client_id: clientId, status: 'active' },
      attributes: ['current_balance'],
      ...queryOptions,
    }),
  ]);
  const totalAssets = assets.reduce((s, a) => s + Number(a.current_value || 0), 0);
  const totalLiabilities = liabilities.reduce((s, l) => s + Number(l.current_balance || 0), 0);
  return {
    total_assets: totalAssets.toFixed(2),
    total_liabilities: totalLiabilities.toFixed(2),
    net_worth: (totalAssets - totalLiabilities).toFixed(2),
    currency_code: 'ZAR',
  };
}

async function monthlyCashflow(clientId, options = {}) {
  const { Income, Expense } = models();
  const queryOptions = { transaction: options.transaction };
  const [income, expenses] = await Promise.all([
    Income.findAll({
      where: { client_id: clientId },
      attributes: ['amount', 'frequency'],
      ...queryOptions,
    }),
    Expense.findAll({
      where: { client_id: clientId },
      attributes: ['amount', 'frequency'],
      ...queryOptions,
    }),
  ]);
  const monthlyIncome = income.reduce((s, i) => s + toMonthly(i.amount, i.frequency), 0);
  const monthlyExpenses = expenses.reduce((s, e) => s + toMonthly(e.amount, e.frequency), 0);
  return {
    total_monthly_income: monthlyIncome.toFixed(2),
    total_monthly_expenses: monthlyExpenses.toFixed(2),
    monthly_surplus: (monthlyIncome - monthlyExpenses).toFixed(2),
    currency_code: 'ZAR',
  };
}

module.exports = {
  listAssets, addAsset, updateAsset, deleteAsset,
  listLiabilities, addLiability,
  netWorth, monthlyCashflow, toMonthly,
};
