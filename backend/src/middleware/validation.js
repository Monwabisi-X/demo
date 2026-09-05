'use strict';

/**
 * Joi validation middleware. `validate(schema, source)` validates req[source] (body/params/
 * query) and replaces it with the coerced/defaulted value, or raises VALIDATION_ERROR with
 * per-field details.
 */

const { AppError } = require('../utils/errors');

function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const { value, error } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });
    if (error) {
      const details = error.details.map((d) => ({ path: d.path.join('.'), message: d.message }));
      return next(new AppError('VALIDATION_ERROR', 'Request validation failed', 400, details));
    }
    req[source] = value;
    next();
  };
}

module.exports = { validate };
