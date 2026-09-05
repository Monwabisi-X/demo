'use strict';

/**
 * Sequelize connection to PostgreSQL.
 *
 * The instance is created lazily-configured but connections are only established when
 * `authenticate()` is called from server.js. All app tables live in the `app` schema
 * (matching the db/ migrations), so we set the default search_path.
 */

const { Sequelize } = require('sequelize');
const config = require('./index');
const logger = require('./logger');

const sequelize = new Sequelize(config.db.name, config.db.user, config.db.password, {
  host: config.db.host,
  port: config.db.port,
  dialect: 'postgres',
  logging: config.isDev ? (msg) => logger.debug(msg) : false,
  pool: {
    min: config.db.poolMin,
    max: config.db.poolMax,
    idle: 10000,
    acquire: 30000,
  },
  dialectOptions: {
    ...(config.db.ssl
      ? { ssl: { require: true, rejectUnauthorized: false } }
      : {}),
  },
  define: {
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    schema: 'app',
  },
});

/**
 * Open a transaction with the RLS/tenant context set for the authenticated principal.
 *
 * This is how the application enforces Row-Level Security: every request-scoped DB call
 * should run inside a callback here so `app.current_user_id` / `app.current_tenant_id` are
 * bound for the transaction. Koisa's authenticated tools rely on this.
 *
 * @param {{ userId?: string, tenantId?: string }} ctx
 * @param {(t: import('sequelize').Transaction) => Promise<any>} work
 */
async function withContext(ctx, work) {
  return sequelize.transaction(async (t) => {
    if (ctx && ctx.userId) {
      await sequelize.query('SET LOCAL app.current_user_id = :uid', {
        replacements: { uid: ctx.userId },
        transaction: t,
      });
    }
    if (ctx && ctx.tenantId) {
      await sequelize.query('SET LOCAL app.current_tenant_id = :tid', {
        replacements: { tid: ctx.tenantId },
        transaction: t,
      });
    }
    return work(t);
  });
}

module.exports = { sequelize, withContext };
