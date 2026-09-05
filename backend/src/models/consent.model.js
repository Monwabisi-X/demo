'use strict';

const { DataTypes } = require('sequelize');

/**
 * POPIA consent / T&C acceptance record (versioned, never a mutable boolean).
 *
 * Each acceptance can reference the exact stored artefact (the signed consent form or the
 * versioned T&Cs PDF) via `evidence_document_id`, so there is an auditable link between the
 * client's acceptance and the precise document they agreed to.
 */
module.exports = (sequelize) =>
  sequelize.define(
    'Consent',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      client_id: { type: DataTypes.UUID, allowNull: false },
      // e.g. MARKETING, DATA_PROCESSING, TERMS_AND_CONDITIONS, MEDICAL_DISCLOSURE
      purpose_code: { type: DataTypes.STRING(100), allowNull: false },
      purpose_description: { type: DataTypes.TEXT, allowNull: false },
      consent_version: { type: DataTypes.STRING(50), allowNull: false },
      granted: { type: DataTypes.BOOLEAN, allowNull: false },
      captured_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      withdrawn_at: { type: DataTypes.DATE },
      capture_method: { type: DataTypes.STRING(50) }, // web_click, esignature, upload
      source_ip: { type: DataTypes.STRING(64) },
      evidence_document_id: { type: DataTypes.UUID }, // link to the stored consent form / T&Cs
    },
    {
      tableName: 'consents',
      updatedAt: false,
      indexes: [{ fields: ['client_id', 'purpose_code', 'captured_at'] }],
    }
  );
