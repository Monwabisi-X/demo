'use strict';

/**
 * Reminder rules + scheduler.
 *
 * Rules describe recurring events (valuation certificate every 2 years, annual review, RA fee
 * renewal, birthdays, licence expiry, …) and who should be notified (us / client / both).
 * `runDueReminders` is the scheduler tick: it finds rules whose next_run_at has arrived,
 * enqueues notifications to the right audience, and rolls next_run_at forward by the cadence.
 *
 * In production this tick is invoked on a schedule (EventBridge → Lambda/worker); locally it
 * can be run from the worker or a cron. It is safe to call repeatedly.
 */

const { Op } = require('sequelize');
const logger = require('../../config/logger');

function models() {
  return require('../../models');
}

const CADENCE_MS = {
  '1 month': 30 * 24 * 3600 * 1000,
  '3 months': 91 * 24 * 3600 * 1000,
  '6 months': 182 * 24 * 3600 * 1000,
  '1 year': 365 * 24 * 3600 * 1000,
  '2 years': 730 * 24 * 3600 * 1000,
};

function nextRunFrom(date, cadence) {
  const ms = CADENCE_MS[cadence] || CADENCE_MS['1 year'];
  return new Date(date.getTime() + ms);
}

async function list({ tenantId, clientId }) {
  const { ReminderRule } = models();
  const where = { tenant_id: tenantId };
  if (clientId) where.client_id = clientId;
  return ReminderRule.findAll({ where, order: [['next_run_at', 'ASC']] });
}

async function create({ tenantId, data }) {
  const { ReminderRule } = models();
  return ReminderRule.create({
    tenant_id: tenantId,
    client_id: data.clientId || null,
    reminder_type: data.reminderType,
    title: data.title,
    audience: data.audience || 'both',
    channel: data.channel || 'email',
    cadence_interval: data.cadenceInterval || '1 year',
    lead_days: data.leadDays ?? 14,
    next_run_at: data.nextRunAt ? new Date(data.nextRunAt) : new Date(),
    entity_type: data.entityType || null,
    entity_id: data.entityId || null,
  });
}

async function update({ tenantId, ruleId, data }) {
  const { ReminderRule } = models();
  const { AppError } = require('../../utils/errors');
  const rule = await ReminderRule.findOne({ where: { id: ruleId, tenant_id: tenantId } });
  if (!rule) throw new AppError('NOT_FOUND', 'Reminder rule not found', 404);
  await rule.update({
    title: data.title ?? rule.title,
    audience: data.audience ?? rule.audience,
    channel: data.channel ?? rule.channel,
    cadence_interval: data.cadenceInterval ?? rule.cadence_interval,
    lead_days: data.leadDays ?? rule.lead_days,
    next_run_at: data.nextRunAt ? new Date(data.nextRunAt) : rule.next_run_at,
    active: data.active ?? rule.active,
  });
  return rule;
}

/**
 * Scheduler tick. Materialises due reminder rules into queued notifications and advances
 * next_run_at. Returns the number of reminders fired.
 */
async function runDueReminders({ now = new Date() } = {}) {
  const { ReminderRule } = models();
  const notification = require('../notification/notification.service');

  const due = await ReminderRule.findAll({
    where: { active: true, next_run_at: { [Op.lte]: now } },
    limit: 500,
  });

  let fired = 0;
  for (const rule of due) {
    const audiences = rule.audience === 'both' ? ['us', 'client'] : [rule.audience];
    for (const who of audiences) {
      try {
        await notification.enqueue({
          clientId: who === 'client' ? rule.client_id : null,
          channel: rule.channel,
          templateCode: `reminder_${rule.reminder_type.toLowerCase()}`,
          recipient: null, // resolved by the delivery worker from client/adviser contact
          body: rule.title,
        });
        fired += 1;
      } catch (err) {
        logger.warn('reminder enqueue failed', { ruleId: rule.id, message: err.message });
      }
    }
    await rule.update({ last_run_at: now, next_run_at: nextRunFrom(now, rule.cadence_interval) });
  }

  if (fired) logger.info('reminders fired', { count: fired });
  return { fired, rulesProcessed: due.length };
}

module.exports = { list, create, update, runDueReminders, nextRunFrom };
