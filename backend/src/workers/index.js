'use strict';

/** Worker entry point with durable notification-outbox reconciliation. */

const config = require('../config');
const logger = require('../config/logger');

const RECONCILE_INTERVAL_MS = 60_000;

async function start() {
  config.validate();

  const { sequelize } = require('../config/database');
  await sequelize.authenticate();
  require('../models');

  const { queues, closeAll } = require('./queue');
  const notificationQueue = queues.notification;
  const integrationQueue = queues.integration;
  require('./notification.worker').register(notificationQueue);
  require('./integration.worker').register(integrationQueue);
  await Promise.all([notificationQueue.isReady(), integrationQueue.isReady()]);

  const notificationService = require('../services/notification/notification.service');
  let reconciliationRunning = false;
  const reconcile = async () => {
    if (reconciliationRunning) return;
    reconciliationRunning = true;
    try {
      const counts = await notificationService.reconcileQueuedNotifications();
      if (counts.enqueued || counts.recoveredStale || counts.deferred) {
        logger.info('notification outbox reconciled', counts);
      }
    } catch (err) {
      logger.error('notification outbox reconciliation failed', { message: err.message });
    } finally {
      reconciliationRunning = false;
    }
  };

  await reconcile();
  const reconcileTimer = setInterval(reconcile, RECONCILE_INTERVAL_MS);
  reconcileTimer.unref();
  logger.info('workers started', { env: config.env });

  let shuttingDown = false;
  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    clearInterval(reconcileTimer);
    logger.info(`workers received ${signal}, shutting down`);

    const forceTimer = setTimeout(() => {
      logger.error('worker forced shutdown after timeout');
      process.exit(1);
    }, 15000);
    forceTimer.unref();

    let failed = false;
    for (const operation of [closeAll, () => sequelize.close()]) {
      try {
        await operation();
      } catch (err) {
        failed = true;
        logger.error('worker shutdown failed', { message: err.message });
      }
    }
    process.exit(failed ? 1 : 0);
  }
  ['SIGTERM', 'SIGINT'].forEach((sig) => process.on(sig, () => shutdown(sig)));
}

if (require.main === module) {
  start().catch((err) => {
    logger.error('worker startup failed', { message: err.message });
    process.exit(1);
  });
}

module.exports = { start };
