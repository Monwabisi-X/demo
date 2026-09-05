'use strict';

const express = require('express');
const ctrl = require('../controllers/financial.controller');
const { requirePermission } = require('../middleware/rbac');
const { validate } = require('../middleware/validation');
const { audit } = require('../middleware/audit');
const v = require('../validators');
const { asyncHandler } = require('../utils/respond');
const { PERMISSIONS: P } = require('../services/auth/rbac.service');

const router = express.Router();

router.get('/assets/:clientId', requirePermission(P.FINANCIAL_READ), asyncHandler(ctrl.getAssets));
router.post('/assets', requirePermission(P.FINANCIAL_WRITE), validate(v.financial.asset), audit('asset.create', 'asset'), asyncHandler(ctrl.addAsset));
router.put('/assets/:assetId', requirePermission(P.FINANCIAL_WRITE), audit('asset.update', 'asset', { idParam: 'assetId' }), asyncHandler(ctrl.updateAsset));
router.delete('/assets/:assetId', requirePermission(P.FINANCIAL_WRITE), audit('asset.delete', 'asset', { idParam: 'assetId' }), asyncHandler(ctrl.deleteAsset));

router.get('/liabilities/:clientId', requirePermission(P.FINANCIAL_READ), asyncHandler(ctrl.getLiabilities));
router.post('/liabilities', requirePermission(P.FINANCIAL_WRITE), validate(v.financial.liability), audit('liability.create', 'liability'), asyncHandler(ctrl.addLiability));

router.get('/net-worth/:clientId', requirePermission(P.FINANCIAL_READ), asyncHandler(ctrl.getNetWorth));

module.exports = router;
