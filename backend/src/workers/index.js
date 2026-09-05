'use strict';

/**
 * Worker entry point. Run with `npm run worker`. Connects the models (for DB access) and
 * registers all queue processors, then keeps the process alive until a shutdown signal.
 */

const config = require('../config');
const logger = require('../config/logger');

async function start() {
  config.validate();

  const { sequelize } = require('../config/database');
  await sequelize.authenticate();
  require('../models');

  const { queues, closeAll } = require('./queue');
  require('./notification.worker').register(queues.notification);
  require('./integration.worker').register(queues.integration);

  logger.info('workers started', { env: config.env });

  async function shutdown(signal) {
    logger.info(`workers received ${signal}, shutting down`);
    try {
      await closeAll();
      await sequelize.close();
    } finally {
      process.exit(0);
    }
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
