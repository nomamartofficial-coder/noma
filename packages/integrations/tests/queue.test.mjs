import assert from 'node:assert/strict';
import { test } from 'vitest';

import {
  BullMqPublisher,
  PermanentJobError,
  QueueContractRegistry,
  RetryableJobError,
} from '../dist/index.js';

const registration = {
  contract: {
    queueName: 'maintenance',
    jobName: 'foundation.process-probe',
    schemaVersion: 1,
    privacyClassification: 'audit',
    authorizedServicePrincipals: ['noma_worker'],
    idempotency: {
      identity: 'outbox-event-id',
      completedDelivery: 'no-op',
      effectCommit: 'same-database-transaction',
    },
    successEvidence: { store: 'postgresql-job-executions', outcome: 'completed' },
    observabilityAttributes: ['queue', 'job', 'outcome'],
    retry: {
      attempts: 3,
      backoff: 'exponential',
      backoffDelayMilliseconds: 1_000,
      jitter: 0.5,
      timeoutMilliseconds: 10_000,
    },
    deadLetter: {
      owner: 'operations',
      attentionAfterMilliseconds: 60_000,
      recoveryAction: 'review-and-replay',
    },
    parsePayload: (value) => value,
  },
  handler: async () => undefined,
};

test('queue registry rejects duplicate contract identities', () => {
  const registry = new QueueContractRegistry([registration]);
  assert.equal(registry.find('maintenance', 'foundation.process-probe', 1), registration);
  assert.throws(() => registry.register(registration), /already registered/);
});

test('queue errors carry redacted stable retry classification', () => {
  const retryable = new RetryableJobError('REDIS_UNAVAILABLE', 'redis://user:password@host:6379');
  const permanent = new PermanentJobError('INVALID_JOB', 'password=private-value');
  assert.equal(retryable.failure.classification, 'retryable');
  assert.equal(permanent.failure.classification, 'permanent');
  assert.doesNotMatch(retryable.failure.message, /password@/);
  assert.doesNotMatch(permanent.failure.message, /private-value/);
});

test('publisher validates Redis URLs without echoing credentials or connecting eagerly', async () => {
  assert.throws(
    () => new BullMqPublisher({ redisUrl: 'https://user:secret@example.invalid', applicationEnvironment: 'test' }),
    /Redis URL/,
  );
  const publisher = new BullMqPublisher({
    redisUrl: 'redis://default:synthetic@127.0.0.1:1',
    applicationEnvironment: 'test',
  });
  await publisher.close();
});
