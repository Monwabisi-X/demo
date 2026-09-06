'use strict';

/**
 * Render a Docker --env-file from non-secret configuration and Secrets Manager values.
 * Intended for a one-shot container on EC2. Secret values are written only to the mounted
 * OUTPUT_FILE (normally tmpfs under /run) and are never logged.
 */

const fs = require('fs');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const region = process.env.AWS_REGION;
const outputFile = process.env.OUTPUT_FILE || '/run/rsf/backend.env';
const staticFile = process.env.STATIC_ENV_FILE || '/config/static.env';
const client = new SecretsManagerClient({ region });

function safeValue(name, value) {
  const text = String(value ?? '');
  if (text.includes('\n') || text.includes('\r') || text.includes('\0')) {
    throw new Error(`${name} contains characters that cannot be written to an env file`);
  }
  return text;
}

async function getSecret(secretId) {
  if (!secretId) throw new Error('Required secret ARN is missing');
  const result = await client.send(new GetSecretValueCommand({ SecretId: secretId }));
  if (!result.SecretString) throw new Error('Required secret has no SecretString value');
  return result.SecretString;
}

function unwrapSecret(raw, preferredKeys = []) {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'string') return parsed;
    for (const key of preferredKeys) {
      if (typeof parsed?.[key] === 'string') return parsed[key];
    }
  } catch {
    // Raw secret strings are supported.
  }
  return raw;
}

async function main() {
  const [rdsRaw, jwtRaw, encryptionRaw] = await Promise.all([
    getSecret(process.env.RDS_MASTER_SECRET_ARN),
    getSecret(process.env.JWT_SECRET_ARN),
    getSecret(process.env.ENCRYPTION_KEY_SECRET_ARN),
  ]);

  const rds = JSON.parse(rdsRaw);
  const staticLines = fs.readFileSync(staticFile, 'utf8').trimEnd();
  const dynamic = {
    DB_HOST: rds.host,
    DB_PORT: rds.port || 5432,
    DB_NAME: rds.dbname || process.env.DB_NAME,
    DB_USER: rds.username,
    DB_PASSWORD: rds.password,
    JWT_SECRET: unwrapSecret(jwtRaw, ['jwtSecret', 'value']),
    ENCRYPTION_KEY: unwrapSecret(encryptionRaw, ['encryptionKey', 'value']),
  };

  const lines = [staticLines];
  for (const [name, value] of Object.entries(dynamic)) {
    lines.push(`${name}=${safeValue(name, value)}`);
  }
  const rendered = `${lines.filter(Boolean).join('\n')}\n`;
  const temporaryFile = `${outputFile}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(temporaryFile, rendered, { mode: 0o600, flag: 'wx' });
    fs.chmodSync(temporaryFile, 0o600);
    // Publish only a complete file. Concurrent API/worker renderers may replace one another,
    // but Docker can never observe a truncated or partially written secret environment.
    fs.renameSync(temporaryFile, outputFile);
  } finally {
    try {
      fs.unlinkSync(temporaryFile);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }
}

main().catch((err) => {
  console.error(`runtime environment rendering failed: ${err.name || 'Error'}`);
  process.exit(1);
});
