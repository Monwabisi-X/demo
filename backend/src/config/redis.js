'use strict';

/**
 * Shared lazy ioredis factory. Importing this module never resolves AWS credentials or opens a
 * socket. IAM passwords are fresh SigV4 presigned ElastiCache connect URIs and are replaced
 * immediately before every ioredis initial connection or automatic reconnect.
 */

const Redis = require('ioredis');
const { defaultProvider } = require('@aws-sdk/credential-provider-node');
const { SignatureV4 } = require('@smithy/signature-v4');
const { HttpRequest } = require('@smithy/protocol-http');
const { formatUrl } = require('@aws-sdk/util-format-url');
const { Sha256 } = require('@aws-crypto/sha256-js');
const config = require('./index');
const logger = require('./logger');

const IAM_TOKEN_EXPIRY_SECONDS = 900;
const IAM_CONNECTION_ROTATION_MS = 11 * 60 * 60 * 1000;
const READY_WAIT_MS = 30_000;
const CLOSE_WAIT_MS = 2_000;

let defaultCredentialProvider;
let directClient = null;
let closePromise = null;
const trackedClients = new Set();

function credentials() {
  if (!defaultCredentialProvider) defaultCredentialProvider = defaultProvider();
  return defaultCredentialProvider;
}

async function generateIamAuthToken() {
  const resource = config.redis.iamResource;
  const username = config.redis.username;
  const region = config.aws.region;

  // The signing host is deliberately the provider-produced cache ID, never REDIS_HOST/DNS.
  if (!resource || !/^[a-z][a-z0-9-]{0,39}$/.test(resource)) {
    throw new Error('REDIS_IAM_RESOURCE must be the lowercase replication-group ID');
  }
  if (!username) throw new Error('REDIS_USERNAME is required for IAM authentication');
  if (!region) throw new Error('AWS_REGION is required for IAM authentication');

  const signer = new SignatureV4({
    credentials: credentials(),
    service: 'elasticache',
    region,
    sha256: Sha256,
  });
  const request = new HttpRequest({
    protocol: 'https:',
    hostname: resource,
    method: 'GET',
    path: '/',
    headers: { host: resource },
    query: { Action: 'connect', User: username },
  });
  const signed = await signer.presign(request, { expiresIn: IAM_TOKEN_EXPIRY_SECONDS });
  const uri = formatUrl(signed);
  if (!uri.startsWith('https://')) throw new Error('Unexpected ElastiCache IAM signing result');
  return uri.slice('https://'.length);
}

function redisOptions(overrides = {}) {
  const options = {
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 200, 2000),
    ...overrides,
    host: config.redis.host,
    port: config.redis.port,
    lazyConnect: true,
  };

  if (config.redis.tls) {
    options.tls = {
      ...(overrides.tls || {}),
      servername: config.redis.host,
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2',
    };
  } else {
    delete options.tls;
  }

  if (config.redis.authMode === 'iam') {
    options.username = config.redis.username;
    delete options.password;
  } else if (config.redis.authMode === 'password') {
    options.password = config.redis.password;
    if (config.redis.username) options.username = config.redis.username;
  } else {
    delete options.username;
    delete options.password;
  }

  return options;
}

function waitForNextReady(client, timeoutMs = READY_WAIT_MS) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Timed out waiting for Redis to become ready'));
    }, timeoutMs);
    timer.unref();

    const onReady = () => {
      cleanup();
      resolve();
    };
    const onEnd = () => {
      cleanup();
      reject(new Error('Redis connection ended before becoming ready'));
    };
    const cleanup = () => {
      clearTimeout(timer);
      client.removeListener('ready', onReady);
      client.removeListener('end', onEnd);
    };
    client.once('ready', onReady);
    client.once('end', onEnd);
  });
}

function waitUntilReady(client, timeoutMs = READY_WAIT_MS) {
  if (client.status === 'ready') return Promise.resolve();
  return waitForNextReady(client, timeoutMs);
}

function scheduleIamConnectRetry(client, metadata) {
  if (metadata.closing || metadata.authRetryTimer) return;
  metadata.authRetryAttempts += 1;
  const retryStrategy = client.options.retryStrategy;
  const delay =
    typeof retryStrategy === 'function'
      ? retryStrategy(metadata.authRetryAttempts)
      : Math.min(metadata.authRetryAttempts * 200, 2000);
  if (typeof delay !== 'number') return;

  metadata.authRetryTimer = setTimeout(() => {
    metadata.authRetryTimer = null;
    client.connect().catch(() => {
      // A pre-connect signing failure schedules the next retry itself. A socket failure is
      // handed back to ioredis, which schedules its normal automatic reconnect.
    });
  }, delay);
  metadata.authRetryTimer.unref();
}

function installIamConnectRefresh(client, metadata) {
  if (config.redis.authMode !== 'iam') return;

  const originalConnect = client.connect.bind(client);
  let connecting;
  client.connect = function refreshedConnect(callback) {
    if (!connecting) {
      connecting = (async () => {
        if (metadata.closing) throw new Error('Redis client is closing');
        let token;
        try {
          token = await generateIamAuthToken();
        } catch (err) {
          // ioredis has already consumed its reconnect timer before calling connect(). If AWS
          // credential resolution fails here, no socket exists to emit close and schedule the
          // next attempt, so preserve automatic reconnect semantics explicitly.
          if (client.status === 'wait' || client.status === 'reconnecting') {
            scheduleIamConnectRetry(client, metadata);
          }
          throw err;
        }
        clearTimeout(metadata.authRetryTimer);
        metadata.authRetryTimer = null;
        metadata.authRetryAttempts = 0;
        if (metadata.closing) throw new Error('Redis client is closing');
        client.options.username = config.redis.username;
        client.options.password = token;
        return originalConnect();
      })().finally(() => {
        connecting = null;
      });
    }

    if (typeof callback === 'function') {
      connecting.then((value) => callback(null, value), callback);
    }
    return connecting;
  };

  metadata.iam = true;
}

async function rotateConnection(metadata) {
  if (!metadata.iam || metadata.closing) return;
  if (metadata.rotationPromise) return metadata.rotationPromise;

  metadata.rotationPromise = (async () => {
    const { client } = metadata;
    if (client.status === 'wait') return;
    if (client.status === 'end') {
      await client.connect();
      return;
    }
    if (client.status === 'connecting' || client.status === 'reconnecting') {
      await waitUntilReady(client);
      return;
    }
    if (client.status !== 'ready' && client.status !== 'connect') return;

    // Reconnect rather than issuing AUTH: subscriber, blocking, MULTI, and Lua contexts must
    // never receive an injected command. ioredis reconnects through the wrapped connect().
    const ready = waitForNextReady(client);
    client.disconnect(true);
    await ready;
  })().finally(() => {
    metadata.rotationPromise = null;
  });

  return metadata.rotationPromise;
}

function scheduleIamRotation(metadata) {
  if (!metadata.iam || metadata.closing) return;
  clearTimeout(metadata.rotationTimer);
  metadata.rotationTimer = setTimeout(() => {
    rotateConnection(metadata).catch((err) => {
      logger.error('Redis IAM connection rotation failed', {
        role: metadata.role,
        message: err.message,
      });
    });
  }, IAM_CONNECTION_ROTATION_MS);
  metadata.rotationTimer.unref();
}

function createRedisClient({ role = 'command', options = {} } = {}) {
  const client = new Redis(redisOptions(options));
  const metadata = {
    client,
    role,
    iam: false,
    closing: false,
    connectedAt: null,
    rotationTimer: null,
    rotationPromise: null,
    authRetryTimer: null,
    authRetryAttempts: 0,
  };
  trackedClients.add(metadata);
  installIamConnectRefresh(client, metadata);

  client.on('ready', () => {
    metadata.connectedAt = Date.now();
    scheduleIamRotation(metadata);
  });
  client.on('end', () => {
    metadata.connectedAt = null;
    clearTimeout(metadata.rotationTimer);
    metadata.rotationTimer = null;
  });
  client.on('error', (err) => {
    logger.error('Redis connection error', { role, message: err.message });
  });
  client.on('connect', () => logger.info('Redis connected', { role }));
  return client;
}

function getRedis() {
  if (!directClient || directClient.status === 'end') {
    directClient = createRedisClient({ role: 'application' });
  }
  return directClient;
}

/** Bull passes these back to createClient; no IAM token is ever stored in this object. */
function bullConnectionOptions() {
  return {
    host: config.redis.host,
    port: config.redis.port,
    lazyConnect: true,
  };
}

/**
 * Called for every warm Lambda invocation. Frozen timers cannot enforce connection age, so this
 * checks retained sockets and reconnects any IAM connection approaching the 12-hour maximum.
 */
async function ensureRedisFreshForInvocation() {
  if (config.redis.authMode !== 'iam') return;
  const now = Date.now();
  const work = [];
  for (const metadata of trackedClients) {
    if (metadata.closing) continue;
    if (
      metadata.client.status === 'end' ||
      (metadata.connectedAt && now - metadata.connectedAt >= IAM_CONNECTION_ROTATION_MS)
    ) {
      work.push(rotateConnection(metadata));
    } else if (['connecting', 'reconnecting'].includes(metadata.client.status)) {
      work.push(waitUntilReady(metadata.client));
    }
  }
  await Promise.all(work);
}

async function closeTrackedClient(metadata) {
  if (metadata.closing) return;
  metadata.closing = true;
  clearTimeout(metadata.rotationTimer);
  clearTimeout(metadata.authRetryTimer);
  metadata.rotationTimer = null;
  metadata.authRetryTimer = null;
  const { client } = metadata;

  try {
    if (client.status === 'wait' || client.status === 'end') {
      client.disconnect();
      return;
    }
    if (metadata.role.includes('bclient') || client.blocked) {
      client.disconnect();
      return;
    }

    let timer;
    let closeError;
    try {
      await Promise.race([
        client.quit().catch((err) => {
          if (err.message !== 'Connection is closed.') throw err;
        }),
        new Promise((resolve) => {
          timer = setTimeout(resolve, CLOSE_WAIT_MS);
          timer.unref();
        }),
      ]);
    } catch (err) {
      closeError = err;
    } finally {
      clearTimeout(timer);
      if (client.status !== 'end') client.disconnect();
    }
    if (closeError) throw closeError;
  } finally {
    trackedClients.delete(metadata);
    if (client === directClient) directClient = null;
  }
}

async function closeAllRedisClients() {
  if (closePromise) return closePromise;
  closePromise = (async () => {
    const results = await Promise.allSettled([...trackedClients].map(closeTrackedClient));
    const failures = results.filter((result) => result.status === 'rejected');
    if (failures.length) {
      throw new Error(`Failed to close ${failures.length} Redis client(s)`);
    }
  })().finally(() => {
    closePromise = null;
  });
  return closePromise;
}

module.exports = {
  getRedis,
  createRedisClient,
  bullConnectionOptions,
  generateIamAuthToken,
  ensureRedisFreshForInvocation,
  closeAllRedisClients,
};
