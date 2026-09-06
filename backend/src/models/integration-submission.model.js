'use strict';

const { DataTypes } = require('sequelize');

/** Persisted straight-through-to-provider dispatch log with idempotency + audit snapshots. */
module.exports = (sequelize) =>
  sequelize.define(
    'IntegrationSubmission',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      tenant_id: { type: DataTypes.UUID, allowNull: false },
      client_id: { type: DataTypes.UUID },
      provider: { type: DataTypes.STRING(80), allowNull: false },
      submission_type: { type: DataTypes.STRING(100), allowNull: false },
      channel: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'api' },
      idempotency_key: { type: DataTypes.STRING(200), allowNull: false },
      status: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'pending' },
      provider_reference: { type: DataTypes.STRING(200) },
      request_snapshot: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      response_snapshot: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      error: { type: DataTypes.TEXT },
      dispatched_at: { type: DataTypes.DATE },
      acknowledged_at: { type: DataTypes.DATE },
    },
    {
      tableName: 'integration_submissions',
      indexes: [{ unique: true, fields: ['tenant_id', 'idempotency_key'] }, { fields: ['client_id', 'status'] }],
    }
  );
