'use strict';

/**
 * Health/readiness checks for the /health and /ready endpoints.
 */

async function liveness() {
  return { status: 'ok', uptime: process.uptime() };
}

async function readiness() {
  const checks = { database: 'unknown', redis: 'unknown' };
  let healthy = true;

  try {
    const { sequelize } = require('../../config/database');
    await sequelize.query('SELECT 1');
    checks.database = 'ok';
  } catch (_e) {
    checks.database = 'error';
    healthy = false;
  }

  try {
    const { getRedis } = require('../../config/redis');
    const pong = await getRedis().ping();
    checks.redis = pong === 'PONG' ? 'ok' : 'error';
    if (checks.redis !== 'ok') healthy = false;
  } catch (_e) {
    checks.redis = 'error';
    healthy = false;
  }

  return { status: healthy ? 'ready' : 'not_ready', checks };
}

module.exports = { liveness, readiness };
