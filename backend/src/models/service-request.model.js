'use strict';

const { DataTypes } = require('sequelize');

/** Generic client "other tasks": change of address/bank, doc requests, consultation, etc. */
module.exports = (sequelize) =>
  sequelize.define(
    'ServiceRequest',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      tenant_id: { type: DataTypes.UUID, allowNull: false },
      client_id: { type: DataTypes.UUID, allowNull: false },
      request_type: { type: DataTypes.STRING(80), allowNull: false },
      status: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'submitted' },
      details: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      policy_id: { type: DataTypes.UUID },
      provider_id: { type: DataTypes.UUID },
      assigned_user_id: { type: DataTypes.UUID },
      resolved_at: { type: DataTypes.DATE },
      created_by: { type: DataTypes.UUID },
    },
    { tableName: 'service_requests', indexes: [{ fields: ['client_id', 'status'] }] }
  );
