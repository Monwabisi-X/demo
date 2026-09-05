'use strict';

/**
 * Audit middleware factory. `audit(action, entityType)` records an audit event after a
 * successful (2xx) mutating response. Entity id is taken from the response body `id`/`data.id`
 * or the route param. Reads are not audited here (sensitive-data reads are covered by the
 * access-log concern in services that touch restricted domains).
 */

const auditService = require('../services/audit/audit.service');

function audit(action, entityType, options = {}) {
  return (req, res, next) => {
    res.on('finish', () => {
      if (res.statusCode < 200 || res.statusCode >= 300) return;
      const principal = req.principal || {};
      const entityId =
        (res.locals && res.locals.auditEntityId) ||
        req.params[options.idParam || 'id'] ||
        req.params.clientId ||
        null;
      auditService.record({
        tenantId: principal.tenantId,
        actorUserId: principal.userId,
        actorRoleCode: (principal.roles || [])[0],
        action,
        entityType,
        entityId,
        reason: req.body && req.body.reason,
        ip: req.context && req.context.ip,
        requestId: req.context && req.context.requestId,
      });
    });
    next();
  };
}

module.exports = { audit };
