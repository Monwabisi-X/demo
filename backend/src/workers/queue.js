'use strict';

/**
 * Bull queue setup (Redis-backed). Queues are created lazily on first access so importing
 * this module has no side effects and requires no live Redis (safe for load checks).
 *
 * Producers: services enqueue jobs (e.g. notification.service, webhook.service).
 * Consumers: workers/*.worker.js register processors (run via `npm run worker`).
 */

const { bullConnectionOptions } = require('../config/redis');

const QUEUE_NAMES = Object.freeze({
  notification: 'notification',
  integration: 'integration',
});

const _instances = {};

function getQueue(name) {
  if (_instances[name]) return _instances[name];
  const Bull = require('bull');
  _instances[name] = new Bull(name, {
    redis: bullConnectionOptions(),
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    },
  });
  return _instances[name];
}

// Lazily-materialised accessors so `queues.notification` builds the queue on demand.
const queues = new Proxy(
  {},
  {
    get(_target, prop) {
      if (typeof prop === 'string' && Object.values(QUEUE_NAMES).includes(prop)) {
        return getQueue(prop);
      }
      return undefined;
    },
  }
);

async function closeAll() {
  await Promise.all(Object.values(_instances).map((q) => q.close()));
}

module.exports = { QUEUE_NAMES, getQueue, queues, closeAll };
