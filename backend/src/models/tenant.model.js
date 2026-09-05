'use strict';

const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
  sequelize.define(
    'Tenant',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      name: { type: DataTypes.STRING(200), allowNull: false },
      registration_number: { type: DataTypes.STRING(100) },
      fsp_number: { type: DataTypes.STRING(50) },
      status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'active' },
    },
    { tableName: 'tenants' }
  );
