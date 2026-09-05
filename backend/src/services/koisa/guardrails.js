'use strict';

/**
 * Server-side Koisa guardrails (JS mirror of agent/koisa/guardrails.py).
 *
 * These enforce, in the backend, that Koisa:
 *   - only ever receives data from the allow-listed tools for the active mode, and
 *   - never emits denied personal/sensitive fields (they are redacted before reaching the
 *     model), and
 *   - warns the user when they appear to be about to share sensitive information.
 *
 * The canonical policy lives in agent/config/modes.json. This module loads it if present,
 * and falls back to a built-in copy so the backend is self-contained.
 */

const fs = require('fs');
const path = require('path');

const FALLBACK = {
  global_denied_data: [
    'sa_id_number', 'id_number', 'passport_number', 'tax_number',
    'bank_account_number', 'branch_code', 'card_number', 'policy_number_full',
    'date_of_birth', 'physical_address', 'email_address', 'phone_number',
    'medical_history', 'medical_questionnaire', 'medical_responses',
    'medical_measurements', 'health_conditions', 'smoker_status', 'biometrics',
    'password', 'credentials', 'kms_key', 'encryption_key',
    // backend column names that must never surface to Koisa
    'id_number_ciphertext', 'id_number_hash', 'passport_number_ciphertext',
    'tax_number_ciphertext', 'email_ciphertext', 'mobile_ciphertext',
    'policy_number_ciphertext', 'password_hash', 'payload_ciphertext',
    'encrypted_data_key',
  ],
  sensitive_input_warning:
    'For your security, please do not share sensitive personal information in this chat — ' +
    'such as your ID or passport number, bank or card details, passwords, or medical ' +
    "information. I don't need it and can't process it here.",
  modes: {
    public: { tools: ['get_public_faqs', 'get_product_catalog', 'get_company_info'], requires_rls_session: false },
    authenticated: {
      tools: ['get_client_dashboard_summary', 'navigate_to_tab', 'get_policy_details'],
      requires_rls_session: true,
    },
  },
};

function loadPolicy() {
  const candidate = path.resolve(__dirname, '../../../../agent/config/modes.json');
  try {
    if (fs.existsSync(candidate)) {
      const parsed = JSON.parse(fs.readFileSync(candidate, 'utf8'));
      return {
        global_denied_data: Array.from(
          new Set([...(parsed.global_denied_data || []), ...FALLBACK.global_denied_data])
        ),
        sensitive_input_warning: parsed.sensitive_input_warning || FALLBACK.sensitive_input_warning,
        modes: parsed.modes || FALLBACK.modes,
      };
    }
  } catch (_e) {
    /* fall through to fallback */
  }
  return FALLBACK;
}

const POLICY = loadPolicy();

const SA_ID_RE = /\b\d{6}[\s-]?\d{4}[\s-]?\d{3}\b/;
const LONG_DIGITS_RE = /\b(?:\d[\s-]?){11,}\b/;
const CARD_RE = /\b(?:\d[ -]?){13,19}\b/;
const KEYWORD_RE = /\b(id\s*number|identity\s*number|passport\s*(number|no)|tax\s*(number|no)|bank\s*account|account\s*number|branch\s*code|card\s*number|cvv|pin|password|otp|medical|diagnosis|illness|medication|hiv|cancer|diabetes)\b/i;

function detectSensitiveInput(text) {
  if (!text) return { sensitive: false, categories: [] };
  const categories = [];
  if (SA_ID_RE.test(text)) categories.push('sa_id_number');
  if (CARD_RE.test(text)) categories.push('card_or_account_number');
  else if (LONG_DIGITS_RE.test(text)) categories.push('long_number');
  if (KEYWORD_RE.test(text)) categories.push('sensitive_keyword');
  return { sensitive: categories.length > 0, categories };
}

function keyIsDenied(key, denied) {
  const k = String(key).toLowerCase();
  return denied.some((d) => {
    const dl = d.toLowerCase();
    return k === dl || k.includes(dl);
  });
}

function redactDenied(value, denied = POLICY.global_denied_data) {
  if (Array.isArray(value)) return value.map((v) => redactDenied(v, denied));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = keyIsDenied(k, denied) ? '[REDACTED]' : redactDenied(v, denied);
    }
    return out;
  }
  return value;
}

function toolsForMode(mode) {
  const m = POLICY.modes[mode];
  return m ? m.tools : [];
}

function assertToolAllowed(mode, toolName) {
  if (!toolsForMode(mode).includes(toolName)) {
    const err = new Error(`Tool ${toolName} is not permitted in mode ${mode}`);
    err.code = 'MODE_VIOLATION';
    throw err;
  }
}

module.exports = {
  POLICY,
  detectSensitiveInput,
  redactDenied,
  toolsForMode,
  assertToolAllowed,
  sensitiveInputWarning: POLICY.sensitive_input_warning,
};
