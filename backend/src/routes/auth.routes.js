'use strict';

const express = require('express');
const ctrl = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { validate } = require('../middleware/validation');
const { rateLimiter } = require('../middleware/rateLimiter');
const { audit } = require('../middleware/audit');
const v = require('../validators');
const { asyncHandler } = require('../utils/respond');

const router = express.Router();

// Stricter per-endpoint limits for auth-sensitive routes (matches documented limits).
const loginLimit = rateLimiter({ windowSeconds: 60, max: 5, keyPrefix: 'rl:login' });
const registerLimit = rateLimiter({ windowSeconds: 60, max: 10, keyPrefix: 'rl:register' });
const forgotLimit = rateLimiter({ windowSeconds: 60, max: 3, keyPrefix: 'rl:forgot' });
const resetLimit = rateLimiter({ windowSeconds: 60, max: 3, keyPrefix: 'rl:reset' });

// ── Public / unauthenticated ────────────────────────────────────────────────────
router.post('/login', loginLimit, validate(v.auth.login), asyncHandler(ctrl.login));
router.post('/register', registerLimit, validate(v.auth.register), asyncHandler(ctrl.register));
router.post('/refresh', validate(v.auth.refresh), asyncHandler(ctrl.refresh));
router.post('/logout', validate(v.auth.logout), asyncHandler(ctrl.logout));
router.post('/forgot-password', forgotLimit, validate(v.auth.forgotPassword), asyncHandler(ctrl.forgotPassword));
router.post('/reset-password', resetLimit, validate(v.auth.resetPassword), asyncHandler(ctrl.resetPassword));

// ── Authenticated (self-service) ──────────────────────────────────────────────
router.get('/me', authenticate, asyncHandler(ctrl.me));
router.put('/me', authenticate, validate(v.auth.updateProfile), asyncHandler(ctrl.updateMe));
router.post('/change-password', authenticate, validate(v.auth.changePassword), asyncHandler(ctrl.changePassword));
router.get('/sessions', authenticate, asyncHandler(ctrl.listSessions));
router.delete('/sessions/:sessionId', authenticate, asyncHandler(ctrl.revokeSession));

// ── Admin-only user management ────────────────────────────────────────────────
router.get('/users', authenticate, requireRole('PLATFORM_ADMIN'), asyncHandler(ctrl.listUsers));
router.post('/users', authenticate, requireRole('PLATFORM_ADMIN'), validate(v.auth.createUser), audit('user.create', 'user'), asyncHandler(ctrl.createUser));
router.put('/users/:userId', authenticate, requireRole('PLATFORM_ADMIN'), validate(v.auth.updateUser), audit('user.update', 'user', { idParam: 'userId' }), asyncHandler(ctrl.updateUser));
router.delete('/users/:userId', authenticate, requireRole('PLATFORM_ADMIN'), audit('user.delete', 'user', { idParam: 'userId' }), asyncHandler(ctrl.deleteUser));

module.exports = router;
