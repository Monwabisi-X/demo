'use strict';

const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
  sequelize.define(
    'User',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      tenant_id: { type: DataTypes.UUID, allowNull: false },
      email: { type: DataTypes.STRING(320), allowNull: false },
      display_name: { type: DataTypes.STRING(200), allowNull: false },
      // Password hash only — never store plaintext. bcrypt hash.
      password_hash: { type: DataTypes.TEXT },
      status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'active' },
      client_id: { type: DataTypes.UUID }, // set when the user is a CLIENT principal
      mfa_enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      last_login_at: { type: DataTypes.DATE },
      deleted_at: { type: DataTypes.DATE },
    },
    {
      tableName: 'users',
      indexes: [{ unique: true, fields: ['tenant_id', 'email'] }],
      defaultScope: { attributes: { exclude: ['password_hash'] } },
      scopes: { withSecret: { attributes: {} } },
    }
  );
