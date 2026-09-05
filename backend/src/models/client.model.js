'use strict';

const { DataTypes } = require('sequelize');

/**
 * Master client record. Sensitive identifiers (SA ID, passport, tax) are stored ONLY as
 * application-encrypted ciphertext/token plus an optional deterministic hash for lookup —
 * never plaintext. These ciphertext columns must never be exposed to Koisa or any client
 * response body.
 */
module.exports = (sequelize) =>
  sequelize.define(
    'Client',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      tenant_id: { type: DataTypes.UUID, allowNull: false },
      household_id: { type: DataTypes.UUID },
      client_type: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'individual' },

      title: { type: DataTypes.STRING(30) },
      first_name: { type: DataTypes.STRING(100) },
      surname: { type: DataTypes.STRING(100) },
      legal_entity_name: { type: DataTypes.STRING(250) },

      // Encrypted / tokenised identifiers (never plaintext).
      id_number_ciphertext: { type: DataTypes.TEXT },
      id_number_hash: { type: DataTypes.BLOB },
      passport_number_ciphertext: { type: DataTypes.TEXT },
      tax_number_ciphertext: { type: DataTypes.TEXT },

      // Contact — treat as sensitive; encrypted where required by threat model.
      email_ciphertext: { type: DataTypes.TEXT },
      mobile_ciphertext: { type: DataTypes.TEXT },

      fica_status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'pending' },
      net_worth: { type: DataTypes.DECIMAL(18, 2) },

      status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'active' },
      archived_at: { type: DataTypes.DATE },
      deleted_at: { type: DataTypes.DATE },
      extension_data: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    },
    {
      tableName: 'clients',
      indexes: [
        { fields: ['tenant_id', 'status'] },
        { fields: ['household_id'] },
      ],
    }
  );
