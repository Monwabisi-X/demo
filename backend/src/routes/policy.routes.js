'use strict';

const express = require('express');
const ctrl = require('../controllers/policy.controller');
const { requirePermission } = require('../middleware/rbac');
const { validate } = require('../middleware/validation');
const { audit } = require('../middleware/audit');
const v = require('../validators');
const { asyncHandler } = require('../utils/respond');
const { PERMISSIONS: P } = require('../services/auth/rbac.service');

const router = express.Router();

router.get('/:clientId', requirePermission(P.CLIENT_READ), asyncHandler(ctrl.list));
router.post('/', requirePermission(P.CLIENT_UPDATE), validate(v.policy.create), audit('policy.create', 'policy'), asyncHandler(ctrl.create));
router.put('/:policyId', requirePermission(P.CLIENT_UPDATE), validate(v.policy.update), audit('policy.update', 'policy', { idParam: 'policyId' }), asyncHandler(ctrl.update));
router.delete('/:policyId', requirePermission(P.CLIENT_UPDATE), audit('policy.delete', 'policy', { idParam: 'policyId' }), asyncHandler(ctrl.remove));

module.exports = router;
