'use strict';

const express = require('express');
const ctrl = require('../controllers/reminder.controller');
const { requirePermission } = require('../middleware/rbac');
const { validate } = require('../middleware/validation');
const { audit } = require('../middleware/audit');
const v = require('../validators');
const { asyncHandler } = require('../utils/respond');
const { PERMISSIONS: P } = require('../services/auth/rbac.service');

const router = express.Router();

router.get('/', requirePermission(P.REMINDER_READ), asyncHandler(ctrl.list));
router.post('/', requirePermission(P.REMINDER_WRITE), validate(v.reminder.create), audit('reminder.create', 'reminder_rule'), asyncHandler(ctrl.create));
router.put('/:ruleId', requirePermission(P.REMINDER_WRITE), validate(v.reminder.update), audit('reminder.update', 'reminder_rule', { idParam: 'ruleId' }), asyncHandler(ctrl.update));
// Manual scheduler trigger (EventBridge/worker calls this on a schedule in prod).
router.post('/run', requirePermission(P.REMINDER_WRITE), asyncHandler(ctrl.run));

module.exports = router;
