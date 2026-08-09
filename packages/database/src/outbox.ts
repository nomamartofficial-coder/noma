import { randomUUID } from 'node:crypto';

import {
  createQueueJobEnvelope,
  parseOutboxEventEnvelope,
  type AttentionOwner,
  type OutboxEventEnvelopeV1,
  type QueueJobContract,
  type SafeJobFailure,
} from '@noma/contracts';

import { Prisma, type PrismaClient } from './generated/prisma/client.js';
import type { DatabaseTransactionClient } from './transaction.js';

export interface CreateOutboxEventInput<TPayload> {
  readonly event: OutboxEventEnvelopeV1<TPayload>;
  readonly contract: QueueJobContract<TPayload>;
}

export interface ClaimedOutboxEvent {
  readonly id: string;
  readonly queueName: string;
  readonly jobName: string;
  readonly jobVersion: number;
  readonly dispatchAttempts: number;
  readonly event: OutboxEventEnvelopeV1;
}

export interface ClaimOutboxEventsOptions {
  readonly leaseOwner: string;
  readonly batchSize?: number;
  readonly leaseMilliseconds?: number;
  readonly recoveryAfterMilliseconds?: number;
  readonly now?: Date;
}

export interface OutboxMetricsSnapshot {
  readonly pending: number;
  readonly dispatched: number;
  readonly deadLettered: number;
  readonly oldestUnpublishedAgeSeconds: number;
  readonly deadLetteredByOwner: Readonly<Record<AttentionOwner, number>>;
}

interface ClaimedOutboxRow {
  readonly id: string;
  readonly event_type: string;
  readonly event_version: number;
  readonly queue_name: string;
  readonly job_name: string;
  readonly job_version: number;
  readonly aggregate_type: string;
  readonly aggregate_id: string;
  readonly aggregate_version: bigint;
  readonly institution_id: string | null;
  readonly scope_type: string | null;
  readonly scope_id: string | null;
  readonly payload: Prisma.JsonValue;
  readonly privacy_classification: string;
  readonly service_principal: string;
  readonly correlation_id: string;
  readonly occurred_at: Date;
  readonly available_at: Date;
  readonly dispatch_attempts: number;
}

function integerInRange(name: string, value: number, minimum: number, maximum: number): number {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${name} must be an integer from ${minimum} to ${maximum}`);
  }
  return value;
}

function safeIdentity(name: string, value: string): string {
  const normalized = value.trim();
  if (!/^[a-z][a-z0-9_-]{1,159}$/i.test(normalized)) {
    throw new Error(`${name} must be 2 to 160 safe identity characters`);
  }
  return normalized;
}

function attentionOwner(owner: AttentionOwner): 'OPERATIONS' | 'FINANCE' | 'SECURITY' {
  return owner.toUpperCase() as 'OPERATIONS' | 'FINANCE' | 'SECURITY';
}

const OUTBOX_PAYLOAD_MARKER = '__noma_outbox_envelope_v1';

function persistedPayload(event: OutboxEventEnvelopeV1): Prisma.InputJsonValue {
  if (!event.telemetry) return event.payload as Prisma.InputJsonValue;
  return {
    [OUTBOX_PAYLOAD_MARKER]: 1,
    data: event.payload as Prisma.InputJsonValue,
    telemetry: event.telemetry as Prisma.InputJsonValue,
  };
}

function restoredPayload(value: Prisma.JsonValue): {
  readonly payload: Prisma.JsonValue;
  readonly telemetry?: OutboxEventEnvelopeV1['telemetry'];
} {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return { payload: value };
  const record = value as Prisma.JsonObject;
  if (record[OUTBOX_PAYLOAD_MARKER] !== 1 || !Object.prototype.hasOwnProperty.call(record, 'data')) {
    return { payload: value };
  }
  return {
    payload: record.data as Prisma.JsonValue,
    ...(record.telemetry ? { telemetry: record.telemetry as OutboxEventEnvelopeV1['telemetry'] } : {}),
  };
}

export async function createOutboxEvent<TPayload>(
  transaction: DatabaseTransactionClient,
  input: CreateOutboxEventInput<TPayload>,
): Promise<OutboxEventEnvelopeV1<TPayload>> {
  const envelope = createQueueJobEnvelope(input.contract, input.event);
  const event = envelope.event;

  await transaction.outboxEvent.create({
    data: {
      id: event.eventId,
      eventType: event.eventType,
      eventVersion: event.eventVersion,
      queueName: envelope.queueName,
      jobName: envelope.jobName,
      jobVersion: envelope.jobVersion,
      aggregateType: event.aggregate.type,
      aggregateId: event.aggregate.id,
      aggregateVersion: BigInt(event.aggregate.version),
      ...(event.institutionId ? { institutionId: event.institutionId } : {}),
      ...(event.scope ? { scopeType: event.scope.type, scopeId: event.scope.id } : {}),
      payload: persistedPayload(event),
      privacyClassification: event.privacyClassification,
      servicePrincipal: event.servicePrincipal,
      correlationId: event.correlationId,
      occurredAt: new Date(event.occurredAt),
      availableAt: new Date(event.availableAt),
    },
  });
  return event;
}

export function createOutboxEventEnvelope<TPayload>(input: {
  readonly eventType: string;
  readonly eventVersion: number;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly aggregateVersion: bigint | number | string;
  readonly institutionId?: string;
  readonly scope?: { readonly type: string; readonly id: string };
  readonly payload: TPayload;
  readonly privacyClassification: OutboxEventEnvelopeV1['privacyClassification'];
  readonly servicePrincipal: string;
  readonly correlationId: string;
  readonly telemetry?: OutboxEventEnvelopeV1['telemetry'];
  readonly occurredAt?: Date;
  readonly availableAt?: Date;
  readonly eventId?: string;
}): OutboxEventEnvelopeV1<TPayload> {
  const occurredAt = input.occurredAt ?? new Date();
  const value = {
    schemaVersion: 1 as const,
    eventId: input.eventId ?? randomUUID(),
    eventType: input.eventType,
    eventVersion: input.eventVersion,
    aggregate: {
      type: input.aggregateType,
      id: input.aggregateId,
      version: String(input.aggregateVersion),
    },
    ...(input.institutionId ? { institutionId: input.institutionId } : {}),
    ...(input.scope ? { scope: input.scope } : {}),
    payload: input.payload,
    privacyClassification: input.privacyClassification,
    servicePrincipal: input.servicePrincipal,
    correlationId: input.correlationId,
    ...(input.telemetry ? { telemetry: input.telemetry } : {}),
    occurredAt: occurredAt.toISOString(),
    availableAt: (input.availableAt ?? occurredAt).toISOString(),
  };
  return parseOutboxEventEnvelope(value) as OutboxEventEnvelopeV1<TPayload>;
}

export async function claimOutboxEvents(
  client: PrismaClient,
  options: ClaimOutboxEventsOptions,
): Promise<readonly ClaimedOutboxEvent[]> {
  const batchSize = integerInRange('batchSize', options.batchSize ?? 50, 1, 200);
  const leaseMilliseconds = integerInRange(
    'leaseMilliseconds',
    options.leaseMilliseconds ?? 30_000,
    1_000,
    300_000,
  );
  const recoveryAfterMilliseconds = integerInRange(
    'recoveryAfterMilliseconds',
    options.recoveryAfterMilliseconds ?? 30_000,
    1_000,
    3_600_000,
  );
  const leaseOwner = safeIdentity('leaseOwner', options.leaseOwner);
  const now = options.now ?? new Date();
  const leaseExpiresAt = new Date(now.getTime() + leaseMilliseconds);
  const recoveryBefore = new Date(now.getTime() - recoveryAfterMilliseconds);

  const rows = await client.$transaction((transaction) => transaction.$queryRaw<ClaimedOutboxRow[]>(
    Prisma.sql`
      WITH candidates AS (
        SELECT "id"
        FROM "outbox_events"
        WHERE "dead_lettered_at" IS NULL
          AND "processed_at" IS NULL
          AND ("lease_expires_at" IS NULL OR "lease_expires_at" <= ${now})
          AND (
            ("status" = 'PENDING'::"outbox_status" AND "available_at" <= ${now})
            OR
            ("status" = 'DISPATCHED'::"outbox_status" AND "dispatched_at" <= ${recoveryBefore})
          )
        ORDER BY
          CASE WHEN "status" = 'PENDING'::"outbox_status" THEN 0 ELSE 1 END,
          "available_at",
          "created_at",
          "id"
        FOR UPDATE SKIP LOCKED
        LIMIT ${batchSize}
      )
      UPDATE "outbox_events" AS event
      SET "lease_owner" = ${leaseOwner},
          "lease_expires_at" = ${leaseExpiresAt},
          "updated_at" = ${now}
      FROM candidates
      WHERE event."id" = candidates."id"
      RETURNING event."id", event."event_type", event."event_version", event."queue_name",
        event."job_name", event."job_version", event."aggregate_type", event."aggregate_id",
        event."aggregate_version", event."institution_id", event."scope_type", event."scope_id",
        event."payload", event."privacy_classification", event."service_principal",
        event."correlation_id", event."occurred_at", event."available_at", event."dispatch_attempts"
    `,
  ));

  return rows.map((row) => {
    const restored = restoredPayload(row.payload);
    return Object.freeze({
      id: row.id,
      queueName: row.queue_name,
      jobName: row.job_name,
      jobVersion: row.job_version,
      dispatchAttempts: row.dispatch_attempts,
      event: parseOutboxEventEnvelope({
      schemaVersion: 1,
      eventId: row.id,
      eventType: row.event_type,
      eventVersion: row.event_version,
      aggregate: {
        type: row.aggregate_type,
        id: row.aggregate_id,
        version: row.aggregate_version.toString(),
      },
      ...(row.institution_id ? { institutionId: row.institution_id } : {}),
      ...(row.scope_type && row.scope_id ? { scope: { type: row.scope_type, id: row.scope_id } } : {}),
      payload: restored.payload,
      privacyClassification: row.privacy_classification,
      servicePrincipal: row.service_principal,
      correlationId: row.correlation_id,
      ...(restored.telemetry ? { telemetry: restored.telemetry } : {}),
      occurredAt: row.occurred_at.toISOString(),
      availableAt: row.available_at.toISOString(),
      }),
    });
  });
}

export async function markOutboxDispatched(
  client: PrismaClient,
  input: { readonly eventId: string; readonly leaseOwner: string; readonly now?: Date },
): Promise<boolean> {
  const result = await client.outboxEvent.updateMany({
    where: {
      id: input.eventId,
      leaseOwner: safeIdentity('leaseOwner', input.leaseOwner),
      status: { in: ['PENDING', 'DISPATCHED'] },
      processedAt: null,
      deadLetteredAt: null,
    },
    data: {
      status: 'DISPATCHED',
      dispatchedAt: input.now ?? new Date(),
      dispatchAttempts: { increment: 1 },
      leaseOwner: null,
      leaseExpiresAt: null,
      lastFailureCode: null,
      lastFailureMessage: null,
    },
  });
  return result.count === 1;
}

export async function releaseOutboxForRetry(
  client: PrismaClient,
  input: {
    readonly eventId: string;
    readonly leaseOwner: string;
    readonly retryAt: Date;
    readonly failure: SafeJobFailure;
  },
): Promise<boolean> {
  const result = await client.outboxEvent.updateMany({
    where: {
      id: input.eventId,
      leaseOwner: safeIdentity('leaseOwner', input.leaseOwner),
      processedAt: null,
      deadLetteredAt: null,
    },
    data: {
      status: 'PENDING',
      availableAt: input.retryAt,
      dispatchAttempts: { increment: 1 },
      leaseOwner: null,
      leaseExpiresAt: null,
      lastFailureCode: input.failure.code,
      lastFailureMessage: input.failure.message,
    },
  });
  return result.count === 1;
}

export async function deadLetterOutboxEvent(
  client: PrismaClient,
  input: {
    readonly eventId: string;
    readonly leaseOwner?: string;
    readonly failure: SafeJobFailure;
    readonly owner: AttentionOwner;
    readonly attentionDeadlineAt: Date;
    readonly now?: Date;
  },
): Promise<boolean> {
  const result = await client.outboxEvent.updateMany({
    where: {
      id: input.eventId,
      ...(input.leaseOwner ? { leaseOwner: safeIdentity('leaseOwner', input.leaseOwner) } : {}),
      processedAt: null,
      deadLetteredAt: null,
    },
    data: {
      status: 'DEAD_LETTERED',
      deadLetteredAt: input.now ?? new Date(),
      attentionOwner: attentionOwner(input.owner),
      attentionStatus: 'OPEN',
      attentionDeadlineAt: input.attentionDeadlineAt,
      recoveryAction: 'REVIEW_AND_REPLAY',
      leaseOwner: null,
      leaseExpiresAt: null,
      lastFailureCode: input.failure.code,
      lastFailureMessage: input.failure.message,
    },
  });
  return result.count === 1;
}

export async function markOutboxProcessed(
  transaction: DatabaseTransactionClient,
  eventId: string,
  now = new Date(),
): Promise<void> {
  await transaction.outboxEvent.updateMany({
    where: { id: eventId, status: { in: ['PENDING', 'DISPATCHED'] }, deadLetteredAt: null },
    data: {
      status: 'PROCESSED',
      processedAt: now,
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
}

export async function readOutboxMetrics(
  client: PrismaClient,
  now = new Date(),
): Promise<OutboxMetricsSnapshot> {
  const [pending, dispatched, deadLettered, oldest, deadLetterGroups] = await Promise.all([
    client.outboxEvent.count({ where: { status: 'PENDING' } }),
    client.outboxEvent.count({ where: { status: 'DISPATCHED' } }),
    client.outboxEvent.count({ where: { status: 'DEAD_LETTERED' } }),
    client.outboxEvent.findFirst({
      where: { status: { in: ['PENDING', 'DISPATCHED'] }, processedAt: null, deadLetteredAt: null },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    }),
    client.jobExecution.groupBy({
      by: ['attentionOwner'],
      where: { status: 'DEAD_LETTERED', attentionStatus: { in: ['OPEN', 'ACKNOWLEDGED'] } },
      _count: { _all: true },
    }),
  ]);
  const deadLetteredByOwner: Record<AttentionOwner, number> = {
    operations: 0,
    finance: 0,
    security: 0,
  };
  for (const group of deadLetterGroups) {
    if (group.attentionOwner) {
      deadLetteredByOwner[group.attentionOwner.toLowerCase() as AttentionOwner] = group._count._all;
    }
  }
  return Object.freeze({
    pending,
    dispatched,
    deadLettered,
    oldestUnpublishedAgeSeconds: oldest
      ? Math.max(0, (now.getTime() - oldest.createdAt.getTime()) / 1_000)
      : 0,
    deadLetteredByOwner: Object.freeze(deadLetteredByOwner),
  });
}
