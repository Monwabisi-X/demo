'use strict';

const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
  sequelize.define(
    'Asset',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      client_id: { type: DataTypes.UUID, allowNull: false },
      category: { type: DataTypes.STRING(80), allowNull: false },
      description: { type: DataTypes.STRING(250), allowNull: false },
      current_value: { type: DataTypes.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
      ownership_percentage: { type: DataTypes.DECIMAL(7, 4), allowNull: false, defaultValue: 100 },
      currency_code: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'ZAR' },
      status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'active' },
    },
    { tableName: 'assets', indexes: [{ fields: ['client_id'] }] }
  );
