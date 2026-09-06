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

function models() {
  return require('../../models');
}

/**
 * Dispatch a normalized submission to a provider, persisting an audit row and enforcing
 * idempotency. If a submission with the same (tenant, idempotencyKey) already exists, the
 * prior result is returned instead of sending again — this is the "straight-through" audit
 * spine: every automated hand-off to a provider is recorded and de-duplicated.
 */
async function dispatch({ tenantId, clientId, provider, submissionType, channel, payload, idempotencyKey }) {
  const key = idempotencyKey || `auto-${provider}-${Date.now()}`;
  const normalized = normalize(payload);

  // Persist / dedupe (best-effort: if the DB isn't available we still attempt dispatch).
  let submission = null;
  if (tenantId) {
    const { IntegrationSubmission } = models();
    const existing = await IntegrationSubmission.findOne({
      where: { tenant_id: tenantId, idempotency_key: key },
    });
    if (existing && ['simulated', 'dispatched', 'acknowledged'].includes(existing.status)) {
      return {
        status: existing.status,
        provider: existing.provider,
        providerReference: existing.provider_reference,
        idempotent: true,
        submissionId: existing.id,
      };
    }
    submission = existing || (await IntegrationSubmission.create({
      tenant_id: tenantId,
      client_id: clientId || null,
      provider,
      submission_type: submissionType,
      channel: channel || 'api',
      idempotency_key: key,
      status: 'pending',
      request_snapshot: normalized,
    }));
  }

  async function finalize(result) {
    if (submission) {
      await submission.update({
        status: result.status,
        provider_reference: result.providerReference || null,
        response_snapshot: result.echo || result.response || {},
        error: result.error || null,
        dispatched_at: ['simulated', 'dispatched'].includes(result.status) ? new Date() : null,
      });
      result.submissionId = submission.id;
    }
    return result;
  }

  if (!SUPPORTED.includes(provider)) {
    return finalize({ status: 'failed', error: `Unsupported provider: ${provider}`, provider });
  }

  if (config.features.integrationSimulation || !config.aws.s3Bucket) {
    logger.info('provider dispatch (simulated)', { provider, submissionType, idempotencyKey: key });
    return finalize({
      status: 'simulated',
      provider,
      providerReference: `SIM-${provider}-${key}`,
      echo: normalized,
    });
  }

  // Real adapter dispatch would go here (per-provider adapter modules).
  logger.warn('real provider dispatch not configured; refusing to send', { provider });
  return finalize({ status: 'failed', error: 'Provider adapter not configured', provider });
}

module.exports = { SUPPORTED, dispatch, normalize };
