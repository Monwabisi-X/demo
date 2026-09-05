'use strict';

/**
 * Application error type carrying a stable error `code` and an HTTP `status`.
 * The centralised error handler renders these into the documented response shape.
 */

class AppError extends Error {
  constructor(code, message, status = 400, details = []) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.expose = true; // safe to surface message to the client
  }
}

const ERROR_STATUS = Object.freeze({
  VALIDATION_ERROR: 400,
  INVALID_REFERENCE: 400,
  INVALID_CREDENTIALS: 401,
  INVALID_TOKEN: 401,
  TOKEN_EXPIRED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  DUPLICATE_RESOURCE: 409,
  RATE_LIMIT_EXCEEDED: 429,
  INTERNAL_ERROR: 500,
});

module.exports = { AppError, ERROR_STATUS };
