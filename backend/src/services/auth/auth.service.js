'use strict';

/**
 * Authentication business logic: register, login, refresh, logout, password management.
 * Passwords are hashed with bcrypt. Tokens are issued via jwt.service.
 */

const bcrypt = require('bcryptjs');
const jwtService = require('./jwt.service');
const { AppError } = require('../../utils/errors');

const BCRYPT_ROUNDS = 12;

// A fixed valid bcrypt hash used only to equalise timing when no user/hash is present,
// so tenant-less login can't be used to enumerate registered emails. Matches nothing.
const DUMMY_HASH = '$2a$12$C6UzMDM.H6dfI/f/IKcEeO3vg0Yq1n9Qm1qk8oQF5.4bqjJ8b6jFa';

// Lazy model access so this module can be required without a live DB (load checks).
function models() {
  return require('../../models');
}

async function hashPassword(plain) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

function principalFromUser(user, roleCodes) {
  return {
    userId: user.id,
    tenantId: user.tenant_id,
    clientId: user.client_id || null,
    roles: roleCodes,
  };
}

async function roleCodesForUser(user) {
  const { Role } = models();
  const roles = await user.getRoles({ attributes: ['code'] });
  return roles.map((r) => r.code);
}

async function register({ tenantId, email, displayName, password, roleCodes = ['CLIENT'] }) {
  const { User, Role } = models();
  const existing = await User.findOne({ where: { tenant_id: tenantId, email } });
  if (existing) throw new AppError('DUPLICATE_RESOURCE', 'A user with that email already exists', 409);

  const user = await User.create({
    tenant_id: tenantId,
    email,
    display_name: displayName,
    password_hash: await hashPassword(password),
  });

  const roles = await Role.findAll({ where: { code: roleCodes } });
  if (roles.length) await user.setRoles(roles);

  return sanitize(user);
}

async function login({ tenantId, email, password, meta = {} }) {
  const { User } = models();
  const user = await User.scope('withSecret').findOne({
    where: { tenant_id: tenantId, email, status: 'active' },
  });
  // Constant-ish response to avoid user enumeration.
  const ok = user && user.password_hash && (await bcrypt.compare(password, user.password_hash));
  if (!ok) throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);

  return issueSession(user, meta);
}

/**
 * Tenant-less login: resolve the tenant on the server from the email + password alone.
 *
 * The client-facing sign-in only collects email + password (no tenant UUID). Because
 * `email` is unique only per-tenant, we load all active users with that email and match on
 * the password. In practice a client's email is unique across tenants; if it somehow matches
 * in more than one tenant we refuse rather than guess (the caller must use tenant-scoped
 * login). Timing is kept roughly constant to avoid user enumeration.
 */
async function loginByEmail({ email, password, meta = {} }) {
  const { User } = models();
  const users = await User.scope('withSecret').findAll({
    where: { email, status: 'active' },
  });

  const matches = [];
  for (const u of users) {
    // Always run a compare (even against a dummy) to keep timing uniform.
    const hash = u.password_hash || DUMMY_HASH;
    if ((await bcrypt.compare(password, hash)) && u.password_hash) matches.push(u);
  }
  if (users.length === 0) {
    // Burn a compare so a missing email costs the same as a wrong password.
    await bcrypt.compare(password, DUMMY_HASH);
  }

  if (matches.length === 0) {
    throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }
  if (matches.length > 1) {
    // Ambiguous across tenants — do not guess which account is intended.
    throw new AppError('AMBIGUOUS_ACCOUNT', 'This email is registered with more than one organisation. Please contact your adviser.', 409);
  }

  return issueSession(matches[0], meta);
}

/** Shared session issuance for both tenant-scoped and tenant-less login. */
async function issueSession(user, meta = {}) {
  const roleCodes = await roleCodesForUser(user);
  const principal = principalFromUser(user, roleCodes);
  const accessToken = jwtService.signAccessToken(principal);
  const refreshToken = await jwtService.issueRefreshToken(user.id, {
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  await user.update({ last_login_at: new Date() });
  return { accessToken, refreshToken, user: sanitize(user), roles: roleCodes };
}

async function refresh({ refreshToken }) {
  const data = await jwtService.consumeRefreshToken(refreshToken);
  if (!data) throw new AppError('INVALID_TOKEN', 'Invalid or expired refresh token', 401);

  const { User } = models();
  const user = await User.findByPk(data.userId);
  if (!user || user.status !== 'active') {
    throw new AppError('INVALID_TOKEN', 'User no longer active', 401);
  }
  const roleCodes = await roleCodesForUser(user);
  const accessToken = jwtService.signAccessToken(principalFromUser(user, roleCodes));
  return { accessToken };
}

async function logout({ accessToken, refreshToken, userId }) {
  if (accessToken) await jwtService.blacklist(accessToken);
  if (refreshToken) await jwtService.revokeRefreshToken(refreshToken, userId);
}

async function changePassword({ userId, oldPassword, newPassword }) {
  const { User } = models();
  const user = await User.scope('withSecret').findByPk(userId);
  if (!user) throw new AppError('NOT_FOUND', 'User not found', 404);
  const ok = user.password_hash && (await bcrypt.compare(oldPassword, user.password_hash));
  if (!ok) throw new AppError('INVALID_CREDENTIALS', 'Current password is incorrect', 401);
  await user.update({ password_hash: await hashPassword(newPassword) });
}

/**
 * Begin a password reset. Always resolves the same way regardless of whether the email
 * exists (no user enumeration). When the user exists, a single-use reset token is issued;
 * in production this is emailed via the notification service (not returned to the caller).
 */
async function forgotPassword({ tenantId, email }) {
  const { User } = models();
  const user = await User.findOne({ where: { tenant_id: tenantId, email, status: 'active' } });
  if (user) {
    const token = await jwtService.issuePasswordResetToken(user.id);
    try {
      const notification = require('../notification/notification.service');
      await notification.enqueue({
        userId: user.id,
        channel: 'email',
        templateCode: 'password_reset',
        recipient: email,
        body: 'A password reset was requested for your account.',
        // The raw token is passed to the delivery layer only, never persisted/logged here.
        meta: { resetToken: token },
      });
    } catch (_e) {
      // Notification backend may be offline in dev; the token still exists in Redis.
    }
  }
  return { requested: true };
}

/** Complete a password reset using a single-use token. */
async function resetPassword({ token, newPassword }) {
  const data = await jwtService.consumePasswordResetToken(token);
  if (!data) throw new AppError('INVALID_TOKEN', 'Invalid or expired reset token', 401);
  const { User } = models();
  const user = await User.findByPk(data.userId);
  if (!user) throw new AppError('NOT_FOUND', 'User not found', 404);
  await user.update({ password_hash: await hashPassword(newPassword) });
  return { reset: true };
}

/** Update the current user's own profile (safe fields only). */
async function updateProfile({ userId, displayName, email }) {
  const { User } = models();
  const user = await User.findByPk(userId);
  if (!user) throw new AppError('NOT_FOUND', 'User not found', 404);
  await user.update({
    display_name: displayName ?? user.display_name,
    email: email ?? user.email,
  });
  return sanitize(user);
}

// ── Session management ─────────────────────────────────────────────────────────
async function listSessions({ userId }) {
  const keys = await jwtService.listSessions(userId);
  return keys.map((sessionId) => ({ sessionId }));
}

async function revokeSession({ userId, sessionId }) {
  await jwtService.revokeSession(userId, sessionId);
  return { revoked: true };
}

// ── Admin user management ────────────────────────────────────────────────────────
async function createUser({ tenantId, email, displayName, password, roleCodes = [] }) {
  return register({ tenantId, email, displayName, password, roleCodes });
}

async function updateUser({ tenantId, userId, displayName, email, status, roleCodes }) {
  const { User, Role } = models();
  const user = await User.findOne({ where: { id: userId, tenant_id: tenantId } });
  if (!user) throw new AppError('NOT_FOUND', 'User not found', 404);
  await user.update({
    display_name: displayName ?? user.display_name,
    email: email ?? user.email,
    status: status ?? user.status,
  });
  if (Array.isArray(roleCodes)) {
    const roles = await Role.findAll({ where: { code: roleCodes } });
    await user.setRoles(roles);
  }
  return sanitize(user);
}

async function deleteUser({ tenantId, userId }) {
  const { User } = models();
  const user = await User.findOne({ where: { id: userId, tenant_id: tenantId } });
  if (!user) throw new AppError('NOT_FOUND', 'User not found', 404);
  // Soft-delete: deactivate and stamp deleted_at rather than hard delete (audit-friendly).
  await user.update({ status: 'inactive', deleted_at: new Date() });
  return { id: userId, deleted: true };
}

function sanitize(user) {
  const json = typeof user.toJSON === 'function' ? user.toJSON() : user;
  delete json.password_hash;
  return json;
}

module.exports = {
  register,
  login,
  loginByEmail,
  refresh,
  logout,
  changePassword,
  forgotPassword,
  resetPassword,
  updateProfile,
  listSessions,
  revokeSession,
  createUser,
  updateUser,
  deleteUser,
  hashPassword,
  roleCodesForUser,
};
