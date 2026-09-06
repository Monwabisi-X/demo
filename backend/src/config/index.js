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
    password: process.env.REDIS_PASSWORD || undefined,
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
    enabled: bool(process.env.KOISA_ENABLED, true),
    bedrockRegion: process.env.BEDROCK_REGION || process.env.AWS_REGION || 'af-south-1',
    modelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-sonnet-5-20250929-v1:0',
  },
};

/**
 * Validate required configuration. Throws in production if a required secret is missing.
 * In development/test we allow safe fallbacks so the app can boot for local work.
 */
function validate() {
  const missing = [];

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

  if (missing.length) {
    throw new Error(
      `Missing required configuration: ${missing.join(', ')}. ` +
        'Set these environment variables (in production, via AWS Secrets Manager).'
    );
  }
}

config.validate = validate;

module.exports = config;
