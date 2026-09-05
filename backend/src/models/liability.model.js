'use strict';

const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
  sequelize.define(
    'Liability',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      client_id: { type: DataTypes.UUID, allowNull: false },
      category: { type: DataTypes.STRING(80), allowNull: false },
      creditor_name: { type: DataTypes.STRING(250) },
      current_balance: { type: DataTypes.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
      monthly_payment: { type: DataTypes.DECIMAL(18, 2) },
      interest_rate: { type: DataTypes.DECIMAL(9, 4) },
      currency_code: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'ZAR' },
      status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'active' },
    },
    { tableName: 'liabilities', indexes: [{ fields: ['client_id'] }] }
  );
