'use strict';

const { DataTypes } = require('sequelize');

/**
 * Document metadata. Binaries live in S3 (private, versioned, KMS-encrypted). PostgreSQL
 * stores only the S3 reference + integrity/status metadata. Used for consent forms, T&Cs,
 * FICA docs, policy schedules, claim evidence, etc.
 */
module.exports = (sequelize) =>
  sequelize.define(
    'Document',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      tenant_id: { type: DataTypes.UUID, allowNull: false },
      client_id: { type: DataTypes.UUID },
      document_type_id: { type: DataTypes.UUID, allowNull: false },
      title: { type: DataTypes.STRING(250), allowNull: false },
      description: { type: DataTypes.TEXT },

      // S3 object reference (never a public URL; access is via presigned URLs only).
      s3_bucket: { type: DataTypes.STRING(250) },
      s3_key: { type: DataTypes.STRING(1000) },
      s3_version_id: { type: DataTypes.STRING(500) },
      checksum_sha256: { type: DataTypes.CHAR(64) },
      mime_type: { type: DataTypes.STRING(150) },
      file_size_bytes: { type: DataTypes.BIGINT },
      kms_key_id: { type: DataTypes.STRING(500) },

      classification: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'confidential' },
      upload_status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'pending' },
      virus_scan_status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'pending' },
      review_status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'pending' },

      review_date: { type: DataTypes.DATEONLY },
      expiry_date: { type: DataTypes.DATEONLY },
      uploaded_by: { type: DataTypes.UUID },
      uploaded_at: { type: DataTypes.DATE },
      deleted_at: { type: DataTypes.DATE },
    },
    {
      tableName: 'documents',
      indexes: [{ fields: ['client_id'] }, { fields: ['document_type_id'] }],
    }
  );
