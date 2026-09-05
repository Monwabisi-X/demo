'use strict';

/**
 * Integration worker: processes inbound provider events (from webhooks) and outbound
 * provider dispatch jobs. Uses the provider adapter service; dispatch is simulated unless
 * real adapters/credentials are configured.
 */

const logger = require('../config/logger');
const providerService = require('../services/integration/provider.service');

async function providerEvent(job) {
  const { provider, event } = job.data;
  logger.info('processing provider event', { provider, type: event && event.type });
  // Map inbound event to a domain update (e.g. claim status, policy confirmation).
  // Kept minimal here; real handlers would update claims/policies + record claim_external_events.
  return { processed: true };
}

async function dispatch(job) {
  const { provider, submissionType, payload, idempotencyKey } = job.data;
  const result = await providerService.dispatch({ provider, submissionType, payload, idempotencyKey });
  logger.info('provider dispatch result', { provider, status: result.status });
  return result;
}

function register(queue) {
  queue.process('provider_event', 5, providerEvent);
  queue.process('dispatch', 5, dispatch);
  logger.info('integration worker registered');
}

module.exports = { register, providerEvent, dispatch };
