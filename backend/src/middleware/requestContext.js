'use strict';

/**
 * Attaches a request id + timing metadata to every request. The request id is echoed back
 * in the `X-Request-Id` response header and used for correlation in logs and audit events.
 */

const { randomUUID } = require('crypto');

module.exports = function requestContext(req, res, next) {
  const requestId = req.headers['x-request-id'] || randomUUID();
  req.context = {
    requestId,
    startedAt: Date.now(),
    ip: req.ip,
    userAgent: req.headers['user-agent'] || null,
  };
  res.setHeader('X-Request-Id', requestId);
  next();
};
