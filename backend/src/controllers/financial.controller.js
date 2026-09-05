'use strict';

const financial = require('../services/financial/financial.service');
const { ok } = require('../utils/respond');

async function getAssets(req, res) {
  return ok(res, await financial.listAssets(req.params.clientId));
}
async function addAsset(req, res) {
  const { clientId, ...data } = req.body;
  const asset = await financial.addAsset(clientId, data);
  res.locals.auditEntityId = asset.id;
  return ok(res, asset, 201);
}
async function updateAsset(req, res) {
  return ok(res, await financial.updateAsset(req.params.assetId, req.body));
}
async function deleteAsset(req, res) {
  return ok(res, await financial.deleteAsset(req.params.assetId));
}
async function getLiabilities(req, res) {
  return ok(res, await financial.listLiabilities(req.params.clientId));
}
async function addLiability(req, res) {
  const { clientId, ...data } = req.body;
  const liability = await financial.addLiability(clientId, data);
  res.locals.auditEntityId = liability.id;
  return ok(res, liability, 201);
}
async function getNetWorth(req, res) {
  return ok(res, await financial.netWorth(req.params.clientId));
}

module.exports = { getAssets, addAsset, updateAsset, deleteAsset, getLiabilities, addLiability, getNetWorth };
