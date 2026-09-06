'use strict';

/**
 * Centralised configuration, loaded from environment variables.
 *
 * Loading this module also validates that required variables are present for the current
 * environment. In production, secrets are expected to be injected (e.g. from AWS Secrets
 * Manager) into the environment before the process starts.
 */

require('dotenv').config();

const env = process.env.NODE_ENV || 'development';
const isProd = env === 'production';
const isTest = env === 'test';

function bool(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function int(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

const invalidBounds = [];

function boundedInt(name, fallback, min, max) {
  const raw = process.env[name];
  if (raw === undefined || raw === null || raw === '') return fallback;
  if (!/^\d+$/.test(raw)) {
    invalidBounds.push(`${name} (must be an integer from ${min} to ${max})`);
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    invalidBounds.push(`${name} (must be from ${min} to ${max})`);
    return fallback;
  }
  return value;
}

const config = {
  env,
  isProd,
  isTest,
  isDev: env === 'development',
  port: int(process.env.PORT, 3000),
  logLevel: process.env.LOG_LEVEL || 'info',

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: int(process.env.DB_PORT, 5432),
    name: process.env.DB_NAME || 'royalsquare',
    user: process.env.DB_USER || 'royalsquare',
    password: process.env.DB_PASSWORD || '',
    poolMin: int(process.env.DB_POOL_MIN, 2),
    poolMax: int(process.env.DB_POOL_MAX, 10),
    ssl: bool(process.env.DB_SSL, isProd),
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: int(process.env.REDIS_PORT, 6379),
    tls: bool(process.env.REDIS_TLS, false),
    authMode:
      process.env.REDIS_AUTH_MODE || (process.env.REDIS_PASSWORD ? 'password' : 'none'),
    username: process.env.REDIS_USERNAME || undefined,
    password: process.env.REDIS_PASSWORD || undefined,
    iamResource: process.env.REDIS_IAM_RESOURCE || undefined,
  },

  auth: {
    jwtSecret: process.env.JWT_SECRET || (isProd ? undefined : 'dev_secret_change_me_012345678901234567890'),
    // Short-lived access tokens; clients transparently refresh via the 30d refresh token.
    jwtExpiry: process.env.JWT_EXPIRY || '1h',
    refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY || '30d',
  },

  encryption: {
    key: process.env.ENCRYPTION_KEY || (isProd ? undefined : '0123456789abcdef0123456789abcdef'),
  },

  aws: {
    region: process.env.AWS_REGION || 'af-south-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || undefined,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || undefined,
    s3Bucket: process.env.S3_BUCKET || undefined,
    cloudfrontDomain: process.env.CLOUDFRONT_DOMAIN || undefined,
    kmsKeyId: process.env.KMS_KEY_ID || undefined,
    kmsMedicalKeyId: process.env.KMS_MEDICAL_KEY_ID || undefined,
    secretsPrefix: process.env.SECRETS_PREFIX || '/royal-square/production',
  },

  rateLimit: {
    windowMinutes: int(process.env.RATE_LIMIT_WINDOW, 15),
    max: int(process.env.RATE_LIMIT_MAX, 100),
  },

  cors: {
    origins: (process.env.CORS_ORIGIN || 'http://localhost:3000')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  },

  features: {
    medical: bool(process.env.ENABLE_MEDICAL_MODULE, false),
    claims: bool(process.env.ENABLE_CLAIMS_MODULE, false),
    integrationSimulation: bool(process.env.ENABLE_INTEGRATION_SIMULATION, false),
  },

  koisa: {
    enabled: bool(process.env.KOISA_ENABLED, false),
    bedrockRegion: process.env.BEDROCK_REGION || '',
    modelId: process.env.BEDROCK_MODEL_ID || '',
    maxRounds: boundedInt('KOISA_MAX_ROUNDS', 4, 1, 8),
    maxTotalToolCalls: boundedInt('KOISA_MAX_TOTAL_TOOL_CALLS', 6, 1, 16),
    maxPerToolCalls: boundedInt('KOISA_MAX_PER_TOOL_CALLS', 2, 1, 5),
    overallTimeoutMs: boundedInt('KOISA_OVERALL_TIMEOUT_MS', 15000, 1000, 30000),
    toolTimeoutMs: boundedInt('KOISA_TOOL_TIMEOUT_MS', 4000, 250, 10000),
    maxTokens: boundedInt('KOISA_MAX_TOKENS', 512, 64, 2048),
    maxToolResultBytes: boundedInt('KOISA_MAX_TOOL_RESULT_BYTES', 8192, 512, 32768),
    maxReplyChars: 2000,
  },
};

function redisValidationErrors() {
  const errors = [];
  const { authMode, tls, username, password, iamResource } = config.redis;

  if (!['none', 'password', 'iam'].includes(authMode)) {
    errors.push('REDIS_AUTH_MODE (must be none, password, or iam)');
    return errors;
  }

  if (!isProd) return errors;

  if (authMode === 'password' && !password) {
    errors.push('REDIS_PASSWORD (required when REDIS_AUTH_MODE=password)');
  }

  if (authMode === 'iam') {
    if (!tls) errors.push('REDIS_TLS (must be true when REDIS_AUTH_MODE=iam)');
    if (!username) errors.push('REDIS_USERNAME');
    if (!iamResource) {
      errors.push('REDIS_IAM_RESOURCE');
    } else if (!/^[a-z][a-z0-9-]{0,39}$/.test(iamResource)) {
      errors.push('REDIS_IAM_RESOURCE (must be the lowercase replication-group ID, not a DNS endpoint)');
    }
    if (!process.env.AWS_REGION) errors.push('AWS_REGION (must be explicit for Redis IAM signing)');
    if (password) errors.push('REDIS_PASSWORD (must be unset when REDIS_AUTH_MODE=iam)');
  }

  return errors;
}

/** Validate only the Redis contract, for runtimes such as the reminder Lambda. */
function validateRedis() {
  const errors = redisValidationErrors();
  if (errors.length) {
    throw new Error(`Invalid Redis configuration: ${errors.join(', ')}.`);
  }
}

/**
 * Validate required configuration. Throws in production if a required secret is missing.
 * In development/test we allow safe fallbacks so the app can boot for local work.
 */
function validate() {
  const missing = [...invalidBounds, ...redisValidationErrors()];

  if (!config.db.password && isProd) missing.push('DB_PASSWORD');
  if (!config.auth.jwtSecret) missing.push('JWT_SECRET');
  if (config.auth.jwtSecret && config.auth.jwtSecret.length < 32) {
    if (isProd) missing.push('JWT_SECRET (must be >= 32 chars)');
  }
  if (!config.encryption.key) missing.push('ENCRYPTION_KEY');

  if (isProd) {
    if (!config.aws.s3Bucket) missing.push('S3_BUCKET');
    if (!config.aws.kmsKeyId) missing.push('KMS_KEY_ID');
    if (!config.aws.accessKeyId && !process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI) {
      // Running on Fargate/ECS uses task role credentials; only warn otherwise.
    }
  }

  if (config.koisa.enabled) {
    if (!config.koisa.bedrockRegion) missing.push('BEDROCK_REGION');
    if (config.koisa.bedrockRegion && config.koisa.bedrockRegion !== config.aws.region) {
      missing.push('BEDROCK_REGION (must equal AWS_REGION for POPIA data residency)');
    }
    if (isProd && !config.koisa.modelId) missing.push('BEDROCK_MODEL_ID');
    if (config.koisa.toolTimeoutMs >= config.koisa.overallTimeoutMs) {
      missing.push('KOISA_TOOL_TIMEOUT_MS (must be less than KOISA_OVERALL_TIMEOUT_MS)');
    }
  }

  if (missing.length) {
    throw new Error(
      `Missing required configuration: ${missing.join(', ')}. ` +
        'Set these environment variables (in production, via AWS Secrets Manager).'
    );
  }
}

config.validate = validate;
config.validateRedis = validateRedis;

module.exports = config;
