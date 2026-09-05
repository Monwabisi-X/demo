'use strict';

/**
 * Inbound provider webhook handling. Verifies the provider signature (HMAC), records the
 * event, and enqueues processing. Signature verification uses a per-provider secret resolved
 * from Secrets Manager in production.
 */

const crypto = require('crypto');
const logger = require('../../config/logger');

function verifySignature({ provider, rawBody, signature, secret }) {
  if (!secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody || '').digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(signature || '')));
  } catch (_e) {
    return false;
  }
}

async function handleEvent({ provider, event }) {
  // Enqueue for the integration worker; here we just acknowledge + log the event type.
  logger.info('provider webhook received', { provider, type: event && event.type });
  try {
    const { queues } = require('../../workers/queue');
    await queues.integration.add('provider_event', { provider, event });
  } catch (_err) {
    // queue offline in dev
  }
  return { accepted: true };
}

module.exports = { verifySignature, handleEvent };
