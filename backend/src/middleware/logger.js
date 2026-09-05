'use strict';

/**
 * Request/response logging. Logs method, path, status, duration, request id and principal id
 * (never the request body, which may contain sensitive data).
 */

const logger = require('../config/logger');

module.exports = function requestLogger(req, res, next) {
  res.on('finish', () => {
    const ctx = req.context || {};
    logger.info('request', {
      requestId: ctx.requestId,
      method: req.method,
      path: req.originalUrl.split('?')[0],
      status: res.statusCode,
      durationMs: ctx.startedAt ? Date.now() - ctx.startedAt : undefined,
      userId: req.principal ? req.principal.userId : undefined,
    });
  });
  next();
};
