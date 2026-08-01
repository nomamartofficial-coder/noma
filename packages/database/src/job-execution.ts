import { randomUUID } from 'node:crypto';

import type {
  AttentionOwner,
  QueueDeadLetterPolicy,
  QueueJobEnvelopeV1,
  SafeJobFailure,
} from '@noma/contracts';

import { Prisma, type PrismaClient } from './generated/prisma/client.js';
import { markOutboxProcessed } from './outbox.js';
import { runInDatabaseTransaction, type DatabaseTransactionClient } from './transaction.js';

export interface JobExecutionLease {
  readonly disposition: 'execute';
  readonly executionId: string;
  readonly outboxEventId: string;
  readonly queueName: string;
  readonly jobId: string;
  readonly attemptNumber: number;
  readonly workerIdentity: string;
}

export type BeginJobExecutionResult =
  | JobExecutionLease
  | { readonly disposition: 'already-completed' }
  | { readonly disposition: 'busy' }
  | { readonly disposition: 'dead-lettered' };

interface JobExecutionLockRow {
  readonly id: string;
  readonly outbox_event_id: string | null;
  readonly status: 'PROCESSING' | 'RETRYABLE_FAILURE' | 'COMPLETED' | 'DEAD_LETTERED';
  readonly attempt_count: number;
  readonly lease_owner: string | null;
  readonly lease_expires_at: Date | null;
}

function safeWorkerIdentity(value: string): string {
  const normalized = value.trim();
  if (!/^[a-z][a-z0-9_-]{1,159}$/i.test(normalized)) {
    throw new Error('workerIdentity must be 2 to 160 safe identity characters');
  }
  return normalized;
}

function ownerValue(owner: AttentionOwner): 'OPERATIONS' | 'FINANCE' | 'SECURITY' {
  return owner.toUpperCase() as 'OPERATIONS' | 'FINANCE' | 'SECURITY';
}

export async function beginJobExecution(
  client: PrismaClient,
  input: {
    readonly job: QueueJobEnvelopeV1;
    readonly workerIdentity: string;
    readonly leaseMilliseconds?: number;
    readonly now?: Date;
  },
): Promise<BeginJobExecutionResult> {
  const workerIdentity = safeWorkerIdentity(input.workerIdentity);
  const leaseMilliseconds = input.leaseMilliseconds ?? 30_000;
  if (!Number.isSafeInteger(leaseMilliseconds) || leaseMilliseconds < 1_000 || leaseMilliseconds > 600_000) {
    throw new RangeError('leaseMilliseconds must be an integer from 1000 to 600000');
  }
  const now = input.now ?? new Date();
  const leaseExpiresAt = new Date(now.getTime() + leaseMilliseconds);

  return client.$transaction(async (transaction) => {
    await transaction.$executeRaw(
      Prisma.sql`
        INSERT INTO "job_executions" (
          "id", "outbox_event_id", "queue_name", "job_id", "job_name", "job_version",
          "aggregate_version", "status", "attempt_count", "service_principal",
          "correlation_id", "created_at", "updated_at"
        ) VALUES (
          ${randomUUID()}::uuid, ${input.job.event.eventId}::uuid, ${input.job.queueName},
          ${input.job.jobId}, ${input.job.jobName}, ${input.job.jobVersion},
          ${BigInt(input.job.event.aggregate.version)}, 'RETRYABLE_FAILURE'::"job_execution_status", 0,
          ${input.job.servicePrincipal}, ${input.job.correlationId}, ${now}, ${now}
        )
        ON CONFLICT ("queue_name", "job_id") DO NOTHING
      `,
    );

    const rows = await transaction.$queryRaw<JobExecutionLockRow[]>(
      Prisma.sql`
        SELECT "id", "outbox_event_id", "status", "attempt_count", "lease_owner", "lease_expires_at"
        FROM "job_executions"
        WHERE "queue_name" = ${input.job.queueName} AND "job_id" = ${input.job.jobId}
        FOR UPDATE
      `,
    );
    const execution = rows[0];
    if (!execution || !execution.outbox_event_id) throw new Error('job execution identity could not be acquired');
    if (execution.status === 'COMPLETED') return Object.freeze({ disposition: 'already-completed' as const });
    if (execution.status === 'DEAD_LETTERED') return Object.freeze({ disposition: 'dead-lettered' as const });
    if (
      execution.status === 'PROCESSING'
      && execution.lease_expires_at
      && execution.lease_expires_at > now
      && execution.lease_owner !== workerIdentity
    ) {
      return Object.freeze({ disposition: 'busy' as const });
    }

    const attemptNumber = execution.attempt_count + 1;
    await transaction.jobExecution.update({
      where: { id: execution.id },
      data: {
        status: 'PROCESSING',
        attemptCount: attemptNumber,
        leaseOwner: workerIdentity,
        leaseExpiresAt,
        startedAt: now,
        lastFailureCode: null,
        lastFailureMessage: null,
      },
    });
    await transaction.jobExecutionAttempt.create({
      data: {
        jobExecutionId: execution.id,
        attemptNumber,
        status: 'STARTED',
        workerIdentity,
        startedAt: now,
      },
    });

    return Object.freeze({
      disposition: 'execute' as const,
      executionId: execution.id,
      outboxEventId: execution.outbox_event_id,
      queueName: input.job.queueName,
      jobId: input.job.jobId,
      attemptNumber,
      workerIdentity,
    });
  });
}

export async function completeJobExecution<T>(
  client: PrismaClient,
  lease: JobExecutionLease,
  operation: (transaction: DatabaseTransactionClient) => Promise<T>,
  now = new Date(),
): Promise<T> {
  return runInDatabaseTransaction(client, async (transaction) => {
    const result = await operation(transaction);
    const updated = await transaction.jobExecution.updateMany({
      where: {
        id: lease.executionId,
        status: 'PROCESSING',
        leaseOwner: lease.workerIdentity,
        attemptCount: lease.attemptNumber,
      },
      data: {
        status: 'COMPLETED',
        completedAt: now,
        leaseOwner: null,
        leaseExpiresAt: null,
        attentionOwner: null,
        attentionStatus: null,
        attentionDeadlineAt: null,
        recoveryAction: null,
        lastFailureCode: null,
        lastFailureMessage: null,
      },
    });
    if (updated.count !== 1) throw new Error('job execution lease was lost before completion');
    await transaction.jobExecutionAttempt.update({
      where: {
        jobExecutionId_attemptNumber: {
          jobExecutionId: lease.executionId,
          attemptNumber: lease.attemptNumber,
        },
      },
      data: { status: 'COMPLETED', finishedAt: now },
    });
    await markOutboxProcessed(transaction, lease.outboxEventId, now);
    return result;
  });
}

export async function recordRetryableJobFailure(
  client: PrismaClient,
  lease: JobExecutionLease,
  failure: SafeJobFailure,
  now = new Date(),
): Promise<void> {
  await client.$transaction(async (transaction) => {
    await transaction.jobExecution.updateMany({
      where: { id: lease.executionId, status: 'PROCESSING', leaseOwner: lease.workerIdentity },
      data: {
        status: 'RETRYABLE_FAILURE',
        leaseOwner: null,
        leaseExpiresAt: null,
        lastFailureCode: failure.code,
        lastFailureMessage: failure.message,
      },
    });
    await transaction.jobExecutionAttempt.updateMany({
      where: {
        jobExecutionId: lease.executionId,
        attemptNumber: lease.attemptNumber,
        status: 'STARTED',
      },
      data: {
        status: 'RETRYABLE_FAILURE',
        finishedAt: now,
        failureCode: failure.code,
        failureMessage: failure.message,
      },
    });
  });
}

export async function deadLetterJobExecution(
  client: PrismaClient,
  lease: JobExecutionLease,
  failure: SafeJobFailure,
  policy: QueueDeadLetterPolicy,
  now = new Date(),
): Promise<void> {
  const deadline = new Date(now.getTime() + policy.attentionAfterMilliseconds);
  await client.$transaction(async (transaction) => {
    await transaction.jobExecution.updateMany({
      where: { id: lease.executionId, status: 'PROCESSING', leaseOwner: lease.workerIdentity },
      data: {
        status: 'DEAD_LETTERED',
        deadLetteredAt: now,
        leaseOwner: null,
        leaseExpiresAt: null,
        attentionOwner: ownerValue(policy.owner),
        attentionStatus: 'OPEN',
        attentionDeadlineAt: deadline,
        recoveryAction: 'REVIEW_AND_REPLAY',
        lastFailureCode: failure.code,
        lastFailureMessage: failure.message,
      },
    });
    await transaction.jobExecutionAttempt.updateMany({
      where: {
        jobExecutionId: lease.executionId,
        attemptNumber: lease.attemptNumber,
        status: 'STARTED',
      },
      data: {
        status: 'PERMANENT_FAILURE',
        finishedAt: now,
        failureCode: failure.code,
        failureMessage: failure.message,
      },
    });
    await transaction.outboxEvent.updateMany({
      where: { id: lease.outboxEventId, processedAt: null },
      data: {
        status: 'DEAD_LETTERED',
        deadLetteredAt: now,
        attentionOwner: ownerValue(policy.owner),
        attentionStatus: 'OPEN',
        attentionDeadlineAt: deadline,
        recoveryAction: 'REVIEW_AND_REPLAY',
        leaseOwner: null,
        leaseExpiresAt: null,
        lastFailureCode: failure.code,
        lastFailureMessage: failure.message,
      },
    });
  });
}

export async function listDeadJobExecutions(
  client: PrismaClient,
  options: { readonly owner?: AttentionOwner; readonly limit?: number } = {},
) {
  const limit = options.limit ?? 50;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 200) {
    throw new RangeError('limit must be an integer from 1 to 200');
  }
  return client.jobExecution.findMany({
    where: {
      status: 'DEAD_LETTERED',
      attentionStatus: { in: ['OPEN', 'ACKNOWLEDGED'] },
      ...(options.owner ? { attentionOwner: ownerValue(options.owner) } : {}),
    },
    orderBy: [{ attentionDeadlineAt: 'asc' }, { createdAt: 'asc' }],
    take: limit,
    select: {
      id: true,
      queueName: true,
      jobId: true,
      jobName: true,
      attemptCount: true,
      attentionOwner: true,
      attentionStatus: true,
      attentionDeadlineAt: true,
      recoveryAction: true,
      lastFailureCode: true,
      correlationId: true,
      deadLetteredAt: true,
    },
  });
}
