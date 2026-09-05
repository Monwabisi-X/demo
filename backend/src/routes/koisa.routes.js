'use strict';

/**
 * Koisa chat. Uses optionalAuthenticate so the SAME endpoint serves public visitors
 * (unauthenticated -> public mode) and signed-in clients (authenticated -> dashboard mode).
 * The service derives the mode and enforces all guardrails.
 */

const express = require('express');
const ctrl = require('../controllers/koisa.controller');
const { optionalAuthenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { rateLimiter } = require('../middleware/rateLimiter');
const v = require('../validators');
const { asyncHandler } = require('../utils/respond');

const router = express.Router();

const chatLimit = rateLimiter({ windowSeconds: 60, max: 20, keyPrefix: 'rl:koisa' });

router.post('/chat', chatLimit, optionalAuthenticate, validate(v.koisa.chat), asyncHandler(ctrl.chat));

module.exports = router;
