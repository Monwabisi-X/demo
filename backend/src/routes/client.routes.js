'use strict';

const express = require('express');
const ctrl = require('../controllers/client.controller');
const { requirePermission, requireAnyPermission } = require('../middleware/rbac');
const { enforceClientScope } = require('../middleware/ownership');
const { validate } = require('../middleware/validation');
const { audit } = require('../middleware/audit');
const v = require('../validators');
const { asyncHandler } = require('../utils/respond');
const { PERMISSIONS: P } = require('../services/auth/rbac.service');

const router = express.Router();

router.get('/', requirePermission(P.CLIENT_READ), asyncHandler(ctrl.list));
router.post('/', requirePermission(P.CLIENT_UPDATE), validate(v.client.create), audit('client.create', 'client'), asyncHandler(ctrl.create));
// CLIENT users hold CLIENT_READ_SELF only — enforce they can read only their own record.
router.get(
  '/:clientId',
  requireAnyPermission([P.CLIENT_READ, P.CLIENT_READ_SELF]),
  enforceClientScope([P.CLIENT_READ, P.CLIENT_UPDATE]),
  asyncHandler(ctrl.getOne)
);
router.put('/:clientId', requirePermission(P.CLIENT_UPDATE), validate(v.client.update), audit('client.update', 'client', { idParam: 'clientId' }), asyncHandler(ctrl.update));
router.delete('/:clientId', requirePermission(P.CLIENT_UPDATE), audit('client.delete', 'client', { idParam: 'clientId' }), asyncHandler(ctrl.remove));

module.exports = router;
