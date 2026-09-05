'use strict';

const documentService = require('../services/document/document.service');
const { ok } = require('../utils/respond');

async function list(req, res) {
  return ok(res, await documentService.listForClient(req.params.clientId));
}

async function upload(req, res) {
  const { clientId, typeCode, title, description, contentBase64, mimeType } = req.body;
  const buffer = contentBase64 ? Buffer.from(contentBase64, 'base64') : undefined;
  const doc = await documentService.createDocument({
    tenantId: req.principal.tenantId,
    clientId,
    typeCode,
    title,
    description,
    buffer,
    mimeType,
    uploadedBy: req.principal.userId,
  });
  res.locals.auditEntityId = doc.id;
  return ok(res, doc, 201);
}

/** Store a consent form / T&Cs and (optionally) record the client's acceptance. */
async function uploadConsent(req, res) {
  const { clientId, typeCode, title, contentBase64, mimeType, consent } = req.body;
  const buffer = contentBase64 ? Buffer.from(contentBase64, 'base64') : undefined;
  if (consent && !consent.sourceIp) consent.sourceIp = req.context && req.context.ip;
  const result = await documentService.storeConsentArtifact({
    tenantId: req.principal.tenantId,
    clientId,
    typeCode,
    title,
    buffer,
    mimeType,
    uploadedBy: req.principal.userId,
    consent,
  });
  res.locals.auditEntityId = result.document.id;
  return ok(res, result, 201);
}

async function download(req, res) {
  return ok(res, await documentService.getDownloadUrl(req.params.documentId));
}

async function remove(req, res) {
  return ok(res, await documentService.softDelete(req.params.documentId));
}

module.exports = { list, upload, uploadConsent, download, remove };
