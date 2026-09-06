'use strict';

const authService = require('../services/auth/auth.service');
const { extractToken } = require('../middleware/auth');
const { ok } = require('../utils/respond');

async function login(req, res) {
  const result = await authService.login({
    ...req.body,
    meta: { ip: req.context && req.context.ip, userAgent: req.context && req.context.userAgent },
  });
  return ok(res, result);
}

// Client-facing sign-in: email + password only; the tenant is resolved server-side.
async function clientLogin(req, res) {
  const result = await authService.loginByEmail({
    ...req.body,
    meta: { ip: req.context && req.context.ip, userAgent: req.context && req.context.userAgent },
  });
  return ok(res, result);
}

async function register(req, res) {
  const { clientProfile, ...rest } = req.body;
  const user = await authService.register({ ...rest, clientProfile });
  return ok(res, user, 201);
}

async function refresh(req, res) {
  return ok(res, await authService.refresh(req.body));
}

async function logout(req, res) {
  await authService.logout({
    accessToken: extractToken(req),
    refreshToken: req.body && req.body.refreshToken,
    userId: req.principal && req.principal.userId,
  });
  return ok(res, { loggedOut: true });
}

async function forgotPassword(req, res) {
  // Always 200 regardless of whether the email exists (no user enumeration).
  await authService.forgotPassword(req.body);
  return ok(res, { requested: true });
}

async function resetPassword(req, res) {
  return ok(res, await authService.resetPassword(req.body));
}

async function me(req, res) {
  const { User } = require('../models');
  const user = await User.findByPk(req.principal.userId);
  return ok(res, user);
}

async function updateMe(req, res) {
  return ok(res, await authService.updateProfile({ userId: req.principal.userId, ...req.body }));
}

async function changePassword(req, res) {
  await authService.changePassword({ userId: req.principal.userId, ...req.body });
  return ok(res, { changed: true });
}

async function listSessions(req, res) {
  return ok(res, await authService.listSessions({ userId: req.principal.userId }));
}

async function revokeSession(req, res) {
  return ok(res, await authService.revokeSession({
    userId: req.principal.userId,
    sessionId: req.params.sessionId,
  }));
}

// ── Admin user management ────────────────────────────────────────────────────────
async function listUsers(req, res) {
  const { User } = require('../models');
  const users = await User.findAll({ where: { tenant_id: req.principal.tenantId } });
  return ok(res, users);
}

async function createUser(req, res) {
  const user = await authService.createUser({ tenantId: req.principal.tenantId, ...req.body });
  res.locals.auditEntityId = user.id;
  return ok(res, user, 201);
}

async function updateUser(req, res) {
  return ok(res, await authService.updateUser({
    tenantId: req.principal.tenantId,
    userId: req.params.userId,
    ...req.body,
  }));
}

async function deleteUser(req, res) {
  return ok(res, await authService.deleteUser({
    tenantId: req.principal.tenantId,
    userId: req.params.userId,
  }));
}

module.exports = {
  login,
  clientLogin,
  register,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  me,
  updateMe,
  changePassword,
  listSessions,
  revokeSession,
  listUsers,
  createUser,
  updateUser,
  deleteUser,
};
