'use strict';

/**
 * Document management. PostgreSQL stores metadata; S3 stores binaries. Provides first-class
 * handling for consent artefacts (consent forms & T&Cs): storeConsentArtifact() records the
 * document AND (optionally) links a Consent acceptance to the exact stored version.
 */

const crypto = require('crypto');
const s3 = require('./s3.service');
const config = require('../../config');
const { AppError } = require('../../utils/errors');

function models() {
  return require('../../models');
}

async function resolveDocumentType(code) {
  const { DocumentType } = models();
  const dt = await DocumentType.findOne({ where: { code } });
  if (!dt) throw new AppError('INVALID_REFERENCE', `Unknown document type: ${code}`, 400);
  return dt;
}

/**
 * Create a document record and (optionally) upload its bytes to S3. If `buffer` is provided
 * we upload directly; otherwise the caller can use presignUpload and confirm later.
 */
async function createDocument({
  tenantId,
  clientId,
  typeCode,
  title,
  description,
  buffer,
  mimeType,
  uploadedBy,
}) {
  const { Document } = models();
  const dt = await resolveDocumentType(typeCode);

  const doc = await Document.create({
    tenant_id: tenantId,
    client_id: clientId || null,
    document_type_id: dt.id,
    title,
    description,
    classification: dt.special_personal_information ? 'special_personal_information' : 'confidential',
    mime_type: mimeType,
    upload_status: 'pending',
    uploaded_by: uploadedBy || null,
  });

  if (buffer) {
    const key = s3.buildKey({ tenantId, clientId, documentId: doc.id, filename: title });
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
    let put = { bucket: config.aws.s3Bucket, key, versionId: null };
    if (config.aws.s3Bucket) {
      put = await s3.putObject({ key, body: buffer, contentType: mimeType });
    }
    await doc.update({
      s3_bucket: put.bucket,
      s3_key: put.key,
      s3_version_id: put.versionId,
      checksum_sha256: checksum,
      file_size_bytes: buffer.length,
      kms_key_id: config.aws.kmsKeyId || null,
      upload_status: 'uploaded',
      uploaded_at: new Date(),
    });
  }

  return doc.reload();
}

/**
 * Store a consent artefact (a signed consent form or a versioned T&Cs document) and record
 * the client's acceptance, linking the Consent row to this exact document.
 */
async function storeConsentArtifact({
  tenantId,
  clientId,
  typeCode, // CONSENT_FORM | TERMS_AND_CONDITIONS | POPIA_DISCLOSURE | MEDICAL_CONSENT
  title,
  buffer,
  mimeType,
  uploadedBy,
  consent, // { purposeCode, purposeDescription, version, granted, captureMethod, sourceIp }
}) {
  const dt = await resolveDocumentType(typeCode);
  if (!dt.is_consent_artifact) {
    throw new AppError('VALIDATION_ERROR', `${typeCode} is not a consent artefact type`, 400);
  }

  const doc = await createDocument({
    tenantId,
    clientId,
    typeCode,
    title,
    buffer,
    mimeType,
    uploadedBy,
  });

  let consentRecord = null;
  if (consent) {
    const { Consent } = models();
    consentRecord = await Consent.create({
      client_id: clientId,
      purpose_code: consent.purposeCode,
      purpose_description: consent.purposeDescription,
      consent_version: consent.version,
      granted: consent.granted !== false,
      capture_method: consent.captureMethod || 'upload',
      source_ip: consent.sourceIp || null,
      evidence_document_id: doc.id,
    });
  }

  return { document: doc, consent: consentRecord };
}

async function listForClient(clientId) {
  const { Document, DocumentType } = models();
  return Document.findAll({
    where: { client_id: clientId, deleted_at: null },
    include: [{ model: DocumentType, attributes: ['code', 'name', 'is_consent_artifact'] }],
    order: [['created_at', 'DESC']],
  });
}

async function getDownloadUrl(documentId) {
  const { Document } = models();
  const doc = await Document.findByPk(documentId);
  if (!doc || doc.deleted_at) throw new AppError('NOT_FOUND', 'Document not found', 404);
  if (!doc.s3_key) throw new AppError('NOT_FOUND', 'Document has no stored file', 404);
  const url = await s3.presignDownload({ key: doc.s3_key, versionId: doc.s3_version_id });
  return { url, expiresInSeconds: 300, filename: doc.title };
}

async function softDelete(documentId) {
  const { Document } = models();
  const doc = await Document.findByPk(documentId);
  if (!doc) throw new AppError('NOT_FOUND', 'Document not found', 404);
  await doc.update({ deleted_at: new Date(), upload_status: 'deleted' });
  return { id: documentId, deleted: true };
}

module.exports = {
  createDocument,
  storeConsentArtifact,
  listForClient,
  getDownloadUrl,
  softDelete,
  resolveDocumentType,
};
