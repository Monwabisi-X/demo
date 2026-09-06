'use strict';

/** Dedicated EventBridge Scheduler adapter for reminder materialisation and outbox repair. */

const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

let initialized;

function required(value, name) {
  if (value === undefined || value === null || value === '') throw new Error(`${name} is missing`);
  return String(value);
}

async function initialize() {
  if (initialized) return initialized;
  initialized = (async () => {
    const secretArn = required(process.env.DB_SECRET_ARN, 'DB_SECRET_ARN');
    const client = new SecretsManagerClient({ region: process.env.AWS_REGION });
    const response = await client.send(new GetSecretValueCommand({ SecretId: secretArn }));
    if (!response.SecretString) throw new Error('RDS credential secret has no SecretString');

    let secret;
    try {
      secret = JSON.parse(response.SecretString);
    } catch (_err) {
      throw new Error('RDS credential secret is not valid JSON');
    }

    // Config and Sequelize read environment at require time, so credentials must be set first.
    process.env.DB_HOST = required(secret.host, 'RDS secret host');
    process.env.DB_PORT = required(secret.port || process.env.DB_PORT || '5432', 'RDS secret port');
    process.env.DB_NAME = required(secret.dbname || process.env.DB_NAME, 'RDS database name');
    process.env.DB_USER = required(secret.username, 'RDS secret username');
    process.env.DB_PASSWORD = required(secret.password, 'RDS secret password');

    const config = require('../../src/config');
    config.validateRedis();
    const { sequelize } = require('../../src/config/database');
    require('../../src/models');
    await sequelize.authenticate();
    return {
      reminders: require('../../src/services/reminder/reminder.service'),
      notifications: require('../../src/services/notification/notification.service'),
      redis: require('../../src/config/redis'),
    };
  })().catch((err) => {
    initialized = undefined;
    throw err;
  });
  return initialized;
}

exports.handler = async (_event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  const { reminders, notifications, redis } = await initialize();
  // Lambda freezes timers between invocations; check retained IAM sockets before every run.
  await redis.ensureRedisFreshForInvocation();
  const reminderCounts = await reminders.runDueReminders({});
  const reconciliationCounts = await notifications.reconcileQueuedNotifications();

  // Return operational counts only; never return or log secret values or message content.
  return {
    ok: true,
    reminders: reminderCounts,
    reconciliation: reconciliationCounts,
  };
};
