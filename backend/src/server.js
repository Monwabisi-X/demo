'use strict';

/**
 * Entry point: validates config, connects DB + Redis, starts the HTTP server, and installs
 * graceful shutdown handlers.
 */

const config = require('./config');
const logger = require('./config/logger');

async function start() {
  config.validate();

  const { createApp } = require('./app');
  const { sequelize } = require('./config/database');
  const { getRedis } = require('./config/redis');

  // Connect dependencies.
  await sequelize.authenticate();
  logger.info('Database connected', { host: config.db.host, db: config.db.name });

  const redis = getRedis();
  await redis.connect().catch((err) => {
    // Redis is not strictly required to boot, but log loudly.
    logger.error('Redis connection failed at startup', { message: err.message });
  });

  // Ensure models/associations are registered.
  require('./models');

  const app = createApp();
  const server = app.listen(config.port, () => {
    logger.info(`Royal Square backend listening on :${config.port}`, { env: config.env });
  });

  // ── Graceful shutdown ──────────────────────────────────────────────────────
  let shuttingDown = false;
  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`Received ${signal}, shutting down gracefully`);

    server.close(async () => {
      const { closeAll } = require('./workers/queue');
      const results = await Promise.allSettled([
        closeAll(), // Stops Bull first, then centrally closes every tracked Redis client/timer.
        sequelize.close(),
      ]);
      for (const result of results) {
        if (result.status === 'rejected') {
          logger.error('Error during shutdown', { message: result.reason.message });
        }
      }
      logger.info('Shutdown complete');
      process.exit(results.some((result) => result.status === 'rejected') ? 1 : 0);
    });

    // Force-exit if close hangs.
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 15000).unref();
  }

  ['SIGTERM', 'SIGINT'].forEach((sig) => process.on(sig, () => shutdown(sig)));
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', { reason: String(reason) });
  });

  return server;
}

// Only auto-start when run directly (not when required by tests / load checks).
if (require.main === module) {
  start().catch((err) => {
    logger.error('Fatal startup error', { message: err.message, stack: err.stack });
    process.exit(1);
  });
}

module.exports = { start };
