'use strict';

/**
 * Self-ownership enforcement.
 *
 * Several routes are readable both by staff (broad CLIENT_READ / FINANCIAL / CLAIMS / DOCUMENT
 * permissions across the tenant) and by a CLIENT viewing their OWN record (via the *_SELF
 * permissions). The RBAC guards let both through, but on their own they do NOT stop a CLIENT
 * from passing someone else's clientId in the URL or body.
 *
 * `enforceClientScope` closes that gap: when the caller is a "self-scoped" principal — i.e. a
 * CLIENT who does not also hold a broad read permission — the clientId taken from the request
 * (param first, then body) MUST equal the clientId bound to their JWT. Staff principals (who
 * hold broad permissions) are unaffected and may access any client in their tenant.
 *
 * This is defence-in-depth on top of tenant scoping in the services; it does not replace it.
 */

const { AppError } = require('../utils/errors');
const { permissionsForRoles, PERMISSIONS: P } = require('../services/auth/rbac.service');

// Broad (non-self) read permissions. Holding ANY of these means the caller is staff-level and
// is allowed to read across clients in their tenant, so self-scoping does not apply.
const BROAD_READ_PERMISSIONS = [
  P.CLIENT_READ,
  P.CLIENT_UPDATE,
  P.FINANCIAL_READ,
  P.CLAIMS_READ,
  P.DOCUMENT_READ,
  P.COMPLIANCE_READ,
];

/**
 * A principal is "self-scoped" for a given set of broad permissions when it holds NONE of
 * them. Such a principal (a plain CLIENT) may only ever act on its own client_id.
 */
function isSelfScoped(principal, broadPerms) {
  const held = permissionsForRoles(principal.roles || []);
  return !broadPerms.some((perm) => held.has(perm));
}

/**
 * Build a middleware that validates the request's clientId against the principal for
 * self-scoped callers. `broadPerms` lets a route declare which broad permissions exempt a
 * caller from self-scoping (defaults to all broad read permissions).
 */
function enforceClientScope(broadPerms = BROAD_READ_PERMISSIONS) {
  return (req, _res, next) => {
    const principal = req.principal;
    if (!principal) return next(new AppError('INVALID_TOKEN', 'Authentication required', 401));

    // Staff-level callers may access any client in their tenant.
    if (!isSelfScoped(principal, broadPerms)) return next();

    // Self-scoped caller: they must be linked to a client and may only act on that client.
    if (!principal.clientId) {
      return next(new AppError('FORBIDDEN', 'This account is not linked to a client record', 403));
    }

    const requested = req.params.clientId || (req.body && req.body.clientId);
    // If no clientId is present in the request, downstream code should default to the
    // principal's own client; nothing to validate here.
    if (requested && requested !== principal.clientId) {
      return next(new AppError('FORBIDDEN', 'You can only access your own records', 403));
    }
    next();
  };
}

module.exports = { enforceClientScope, isSelfScoped, BROAD_READ_PERMISSIONS };
