'use strict';

/**
 * Reminder rule CRUD and the durable scheduler tick.
 *
 * One due occurrence per rule is materialised per tick. If the scheduler was offline for
 * multiple cycles, intermediate cycles are intentionally skipped and next_run_at advances to
 * the first future calendar occurrence. PostgreSQL is the source of truth; Bull is only the
 * delivery transport for committed outbox rows.
 */

const { QueryTypes } = require('sequelize');
const logger = require('../../config/logger');
const { AppError } = require('../../utils/errors');

function models() {
  return require('../../models');
}

const CADENCES = Object.freeze({
  '1 month': 1,
  '3 months': 3,
  '6 months': 6,
  '1 year': 12,
  '2 years': 24,
});
const CADENCE_VALUES = Object.freeze(Object.keys(CADENCES));
const DEFAULT_BATCH_SIZE = 100;
const MAX_BATCH_SIZE = 500;
const MAX_SEQUENTIAL_SKIPS = 120;

function validateCadence(cadence) {
  if (!Object.prototype.hasOwnProperty.call(CADENCES, cadence)) {
    throw new AppError(
      'VALIDATION_ERROR',
      `cadenceInterval must be one of: ${CADENCE_VALUES.join(', ')}`,
      400
    );
  }
  return cadence;
}

function validateAudienceTarget(audience, clientId) {
  if (!['us', 'client', 'both'].includes(audience)) {
    throw new AppError('VALIDATION_ERROR', 'Reminder audience is invalid', 400);
  }
  if (audience !== 'us' && !clientId) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Client and both audiences require a clientId; tenant-wide reminders must target us',
      400
    );
  }
  return audience;
}

function calendarAnchor(date) {
  const source = new Date(date);
  if (Number.isNaN(source.getTime())) {
    throw new AppError('VALIDATION_ERROR', 'Reminder schedule date is invalid', 400);
  }
  const day = source.getUTCDate();
  const monthDays = new Date(Date.UTC(source.getUTCFullYear(), source.getUTCMonth() + 1, 0)).getUTCDate();
  return { day, monthEnd: day === monthDays };
}

function addCalendarMonths(date, months, anchor = calendarAnchor(date)) {
  const source = new Date(date);
  if (Number.isNaN(source.getTime())) {
    throw new AppError('VALIDATION_ERROR', 'Reminder schedule date is invalid', 400);
  }

  const result = new Date(source);
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const targetMonthDays = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(anchor.monthEnd ? targetMonthDays : Math.min(anchor.day, targetMonthDays));
  return result;
}

function nextRunFrom(date, cadence) {
  return addCalendarMonths(date, CADENCES[validateCadence(cadence)]);
}

function advanceToFirstFuture(scheduledFor, cadence, now, anchor = calendarAnchor(scheduledFor)) {
  const months = CADENCES[validateCadence(cadence)];
  let advances = 1;
  let next = addCalendarMonths(scheduledFor, advances * months, anchor);

  while (next <= now && advances < MAX_SEQUENTIAL_SKIPS) {
    advances += 1;
    next = addCalendarMonths(scheduledFor, advances * months, anchor);
  }

  // Bound sequential work for very stale rules, then jump close to now and finish safely.
  if (next <= now) {
    const monthDistance =
      (now.getUTCFullYear() - next.getUTCFullYear()) * 12 +
      (now.getUTCMonth() - next.getUTCMonth());
    advances += Math.max(1, Math.floor(monthDistance / months));
    next = addCalendarMonths(scheduledFor, advances * months, anchor);

    for (let guard = 0; next <= now && guard < 3; guard += 1) {
      advances += 1;
      next = addCalendarMonths(scheduledFor, advances * months, anchor);
    }
  }

  if (next <= now) throw new Error('Could not advance reminder schedule to a future occurrence');
  return { nextRunAt: next, skippedCycles: Math.max(0, advances - 1) };
}

async function list({ tenantId, clientId }) {
  const { ReminderRule } = models();
  const where = { tenant_id: tenantId };
  if (clientId) where.client_id = clientId;
  return ReminderRule.findAll({ where, order: [['next_run_at', 'ASC'], ['id', 'ASC']] });
}

async function create({ tenantId, data }) {
  const { ReminderRule, Client, sequelize } = models();
  validateCadence(data.cadenceInterval || '1 year');
  const audience = data.audience || (data.clientId ? 'both' : 'us');
  validateAudienceTarget(audience, data.clientId);
  const nextRunAt = data.nextRunAt ? new Date(data.nextRunAt) : new Date();
  const anchor = calendarAnchor(nextRunAt);

  return sequelize.transaction(async (transaction) => {
    if (data.clientId) {
      const client = await Client.findOne({
        attributes: ['id'],
        where: { id: data.clientId, tenant_id: tenantId, deleted_at: null },
        transaction,
      });
      if (!client) {
        throw new AppError('INVALID_REFERENCE', 'Client does not belong to this tenant', 400);
      }
    }

    return ReminderRule.create({
      tenant_id: tenantId,
      client_id: data.clientId || null,
      reminder_type: data.reminderType,
      title: data.title,
      audience,
      channel: data.channel || 'email',
      cadence_interval: data.cadenceInterval || '1 year',
      lead_days: data.leadDays ?? 14,
      next_run_at: nextRunAt,
      cadence_anchor_day: anchor.day,
      cadence_anchor_month_end: anchor.monthEnd,
      entity_type: data.entityType || null,
      entity_id: data.entityId || null,
    }, { transaction });
  });
}

async function update({ tenantId, ruleId, data }) {
  const { ReminderRule } = models();
  if (data.cadenceInterval !== undefined) validateCadence(data.cadenceInterval);
  const rule = await ReminderRule.findOne({ where: { id: ruleId, tenant_id: tenantId } });
  if (!rule) throw new AppError('NOT_FOUND', 'Reminder rule not found', 404);
  const nextRunAt = data.nextRunAt ? new Date(data.nextRunAt) : rule.next_run_at;
  const anchor = data.nextRunAt ? calendarAnchor(nextRunAt) : {
    day: rule.cadence_anchor_day,
    monthEnd: rule.cadence_anchor_month_end,
  };
  const audience = data.audience ?? rule.audience;
  validateAudienceTarget(audience, rule.client_id);
  await rule.update({
    title: data.title ?? rule.title,
    audience,
    channel: data.channel ?? rule.channel,
    cadence_interval: data.cadenceInterval ?? rule.cadence_interval,
    lead_days: data.leadDays ?? rule.lead_days,
    next_run_at: nextRunAt,
    cadence_anchor_day: anchor.day,
    cadence_anchor_month_end: anchor.monthEnd,
    active: data.active ?? rule.active,
  });
  return rule;
}

function boundedBatchSize(value) {
  const parsed = Number(value || DEFAULT_BATCH_SIZE);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return DEFAULT_BATCH_SIZE;
  return Math.min(parsed, MAX_BATCH_SIZE);
}

/**
 * Materialise at most one occurrence for each due rule in short, independent transactions.
 * Candidate ordering is deterministic; each transaction rechecks due state under
 * FOR UPDATE SKIP LOCKED. Invalid legacy cadences are reported and skipped without blocking
 * valid rules. Enqueueing happens only after each transaction commits.
 */
async function runDueReminders({ now = new Date(), tenantId, batchSize = DEFAULT_BATCH_SIZE } = {}) {
  const { sequelize } = models();
  const notificationService = require('../notification/notification.service');
  const limit = boundedBatchSize(batchSize);
  const replacements = { now, limit, cadences: CADENCE_VALUES };
  const tenantClause = tenantId ? 'AND tenant_id = :tenantId' : '';
  if (tenantId) replacements.tenantId = tenantId;

  const candidates = await sequelize.query(
    `SELECT id
       FROM app.reminder_rules
      WHERE active = true
        AND next_run_at <= :now
        AND cadence_interval IN (:cadences)
        ${tenantClause}
      ORDER BY next_run_at ASC, id ASC
      LIMIT :limit`,
    { replacements, type: QueryTypes.SELECT }
  );

  const [invalidSummary] = await sequelize.query(
    `SELECT COUNT(*)::integer AS count
       FROM app.reminder_rules
      WHERE active = true
        AND next_run_at <= :now
        AND cadence_interval NOT IN (:cadences)
        ${tenantClause}`,
    { replacements, type: QueryTypes.SELECT }
  );

  const counts = {
    rulesConsidered: candidates.length,
    rulesProcessed: 0,
    rulesLockedElsewhere: 0,
    invalidCadences: Number(invalidSummary.count || 0),
    notificationsPersisted: 0,
    idempotentConflicts: 0,
    notificationsEnqueued: 0,
    queueDeferred: 0,
    missedCyclesSkipped: 0,
  };

  for (const candidate of candidates) {
    let committed;
    try {
      committed = await sequelize.transaction(async (transaction) => {
        const [rule] = await sequelize.query(
          `SELECT id, tenant_id, client_id, reminder_type, title, audience, channel,
                  cadence_interval, cadence_anchor_day, cadence_anchor_month_end, next_run_at
             FROM app.reminder_rules
            WHERE id = :ruleId
              AND active = true
              AND next_run_at <= :now
              ${tenantClause}
            FOR UPDATE SKIP LOCKED`,
          {
            replacements: { ...replacements, ruleId: candidate.id },
            type: QueryTypes.SELECT,
            transaction,
          }
        );
        if (!rule) return null;

        validateCadence(rule.cadence_interval);
        const scheduledFor = new Date(rule.next_run_at);
        const { nextRunAt, skippedCycles } = advanceToFirstFuture(
          scheduledFor,
          rule.cadence_interval,
          now,
          { day: rule.cadence_anchor_day, monthEnd: rule.cadence_anchor_month_end }
        );
        const audiences = rule.audience === 'both' ? ['us', 'client'] : [rule.audience];
        const notificationIds = [];
        let conflicts = 0;

        for (const audience of audiences) {
          const inserted = await sequelize.query(
            `INSERT INTO app.notifications (
               client_id, channel, template_code, recipient, message_body_snapshot, status,
               reminder_rule_id, scheduled_for, audience
             ) VALUES (
               :clientId, :channel, :templateCode, NULL, :body, 'queued',
               :ruleId, :scheduledFor, :audience
             )
             ON CONFLICT (reminder_rule_id, scheduled_for, audience) DO NOTHING
             RETURNING id`,
            {
              replacements: {
                clientId: audience === 'client' ? rule.client_id : null,
                channel: rule.channel,
                templateCode: `reminder_${rule.reminder_type.slice(0, 91).toLowerCase()}`,
                body: rule.title,
                ruleId: rule.id,
                scheduledFor,
                audience,
              },
              type: QueryTypes.SELECT,
              transaction,
            }
          );
          if (inserted.length) notificationIds.push(inserted[0].id);
          else conflicts += 1;
        }

        await sequelize.query(
          `UPDATE app.reminder_rules
              SET last_run_at = :now, next_run_at = :nextRunAt
            WHERE id = :ruleId`,
          { replacements: { now, nextRunAt, ruleId: rule.id }, transaction }
        );

        return { notificationIds, conflicts, skippedCycles };
      });
    } catch (err) {
      if (err.code === 'VALIDATION_ERROR') {
        counts.invalidCadences += 1;
        logger.warn('invalid reminder cadence skipped', { ruleId: candidate.id });
        continue;
      }
      logger.error('reminder occurrence persistence failed', {
        ruleId: candidate.id,
        message: err.message,
      });
      throw err;
    }

    if (!committed) {
      counts.rulesLockedElsewhere += 1;
      continue;
    }

    counts.rulesProcessed += 1;
    counts.notificationsPersisted += committed.notificationIds.length;
    counts.idempotentConflicts += committed.conflicts;
    counts.missedCyclesSkipped += committed.skippedCycles;

    for (const notificationId of committed.notificationIds) {
      try {
        const result = await notificationService.enqueuePersisted(notificationId);
        if (result.enqueued) counts.notificationsEnqueued += 1;
        else counts.queueDeferred += 1;
      } catch (err) {
        counts.queueDeferred += 1;
        logger.warn('committed reminder notification left for reconciliation', {
          notificationId,
          message: err.message,
        });
      }
    }
  }

  if (counts.rulesProcessed) logger.info('reminder tick completed', counts);
  return { ...counts, fired: counts.notificationsPersisted };
}

module.exports = {
  CADENCE_VALUES,
  list,
  create,
  update,
  runDueReminders,
  calendarAnchor,
  nextRunFrom,
  advanceToFirstFuture,
  validateCadence,
};
