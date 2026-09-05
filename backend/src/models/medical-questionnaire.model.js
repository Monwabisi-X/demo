'use strict';

const { DataTypes } = require('sequelize');

/**
 * Medical questionnaire — a separate high-security domain. The full 18-point intake is
 * stored ONLY as a KMS-encrypted payload (bytea/ciphertext). Non-sensitive underwriting
 * flags are kept separately for workflow use. This data is NEVER exposed to Koisa and is
 * excluded from ordinary client queries.
 */
module.exports = (sequelize) =>
  sequelize.define(
    'MedicalQuestionnaire',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      client_id: { type: DataTypes.UUID, allowNull: false },
      questionnaire_version: { type: DataTypes.STRING(50), allowNull: false },
      status: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'draft' },

      // KMS envelope-encrypted 18-point payload + wrapped data key.
      payload_ciphertext: { type: DataTypes.BLOB },
      encrypted_data_key: { type: DataTypes.BLOB },
      kms_key_id: { type: DataTypes.STRING(500) },

      access_classification: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'special_personal_information',
      },
      submitted_at: { type: DataTypes.DATE },
    },
    { tableName: 'medical_questionnaires', indexes: [{ fields: ['client_id'] }] }
  );
