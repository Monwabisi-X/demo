'use strict';

/**
 * JWT issuing/verification + Redis-backed refresh & blacklist support.
 *
 * Access tokens are short-ish lived (JWT_EXPIRY) and carry the principal's identity, tenant,
 * roles and (for CLIENT users) the client_id used to scope RLS. Refresh tokens are opaque
 * random strings stored in Redis so they can be revoked server-side.
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../../config');
const { getRedis } = require('../../config/redis');

const BLACKLIST_PREFIX = 'blacklist:';
const REFRESH_PREFIX = 'refresh:';
const SESSION_PREFIX = 'session:';
const RESET_PREFIX = 'pwreset:';

function signAccessToken(principal) {
  const payload = {
    sub: principal.userId,
    tenantId: principal.tenantId,
    clientId: principal.clientId || null,
    roles: principal.roles || [],
    type: 'access',
  };
  return jwt.sign(payload, config.auth.jwtSecret, { expiresIn: config.auth.jwtExpiry });
}

function verifyAccessToken(token) {
  return jwt.verify(token, config.auth.jwtSecret);
}

/** SHA-256 of a token, used as the blacklist/session key (never store the raw token). */
function tokenKey(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function blacklist(token, ttlSeconds = 7 * 24 * 3600) {
  const redis = getRedis();
  await redis.set(`${BLACKLIST_PREFIX}${tokenKey(token)}`, '1', 'EX', ttlSeconds);
}

async function isBlacklisted(token) {
  const redis = getRedis();
  const hit = await redis.get(`${BLACKLIST_PREFIX}${tokenKey(token)}`);
  return hit === '1';
}

async function issueRefreshToken(userId, meta = {}) {
  const redis = getRedis();
  const raw = crypto.randomBytes(48).toString('base64url');
  const key = `${REFRESH_PREFIX}${tokenKey(raw)}`;
  const ttl = parseDurationSeconds(config.auth.refreshTokenExpiry);
  await redis.set(key, JSON.stringify({ userId, ...meta, createdAt: Date.now() }), 'EX', ttl);
  // Track session for listing/revocation.
  await redis.sadd(`${SESSION_PREFIX}${userId}`, tokenKey(raw));
  return raw;
}

async function consumeRefreshToken(raw) {
  const redis = getRedis();
  const key = `${REFRESH_PREFIX}${tokenKey(raw)}`;
  const data = await redis.get(key);
  if (!data) return null;
  return JSON.parse(data);
}

async function revokeRefreshToken(raw, userId) {
  const redis = getRedis();
  await redis.del(`${REFRESH_PREFIX}${tokenKey(raw)}`);
  if (userId) await redis.srem(`${SESSION_PREFIX}${userId}`, tokenKey(raw));
}

async function listSessions(userId) {
  const redis = getRedis();
  return redis.smembers(`${SESSION_PREFIX}${userId}`);
}

/** Revoke a session by its key (the SHA-256 token key returned from listSessions). */
async function revokeSession(userId, sessionKey) {
  const redis = getRedis();
  await redis.del(`${REFRESH_PREFIX}${sessionKey}`);
  await redis.srem(`${SESSION_PREFIX}${userId}`, sessionKey);
}

/**
 * Issue a single-use password reset token. Returns the raw token (to be emailed to the
 * user); only its hash is stored in Redis, with a short TTL.
 */
async function issuePasswordResetToken(userId, ttlSeconds = 3600) {
  const redis = getRedis();
  const raw = crypto.randomBytes(32).toString('base64url');
  await redis.set(`${RESET_PREFIX}${tokenKey(raw)}`, JSON.stringify({ userId }), 'EX', ttlSeconds);
  return raw;
}

/** Consume (and delete) a password reset token, returning { userId } or null. */
async function consumePasswordResetToken(raw) {
  const redis = getRedis();
  const key = `${RESET_PREFIX}${tokenKey(raw)}`;
  const data = await redis.get(key);
  if (!data) return null;
  await redis.del(key); // single use
  return JSON.parse(data);
}

/** Parse durations like '7d', '30m', '3600' into seconds. */
function parseDurationSeconds(value) {
  if (typeof value === 'number') return value;
  const m = String(value).match(/^(\d+)([smhd])?$/);
  if (!m) return 7 * 24 * 3600;
  const n = parseInt(m[1], 10);
  const unit = m[2] || 's';
  return n * { s: 1, m: 60, h: 3600, d: 86400 }[unit];
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  blacklist,
  isBlacklisted,
  issueRefreshToken,
  consumeRefreshToken,
  revokeRefreshToken,
  listSessions,
  revokeSession,
  issuePasswordResetToken,
  consumePasswordResetToken,
  tokenKey,
};
