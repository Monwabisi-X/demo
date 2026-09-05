'use strict';

/**
 * Application-level field encryption (AES-256-GCM).
 *
 * Two modes (see config/encryption.js):
 *  - 'local' : encrypt directly with a 32-byte key from ENCRYPTION_KEY (development).
 *  - 'kms'   : envelope encryption. KMS generates a per-payload data key (DEK); we encrypt
 *              with the plaintext DEK and persist the KMS-wrapped DEK next to the ciphertext.
 *
 * Ciphertext string format (local): base64(iv).base64(authTag).base64(ciphertext)
 * Envelope result (kms): { ciphertext, encryptedDataKey, keyId } — store all three.
 *
 * Callers must NEVER log plaintext or keys.
 */

const crypto = require('crypto');
const encConfig = require('../../config/encryption');
const config = require('../../config');

const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;

function encryptWithKey(plaintext, key) {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), ct.toString('base64')].join('.');
}

function decryptWithKey(packed, key) {
  const [ivB64, tagB64, ctB64] = String(packed).split('.');
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const ct = Buffer.from(ctB64, 'base64');
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}

// ── Local mode ────────────────────────────────────────────────────────────────
function encryptLocal(plaintext) {
  return encryptWithKey(plaintext, encConfig.resolveKeyBuffer());
}
function decryptLocal(packed) {
  return decryptWithKey(packed, encConfig.resolveKeyBuffer());
}

// ── KMS envelope mode ───────────────────────────────────────────────────────
async function encryptEnvelope(plaintext, { keyId } = {}) {
  const { getKMS } = require('../../config/aws');
  const { GenerateDataKeyCommand } = require('@aws-sdk/client-kms');
  const kms = getKMS();
  const KeyId = keyId || encConfig.kmsKeyId;
  const out = await kms.send(new GenerateDataKeyCommand({ KeyId, KeySpec: 'AES_256' }));
  const dek = Buffer.from(out.Plaintext);
  try {
    const ciphertext = encryptWithKey(plaintext, dek);
    return {
      ciphertext,
      encryptedDataKey: Buffer.from(out.CiphertextBlob).toString('base64'),
      keyId: KeyId,
    };
  } finally {
    dek.fill(0); // wipe plaintext DEK from memory
  }
}

async function decryptEnvelope({ ciphertext, encryptedDataKey }) {
  const { getKMS } = require('../../config/aws');
  const { DecryptCommand } = require('@aws-sdk/client-kms');
  const kms = getKMS();
  const out = await kms.send(
    new DecryptCommand({ CiphertextBlob: Buffer.from(encryptedDataKey, 'base64') })
  );
  const dek = Buffer.from(out.Plaintext);
  try {
    return decryptWithKey(ciphertext, dek);
  } finally {
    dek.fill(0);
  }
}

/** Deterministic hash for exact-match lookups on tokenised values (e.g. ID number). */
function deterministicHash(value) {
  return crypto
    .createHmac('sha256', encConfig.resolveKeyBuffer())
    .update(String(value))
    .digest();
}

/** High-level helpers that pick the configured mode. */
async function encryptField(plaintext, opts = {}) {
  if (plaintext == null || plaintext === '') return null;
  if (encConfig.mode === 'kms') return encryptEnvelope(plaintext, opts);
  return { ciphertext: encryptLocal(plaintext), encryptedDataKey: null, keyId: 'local' };
}

async function decryptField(record) {
  if (!record || !record.ciphertext) return null;
  if (record.keyId && record.keyId !== 'local' && record.encryptedDataKey) {
    return decryptEnvelope(record);
  }
  return decryptLocal(record.ciphertext);
}

/** Mask a value for safe display, keeping only the last `keep` chars. */
function mask(value, keep = 4) {
  const s = String(value || '');
  if (s.length <= keep) return '*'.repeat(s.length);
  return `${'*'.repeat(Math.max(4, s.length - keep))}${s.slice(-keep)}`;
}

module.exports = {
  mode: encConfig.mode,
  encryptLocal,
  decryptLocal,
  encryptEnvelope,
  decryptEnvelope,
  encryptField,
  decryptField,
  deterministicHash,
  mask,
};
