import { defineQueueJobContract } from '../../packages/contracts/dist/index.js';

export function createProbeContract(options = {}) {
  return defineQueueJobContract({
    queueName: 'maintenance',
    jobName: options.jobName ?? 'foundation.process-probe',
    schemaVersion: 1,
    privacyClassification: 'audit',
    authorizedServicePrincipals: ['noma_api'],
    idempotency: {
      identity: 'outbox-event-id',
      completedDelivery: 'no-op',
      effectCommit: 'same-database-transaction',
    },
    successEvidence: { store: 'postgresql-job-executions', outcome: 'completed' },
    observabilityAttributes: ['queue', 'job', 'outcome', 'correlation_id'],
    retry: {
      attempts: options.attempts ?? 3,
      backoff: 'exponential',
      backoffDelayMilliseconds: options.backoffDelayMilliseconds ?? 100,
      jitter: 0.5,
      timeoutMilliseconds: 10_000,
    },
    deadLetter: {
      owner: 'operations',
      attentionAfterMilliseconds: 60_000,
      recoveryAction: 'review-and-replay',
    },
    parsePayload(value) {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new Error('probe payload must be an object');
      }
      if (typeof value.probeId !== 'string' || value.probeId.length === 0) {
        throw new Error('probe payload probeId is required');
      }
      if (typeof value.version !== 'string' || !/^(?:0|[1-9][0-9]*)$/.test(value.version)) {
        throw new Error('probe payload version is invalid');
      }
      if (!Number.isSafeInteger(value.delta) || value.delta < 0 || value.delta > 1_000) {
        throw new Error('probe payload delta is invalid');
      }
      return Object.freeze({
        probeId: value.probeId,
        version: value.version,
        delta: value.delta,
      });
    },
  });
}
