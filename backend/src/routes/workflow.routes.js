'use strict';

const express = require('express');
const ctrl = require('../controllers/workflow.controller');
const { requirePermission } = require('../middleware/rbac');
const { validate } = require('../middleware/validation');
const { audit } = require('../middleware/audit');
const v = require('../validators');
const { asyncHandler } = require('../utils/respond');
const { PERMISSIONS: P } = require('../services/auth/rbac.service');

const router = express.Router();

router.post('/start', requirePermission(P.INTEGRATION_EXECUTE), validate(v.workflow.start), asyncHandler(ctrl.start));
router.put('/:workflowInstanceId/advance', requirePermission(P.INTEGRATION_EXECUTE), asyncHandler(ctrl.advance));
router.get('/status/:entityType/:entityId', requirePermission(P.CLIENT_READ), asyncHandler(ctrl.status));

// Adviser staging / control-gate approval workflow.
router.post('/approval/submit', requirePermission(P.CLIENT_UPDATE), validate(v.workflow.submitApproval), audit('approval.submit', 'adviser_staging'), asyncHandler(ctrl.submitApproval));
router.get('/approval/pending', requirePermission(P.COMPLIANCE_READ), asyncHandler(ctrl.listPending));
router.put('/approval/:entityType/:entityId/approve', requirePermission(P.COMPLIANCE_WRITE), validate(v.workflow.decision), audit('approval.approve', 'adviser_staging', { idParam: 'entityId' }), asyncHandler(ctrl.approve));
router.put('/approval/:entityType/:entityId/reject', requirePermission(P.COMPLIANCE_WRITE), validate(v.workflow.decision), audit('approval.reject', 'adviser_staging', { idParam: 'entityId' }), asyncHandler(ctrl.reject));
router.get('/approval/:entityType/:entityId/status', requirePermission(P.CLIENT_READ), asyncHandler(ctrl.approvalStatus));

module.exports = router;
