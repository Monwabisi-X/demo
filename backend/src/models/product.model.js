'use strict';

const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
  sequelize.define(
    'Product',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      provider_id: { type: DataTypes.UUID, allowNull: false },
      category: { type: DataTypes.STRING(100), allowNull: false },
      product_code: { type: DataTypes.STRING(100) },
      product_name: { type: DataTypes.STRING(250), allowNull: false },
      description: { type: DataTypes.TEXT },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'products' }
  );
