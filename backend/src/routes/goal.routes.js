'use strict';

const express = require('express');
const ctrl = require('../controllers/goal.controller');
const { requireAnyPermission, requirePermission } = require('../middleware/rbac');
const { enforceClientScope } = require('../middleware/ownership');
const { validate } = require('../middleware/validation');
const { audit } = require('../middleware/audit');
const v = require('../validators');
const { asyncHandler } = require('../utils/respond');
const { PERMISSIONS: P } = require('../services/auth/rbac.service');

const router = express.Router();

// Client reads own goals (GOALS_READ, self-scoped); advisers manage.
router.get(
  '/:clientId',
  requirePermission(P.GOALS_READ),
  enforceClientScope([P.GOALS_WRITE]),
  asyncHandler(ctrl.list)
);
router.post('/', requirePermission(P.GOALS_WRITE), validate(v.goal.create), audit('goal.create', 'goal'), asyncHandler(ctrl.create));
router.put('/:goalId', requirePermission(P.GOALS_WRITE), validate(v.goal.update), audit('goal.update', 'goal', { idParam: 'goalId' }), asyncHandler(ctrl.update));
router.delete('/:goalId', requirePermission(P.GOALS_WRITE), audit('goal.delete', 'goal', { idParam: 'goalId' }), asyncHandler(ctrl.remove));

module.exports = router;
