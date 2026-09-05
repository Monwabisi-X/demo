'use strict';

/**
 * Centralised error handling.
 *
 * Renders every error into the documented shape:
 *   { "error": { "message", "code", "details" } }
 *
 * Maps Sequelize + JWT errors to stable codes. Never leaks stack traces or internal
 * messages to clients in production.
 */

const logger = require('../config/logger');
const { AppError } = require('../utils/errors');
const config = require('../config');

function notFound(req, _res, next) {
  next(new AppError('NOT_FOUND', `Route not found: ${req.method} ${req.path}`, 404));
}

function mapError(err) {
  if (err instanceof AppError) return err;

  // Sequelize mappings.
  switch (err.name) {
    case 'SequelizeValidationError':
      return new AppError(
        'VALIDATION_ERROR',
        'Request validation failed',
        400,
        (err.errors || []).map((e) => ({ path: e.path, message: e.message }))
      );
    case 'SequelizeUniqueConstraintError':
      return new AppError('DUPLICATE_RESOURCE', 'Resource already exists', 409);
    case 'SequelizeForeignKeyConstraintError':
      return new AppError('INVALID_REFERENCE', 'Referenced resource does not exist', 400);
    case 'JsonWebTokenError':
      return new AppError('INVALID_TOKEN', 'Invalid token', 401);
    case 'TokenExpiredError':
      return new AppError('TOKEN_EXPIRED', 'Token expired', 401);
    default:
      return null;
  }
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  const mapped = mapError(err) || new AppError('INTERNAL_ERROR', 'Internal server error', 500);

  const requestId = req.context && req.context.requestId;
  if (mapped.status >= 500) {
    logger.error('unhandled error', {
      requestId,
      code: mapped.code,
      message: err.message,
      stack: config.isProd ? undefined : err.stack,
    });
  } else {
    logger.warn('handled error', { requestId, code: mapped.code, status: mapped.status });
  }

  const body = {
    error: {
      message: mapped.expose || !config.isProd ? mapped.message : 'Internal server error',
      code: mapped.code,
      details: mapped.details || [],
    },
  };
  if (requestId) body.error.requestId = requestId;

  res.status(mapped.status).json(body);
}

module.exports = errorHandler;
module.exports.notFound = notFound;
module.exports.errorHandler = errorHandler;
