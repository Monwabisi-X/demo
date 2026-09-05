'use strict';

/**
 * Medical questionnaire service — a separate HIGH-SECURITY domain.
 *
 * The full 18-point intake is encrypted as a single JSON payload using envelope encryption
 * (KMS in production, local AES-256-GCM in dev) under the dedicated medical key. Only the
 * ciphertext + wrapped data key are stored. Plaintext answers are NEVER persisted, logged,
 * returned to Koisa, or included in ordinary client queries.
 *
 * Access is gated at the route layer by MEDICAL_READ / MEDICAL_WRITE (which are NOT implied
 * by CLIENT_READ). Reads that decrypt the payload should be recorded as sensitive-data
 * access; this service records an audit event on decrypt.
 */

const encryption = require('../encryption/encryption.service');
const encConfig = require('../../config/encryption');
const config = require('../../config');
const logger = require('../../config/logger');
const auditService = require('../audit/audit.service');
const { AppError } = require('../../utils/errors');

function models() {
  return require('../../models');
}

/** Encrypt an arbitrary answers object under the medical key. */
async function encryptPayload(answers) {
  const json = JSON.stringify(answers || {});
  const enc = await encryption.encryptField(json, { keyId: encConfig.kmsMedicalKeyId });
  return {
    payload_ciphertext: Buffer.from(enc.ciphertext, 'utf8'),
    encrypted_data_key: enc.encryptedDataKey ? Buffer.from(enc.encryptedDataKey, 'base64') : null,
    kms_key_id: enc.keyId,
  };
}

async function decryptPayload(row) {
  if (!row.payload_ciphertext) return {};
  const record = {
    ciphertext: Buffer.from(row.payload_ciphertext).toString('utf8'),
    encryptedDataKey: row.encrypted_data_key
      ? Buffer.from(row.encrypted_data_key).toString('base64')
      : null,
    keyId: row.kms_key_id,
  };
  const plaintext = await encryption.decryptField(record);
  try {
    return plaintext ? JSON.parse(plaintext) : {};
  } catch (_e) {
    return {};
  }
}

/** Metadata-only view (never includes decrypted answers). */
function toMeta(row) {
  return {
    id: row.id,
    client_id: row.client_id,
    questionnaire_version: row.questionnaire_version,
    status: row.status,
    access_classification: row.access_classification,
    submitted_at: row.submitted_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Get a client's questionnaire. By default returns METADATA ONLY. Pass `decrypt: true`
 * (only from a MEDICAL_READ-guarded path) to include the decrypted answers; doing so records
 * a sensitive-data access audit event.
 */
async function getForClient({ clientId, decrypt = false, actor }) {
  if (!config.features.medical) {
    throw new AppError('FORBIDDEN', 'Medical module is disabled', 403);
  }
  const { MedicalQuestionnaire } = models();
  const row = await MedicalQuestionnaire.findOne({ where: { client_id: clientId } });
  if (!row) throw new AppError('NOT_FOUND', 'No questionnaire for this client', 404);

  const result = toMeta(row);
  if (decrypt) {
    result.answers = await decryptPayload(row);
    await auditService.record({
      tenantId: actor && actor.tenantId,
      actorUserId: actor && actor.userId,
      actorRoleCode: actor && (actor.roles || [])[0],
      action: 'medical.read.decrypt',
      entityType: 'medical_questionnaire',
      entityId: row.id,
      reason: 'Decrypted medical answers accessed',
    });
  }
  return result;
}

async function submit({ clientId, questionnaireVersion, answers, status = 'submitted' }) {
  if (!config.features.medical) {
    throw new AppError('FORBIDDEN', 'Medical module is disabled', 403);
  }
  const { MedicalQuestionnaire } = models();
  const existing = await MedicalQuestionnaire.findOne({ where: { client_id: clientId } });
  if (existing) {
    throw new AppError('DUPLICATE_RESOURCE', 'A questionnaire already exists; use update', 409);
  }
  const encrypted = await encryptPayload(answers);
  const row = await MedicalQuestionnaire.create({
    client_id: clientId,
    questionnaire_version: questionnaireVersion,
    status,
    submitted_at: status === 'submitted' ? new Date() : null,
    ...encrypted,
  });
  logger.info('medical questionnaire submitted', { id: row.id }); // no PII
  return toMeta(row);
}

async function update({ questionnaireId, answers, status }) {
  if (!config.features.medical) {
    throw new AppError('FORBIDDEN', 'Medical module is disabled', 403);
  }
  const { MedicalQuestionnaire } = models();
  const row = await MedicalQuestionnaire.findByPk(questionnaireId);
  if (!row) throw new AppError('NOT_FOUND', 'Questionnaire not found', 404);

  const patch = {};
  if (answers !== undefined) Object.assign(patch, await encryptPayload(answers));
  if (status !== undefined) {
    patch.status = status;
    if (status === 'submitted' && !row.submitted_at) patch.submitted_at = new Date();
  }
  await row.update(patch);
  return toMeta(row);
}

module.exports = { getForClient, submit, update, toMeta };
