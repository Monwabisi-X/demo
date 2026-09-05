'use strict';

const { DataTypes } = require('sequelize');

/**
 * Format-agnostic landing zone for bulk legacy client imports (CSV/Excel/JSON). Files land
 * in S3; a row here tracks the parse/validation lifecycle and error log before records are
 * promoted into the master tables.
 */
module.exports = (sequelize) =>
  sequelize.define(
    'LegacyImportStaging',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      tenant_id: { type: DataTypes.UUID, allowNull: false },
      source_filename: { type: DataTypes.STRING(500) },
      source_format: { type: DataTypes.STRING(20) }, // csv, xlsx, json
      s3_key: { type: DataTypes.STRING(1000) },
      raw_row: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      normalized_row: { type: DataTypes.JSONB },
      status: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'RECEIVED' },
      validation_errors: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      promoted_client_id: { type: DataTypes.UUID },
      processed_at: { type: DataTypes.DATE },
    },
    { tableName: 'legacy_import_staging', indexes: [{ fields: ['tenant_id', 'status'] }] }
  );
