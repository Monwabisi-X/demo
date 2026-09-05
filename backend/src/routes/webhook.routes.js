'use strict';

/**
 * Provider webhook receiver. Provider auth is via HMAC signature (not JWT). The raw body is
 * captured so the signature can be verified. Secrets are resolved per-provider (from Secrets
 * Manager in production).
 */

const express = require('express');
const webhookService = require('../services/integration/webhook.service');
const { asyncHandler } = require('../utils/respond');

const router = express.Router();

// Capture the raw body for signature verification while still parsing JSON.
router.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf ? buf.toString('utf8') : '';
    },
  })
);

router.post(
  '/:provider',
  asyncHandler(async (req, res) => {
    const provider = req.params.provider;
    const signature = req.headers['x-provider-signature'];
    // Secret lookup is environment-specific; undefined here means verification fails closed.
    const secret = process.env[`WEBHOOK_SECRET_${provider.toUpperCase()}`];
    const verified = webhookService.verifySignature({
      provider,
      rawBody: req.rawBody,
      signature,
      secret,
    });
    if (!verified) {
      return res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Invalid webhook signature' } });
    }
    const result = await webhookService.handleEvent({ provider, event: req.body });
    return res.status(200).json({ data: result });
  })
);

module.exports = router;
