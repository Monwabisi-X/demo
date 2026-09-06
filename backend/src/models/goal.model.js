'use strict';

const { DataTypes } = require('sequelize');

/** Client financial goals (individual or shared) with visual progress on the dashboard. */
module.exports = (sequelize) =>
  sequelize.define(
    'Goal',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      tenant_id: { type: DataTypes.UUID, allowNull: false },
      client_id: { type: DataTypes.UUID, allowNull: false },
      household_id: { type: DataTypes.UUID },
      scope: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'individual' },
      category: { type: DataTypes.STRING(80) },
      name: { type: DataTypes.STRING(250), allowNull: false },
      description: { type: DataTypes.TEXT },
      target_amount: { type: DataTypes.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
      current_amount: { type: DataTypes.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
      currency_code: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'ZAR' },
      target_date: { type: DataTypes.DATEONLY },
      status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'active' },
      created_by: { type: DataTypes.UUID },
    },
    { tableName: 'goals', indexes: [{ fields: ['client_id', 'status'] }] }
  );
