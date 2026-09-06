'use strict';

const express = require('express');
const ctrl = require('../controllers/service-request.controller');
const { requirePermission } = require('../middleware/rbac');
const { enforceClientScope } = require('../middleware/ownership');
const { validate } = require('../middleware/validation');
const { audit } = require('../middleware/audit');
const v = require('../validators');
const { asyncHandler } = require('../utils/respond');
const { PERMISSIONS: P } = require('../services/auth/rbac.service');

const router = express.Router();

// Both clients and staff hold SERVICE_REQUEST_*, so self-scope on the clientId for the list.
router.get(
  '/:clientId',
  requirePermission(P.SERVICE_REQUEST_READ),
  enforceClientScope([P.CLIENT_READ, P.CLIENT_UPDATE]),
  asyncHandler(ctrl.list)
);
router.post(
  '/',
  requirePermission(P.SERVICE_REQUEST_WRITE),
  validate(v.serviceRequest.create),
  enforceClientScope([P.CLIENT_READ, P.CLIENT_UPDATE]),
  audit('service_request.create', 'service_request'),
  asyncHandler(ctrl.create)
);
router.put('/:requestId', requirePermission(P.SERVICE_REQUEST_WRITE), validate(v.serviceRequest.update), audit('service_request.update', 'service_request', { idParam: 'requestId' }), asyncHandler(ctrl.update));

module.exports = router;
