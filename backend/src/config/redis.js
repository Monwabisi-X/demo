'use strict';

/**
 * Redis client (ioredis), used for: token blacklist, rate limiting, caching, and as the
 * Bull queue backend. Connection is lazy so importing this module has no side effects.
 */

const Redis = require('ioredis');
const config = require('./index');
const logger = require('./logger');

let client = null;

function getRedis() {
  if (client) return client;
  client = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 200, 2000),
  });
  client.on('error', (err) => logger.error('Redis error', { message: err.message }));
  client.on('connect', () => logger.info('Redis connected'));
  return client;
}

/** Bull needs its own connection options (it manages multiple connections internally). */
function bullConnectionOptions() {
  return {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
  };
}

module.exports = { getRedis, bullConnectionOptions };
