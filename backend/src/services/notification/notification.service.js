'use strict';

/**
 * PostgreSQL-backed notification outbox. Persistence and Bull submission are deliberately
 * separate: the database row is durable and reconciliation repairs any Redis enqueue gap.
 */

const { QueryTypes } = require('sequelize');
const logger = require('../../config/logger');

function models() {
  return require('../../models');
}

async function persistQueued(
  { clientId, userId, channel, templateCode, recipient, body, reminderRuleId, scheduledFor, audience },
  options = {}
) {
  const { Notification } = models();
  return Notification.create(
    {
      client_id: clientId || null,
      user_id: userId || null,
      channel,
      template_code: templateCode,
      recipient,
      message_body_snapshot: body,
      status: 'queued',
      reminder_rule_id: reminderRuleId || null,
      scheduled_for: scheduledFor || null,
      audience: audience || null,
    },
    options
  );
}

async function enqueuePersisted(notificationOrId) {
  const notificationId =
    typeof notificationOrId === 'string' ? notificationOrId : notificationOrId.id;
  const { queues } = require('../../workers/queue');
  const queue = queues.notification;
  const existing = await queue.getJob(notificationId);

  if (existing) {
    const state = await existing.getState();
    if (['active', 'waiting', 'delayed', 'paused'].includes(state)) {
      return { enqueued: false, alreadyQueued: true, state };
    }
    // Retained completed/failed jobs otherwise block reuse of the durable outbox ID.
    await existing.remove();
  }

  await queue.add('deliver', { notificationId }, { jobId: notificationId });
  return { enqueued: true, alreadyQueued: false };
}

/** Preserve the existing generic producer API for password-reset and other notifications. */
async function enqueue(data) {
  const notification = await persistQueued(data);
  try {
    await enqueuePersisted(notification);
  } catch (err) {
    logger.warn('notification queue unavailable; row left queued', {
      notificationId: notification.id,
      message: err.message,
    });
  }
  return notification;
}

async function claimQueued(notificationId) {
  const { sequelize } = models();
  const processingStartedAt = new Date();
  const rows = await sequelize.query(
    `UPDATE app.notifications
        SET status = 'processing', processing_started_at = :processingStartedAt
      WHERE id = :notificationId
        AND status = 'queued'
      RETURNING *`,
    {
      replacements: { notificationId, processingStartedAt },
      type: QueryTypes.SELECT,
    }
  );
  return rows[0] || null;
}

async function markSent(notificationId, processingStartedAt) {
  const { Notification } = models();
  const [updated] = await Notification.update(
    {
      status: 'sent',
      sent_at: new Date(),
      failed_at: null,
      failure_reason: null,
      processing_started_at: null,
    },
    { where: { id: notificationId, status: 'processing', processing_started_at: processingStartedAt } }
  );
  return updated === 1;
}

async function markRetryableFailure(notificationId, processingStartedAt, reason) {
  const { sequelize } = models();
  const rows = await sequelize.query(
    `UPDATE app.notifications
        SET status = 'queued',
            retry_count = retry_count + 1,
            failed_at = clock_timestamp(),
            failure_reason = :reason,
            processing_started_at = NULL
      WHERE id = :notificationId
        AND status = 'processing'
        AND processing_started_at = :processingStartedAt
      RETURNING id`,
    {
      replacements: {
        notificationId,
        processingStartedAt,
        reason: String(reason).slice(0, 2000),
      },
      type: QueryTypes.SELECT,
    }
  );
  return rows.length === 1;
}

async function markTerminalFailure(notificationId, processingStartedAt, reason) {
  const { sequelize } = models();
  const rows = await sequelize.query(
    `UPDATE app.notifications
        SET status = 'failed',
            retry_count = retry_count + 1,
            failed_at = clock_timestamp(),
            failure_reason = :reason,
            processing_started_at = NULL
      WHERE id = :notificationId
        AND status = 'processing'
        AND processing_started_at = :processingStartedAt
      RETURNING id`,
    {
      replacements: {
        notificationId,
        processingStartedAt,
        reason: String(reason).slice(0, 2000),
      },
      type: QueryTypes.SELECT,
    }
  );
  return rows.length === 1;
}

async function reconcileQueuedNotifications({ limit = 100, staleAfterMs = 15 * 60 * 1000 } = {}) {
  const { Notification, sequelize } = models();
  const boundedLimit = Math.max(1, Math.min(Number(limit) || 100, 500));
  const staleBefore = new Date(Date.now() - Math.max(60_000, staleAfterMs));

  const recoveredRows = await sequelize.query(
    `WITH stale AS (
       SELECT id
         FROM app.notifications
        WHERE status = 'processing'
          AND processing_started_at < :staleBefore
        ORDER BY processing_started_at ASC, id ASC
        LIMIT :limit
        FOR UPDATE SKIP LOCKED
     )
     UPDATE app.notifications AS notification
        SET status = 'queued', processing_started_at = NULL
       FROM stale
      WHERE notification.id = stale.id
      RETURNING notification.id`,
    {
      replacements: { staleBefore, limit: boundedLimit },
      type: QueryTypes.SELECT,
    }
  );

  const queued = await Notification.findAll({
    attributes: ['id'],
    where: { status: 'queued' },
    order: [['queued_at', 'ASC'], ['id', 'ASC']],
    limit: boundedLimit,
  });

  const counts = { recoveredStale: recoveredRows.length, examined: queued.length, enqueued: 0, alreadyQueued: 0, deferred: 0 };
  for (const notification of queued) {
    try {
      const result = await enqueuePersisted(notification.id);
      if (result.enqueued) counts.enqueued += 1;
      else counts.alreadyQueued += 1;
    } catch (err) {
      counts.deferred += 1;
      logger.warn('queued notification reconciliation deferred', {
        notificationId: notification.id,
        message: err.message,
      });
    }
  }
  return counts;
}

module.exports = {
  persistQueued,
  enqueuePersisted,
  enqueue,
  claimQueued,
  markSent,
  markRetryableFailure,
  markTerminalFailure,
  reconcileQueuedNotifications,
};
