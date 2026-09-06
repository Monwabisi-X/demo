'use strict';

/** Notification delivery worker. PostgreSQL state is authoritative; duplicate Bull jobs no-op. */

const logger = require('../config/logger');
const config = require('../config');
const notificationService = require('../services/notification/notification.service');

async function dispatch(notification, { idempotencyKey }) {
  if (config.features.integrationSimulation) {
    logger.info('notification delivered (simulated)', {
      notificationId: notification.id,
      channel: notification.channel,
      providerIdempotencyKey: idempotencyKey,
    });
    return { provider: 'simulation', idempotencyKey };
  }

  // A real SES/SNS/WhatsApp adapter must pass idempotencyKey through when supported.
  logger.warn('notification provider not configured', { notificationId: notification.id });
  throw new Error('Notification provider not configured');
}

async function deliver(job) {
  const { notificationId } = job.data;
  const notification = await notificationService.claimQueued(notificationId);
  if (!notification) {
    logger.info('notification job ignored; row missing or not claimable', { notificationId });
    return { claimed: false };
  }

  try {
    const providerResult = await dispatch(notification, { idempotencyKey: notification.id });
    const markedSent = await notificationService.markSent(
      notificationId,
      notification.processing_started_at
    );
    if (!markedSent) throw new Error('Notification processing claim was lost before completion');
    return { claimed: true, provider: providerResult.provider };
  } catch (err) {
    const configuredAttempts = Number(job.opts && job.opts.attempts) || 1;
    const terminalAttempt = job.attemptsMade + 1 >= configuredAttempts;
    if (terminalAttempt) {
      await notificationService.markTerminalFailure(
        notificationId,
        notification.processing_started_at,
        err.message
      );
    } else {
      await notificationService.markRetryableFailure(
        notificationId,
        notification.processing_started_at,
        err.message
      );
    }
    throw err;
  }
}

function register(queue) {
  queue.process('deliver', 5, deliver);
  logger.info('notification worker registered');
}

module.exports = { register, deliver, dispatch };
