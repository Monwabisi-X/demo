'use strict';

/** Consistent success envelope + async handler wrapper. */

function ok(res, data, status = 200) {
  return res.status(status).json({ data });
}

/** Wrap an async controller so thrown errors reach the error handler. */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { ok, asyncHandler };
