'use strict';

const express = require('express');
const ctrl = require('../controllers/audit.controller');
const { requirePermission } = require('../middleware/rbac');
const { asyncHandler } = require('../utils/respond');
const { PERMISSIONS: P } = require('../services/auth/rbac.service');

const router = express.Router();

router.get('/', requirePermission(P.AUDIT_READ), asyncHandler(ctrl.query));
router.get('/:entityType/:entityId', requirePermission(P.AUDIT_READ), asyncHandler(ctrl.forEntity));

module.exports = router;
