import { defineQueueJobContract } from '@noma/contracts';

import type { IdentityTokenPurpose } from './contracts.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface IdentityEmailDeliveryPayload {
  readonly userEmailId: string;
  readonly purpose: IdentityTokenPurpose;
  readonly operationId: string;
}

export interface IdentitySecurityNoticePayload {
  readonly userEmailId: string;
  readonly eventCode: 'EMAIL_VERIFIED' | 'PASSWORD_RECOVERED' | 'MFA_FACTOR_ACTIVATED' | 'MFA_FACTOR_REPLACED' | 'MFA_FACTOR_REMOVED' | 'MFA_RECOVERY_CODES_REGENERATED';
  readonly operationId: string;
}

export const IDENTITY_EMAIL_DELIVERY_CONTRACT = defineQueueJobContract<IdentityEmailDeliveryPayload>({
  queueName: 'email',
  jobName: 'identity.email-delivery',
  schemaVersion: 1,
  privacyClassification: 'account-private',
  authorizedServicePrincipals: ['noma_api_identity'],
  idempotency: { identity: 'outbox-event-id', completedDelivery: 'no-op', effectCommit: 'same-database-transaction' },
  successEvidence: { store: 'postgresql-job-executions', outcome: 'completed' },
  observabilityAttributes: ['purpose', 'outcome'],
  retry: { attempts: 3, backoff: 'exponential', backoffDelayMilliseconds: 1_000, jitter: 1, timeoutMilliseconds: 15_000 },
  deadLetter: { owner: 'security', attentionAfterMilliseconds: 60_000, recoveryAction: 'review-and-replay' },
  parsePayload(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('identity email payload must be an object');
    const input = value as Record<string, unknown>;
    if (Object.keys(input).some((key) => !['userEmailId', 'purpose', 'operationId'].includes(key))) throw new Error('identity email payload contains unsupported fields');
    if (typeof input.userEmailId !== 'string' || !UUID_PATTERN.test(input.userEmailId)) throw new Error('identity email userEmailId must be a UUID');
    if (input.purpose !== 'EMAIL_VERIFICATION' && input.purpose !== 'PASSWORD_RECOVERY') throw new Error('identity email purpose is invalid');
    if (typeof input.operationId !== 'string' || !UUID_PATTERN.test(input.operationId)) throw new Error('identity email operationId must be a UUID');
    return Object.freeze({ userEmailId: input.userEmailId, purpose: input.purpose, operationId: input.operationId });
  },
});

export const IDENTITY_SECURITY_NOTICE_CONTRACT = defineQueueJobContract<IdentitySecurityNoticePayload>({
  queueName: 'email',
  jobName: 'identity.security-notice',
  schemaVersion: 1,
  privacyClassification: 'account-private',
  authorizedServicePrincipals: ['noma_api_identity'],
  idempotency: { identity: 'outbox-event-id', completedDelivery: 'no-op', effectCommit: 'same-database-transaction' },
  successEvidence: { store: 'postgresql-job-executions', outcome: 'completed' },
  observabilityAttributes: ['event_code', 'outcome'],
  retry: { attempts: 1, backoff: 'exponential', backoffDelayMilliseconds: 1_000, jitter: 1, timeoutMilliseconds: 15_000 },
  deadLetter: { owner: 'security', attentionAfterMilliseconds: 60_000, recoveryAction: 'review-and-replay' },
  parsePayload(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('identity notice payload must be an object');
    const input = value as Record<string, unknown>;
    if (Object.keys(input).some((key) => !['userEmailId', 'eventCode', 'operationId'].includes(key))) throw new Error('identity notice payload contains unsupported fields');
    if (typeof input.userEmailId !== 'string' || !UUID_PATTERN.test(input.userEmailId)) throw new Error('identity notice userEmailId must be a UUID');
    if (!['EMAIL_VERIFIED', 'PASSWORD_RECOVERED', 'MFA_FACTOR_ACTIVATED', 'MFA_FACTOR_REPLACED', 'MFA_FACTOR_REMOVED', 'MFA_RECOVERY_CODES_REGENERATED'].includes(String(input.eventCode))) throw new Error('identity notice eventCode is invalid');
    if (typeof input.operationId !== 'string' || !UUID_PATTERN.test(input.operationId)) throw new Error('identity notice operationId must be a UUID');
    return Object.freeze({ userEmailId: input.userEmailId, eventCode: input.eventCode as IdentitySecurityNoticePayload['eventCode'], operationId: input.operationId });
  },
});
