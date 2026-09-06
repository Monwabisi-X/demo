'use strict';

const express = require('express');
const ctrl = require('../controllers/document.controller');
const { requirePermission } = require('../middleware/rbac');
const { enforceClientScope } = require('../middleware/ownership');
const { validate } = require('../middleware/validation');
const { audit } = require('../middleware/audit');
const v = require('../validators');
const { asyncHandler } = require('../utils/respond');
const { PERMISSIONS: P } = require('../services/auth/rbac.service');

const router = express.Router();

// CLIENT holds DOCUMENT_READ; scope self-ownership on DOCUMENT_WRITE (staff-only) so a client
// can only list their own documents by clientId.
router.get('/:clientId', requirePermission(P.DOCUMENT_READ), enforceClientScope([P.DOCUMENT_WRITE]), asyncHandler(ctrl.list));
router.post('/upload', requirePermission(P.DOCUMENT_WRITE), validate(v.document.create), audit('document.upload', 'document'), asyncHandler(ctrl.upload));

// Self-service acceptance has a constrained body and server-owned evidence metadata.
router.post(
  '/consent/self',
  requirePermission(P.DOCUMENT_WRITE_SELF),
  enforceClientScope([P.DOCUMENT_WRITE]),
  validate(v.document.selfConsent),
  audit('document.consent.accept', 'document'),
  asyncHandler(ctrl.acceptTerms)
);

// Generic consent artefacts remain a broad staff-only document operation.
router.post(
  '/consent',
  requirePermission(P.DOCUMENT_WRITE),
  validate(v.document.consent),
  audit('document.consent.store', 'document'),
  asyncHandler(ctrl.uploadConsent)
);

router.get('/:documentId/download', requirePermission(P.DOCUMENT_READ), asyncHandler(ctrl.download));
router.delete('/:documentId', requirePermission(P.DOCUMENT_WRITE), audit('document.delete', 'document', { idParam: 'documentId' }), asyncHandler(ctrl.remove));

module.exports = router;
