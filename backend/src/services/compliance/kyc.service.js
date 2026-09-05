'use strict';

/**
 * FICA / KYC status. In production this integrates with Smile ID / TruID for real-time DHA
 * and NATIS checks (via the provider integration mesh); here we record and expose the status
 * on the client record. Verification is simulated when integration simulation is enabled.
 */

const config = require('../../config');
const { AppError } = require('../../utils/errors');

function models() {
  return require('../../models');
}

async function getStatus(clientId) {
  const { Client } = models();
  const client = await Client.findByPk(clientId, { attributes: ['id', 'fica_status'] });
  if (!client) throw new AppError('NOT_FOUND', 'Client not found', 404);
  return { client_id: clientId, fica_status: client.fica_status };
}

/**
 * Submit KYC. The verification method/provider is recorded; the ID number itself must be
 * handled by the encryption service and never persisted in plaintext (the caller passes an
 * already-encrypted reference or triggers the provider adapter).
 */
async function submit({ clientId, method, provider }) {
  const { Client } = models();
  const client = await models().Client.findByPk(clientId);
  if (!client) throw new AppError('NOT_FOUND', 'Client not found', 404);

  // Simulated result path for prototype/dev.
  const status = config.features.integrationSimulation ? 'verified' : 'in_progress';
  await client.update({ fica_status: status });
  return { client_id: clientId, fica_status: status, method, provider: provider || 'simulated' };
}

module.exports = { getStatus, submit };
