'use strict';

/**
 * Adviser staging / control-gate approval workflow.
 *
 * Client submissions land in adviser_staging_queue with status PENDING_REVIEW. An adviser or
 * compliance officer reviews, optionally enriches (adviser_edits), then approves (which marks
 * it ready for automated dispatch to providers) or rejects it. Nothing is dispatched to a
 * third-party provider until it has passed this gate.
 */

const { AppError } = require('../../utils/errors');

function models() {
  return require('../../models');
}

const STATUS = Object.freeze({
  PENDING: 'PENDING_REVIEW',
  IN_REVIEW: 'IN_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  DISPATCHED: 'DISPATCHED',
});

async function submitForApproval({ tenantId, clientId, submissionType, snapshot }) {
  const { AdviserStagingQueue } = models();
  return AdviserStagingQueue.create({
    tenant_id: tenantId,
    client_id: clientId || null,
    submission_type: submissionType,
    client_snapshot: snapshot || {},
    status: STATUS.PENDING,
  });
}

async function listPending({ tenantId }) {
  const { AdviserStagingQueue } = models();
  return AdviserStagingQueue.findAll({
    where: { tenant_id: tenantId, status: [STATUS.PENDING, STATUS.IN_REVIEW] },
    order: [['created_at', 'ASC']],
  });
}

async function getStatus({ id }) {
  const { AdviserStagingQueue } = models();
  const row = await AdviserStagingQueue.findByPk(id, {
    attributes: ['id', 'status', 'submission_type', 'reviewed_at', 'dispatched_at'],
  });
  if (!row) throw new AppError('NOT_FOUND', 'Submission not found', 404);
  return row;
}

async function approve({ id, reviewerId, adviserEdits }) {
  const { AdviserStagingQueue } = models();
  const row = await AdviserStagingQueue.findByPk(id);
  if (!row) throw new AppError('NOT_FOUND', 'Submission not found', 404);
  if (row.status === STATUS.APPROVED || row.status === STATUS.DISPATCHED) {
    throw new AppError('VALIDATION_ERROR', 'Submission already approved', 400);
  }
  await row.update({
    status: STATUS.APPROVED,
    reviewed_by: reviewerId,
    reviewed_at: new Date(),
    adviser_edits: adviserEdits || row.adviser_edits,
  });
  return row;
}

async function reject({ id, reviewerId, reason }) {
  const { AdviserStagingQueue } = models();
  const row = await AdviserStagingQueue.findByPk(id);
  if (!row) throw new AppError('NOT_FOUND', 'Submission not found', 404);
  await row.update({
    status: STATUS.REJECTED,
    reviewed_by: reviewerId,
    reviewed_at: new Date(),
    rejection_reason: reason,
  });
  return row;
}

module.exports = { STATUS, submitForApproval, listPending, getStatus, approve, reject };
