'use strict';

const express = require('express');
const ctrl = require('../controllers/document.controller');
const { requirePermission } = require('../middleware/rbac');
const { validate } = require('../middleware/validation');
const { audit } = require('../middleware/audit');
const v = require('../validators');
const { asyncHandler } = require('../utils/respond');
const { PERMISSIONS: P } = require('../services/auth/rbac.service');

const router = express.Router();

router.get('/:clientId', requirePermission(P.DOCUMENT_READ), asyncHandler(ctrl.list));
router.post('/upload', requirePermission(P.DOCUMENT_WRITE), validate(v.document.create), audit('document.upload', 'document'), asyncHandler(ctrl.upload));

// Consent forms & T&Cs: store the artefact and (optionally) record the acceptance.
router.post('/consent', requirePermission(P.DOCUMENT_WRITE), validate(v.document.consent), audit('document.consent.store', 'document'), asyncHandler(ctrl.uploadConsent));

router.get('/:documentId/download', requirePermission(P.DOCUMENT_READ), asyncHandler(ctrl.download));
router.delete('/:documentId', requirePermission(P.DOCUMENT_WRITE), audit('document.delete', 'document', { idParam: 'documentId' }), asyncHandler(ctrl.remove));

module.exports = router;
