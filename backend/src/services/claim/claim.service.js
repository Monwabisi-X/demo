'use strict';

/**
 * Claims. Scene intake metadata (GPS, evidence photo refs, sketches, voice-note refs) is
 * stored in incident_data (JSONB) — the binaries themselves live in S3 as documents. In
 * production, submitting a claim also kicks off the Step Functions workflow (out of scope
 * here; INTEGRATION_EXECUTE guards that action).
 */

const { AppError } = require('../../utils/errors');

function models() {
  return require('../../models');
}

async function listForClient(clientId) {
  return models().Claim.findAll({ where: { client_id: clientId }, order: [['reported_at', 'DESC']] });
}

async function submit(clientId, data) {
  const { Claim } = models();
  return Claim.create({
    client_id: clientId,
    policy_id: data.policyId || null,
    provider_id: data.providerId || null,
    claim_type: data.claimType || 'motor',
    status: 'REPORTED',
    loss_date: data.lossDate || null,
    narrative: data.narrative || null,
    incident_data: data.incident || {},
  });
}

async function update(claimId, data) {
  const { Claim } = models();
  const claim = await models().Claim.findByPk(claimId);
  if (!claim) throw new AppError('NOT_FOUND', 'Claim not found', 404);
  return claim.update(data);
}

async function status(claimId) {
  const claim = await models().Claim.findByPk(claimId, { attributes: ['id', 'status', 'claim_type', 'reported_at', 'closed_at'] });
  if (!claim) throw new AppError('NOT_FOUND', 'Claim not found', 404);
  return claim;
}

module.exports = { listForClient, submit, update, status };
