'use strict';

const express = require('express');
const ctrl = require('../controllers/claim.controller');
const { requirePermission } = require('../middleware/rbac');
const { enforceClientScope } = require('../middleware/ownership');
const { validate } = require('../middleware/validation');
const { audit } = require('../middleware/audit');
const v = require('../validators');
const { asyncHandler } = require('../utils/respond');
const { PERMISSIONS: P } = require('../services/auth/rbac.service');

const router = express.Router();

// CLIENT holds CLAIMS_READ; scope self-ownership on CLAIMS_WRITE (staff-only) so a client can
// only list their own claims.
router.get('/:clientId', requirePermission(P.CLAIMS_READ), enforceClientScope([P.CLAIMS_WRITE]), asyncHandler(ctrl.list));
router.post('/', requirePermission(P.CLAIMS_WRITE), validate(v.claim.submit), audit('claim.submit', 'claim'), asyncHandler(ctrl.submit));
router.put('/:claimId', requirePermission(P.CLAIMS_WRITE), validate(v.claim.update), audit('claim.update', 'claim', { idParam: 'claimId' }), asyncHandler(ctrl.update));
router.get('/:claimId/status', requirePermission(P.CLAIMS_READ), asyncHandler(ctrl.status));

module.exports = router;
