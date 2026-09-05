'use strict';

/**
 * Winston logger.
 *
 * IMPORTANT (POPIA / privacy): never log personal or sensitive information. Log identifiers
 * (ids, request ids), not values. The `redactMeta` helper strips known-sensitive keys from
 * any metadata object before it is written.
 */

const winston = require('winston');
const config = require('./index');

const SENSITIVE_KEYS = new Set([
  'password',
  'newpassword',
  'oldpassword',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'idnumber',
  'id_number',
  'sa_id_number',
  'passportnumber',
  'passport_number',
  'taxnumber',
  'tax_number',
  'accountnumber',
  'account_number',
  'bank_account_number',
  'cardnumber',
  'card_number',
  'cvv',
  'pin',
  'encryptionkey',
  'encryption_key',
  'secret',
  'ciphertext',
  'medical',
  'medical_responses',
]);

function redactMeta(meta) {
  if (!meta || typeof meta !== 'object') return meta;
  const out = Array.isArray(meta) ? [] : {};
  for (const [k, v] of Object.entries(meta)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      out[k] = '[REDACTED]';
    } else if (v && typeof v === 'object') {
      out[k] = redactMeta(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

const redactFormat = winston.format((info) => {
  const { level, message, timestamp, ...rest } = info;
  const cleaned = redactMeta(rest);
  return { level, message, timestamp, ...cleaned };
});

const logger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    redactFormat(),
    config.isProd ? winston.format.json() : winston.format.simple()
  ),
  transports: [new winston.transports.Console()],
  silent: config.isTest,
});

logger.redactMeta = redactMeta;

module.exports = logger;
