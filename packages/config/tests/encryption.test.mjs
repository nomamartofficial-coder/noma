import assert from 'node:assert/strict';
import { test } from 'vitest';

import { loadEncryptionEnvironment } from '../dist/encryption.js';

const aws = {
  NOMA_ENV: 'staging',
  NOMA_CREDENTIAL_ENVIRONMENT: 'staging',
  NOMA_ENCRYPTION_MODE: 'aws-kms',
  NOMA_ENCRYPTION_PURPOSES: 'noma:mfa-seed',
  NOMA_KMS_KEY_ARN: 'arn:aws:kms:eu-central-1:111122223333:key/12345678-1234-1234-1234-123456789abc',
  AWS_ROLE_ARN: 'arn:aws:iam::111122223333:role/noma-staging-api',
  AWS_WEB_IDENTITY_TOKEN_FILE: 'C:/synthetic/test-only/oidc-token',
};

test('encryption is disabled by default and cannot silently select a local key', () => {
  const config = loadEncryptionEnvironment('api', {});
  assert.equal(config.mode, 'disabled');
  assert.deepEqual(config.purposes, []);
});

test('AWS KMS configuration is Frankfurt-only, role-bound, and diagnostic-safe', () => {
  const config = loadEncryptionEnvironment('api', aws);
  assert.equal(config.mode, 'aws-kms');
  assert.equal(config.keyReference, aws.NOMA_KMS_KEY_ARN);
  assert.equal(JSON.stringify(config).includes(aws.AWS_ROLE_ARN), false);
  assert.equal(JSON.stringify(config).includes(aws.AWS_WEB_IDENTITY_TOKEN_FILE), false);
  assert.throws(() => loadEncryptionEnvironment('api', { ...aws, NOMA_KMS_KEY_ARN: aws.NOMA_KMS_KEY_ARN.replace('eu-central-1', 'us-east-1') }));
  assert.throws(() => loadEncryptionEnvironment('api', { ...aws, AWS_ACCESS_KEY_ID: 'synthetic-static-credential' }));
  assert.throws(() => loadEncryptionEnvironment('api', { ...aws, AWS_WEB_IDENTITY_TOKEN_FILE: undefined }));
});

test('Worker/browser have no KMS authority and local provider is remote-inaccessible', () => {
  assert.throws(() => loadEncryptionEnvironment('worker', aws));
  assert.throws(() => loadEncryptionEnvironment('web', aws));
  assert.throws(() => loadEncryptionEnvironment('api', { ...aws, NOMA_ENCRYPTION_MODE: 'test-only' }));
  assert.equal(loadEncryptionEnvironment('test', { NOMA_ENV: 'test', NOMA_ENCRYPTION_MODE: 'test-only', NOMA_ENCRYPTION_PURPOSES: 'noma:mfa-seed' }).mode, 'test-only');
});

test('migration destinations are only accepted for the dedicated migration identity', () => {
  const destination = 'arn:aws:kms:eu-central-1:111122223333:key/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  assert.throws(() => loadEncryptionEnvironment('api', { ...aws, NOMA_KMS_DESTINATION_KEY_ARNS: destination }));
  const config = loadEncryptionEnvironment('migration', { ...aws, NOMA_KMS_DESTINATION_KEY_ARNS: destination });
  assert.deepEqual(config.destinationKeyReferences, [destination]);
});
