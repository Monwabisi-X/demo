'use strict';

const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
  sequelize.define(
    'Income',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      client_id: { type: DataTypes.UUID, allowNull: false },
      category: { type: DataTypes.STRING(80), allowNull: false },
      description: { type: DataTypes.STRING(250) },
      amount: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
      frequency: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'monthly' },
      currency_code: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'ZAR' },
      valid_from: { type: DataTypes.DATEONLY },
      valid_to: { type: DataTypes.DATEONLY },
    },
    { tableName: 'income_sources', indexes: [{ fields: ['client_id'] }] }
  );
