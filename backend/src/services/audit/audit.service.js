'use strict';

/**
 * Immutable audit trail writer. Records who did what to which entity. before/after payloads
 * are redacted of raw sensitive values before insertion (defence-in-depth alongside the
 * logger redactor). Insert-only; the DB trigger blocks any UPDATE/DELETE.
 */

const logger = require('../../config/logger');

function models() {
  return require('../../models');
}

async function record(event) {
  try {
    const { Audit } = models();
    await Audit.create({
      tenant_id: event.tenantId || null,
      actor_user_id: event.actorUserId || null,
      actor_role_code: event.actorRoleCode || null,
      action: event.action,
      entity_type: event.entityType,
      entity_id: event.entityId || null,
      before_data: event.before ? logger.redactMeta(event.before) : null,
      after_data: event.after ? logger.redactMeta(event.after) : null,
      reason: event.reason || null,
      ip_address: event.ip || null,
      request_id: event.requestId || null,
    });
  } catch (err) {
    // Auditing must never break the request; log loudly instead.
    logger.error('audit write failed', { message: err.message, action: event.action });
  }
}

module.exports = { record };
