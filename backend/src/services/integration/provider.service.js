'use strict';

/**
 * Provider integration mesh (adapter pattern). Normalised platform data is translated into
 * provider-specific payloads (Santam, Sanlam, Discovery, Liberty, Old Mutual) and dispatched
 * via REST/SFTP/encrypted email. In this build, dispatch is SIMULATED unless real adapters
 * and credentials are configured. Idempotency keys prevent duplicate submissions.
 */

const config = require('../../config');
const logger = require('../../config/logger');

const SUPPORTED = ['santam', 'sanlam', 'discovery', 'liberty', 'old_mutual'];

function normalize(payload) {
  // A place to map internal shapes to a normalized provider-agnostic structure.
  return { ...payload };
}

async function dispatch({ provider, submissionType, payload, idempotencyKey }) {
  if (!SUPPORTED.includes(provider)) {
    return { status: 'failed', error: `Unsupported provider: ${provider}` };
  }
  const normalized = normalize(payload);

  if (config.features.integrationSimulation || !config.aws.region) {
    logger.info('provider dispatch (simulated)', { provider, submissionType, idempotencyKey });
    return {
      status: 'simulated',
      provider,
      providerReference: `SIM-${provider}-${idempotencyKey || Date.now()}`,
      echo: normalized,
    };
  }

  // Real adapter dispatch would go here (per-provider adapter modules).
  logger.warn('real provider dispatch not configured; refusing to send', { provider });
  return { status: 'failed', error: 'Provider adapter not configured' };
}

module.exports = { SUPPORTED, dispatch, normalize };
