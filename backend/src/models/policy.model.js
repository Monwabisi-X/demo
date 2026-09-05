'use strict';

const { DataTypes } = require('sequelize');

/**
 * Client policy/investment holding. The full policy number is sensitive: store ciphertext
 * plus a masked form for display. Only `policy_number_masked` may ever be shown to Koisa.
 */
module.exports = (sequelize) =>
  sequelize.define(
    'Policy',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      client_id: { type: DataTypes.UUID, allowNull: false },
      provider_id: { type: DataTypes.UUID, allowNull: false },
      product_id: { type: DataTypes.UUID, allowNull: false },

      policy_number_masked: { type: DataTypes.STRING(100) },
      policy_number_ciphertext: { type: DataTypes.TEXT },

      premium: { type: DataTypes.DECIMAL(18, 2) },
      contribution: { type: DataTypes.DECIMAL(18, 2) },
      cover_amount: { type: DataTypes.DECIMAL(18, 2) },
      current_value: { type: DataTypes.DECIMAL(18, 2) },
      currency_code: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'ZAR' },

      start_date: { type: DataTypes.DATEONLY },
      renewal_date: { type: DataTypes.DATEONLY },
      end_date: { type: DataTypes.DATEONLY },
      status: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'active' },
    },
    { tableName: 'policies', indexes: [{ fields: ['client_id'] }, { fields: ['provider_id'] }] }
  );
