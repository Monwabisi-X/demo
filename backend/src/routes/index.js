'use strict';

/**
 * /api/v1 router. Auth and Koisa manage their own auth (login is public; Koisa uses optional
 * auth). Everything else requires a valid JWT via `authenticate`, then per-route RBAC.
 */

const express = require('express');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Public / self-authenticating routers.
router.use('/auth', require('./auth.routes'));
router.use('/koisa', require('./koisa.routes')); // optional auth inside

// Authenticated routers.
router.use('/clients', authenticate, require('./client.routes'));
router.use('/financial', authenticate, require('./financial.routes'));
router.use('/policies', authenticate, require('./policy.routes'));
router.use('/claims', authenticate, require('./claim.routes'));
router.use('/documents', authenticate, require('./document.routes'));
router.use('/compliance', authenticate, require('./compliance.routes'));
router.use('/medical', authenticate, require('./medical.routes'));
router.use('/workflow', authenticate, require('./workflow.routes'));
router.use('/audit', authenticate, require('./audit.routes'));

module.exports = router;
