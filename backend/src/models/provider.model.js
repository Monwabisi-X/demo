'use strict';

const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
  sequelize.define(
    'Provider',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      provider_type: { type: DataTypes.STRING(80) },
      legal_name: { type: DataTypes.STRING(250), allowNull: false },
      trading_name: { type: DataTypes.STRING(250) },
      contact_email: { type: DataTypes.STRING(320) },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      extension_data: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    },
    { tableName: 'providers' }
  );
