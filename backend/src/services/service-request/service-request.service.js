'use strict';

/**
 * Client "other tasks": change of address / bank details, request a policy document, border
 * letter, IRP5, or a consultation. A client raises the request; advisers work it. Where the
 * request maps to a provider action it can be handed to the integration mesh (straight-through).
 */

const { AppError } = require('../../utils/errors');

function models() {
  return require('../../models');
}

const REQUEST_TYPES = [
  'CHANGE_OF_ADDRESS',
  'CHANGE_OF_BANK',
  'REQUEST_POLICY_DOCUMENT',
  'REQUEST_BORDER_LETTER',
  'REQUEST_IRP5',
  'REQUEST_CONSULTATION',
];

async function listForClient({ tenantId, clientId }) {
  const { ServiceRequest } = models();
  return ServiceRequest.findAll({
    where: { tenant_id: tenantId, client_id: clientId },
    order: [['created_at', 'DESC']],
  });
}

async function create({ tenantId, clientId, createdBy, data }) {
  const { ServiceRequest } = models();
  if (!REQUEST_TYPES.includes(data.requestType)) {
    throw new AppError('VALIDATION_ERROR', `Unknown request type: ${data.requestType}`, 400);
  }
  return ServiceRequest.create({
    tenant_id: tenantId,
    client_id: clientId,
    request_type: data.requestType,
    details: data.details || {},
    policy_id: data.policyId || null,
    provider_id: data.providerId || null,
    created_by: createdBy || null,
  });
}

async function updateStatus({ tenantId, requestId, status, assignedUserId }) {
  const { ServiceRequest } = models();
  const req = await ServiceRequest.findOne({ where: { id: requestId, tenant_id: tenantId } });
  if (!req) throw new AppError('NOT_FOUND', 'Service request not found', 404);
  await req.update({
    status: status ?? req.status,
    assigned_user_id: assignedUserId ?? req.assigned_user_id,
    resolved_at: status === 'completed' ? new Date() : req.resolved_at,
  });
  return req;
}

module.exports = { REQUEST_TYPES, listForClient, create, updateStatus };
