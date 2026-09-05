'use strict';

/**
 * AWS SDK v3 clients (S3, KMS, Secrets Manager), pinned to af-south-1 by default for POPIA
 * data residency. Clients are created lazily so the module can be imported without AWS
 * credentials present (e.g. in local/dev/test).
 */

const config = require('./index');

let _s3 = null;
let _kms = null;
let _secrets = null;

function credentials() {
  // If explicit keys are provided use them; otherwise fall back to the default provider
  // chain (task role on Fargate/ECS, env, shared config, etc.).
  if (config.aws.accessKeyId && config.aws.secretAccessKey) {
    return {
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey,
    };
  }
  return undefined;
}

function getS3() {
  if (_s3) return _s3;
  const { S3Client } = require('@aws-sdk/client-s3');
  _s3 = new S3Client({ region: config.aws.region, credentials: credentials() });
  return _s3;
}

function getKMS() {
  if (_kms) return _kms;
  const { KMSClient } = require('@aws-sdk/client-kms');
  _kms = new KMSClient({ region: config.aws.region, credentials: credentials() });
  return _kms;
}

function getSecrets() {
  if (_secrets) return _secrets;
  const { SecretsManagerClient } = require('@aws-sdk/client-secrets-manager');
  _secrets = new SecretsManagerClient({ region: config.aws.region, credentials: credentials() });
  return _secrets;
}

module.exports = { getS3, getKMS, getSecrets };
