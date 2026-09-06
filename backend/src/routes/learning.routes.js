'use strict';

/**
 * Learning / Information content. Tenant-scoped, published educational articles surfaced in
 * the client dashboard's Information tab. Reads require CONTENT_READ (granted to CLIENT and
 * staff roles). No client PII is ever exposed here.
 */

const express = require('express');
const ctrl = require('../controllers/learning.controller');
const { requirePermission } = require('../middleware/rbac');
const { asyncHandler } = require('../utils/respond');
const { PERMISSIONS: P } = require('../services/auth/rbac.service');

const router = express.Router();

router.get('/', requirePermission(P.CONTENT_READ), asyncHandler(ctrl.list));
router.get('/:slug', requirePermission(P.CONTENT_READ), asyncHandler(ctrl.getOne));

module.exports = router;
