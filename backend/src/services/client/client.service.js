'use strict';

/**
 * Client CRUD. Sensitive identifiers are encrypted on write and never returned in plaintext.
 * `toSafeJSON` strips all ciphertext/hash columns from any response body.
 */

const encryption = require('../encryption/encryption.service');
const { AppError } = require('../../utils/errors');

function models() {
  return require('../../models');
}

const SENSITIVE_COLUMNS = [
  'id_number_ciphertext', 'id_number_hash',
  'passport_number_ciphertext', 'tax_number_ciphertext',
  'email_ciphertext', 'mobile_ciphertext',
];

function toSafeJSON(client) {
  const json = typeof client.toJSON === 'function' ? client.toJSON() : { ...client };
  for (const col of SENSITIVE_COLUMNS) delete json[col];
  return json;
}

async function encryptIdentifiers(input) {
  const out = {};
  if (input.idNumber) {
    const enc = await encryption.encryptField(input.idNumber);
    out.id_number_ciphertext = enc.ciphertext;
    out.id_number_hash = encryption.deterministicHash(input.idNumber);
  }
  if (input.passportNumber) {
    out.passport_number_ciphertext = (await encryption.encryptField(input.passportNumber)).ciphertext;
  }
  if (input.taxNumber) {
    out.tax_number_ciphertext = (await encryption.encryptField(input.taxNumber)).ciphertext;
  }
  if (input.email) out.email_ciphertext = (await encryption.encryptField(input.email)).ciphertext;
  if (input.mobile) out.mobile_ciphertext = (await encryption.encryptField(input.mobile)).ciphertext;
  return out;
}

async function list({ tenantId, limit = 50, offset = 0 }) {
  const { Client } = models();
  const { rows, count } = await Client.findAndCountAll({
    where: { tenant_id: tenantId, deleted_at: null },
    attributes: { exclude: SENSITIVE_COLUMNS },
    limit,
    offset,
    order: [['created_at', 'DESC']],
  });
  return { items: rows.map(toSafeJSON), total: count };
}

async function getById({ tenantId, clientId }) {
  const { Client } = models();
  const client = await Client.findOne({ where: { id: clientId, tenant_id: tenantId } });
  if (!client || client.deleted_at) throw new AppError('NOT_FOUND', 'Client not found', 404);
  return toSafeJSON(client);
}

async function create({ tenantId, data }) {
  const { Client } = models();
  const encrypted = await encryptIdentifiers(data);
  const client = await Client.create({
    tenant_id: tenantId,
    client_type: data.clientType || 'individual',
    title: data.title,
    first_name: data.firstName,
    surname: data.surname,
    legal_entity_name: data.legalEntityName,
    fica_status: 'pending',
    ...encrypted,
  });
  return toSafeJSON(client);
}

async function update({ tenantId, clientId, data }) {
  const { Client } = models();
  const client = await Client.findOne({ where: { id: clientId, tenant_id: tenantId } });
  if (!client || client.deleted_at) throw new AppError('NOT_FOUND', 'Client not found', 404);
  const encrypted = await encryptIdentifiers(data);
  await client.update({
    title: data.title ?? client.title,
    first_name: data.firstName ?? client.first_name,
    surname: data.surname ?? client.surname,
    legal_entity_name: data.legalEntityName ?? client.legal_entity_name,
    ...encrypted,
  });
  return toSafeJSON(client);
}

async function remove({ tenantId, clientId }) {
  const { Client } = models();
  const client = await Client.findOne({ where: { id: clientId, tenant_id: tenantId } });
  if (!client) throw new AppError('NOT_FOUND', 'Client not found', 404);
  await client.update({ deleted_at: new Date(), status: 'archived' });
  return { id: clientId, deleted: true };
}

module.exports = { list, getById, create, update, remove, toSafeJSON };
