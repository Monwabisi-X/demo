'use strict';

const { DataTypes } = require('sequelize');

/**
 * Control gate: raw client submissions land here as a JSONB snapshot with status
 * PENDING_REVIEW. Advisers review, enrich (adviser_edits), and approve before any automated
 * dispatch to third-party providers.
 */
module.exports = (sequelize) =>
  sequelize.define(
    'AdviserStagingQueue',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      tenant_id: { type: DataTypes.UUID, allowNull: false },
      client_id: { type: DataTypes.UUID },
      submission_type: { type: DataTypes.STRING(100), allowNull: false },
      client_snapshot: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      adviser_edits: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      status: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'PENDING_REVIEW' },
      reviewed_by: { type: DataTypes.UUID },
      reviewed_at: { type: DataTypes.DATE },
      rejection_reason: { type: DataTypes.TEXT },
      dispatched_at: { type: DataTypes.DATE },
    },
    { tableName: 'adviser_staging_queue', indexes: [{ fields: ['status'] }, { fields: ['client_id'] }] }
  );
