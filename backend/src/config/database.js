'use strict';

/**
 * Sequelize connection to PostgreSQL.
 *
 * The instance is created lazily-configured but connections are only established when
 * `authenticate()` is called from server.js. All app tables live in the `app` schema
 * (matching the db/ migrations), so we set the default search_path.
 */

const { Sequelize } = require('sequelize');
const rdsCaBundle = require('aws-ssl-profiles');
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
      ? {
          ssl: {
            ...rdsCaBundle,
            require: true,
            rejectUnauthorized: true,
          },
        }
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
 * Run authenticated Koisa reads under the dedicated NOLOGIN reader role and one transaction.
 * All identifiers are mandatory, transaction-local settings are parameterized, and linkage is
 * verified after role assumption. Ordinary application queries never assume this role.
 *
 * @param {{ userId: string, tenantId: string, clientId: string }} ctx
 * @param {(t: import('sequelize').Transaction) => Promise<any>} work
 * @param {{ statementTimeoutMs?: number }} [options]
 */
async function withContext(ctx, work, options = {}) {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (
    !ctx ||
    !uuid.test(ctx.userId || '') ||
    !uuid.test(ctx.tenantId || '') ||
    !uuid.test(ctx.clientId || '') ||
    typeof work !== 'function'
  ) {
    const error = new Error('Authenticated data context is invalid');
    error.code = 'INVALID_DATA_CONTEXT';
    throw error;
  }

  const requestedTimeout = Number(options.statementTimeoutMs || config.koisa.toolTimeoutMs);
  // The dashboard tool can execute up to seven statements after this value is installed.
  // Dividing the tool budget bounds the transaction without returning while SQL is still live.
  const statementTimeoutMs = Math.max(100, Math.min(Math.floor(requestedTimeout / 7), 1000));
  return sequelize.transaction(async (transaction) => {
    await sequelize.query(
      `SELECT
         set_config('app.current_user_id', $1, true),
         set_config('app.current_tenant_id', $2, true),
         set_config('app.current_client_id', $3, true),
         set_config('statement_timeout', $4, true),
         set_config('lock_timeout', $4, true),
         set_config('idle_in_transaction_session_timeout', $5, true)`,
      {
        bind: [
          ctx.userId,
          ctx.tenantId,
          ctx.clientId,
          `${statementTimeoutMs}ms`,
          `${Math.max(1000, requestedTimeout)}ms`,
        ],
        transaction,
      }
    );

    await sequelize.query('SET LOCAL ROLE rsf_koisa_reader', { transaction });

    const [rows] = await sequelize.query(
      `SELECT 1
         FROM app.users AS u
         JOIN app.clients AS c
           ON c.id = u.client_id
          AND c.tenant_id = u.tenant_id
        WHERE u.id = $1
          AND u.tenant_id = $2
          AND u.client_id = $3
          AND u.status = 'active'
          AND u.deleted_at IS NULL
          AND c.status = 'active'
          AND c.deleted_at IS NULL
        LIMIT 1`,
      {
        bind: [ctx.userId, ctx.tenantId, ctx.clientId],
        transaction,
      }
    );

    if (rows.length !== 1) {
      const error = new Error('Authenticated data context was rejected');
      error.code = 'INVALID_DATA_CONTEXT';
      throw error;
    }
    return work(transaction);
  });
}

module.exports = { sequelize, withContext };
