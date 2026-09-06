'use strict';

/**
 * SARS government adapter — skeleton.
 *
 * Handles tax-document requests such as an IRP5/IT3(a) retrieval on behalf of a client (with
 * the client's consent captured elsewhere). Real SARS integrations use eFiling / the SARS
 * Third Party Data channel with mutually authenticated TLS + credentials held in Secrets
 * Manager. This skeleton establishes the contract and mapping; wire the real channel when
 * the integration agreement and certificates are in place.
 */

const { loadSecret, httpJson, fail } = require('./base.adapter');

const PROVIDER = 'sars';
const KIND = 'government';

const SUPPORTED_TYPES = new Set(['REQUEST_IRP5', 'TAX_CERTIFICATE']);

function supports(submissionType) {
  return SUPPORTED_TYPES.has(submissionType);
}

function map(submissionType, payload) {
  // ID number is sensitive: pass a reference/hash where possible; the real channel encrypts
  // in transit and the value is never logged by this adapter.
  return {
    taxReference: payload.tax_reference || null,
    idNumberRef: payload.id_number_ref || null,
    taxYear: payload.tax_year,
    documentType: submissionType === 'REQUEST_IRP5' ? 'IRP5' : payload.document_type,
  };
}

async function send({ submissionType, payload, idempotencyKey }) {
  const secret = await loadSecret(process.env.SARS_SECRET_ID || 'rsf/production/integration-sars');
  const baseUrl = secret && secret.baseUrl;
  const clientCredential = secret && (secret.apiKey || secret.clientId);
  if (!baseUrl || !clientCredential) {
    return fail('SARS adapter not configured (missing baseUrl/credential secret)');
  }

  try {
    const { ok, status, body } = await httpJson(`${baseUrl.replace(/\/$/, '')}/tax-documents/requests`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${clientCredential}`,
        'idempotency-key': idempotencyKey,
      },
      body: map(submissionType, payload),
    });
    if (!ok) return { status: 'failed', error: `SARS HTTP ${status}`, response: body };
    return {
      status: 'dispatched',
      providerReference: body && (body.requestId || body.reference),
      response: body,
    };
  } catch (err) {
    return fail(err.message);
  }
}

module.exports = { provider: PROVIDER, kind: KIND, supports, map, send };
