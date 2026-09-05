'use strict';

const express = require('express');
const status = require('../services/status/status.service');
const { asyncHandler } = require('../utils/respond');

const healthRouter = express.Router();

healthRouter.get(
  '/health',
  asyncHandler(async (_req, res) => res.status(200).json(await status.liveness()))
);

healthRouter.get(
  '/ready',
  asyncHandler(async (_req, res) => {
    const r = await status.readiness();
    res.status(r.status === 'ready' ? 200 : 503).json(r);
  })
);

module.exports = { healthRouter };
