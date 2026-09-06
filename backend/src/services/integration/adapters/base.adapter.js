'use strict';

/**
 * Base provider adapter contract + shared helpers.
 *
 * Every real integration (insurer or government) is implemented as an adapter module that
 * exports:
 *   - provider:        stable provider code (e.g. 'santam', 'sars')
 *   - kind:            'insurer' | 'government'
 *   - supports(type):  whether it handles a given submission_type
 *   - map(payload):    translate the platform's normalized payload -> the provider's shape
 *   - send({ ... }):   perform the actual REST/SFTP/email call and return a normalized result
 *
 * `send` MUST return: { status, providerReference?, response?, error? }
 *   status ∈ 'dispatched' | 'acknowledged' | 'failed'
 *
 * Credentials are ALWAYS fetched from AWS Secrets Manager at call time (never from source or
 * committed config). Adapters never log request/response bodies that may contain PII.
 */

const logger = require('../../../config/logger');

// Lazy cache of resolved secrets so we don't hit Secrets Manager on every call.
const _secretCache = new Map();

/**
 * Resolve a JSON or string secret by name from Secrets Manager. Returns null when AWS isn't
 * configured (dev/test) so callers can fall back to simulation.
 */
async function loadSecret(secretId) {
  if (!secretId) return null;
  if (_secretCache.has(secretId)) return _secretCache.get(secretId);
  try {
    const { getSecrets } = require('../../../config/aws');
    const { GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
    const res = await getSecrets().send(new GetSecretValueCommand({ SecretId: secretId }));
    let value = res.SecretString || null;
    try {
      value = JSON.parse(value);
    } catch (_e) {
      /* plain string secret */
    }
    _secretCache.set(secretId, value);
    return value;
  } catch (err) {
    logger.warn('adapter secret load failed', { secretId, message: err.message });
    return null;
  }
}

/**
 * Minimal JSON HTTP helper built on global fetch (Node 18+). Applies a timeout and returns
 * { ok, status, body }. Adapters use this so we don't add an HTTP dependency.
 */
async function httpJson(url, { method = 'POST', headers = {}, body, timeoutMs = 15000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json', ...headers },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    let parsed = null;
    const text = await res.text();
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch (_e) {
      parsed = { raw: text };
    }
    return { ok: res.ok, status: res.status, body: parsed };
  } finally {
    clearTimeout(timer);
  }
}

/** Standard failure shape so the dispatch mesh handles every adapter uniformly. */
function fail(error) {
  return { status: 'failed', error: String(error) };
}

module.exports = { loadSecret, httpJson, fail };
