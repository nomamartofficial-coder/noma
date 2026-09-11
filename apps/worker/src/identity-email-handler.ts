import { createHash } from 'node:crypto';

import {
  beginJobExecution,
  completeJobExecution,
  createIdentityPersistence,
  deadLetterJobExecution,
  recordRetryableJobFailure,
  type DatabaseClient,
} from '@noma/database';
import { toSafeJobFailure } from '@noma/contracts';
import {
  PermanentJobError,
  RetryableJobError,
  type QueueContractRegistration,
} from '@noma/integrations';
import {
  IDENTITY_EMAIL_DELIVERY_CONTRACT,
  IDENTITY_SECURITY_NOTICE_CONTRACT,
  type IdentityEmailDeliveryPayload,
  type IdentitySecurityNoticePayload,
} from '@noma/platform/identity';
import type { ProviderEnvironment, TransactionalEmailProviderPort } from '@noma/platform/providers';
import { OneTimeIdentityTokenIssuer } from '@noma/security';

export function deriveIdentityDeliveryAttemptId(jobId: string, attemptsMade: number): string {
  if (!Number.isSafeInteger(attemptsMade) || attemptsMade < 0) {
    throw new RangeError('attemptsMade must be a non-negative safe integer');
  }
  const deliveryAttempt = attemptsMade + 1;
  const bytes = createHash('sha256').update(`${jobId}|${deliveryAttempt}`, 'utf8').digest().subarray(0, 16);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x50;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function environment(value: string): ProviderEnvironment {
  return value === 'development' ? 'local' : value as ProviderEnvironment;
}

export function createIdentityEmailQueueRegistrations(options: {
  readonly database: DatabaseClient;
  readonly provider: TransactionalEmailProviderPort;
  readonly publicWebOrigin: string;
  readonly applicationEnvironment: string;
  readonly workerIdentity: string;
  readonly now?: () => Date;
}): readonly QueueContractRegistration[] {
  const persistence = createIdentityPersistence(options.database);
  const proofTokens = new OneTimeIdentityTokenIssuer();
  const now = (): Date => new Date((options.now?.() ?? new Date()).getTime());

  const delivery: QueueContractRegistration<IdentityEmailDeliveryPayload> = {
    contract: IDENTITY_EMAIL_DELIVERY_CONTRACT,
    handler: async (job, context) => {
      const acquisition = await beginJobExecution(options.database, {
        job,
        workerIdentity: options.workerIdentity,
        leaseMilliseconds: IDENTITY_EMAIL_DELIVERY_CONTRACT.retry.timeoutMilliseconds + 5_000,
      });
      if (acquisition.disposition === 'already-completed') return;
      if (acquisition.disposition === 'busy') throw new RetryableJobError('JOB_EXECUTION_BUSY', 'The identity delivery lease is currently owned');
      if (acquisition.disposition === 'dead-lettered') throw new PermanentJobError('JOB_ALREADY_DEAD_LETTERED', 'The identity delivery requires owned intervention');

      const candidate = await persistence.readIdentityDeliveryCandidate(job.event.payload.userEmailId, job.event.payload.purpose);
      if (!candidate) {
        await completeJobExecution(options.database, acquisition, async () => undefined);
        return;
      }
      // BullMQ's attempt counter advances only after a definite retry. A lease
      // recovery within the same queue attempt therefore reuses the token id
      // and fails closed instead of generating a second deliverable proof.
      const deliveryAttempt = context.attemptsMade + 1;
      const tokenId = deriveIdentityDeliveryAttemptId(job.jobId, context.attemptsMade);
      const startedAt = now();
      const issuedAt = new Date(job.event.occurredAt);
      const expiresAt = new Date(issuedAt.getTime() + 30 * 60_000);
      if (expiresAt <= startedAt) {
        await completeJobExecution(options.database, acquisition, async () => undefined);
        return;
      }
      const token = proofTokens.issue();
      const issued = await persistence.issueReplacementIdentityToken({
        id: tokenId,
        userEmailId: candidate.email.id,
        purpose: job.event.payload.purpose,
        tokenDigest: token.tokenDigest,
        issuedSecurityVersion: candidate.user.securityVersion,
        issuedAt,
        expiresAt,
      });
      if (issued.disposition === 'ineligible' || issued.disposition === 'superseded') {
        await completeJobExecution(options.database, acquisition, async () => undefined);
        return;
      }
      if (issued.disposition === 'already-issued') {
        const failure = toSafeJobFailure('permanent', 'EMAIL_DELIVERY_ACCEPTANCE_UNKNOWN', 'A prior delivery attempt ended without durable provider evidence');
        await deadLetterJobExecution(options.database, acquisition, failure, IDENTITY_EMAIL_DELIVERY_CONTRACT.deadLetter);
        throw new PermanentJobError(failure.code, failure.message);
      }

      const route = job.event.payload.purpose === 'EMAIL_VERIFICATION' ? '/verify-email' : '/reset-password';
      const result = await options.provider.sendEmail({
        identity: {
          operationId: tokenId,
          idempotencyKey: job.event.payload.operationId,
          correlationId: job.correlationId,
          attempt: deliveryAttempt,
          deadlineAt: new Date(startedAt.getTime() + IDENTITY_EMAIL_DELIVERY_CONTRACT.retry.timeoutMilliseconds).toISOString(),
        },
        environment: environment(options.applicationEnvironment),
        messageIdentity: tokenId,
        templateKey: job.event.payload.purpose === 'EMAIL_VERIFICATION' ? 'noma-email-verification-v1' : 'noma-password-recovery-v1',
        templateVersion: 'version-001',
        recipientReference: `email-${candidate.email.id}`,
        recipientAddress: issued.recipientAddress,
        locale: issued.locale,
        variables: { actionUrl: `${options.publicWebOrigin}${route}?token=${encodeURIComponent(token.rawToken)}`, expiresInMinutes: 30 },
        metadata: { purpose: job.event.payload.purpose, operationReference: job.event.payload.operationId },
      }, context.signal);

      if (result.kind === 'accepted' || result.kind === 'final_success') {
        await completeJobExecution(options.database, acquisition, async () => undefined);
        return;
      }
      if (result.kind === 'uncertain') {
        const failure = toSafeJobFailure('permanent', 'EMAIL_PROVIDER_ACCEPTANCE_UNKNOWN', 'Email provider acceptance is uncertain; user resend is required');
        await deadLetterJobExecution(options.database, acquisition, failure, IDENTITY_EMAIL_DELIVERY_CONTRACT.deadLetter);
        throw new PermanentJobError(failure.code, failure.message);
      }

      await persistence.invalidateIdentityToken(tokenId, now(), 'DELIVERY_NOT_ACCEPTED');
      if (result.kind === 'final_failure' && result.retryable && deliveryAttempt < IDENTITY_EMAIL_DELIVERY_CONTRACT.retry.attempts) {
        const failure = toSafeJobFailure('retryable', 'EMAIL_PROVIDER_RETRYABLE_REJECTION', 'Email provider definitively rejected the delivery attempt');
        await recordRetryableJobFailure(options.database, acquisition, failure);
        throw new RetryableJobError(failure.code, failure.message);
      }
      const failure = toSafeJobFailure('permanent', 'EMAIL_PROVIDER_REJECTED', 'Email provider rejected the delivery request');
      await deadLetterJobExecution(options.database, acquisition, failure, IDENTITY_EMAIL_DELIVERY_CONTRACT.deadLetter);
      throw new PermanentJobError(failure.code, failure.message);
    },
  };

  const notice: QueueContractRegistration<IdentitySecurityNoticePayload> = {
    contract: IDENTITY_SECURITY_NOTICE_CONTRACT,
    handler: async (job, context) => {
      const acquisition = await beginJobExecution(options.database, { job, workerIdentity: options.workerIdentity, leaseMilliseconds: 20_000 });
      if (acquisition.disposition === 'already-completed') return;
      if (acquisition.disposition === 'busy') throw new RetryableJobError('JOB_EXECUTION_BUSY', 'The security notice lease is currently owned');
      if (acquisition.disposition === 'dead-lettered') throw new PermanentJobError('JOB_ALREADY_DEAD_LETTERED', 'The security notice requires owned intervention');
      if (acquisition.attemptNumber > 1) {
        const failure = toSafeJobFailure('permanent', 'SECURITY_NOTICE_ACCEPTANCE_UNKNOWN', 'A prior security-notice attempt ended without durable provider evidence');
        await deadLetterJobExecution(options.database, acquisition, failure, IDENTITY_SECURITY_NOTICE_CONTRACT.deadLetter);
        throw new PermanentJobError(failure.code, failure.message);
      }
      const contact = await persistence.readIdentityEmailContact(job.event.payload.userEmailId);
      if (!contact) {
        await completeJobExecution(options.database, acquisition, async () => undefined);
        return;
      }
      const startedAt = now();
      const result = await options.provider.sendEmail({
        identity: { operationId: job.event.payload.operationId, idempotencyKey: job.jobId, correlationId: job.correlationId, attempt: 1, deadlineAt: new Date(startedAt.getTime() + 15_000).toISOString() },
        environment: environment(options.applicationEnvironment),
        messageIdentity: job.event.payload.operationId,
        templateKey: job.event.payload.eventCode === 'EMAIL_VERIFIED' ? 'noma-email-verified-v1' : 'noma-password-recovered-v1',
        templateVersion: 'version-001',
        recipientReference: `email-${contact.email.id}`,
        recipientAddress: contact.email.displayEmail,
        locale: contact.user.locale,
        variables: { eventCode: job.event.payload.eventCode },
        metadata: { category: 'identity-security-notice', operationReference: job.event.payload.operationId },
      }, context.signal);
      if (result.kind === 'accepted' || result.kind === 'final_success') {
        await completeJobExecution(options.database, acquisition, async () => undefined);
        return;
      }
      const failure = toSafeJobFailure('permanent', result.kind === 'uncertain' ? 'SECURITY_NOTICE_ACCEPTANCE_UNKNOWN' : 'SECURITY_NOTICE_REJECTED', 'Security notice delivery requires owned review');
      await deadLetterJobExecution(options.database, acquisition, failure, IDENTITY_SECURITY_NOTICE_CONTRACT.deadLetter);
      throw new PermanentJobError(failure.code, failure.message);
    },
  };

  return Object.freeze([
    delivery as unknown as QueueContractRegistration,
    notice as unknown as QueueContractRegistration,
  ]);
}
