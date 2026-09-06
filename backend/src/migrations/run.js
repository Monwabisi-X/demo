'use strict';

/**
 * Simple, ordered SQL migration runner. Applies every *.sql file in this directory in
 * filename order inside a transaction, tracking applied files in app.schema_migrations.
 *
 * Usage: npm run migrate   (or migrate:prod)
 */

const fs = require('fs');
const path = require('path');
const { sequelize } = require('../config/database');
const logger = require('../config/logger');

async function ensureMigrationsTable() {
  await sequelize.query('CREATE SCHEMA IF NOT EXISTS app');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS app.schema_migrations (
      filename varchar(255) PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function appliedSet() {
  const [rows] = await sequelize.query('SELECT filename FROM app.schema_migrations');
  return new Set(rows.map((r) => r.filename));
}

async function run() {
  await sequelize.authenticate();
  await ensureMigrationsTable();
  const applied = await appliedSet();

  const files = fs
    .readdirSync(__dirname)
    .filter((f) => f.endsWith('.sql'))
    // Never install the known local demo login in a production database.
    .filter((f) => !(process.env.NODE_ENV === 'production' && f === '009_demo_client_seed.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      logger.info(`skip (already applied): ${file}`);
      continue;
    }
    const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
    logger.info(`applying: ${file}`);
    await sequelize.transaction(async (t) => {
      await sequelize.query(sql, { transaction: t });
      await sequelize.query('INSERT INTO app.schema_migrations (filename) VALUES (:f)', {
        replacements: { f: file },
        transaction: t,
      });
    });
  }

  logger.info('migrations complete');
  await sequelize.close();
}

if (require.main === module) {
  run().catch((err) => {
    logger.error('migration failed', { message: err.message });
    process.exit(1);
  });
}

module.exports = { run };
