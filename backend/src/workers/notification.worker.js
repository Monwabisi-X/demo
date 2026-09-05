'use strict';

/**
 * Notification worker: delivers queued notifications via the configured channel
 * (email/SMS/WhatsApp). Delivery providers are pluggable; in this build delivery is
 * simulated unless a real provider is wired. Never logs the message body (may contain PII).
 */

const logger = require('../config/logger');
const config = require('../config');
const notificationService = require('../services/notification/notification.service');

async function deliver(job) {
  const { notificationId } = job.data;
  const { Notification } = require('../models');
  const n = await Notification.findByPk(notificationId);
  if (!n) return;

  try {
    if (config.features.integrationSimulation) {
      logger.info('notification delivered (simulated)', {
        notificationId,
        channel: n.channel,
      });
    } else {
      // Real provider dispatch (SES/SNS/WhatsApp) would go here.
      logger.warn('notification provider not configured; marking failed', { notificationId });
      throw new Error('Notification provider not configured');
    }
    await notificationService.markSent(notificationId);
  } catch (err) {
    await notificationService.markFailed(notificationId, err.message);
    throw err; // let Bull retry per backoff policy
  }
}

function register(queue) {
  queue.process('deliver', 5, deliver);
  logger.info('notification worker registered');
}

module.exports = { register, deliver };
