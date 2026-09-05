'use strict';

const { DataTypes } = require('sequelize');

/**
 * Document type catalogue. Includes consent-form and terms-and-conditions types, so that
 * signed consent forms and accepted T&Cs are stored as first-class, retention-governed
 * documents (see 002_seed.sql for the seeded set).
 */
module.exports = (sequelize) =>
  sequelize.define(
    'DocumentType',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      code: { type: DataTypes.STRING(100), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(200), allowNull: false },
      description: { type: DataTypes.TEXT },
      // Whether this type is a legal/consent artefact (consent form, T&Cs, disclosure).
      is_consent_artifact: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      special_personal_information: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      retention_days: { type: DataTypes.INTEGER },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'document_types' }
  );
