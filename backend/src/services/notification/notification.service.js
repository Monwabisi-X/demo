'use strict';

/**
 * Notification creation + queueing. Enqueues onto the Bull notification queue; the worker
 * performs delivery (SMS/Email/WhatsApp). A message-body snapshot is stored for auditability.
 */

function models() {
  return require('../../models');
}

async function enqueue({ clientId, userId, channel, templateCode, recipient, body }) {
  const { Notification } = models();
  const notification = await Notification.create({
    client_id: clientId || null,
    user_id: userId || null,
    channel,
    template_code: templateCode,
    recipient,
    message_body_snapshot: body,
    status: 'queued',
  });

  // Best-effort enqueue onto Bull; delivery happens in the worker.
  try {
    const { queues } = require('../../workers/queue');
    await queues.notification.add('deliver', { notificationId: notification.id });
  } catch (_err) {
    // Queue unavailable (e.g. offline/dev). The row remains 'queued' for later pickup.
  }
  return notification;
}

async function markSent(notificationId) {
  const { Notification } = models();
  const n = await Notification.findByPk(notificationId);
  if (n) await n.update({ status: 'sent', sent_at: new Date() });
}

async function markFailed(notificationId, reason) {
  const { Notification } = models();
  const n = await Notification.findByPk(notificationId);
  if (n) {
    await n.update({
      status: 'failed',
      failed_at: new Date(),
      failure_reason: reason,
      retry_count: (n.retry_count || 0) + 1,
    });
  }
}

module.exports = { enqueue, markSent, markFailed };
