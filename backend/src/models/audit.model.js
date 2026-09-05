'use strict';

const { DataTypes } = require('sequelize');

/**
 * Immutable audit trail. The application only ever INSERTs here; a DB trigger blocks
 * UPDATE/DELETE (see migration 003). before_data/after_data must already be redacted of
 * raw sensitive values by the audit middleware before insertion.
 */
module.exports = (sequelize) =>
  sequelize.define(
    'Audit',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      tenant_id: { type: DataTypes.UUID },
      actor_user_id: { type: DataTypes.UUID },
      actor_role_code: { type: DataTypes.STRING(100) },
      action: { type: DataTypes.STRING(100), allowNull: false },
      entity_type: { type: DataTypes.STRING(100), allowNull: false },
      entity_id: { type: DataTypes.UUID },
      before_data: { type: DataTypes.JSONB },
      after_data: { type: DataTypes.JSONB },
      reason: { type: DataTypes.TEXT },
      ip_address: { type: DataTypes.STRING(64) },
      request_id: { type: DataTypes.STRING(200) },
      occurred_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    { tableName: 'audit_events', timestamps: false }
  );
