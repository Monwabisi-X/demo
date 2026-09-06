'use strict';

const encryption = require('../encryption/encryption.service');
const { AppError } = require('../../utils/errors');

function models() {
  return require('../../models');
}

// Never return the ciphertext column; only the masked policy number.
const EXCLUDE = ['policy_number_ciphertext'];

async function listForClient(clientId, options = {}) {
  const { Policy, Provider, Product } = models();
  return Policy.findAll({
    where: { client_id: clientId },
    attributes: options.attributes || { exclude: EXCLUDE },
    include: [
      { model: Provider, attributes: ['trading_name', 'legal_name'] },
      { model: Product, attributes: ['product_name', 'category'] },
    ],
    order: [['created_at', 'DESC']],
    ...(options.limit ? { limit: options.limit } : {}),
    transaction: options.transaction,
  });
}

async function create(clientId, data) {
  const { Policy } = models();
  const payload = { client_id: clientId, ...data };
  if (data.policyNumber) {
    payload.policy_number_ciphertext = (await encryption.encryptField(data.policyNumber)).ciphertext;
    payload.policy_number_masked = encryption.mask(data.policyNumber);
    delete payload.policyNumber;
  }
  const policy = await Policy.create(payload);
  const json = policy.toJSON();
  delete json.policy_number_ciphertext;
  return json;
}

async function update(policyId, data) {
  const { Policy } = models();
  const policy = await Policy.findByPk(policyId);
  if (!policy) throw new AppError('NOT_FOUND', 'Policy not found', 404);
  const patch = { ...data };
  if (data.policyNumber) {
    patch.policy_number_ciphertext = (await encryption.encryptField(data.policyNumber)).ciphertext;
    patch.policy_number_masked = encryption.mask(data.policyNumber);
    delete patch.policyNumber;
  }
  await policy.update(patch);
  const json = policy.toJSON();
  delete json.policy_number_ciphertext;
  return json;
}

async function remove(policyId) {
  const n = await models().Policy.destroy({ where: { id: policyId } });
  if (!n) throw new AppError('NOT_FOUND', 'Policy not found', 404);
  return { id: policyId, deleted: true };
}

module.exports = { listForClient, create, update, remove };
