import assert from 'node:assert/strict';
import { test } from 'vitest';

import {
  createQueueJobEnvelope,
  defineQueueJobContract,
  parseOutboxEventEnvelope,
  parseQueueJobEnvelope,
  toSafeJobFailure,
} from '../dist/index.js';

const event = {
  schemaVersion: 1,
  eventId: '019ce3a4-d7b2-7c11-8cb4-29e63a2f17a1',
  eventType: 'foundation.probe-requested',
  eventVersion: 1,
  aggregate: { type: 'foundation.probe', id: 'probe-1', version: '1' },
  payload: { probeId: 'probe-1' },
  privacyClassification: 'audit',
  servicePrincipal: 'noma_worker',
  correlationId: 'correlation-1',
  occurredAt: '2026-08-01T00:00:00.000Z',
  availableAt: '2026-08-01T00:00:00.000Z',
};

const contract = defineQueueJobContract({
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
  parsePayload(value) {
    if (typeof value !== 'object' || value === null || value.probeId !== 'probe-1') {
      throw new Error('probe payload is invalid');
    }
    return { probeId: value.probeId };
  },
});

test('outbox readers tolerate additive optional fields and preserve required facts', () => {
  const parsed = parseOutboxEventEnvelope({ ...event, futureOptionalField: true });
  assert.equal(parsed.eventId, event.eventId);
  assert.equal(parsed.aggregate.version, '1');
});

test('job envelope uses the outbox UUID as its deterministic BullMQ identity', () => {
  const envelope = createQueueJobEnvelope(contract, event);
  assert.equal(envelope.jobId, event.eventId);
  assert.doesNotMatch(envelope.jobId, /:/);
  assert.deepEqual(parseQueueJobEnvelope({ ...envelope, futureOptionalField: true }, contract), envelope);
});

test('missing required event fields and incompatible job versions fail visibly', () => {
  assert.throws(() => parseOutboxEventEnvelope({ ...event, correlationId: undefined }), /correlationId/);
  const { payload: _payload, ...withoutPayload } = event;
  assert.throws(() => parseOutboxEventEnvelope(withoutPayload), /payload/);
  const envelope = createQueueJobEnvelope(contract, event);
  assert.throws(() => parseQueueJobEnvelope({ ...envelope, jobVersion: 2 }, contract), /jobVersion/);
});

test('unauthorized principals and secret-bearing payload fields fail permanently before publication', () => {
  assert.throws(
    () => createQueueJobEnvelope(contract, { ...event, servicePrincipal: 'noma_api' }),
    /not authorized/,
  );
  assert.throws(
    () => parseOutboxEventEnvelope({ ...event, payload: { accessToken: 'private' } }),
    /secret field/,
  );
});

test('job contracts enforce bounded retry, jitter, timeout, and ownership policy', () => {
  assert.throws(
    () => defineQueueJobContract({ ...contract, retry: { ...contract.retry, attempts: 11 } }),
    /attempts/,
  );
  assert.throws(
    () => defineQueueJobContract({ ...contract, retry: { ...contract.retry, jitter: 2 } }),
    /jitter/,
  );
});

test('safe failures redact infrastructure URLs and credential-like values', () => {
  const failure = toSafeJobFailure(
    'retryable',
    'REDIS_UNAVAILABLE',
    'redis://default:password@127.0.0.1:6379 token=private-value',
  );
  assert.doesNotMatch(failure.message, /password|private-value|default:/);
  assert.match(failure.message, /REDACTED/);
});
