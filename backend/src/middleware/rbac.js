'use strict';

/**
 * Authorization middleware. `requirePermission(perm)` and `requireAnyPermission([...])`
 * enforce the RBAC matrix against `req.principal.roles`. `requireRole(role)` checks role
 * membership directly (e.g. admin-only endpoints).
 */

const { can, permissionsForRoles } = require('../services/auth/rbac.service');
const { AppError } = require('../utils/errors');

function requirePermission(permission) {
  return (req, _res, next) => {
    if (!req.principal) return next(new AppError('INVALID_TOKEN', 'Authentication required', 401));
    if (!can(req.principal.roles, permission)) {
      return next(new AppError('FORBIDDEN', `Missing permission: ${permission}`, 403));
    }
    next();
  };
}

function requireAnyPermission(permissions) {
  return (req, _res, next) => {
    if (!req.principal) return next(new AppError('INVALID_TOKEN', 'Authentication required', 401));
    const held = permissionsForRoles(req.principal.roles);
    if (!permissions.some((p) => held.has(p))) {
      return next(new AppError('FORBIDDEN', `Missing one of: ${permissions.join(', ')}`, 403));
    }
    next();
  };
}

function requireRole(...roleCodes) {
  return (req, _res, next) => {
    if (!req.principal) return next(new AppError('INVALID_TOKEN', 'Authentication required', 401));
    if (!req.principal.roles.some((r) => roleCodes.includes(r))) {
      return next(new AppError('FORBIDDEN', `Requires role: ${roleCodes.join(' or ')}`, 403));
    }
    next();
  };
}

module.exports = { requirePermission, requireAnyPermission, requireRole };
