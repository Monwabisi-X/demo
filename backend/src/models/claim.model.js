'use strict';

const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
  sequelize.define(
    'Claim',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      client_id: { type: DataTypes.UUID, allowNull: false },
      policy_id: { type: DataTypes.UUID },
      provider_id: { type: DataTypes.UUID },
      claim_number_masked: { type: DataTypes.STRING(100) },
      claim_type: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'motor' },
      status: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'REPORTED' },
      reported_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      loss_date: { type: DataTypes.DATE },
      narrative: { type: DataTypes.TEXT },
      // Scene intake metadata (GPS, evidence refs) — binaries live in S3, refs here.
      incident_data: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      closed_at: { type: DataTypes.DATE },
    },
    { tableName: 'claims', indexes: [{ fields: ['client_id', 'status'] }] }
  );
