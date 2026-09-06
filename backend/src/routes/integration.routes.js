'use strict';

/**
 * Read-only visibility into straight-through provider submissions (audit trail + status).
 * Staff only — clients do not see raw provider dispatch records.
 */

const express = require('express');
const ctrl = require('../controllers/integration.controller');
const { requirePermission } = require('../middleware/rbac');
const { asyncHandler } = require('../utils/respond');
const { PERMISSIONS: P } = require('../services/auth/rbac.service');

const router = express.Router();

router.get('/submissions', requirePermission(P.INTEGRATION_READ), asyncHandler(ctrl.list));
router.get('/submissions/:submissionId', requirePermission(P.INTEGRATION_READ), asyncHandler(ctrl.getOne));

module.exports = router;
