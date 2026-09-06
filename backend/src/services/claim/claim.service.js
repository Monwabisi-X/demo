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

// The multi-week motor-claim journey from the problem statement, in order.
const MOTOR_LIFECYCLE = [
  'CLAIM_NUMBER_ISSUED',
  'ASSESSMENT_BOOKED',
  'ASSESSMENT_SENT',
  'REPAIR_QUOTES_SENT',
  'REPAIRS_AUTHORISED',
  'REPAIR_DATE_SELECTED',
  'CAR_HIRE_ARRANGED',
  'REPAIR_IN_PROGRESS',
  'HIRE_CAR_RETURNED',
  'CLIENT_REVIEW_CLOSED',
];

async function listForClient(clientId) {
  return models().Claim.findAll({ where: { client_id: clientId }, order: [['reported_at', 'DESC']] });
}

async function submit(clientId, data) {
  const { Claim, ClaimLifecycleStep } = models();
  const claim = await Claim.create({
    client_id: clientId,
    policy_id: data.policyId || null,
    provider_id: data.providerId || null,
    claim_type: data.claimType || 'motor',
    status: 'REPORTED',
    loss_date: data.lossDate || null,
    narrative: data.narrative || null,
    incident_data: data.incident || {},
  });

  // Seed the lifecycle steps for motor claims so the client/adviser can track progress.
  if ((data.claimType || 'motor') === 'motor') {
    await ClaimLifecycleStep.bulkCreate(
      MOTOR_LIFECYCLE.map((key, i) => ({ claim_id: claim.id, step_key: key, step_order: i })),
      { ignoreDuplicates: true }
    );
  }
  return claim;
}

/** Return the ordered lifecycle steps for a claim. */
async function lifecycle(claimId) {
  const { Claim, ClaimLifecycleStep } = models();
  const claim = await Claim.findByPk(claimId);
  if (!claim) throw new AppError('NOT_FOUND', 'Claim not found', 404);
  const steps = await ClaimLifecycleStep.findAll({
    where: { claim_id: claimId },
    order: [['step_order', 'ASC']],
  });
  return { claim_id: claimId, status: claim.status, steps };
}

/** Advance a specific lifecycle step (mark in_progress/done) with an optional detail note. */
async function advanceStep({ claimId, stepKey, status = 'done', detail }) {
  const { ClaimLifecycleStep } = models();
  const step = await ClaimLifecycleStep.findOne({ where: { claim_id: claimId, step_key: stepKey } });
  if (!step) throw new AppError('NOT_FOUND', 'Claim step not found', 404);
  await step.update({
    status,
    detail: detail ?? step.detail,
    occurred_at: status === 'done' ? new Date() : step.occurred_at,
  });
  return step;
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

module.exports = { listForClient, submit, update, status, lifecycle, advanceStep, MOTOR_LIFECYCLE };
