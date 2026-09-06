'use strict';

const express = require('express');
const ctrl = require('../controllers/compliance.controller');
const { requirePermission } = require('../middleware/rbac');
const { validate } = require('../middleware/validation');
const { audit } = require('../middleware/audit');
const v = require('../validators');
const { asyncHandler } = require('../utils/respond');
const { PERMISSIONS: P } = require('../services/auth/rbac.service');

const router = express.Router();

router.get('/kyc/:clientId', requirePermission(P.COMPLIANCE_READ), asyncHandler(ctrl.getKyc));
router.post('/kyc', requirePermission(P.COMPLIANCE_WRITE), validate(v.compliance.kyc), audit('kyc.submit', 'kyc'), asyncHandler(ctrl.submitKyc));
router.get('/consent/:clientId', requirePermission(P.COMPLIANCE_READ), asyncHandler(ctrl.getConsent));
router.post('/consent', requirePermission(P.COMPLIANCE_WRITE), validate(v.compliance.consent), audit('consent.record', 'consent'), asyncHandler(ctrl.recordConsent));

// Smile ID identity verification (FICA/KYC automation).
router.post('/verify-identity', requirePermission(P.COMPLIANCE_WRITE), validate(v.compliance.verifyIdentity), audit('identity.verify', 'client', { idParam: 'clientId' }), asyncHandler(ctrl.verifyIdentity));

module.exports = router;
