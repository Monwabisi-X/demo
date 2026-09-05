'use strict';

/**
 * Medical questionnaire routes — high-security domain.
 *
 * Guarded by MEDICAL_READ / MEDICAL_WRITE, which are deliberately NOT implied by CLIENT_READ.
 * Reads decrypt the payload and are audited by the service. All mutations are audited.
 */

const express = require('express');
const ctrl = require('../controllers/medical.controller');
const { requirePermission } = require('../middleware/rbac');
const { validate } = require('../middleware/validation');
const { audit } = require('../middleware/audit');
const v = require('../validators');
const { asyncHandler } = require('../utils/respond');
const { PERMISSIONS: P } = require('../services/auth/rbac.service');

const router = express.Router();

router.get('/:clientId', requirePermission(P.MEDICAL_READ), asyncHandler(ctrl.getForClient));
router.post('/', requirePermission(P.MEDICAL_WRITE), validate(v.medical.submit), audit('medical.submit', 'medical_questionnaire'), asyncHandler(ctrl.submit));
router.put('/:questionnaireId', requirePermission(P.MEDICAL_WRITE), validate(v.medical.update), audit('medical.update', 'medical_questionnaire', { idParam: 'questionnaireId' }), asyncHandler(ctrl.update));

module.exports = router;
