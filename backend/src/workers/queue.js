'use strict';

/**
 * Bull queue setup (Redis-backed). Queues and every Redis socket are created lazily, so imports
 * remain side-effect-free. Custom clients are tracked centrally because Bull does not close
 * clients returned by createClient.
 */

const {
  bullConnectionOptions,
  createRedisClient,
  closeAllRedisClients,
} = require('../config/redis');

const QUEUE_NAMES = Object.freeze({
  notification: 'notification',
  integration: 'integration',
});

const _instances = {};
const QUEUE_CLOSE_TIMEOUT_MS = 5_000;

function closeQueue(queue) {
  let timer;
  return Promise.race([
    Promise.resolve().then(() => queue.close()),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Timed out closing Bull queue')), QUEUE_CLOSE_TIMEOUT_MS);
      timer.unref();
    }),
  ]).finally(() => clearTimeout(timer));
}

function createBullClient(queueName, type, redisOpts) {
  const options = { ...redisOpts };
  if (type === 'subscriber' || type === 'bclient') {
    options.maxRetriesPerRequest = null;
    options.enableReadyCheck = false;
  }
  // Bull invokes this factory separately for each queue/client type. In particular, blocking
  // clients are never shared, and every socket gets the IAM connect wrapper and strict TLS.
  return createRedisClient({ role: `bull:${queueName}:${type}`, options });
}

function getQueue(name) {
  if (_instances[name]) return _instances[name];
  const Bull = require('bull');
  _instances[name] = new Bull(name, {
    redis: bullConnectionOptions(),
    createClient: (type, redisOpts) => createBullClient(name, type, redisOpts),
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    },
  });
  return _instances[name];
}

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
  const queuesToClose = Object.values(_instances);
  const queueResults = await Promise.allSettled(queuesToClose.map(closeQueue));
  for (const name of Object.keys(_instances)) delete _instances[name];

  let redisError;
  try {
    // Bull intentionally does not own custom createClient results; close all tracked sockets
    // only after queues have stopped processors/subscriptions and cleared their timers.
    await closeAllRedisClients();
  } catch (err) {
    redisError = err;
  }

  const queueFailures = queueResults.filter((result) => result.status === 'rejected');
  if (queueFailures.length || redisError) {
    throw new Error(
      `Queue shutdown incomplete (${queueFailures.length} queue failure(s), ` +
        `${redisError ? 'Redis cleanup failed' : 'Redis cleanup succeeded'})`
    );
  }
}

module.exports = { QUEUE_NAMES, getQueue, queues, closeAll };
