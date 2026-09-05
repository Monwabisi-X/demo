'use strict';

/**
 * Redis-backed rate limiter using a fixed-window counter keyed by principal id (if
 * authenticated) or client IP. Degrades open if Redis is unavailable (never blocks traffic
 * because the limiter backend is down), and logs the failure.
 */

const { getRedis } = require('../config/redis');
const config = require('../config');
const logger = require('../config/logger');
const { AppError } = require('../utils/errors');

/**
 * @param {{ windowSeconds?: number, max?: number, keyPrefix?: string }} [opts]
 */
function rateLimiter(opts = {}) {
  const windowSeconds = opts.windowSeconds || config.rateLimit.windowMinutes * 60;
  const max = opts.max || config.rateLimit.max;
  const keyPrefix = opts.keyPrefix || 'rl';

  return async function rateLimit(req, res, next) {
    if (config.isTest) return next();
    try {
      const redis = getRedis();
      const id = (req.principal && req.principal.userId) || req.ip;
      const bucket = Math.floor(Date.now() / 1000 / windowSeconds);
      const key = `${keyPrefix}:${id}:${bucket}`;

      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, windowSeconds);

      const remaining = Math.max(0, max - count);
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', remaining);

      if (count > max) {
        return next(new AppError('RATE_LIMIT_EXCEEDED', 'Too many requests', 429));
      }
      return next();
    } catch (err) {
      logger.warn('rate limiter degraded (allowing request)', { message: err.message });
      return next();
    }
  };
}

module.exports = { rateLimiter };
