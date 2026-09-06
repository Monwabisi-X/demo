'use strict';

/**
 * Santam insurer adapter (REST) — skeleton.
 *
 * Maps the platform's normalized claim/policy payloads to Santam's API shape and submits them.
 * The base URL and API key are resolved from Secrets Manager / env at call time; nothing is
 * committed. Until a real endpoint + credentials are provided this returns a clear 'failed'
 * with a not-configured error, and the dispatch mesh's simulation mode covers dev/testing.
 *
 * Replace the endpoint paths and field mappings with Santam's published spec when onboarding.
 */

const { loadSecret, httpJson, fail } = require('./base.adapter');

const PROVIDER = 'santam';
const KIND = 'insurer';

// Submission types this adapter knows how to translate.
const SUPPORTED_TYPES = new Set(['CLAIM', 'POLICY_APPLICATION', 'DOCUMENT_REQUEST']);

function supports(submissionType) {
  return SUPPORTED_TYPES.has(submissionType);
}

/** Translate the platform's normalized payload into Santam's request body. */
function map(submissionType, payload) {
  switch (submissionType) {
    case 'CLAIM':
      return {
        claimType: payload.claim_type || 'motor',
        lossDate: payload.loss_date,
        description: payload.narrative,
        // Evidence documents are referenced by S3 key/URL, uploaded separately or presigned.
        attachments: payload.attachments || [],
        incident: payload.incident_data || {},
      };
    case 'POLICY_APPLICATION':
      return { productCode: payload.product_code, cover: payload.cover_amount, premium: payload.premium };
    case 'DOCUMENT_REQUEST':
      return { documentType: payload.document_type, policyNumber: payload.policy_number };
    default:
      return payload;
  }
}

/**
 * Send to Santam. Resolves { baseUrl, apiKey } from the 'integration/santam' secret
 * (JSON: { "baseUrl": "...", "apiKey": "..." }). Endpoint paths are placeholders.
 */
async function send({ submissionType, payload, idempotencyKey }) {
  const secret = await loadSecret(process.env.SANTAM_SECRET_ID || 'rsf/production/integration-santam');
  const baseUrl = secret && secret.baseUrl;
  const apiKey = secret && secret.apiKey;
  if (!baseUrl || !apiKey) {
    return fail('Santam adapter not configured (missing baseUrl/apiKey secret)');
  }

  const path = {
    CLAIM: '/claims',
    POLICY_APPLICATION: '/policies/applications',
    DOCUMENT_REQUEST: '/documents/requests',
  }[submissionType] || '/submissions';

  try {
    const { ok, status, body } = await httpJson(`${baseUrl.replace(/\/$/, '')}${path}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'idempotency-key': idempotencyKey,
      },
      body: map(submissionType, payload),
    });
    if (!ok) return { status: 'failed', error: `Santam HTTP ${status}`, response: body };
    return {
      status: 'dispatched',
      providerReference: body && (body.claimNumber || body.reference || body.id),
      response: body,
    };
  } catch (err) {
    return fail(err.message);
  }
}

module.exports = { provider: PROVIDER, kind: KIND, supports, map, send };
