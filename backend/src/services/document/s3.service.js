'use strict';

/**
 * S3 access for document binaries. Objects are private and server-side encrypted with KMS.
 * Downloads are only ever served via short-lived presigned URLs — object keys are never
 * exposed to clients. Key layout mirrors the blueprint:
 *   tenant/{tenantId}/clients/{clientId}/documents/{documentId}/{filename}
 */

const config = require('../../config');
const logger = require('../../config/logger');

function buildKey({ tenantId, clientId, documentId, filename }) {
  const safe = String(filename || 'file').replace(/[^\w.\-]/g, '_');
  const scope = clientId ? `clients/${clientId}` : 'shared';
  return `tenant/${tenantId}/${scope}/documents/${documentId}/${safe}`;
}

async function putObject({ key, body, contentType }) {
  const { getS3 } = require('../../config/aws');
  const { PutObjectCommand } = require('@aws-sdk/client-s3');
  const s3 = getS3();
  const res = await s3.send(
    new PutObjectCommand({
      Bucket: config.aws.s3Bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      ServerSideEncryption: config.aws.kmsKeyId ? 'aws:kms' : 'AES256',
      SSEKMSKeyId: config.aws.kmsKeyId || undefined,
    })
  );
  return { versionId: res.VersionId, bucket: config.aws.s3Bucket, key };
}

async function presignDownload({ key, versionId, expiresIn = 300 }) {
  const { getS3 } = require('../../config/aws');
  const { GetObjectCommand } = require('@aws-sdk/client-s3');
  const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
  const s3 = getS3();
  const cmd = new GetObjectCommand({
    Bucket: config.aws.s3Bucket,
    Key: key,
    VersionId: versionId || undefined,
  });
  return getSignedUrl(s3, cmd, { expiresIn });
}

async function presignUpload({ key, contentType, expiresIn = 300 }) {
  const { getS3 } = require('../../config/aws');
  const { PutObjectCommand } = require('@aws-sdk/client-s3');
  const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
  const s3 = getS3();
  const cmd = new PutObjectCommand({
    Bucket: config.aws.s3Bucket,
    Key: key,
    ContentType: contentType,
    ServerSideEncryption: config.aws.kmsKeyId ? 'aws:kms' : 'AES256',
    SSEKMSKeyId: config.aws.kmsKeyId || undefined,
  });
  return getSignedUrl(s3, cmd, { expiresIn });
}

async function deleteObject({ key }) {
  const { getS3 } = require('../../config/aws');
  const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
  const s3 = getS3();
  await s3.send(new DeleteObjectCommand({ Bucket: config.aws.s3Bucket, Key: key }));
  logger.info('s3 object deleted', { key });
}

module.exports = { buildKey, putObject, presignDownload, presignUpload, deleteObject };
