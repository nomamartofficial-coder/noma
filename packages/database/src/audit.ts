import { auditEventRegistry, isPreparedAuditEvent, type PreparedAuditEvent } from '@noma/platform/audit';
import { Prisma } from './generated/prisma/client.js';
import type { DatabaseTransactionClient } from './transaction.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RESOURCE_TYPE = /^[A-Z][A-Z0-9_]{0,79}$/;
const REFERENCE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;
const MAX_TIME_WINDOW_MS = 31 * 24 * 60 * 60_000;

function auditReference(name: string, value: string, pattern = REFERENCE): string {
  if (typeof value !== 'string' || value !== value.trim() || !pattern.test(value)) throw new Error(`Invalid ${name}`);
  return value;
}

function validateTimelineInput(input: ReadAuditTimelineInput): void {
  if (!Number.isSafeInteger(input.pageSize) || input.pageSize < 1 || input.pageSize > 100) throw new Error('Invalid audit page size');
  if (input.scope.kind === 'INSTITUTION') auditReference('audit institution', input.scope.institutionId, UUID);
  else auditReference('audit scope', input.scope.scopeId, UUID);
  const filter = input.filter;
  if (filter.category === 'RESOURCE') {
    auditReference('audit resource type', filter.resourceType, RESOURCE_TYPE);
    auditReference('audit resource id', filter.resourceId);
  } else if (filter.category === 'ACTOR') auditReference('audit actor', filter.actorUserId, UUID);
  else if (filter.category === 'INSTITUTION') auditReference('audit institution filter', filter.institutionId, UUID);
  else if (filter.category === 'ACTION') {
    if (!auditEventRegistry.resolve(filter.actionCode)) throw new Error('Invalid audit action filter');
  } else if (filter.category === 'CORRELATION') auditReference('audit correlation', filter.correlationId);
  else if (!(filter.recordedFrom instanceof Date) || !(filter.recordedUntil instanceof Date)
    || !Number.isFinite(filter.recordedFrom.getTime()) || !Number.isFinite(filter.recordedUntil.getTime())
    || filter.recordedFrom >= filter.recordedUntil
    || filter.recordedUntil.getTime() - filter.recordedFrom.getTime() > MAX_TIME_WINDOW_MS) {
    throw new Error('Invalid audit time filter');
  }
  if (input.cursor && (input.cursor.recordedSequence < 1n || !UUID.test(input.cursor.id))) throw new Error('Invalid audit cursor');
}

export async function appendAuditEvent(
  transaction: DatabaseTransactionClient,
  event: PreparedAuditEvent,
): Promise<Readonly<{ id: string; recordedSequence: bigint }>> {
  if (!isPreparedAuditEvent(event)) throw new Error('Audit event was not prepared by the closed registry');
  const actor = event.actor;
  const authority = event.authority;
  const row = await transaction.auditEvent.create({
    data: {
      id: event.eventId,
      actionCode: event.actionCode,
      contractVersion: event.contractVersion,
      sourceModule: event.sourceModule,
      occurredAt: event.occurredAt,
      actorKind: actor.kind,
      actorUserId: actor.kind === 'HUMAN' ? actor.userId : null,
      actorServicePrincipalId: actor.kind === 'SERVICE_PRINCIPAL' ? actor.servicePrincipalId : null,
      systemActorCode: actor.kind === 'SYSTEM' ? actor.systemActorCode : null,
      sessionId: actor.kind === 'HUMAN' ? actor.sessionId ?? null : null,
      authorityRoleAssignmentId: authority?.roleAssignmentId ?? null,
      authorityRoleTemplateCode: authority?.roleTemplateCode ?? null,
      authorityRoleTemplateVersion: authority?.roleTemplateVersion ?? null,
      authorityCapabilityCode: authority?.capabilityCode ?? null,
      authorityPolicyId: authority?.policyId ?? null,
      authorityScopeType: authority?.scopeType ?? null,
      authorityScopeId: authority?.scopeId ?? null,
      institutionId: event.resource.institutionId ?? authority?.institutionId ?? null,
      assurance: authority?.assurance ?? null,
      approvalRequestId: authority?.approvalRequestId ?? null,
      resourceType: event.resource.type,
      resourceId: event.resource.id,
      reasonCode: event.reasonCode ?? null,
      reasonText: event.reasonText ?? null,
      outcome: event.outcome,
      failureCode: event.failureCode ?? null,
      requestId: event.requestId ?? null,
      correlationId: event.correlationId,
      operationId: event.operationId,
      sourceVersion: event.sourceVersion === undefined ? null : BigInt(event.sourceVersion),
      correctsAuditEventId: event.correctsAuditEventId ?? null,
      ...(event.beforeSummary === undefined ? {} : {
        beforeSummary: event.beforeSummary as Prisma.InputJsonObject,
      }),
      ...(event.afterSummary === undefined ? {} : {
        afterSummary: event.afterSummary as Prisma.InputJsonObject,
      }),
      ...(event.links.length === 0 ? {} : { links: {
        create: event.links.map((link) => ({
          targetType: link.targetType,
          targetId: link.targetId,
          relationshipType: link.relationshipType,
        })),
      } }),
    },
    select: { id: true, recordedSequence: true },
  });
  return Object.freeze(row);
}

export const AUDIT_TIMELINE_ROW_SELECT = Object.freeze({
  id: true,
  recordedSequence: true,
  actionCode: true,
  occurredAt: true,
  actorKind: true,
  actorUserId: true,
  actorServicePrincipalId: true,
  systemActorCode: true,
  resourceType: true,
  resourceId: true,
  outcome: true,
  reasonCode: true,
  correlationId: true,
  beforeSummary: true,
  afterSummary: true,
  correctsAuditEventId: true,
} satisfies Prisma.AuditEventSelect);

export type AuditTimelineRowSource = Readonly<{
  id: string;
  recordedSequence: bigint;
  actionCode: string;
  occurredAt: Date;
  actorKind: 'HUMAN' | 'SERVICE_PRINCIPAL' | 'SYSTEM';
  actorUserId: string | null;
  actorServicePrincipalId: string | null;
  systemActorCode: string | null;
  resourceType: string;
  resourceId: string;
  outcome: 'SUCCEEDED' | 'DENIED' | 'FAILED';
  reasonCode: string | null;
  correlationId: string;
  beforeSummary: Prisma.JsonValue | null;
  afterSummary: Prisma.JsonValue | null;
  correctsAuditEventId: string | null;
}>;

export type AuditTimelineScope =
  | Readonly<{ kind: 'INSTITUTION'; institutionId: string }>
  | Readonly<{ kind: 'EXACT_SCOPE'; scopeId: string }>;

export type AuditTimelineFilter =
  | Readonly<{ category: 'RESOURCE'; resourceType: string; resourceId: string }>
  | Readonly<{ category: 'ACTOR'; actorUserId: string }>
  | Readonly<{ category: 'INSTITUTION'; institutionId: string }>
  | Readonly<{ category: 'ACTION'; actionCode: string }>
  | Readonly<{ category: 'CORRELATION'; correlationId: string }>
  | Readonly<{ category: 'TIME'; recordedFrom: Date; recordedUntil: Date }>;

export interface ReadAuditTimelineInput {
  readonly scope: AuditTimelineScope;
  readonly filter: AuditTimelineFilter;
  readonly pageSize: number;
  readonly cursor?: Readonly<{ recordedSequence: bigint; id: string }>;
}

export async function readAuditTimelineSources(
  transaction: DatabaseTransactionClient,
  input: ReadAuditTimelineInput,
): Promise<readonly AuditTimelineRowSource[]> {
  validateTimelineInput(input);
  const scopeWhere: Prisma.AuditEventWhereInput = input.scope.kind === 'INSTITUTION'
    ? { institutionId: input.scope.institutionId }
    : { authorityScopeId: input.scope.scopeId };
  const filterWhere: Prisma.AuditEventWhereInput = input.filter.category === 'RESOURCE'
    ? { resourceType: input.filter.resourceType, resourceId: input.filter.resourceId }
    : input.filter.category === 'ACTOR'
      ? { actorUserId: input.filter.actorUserId }
      : input.filter.category === 'INSTITUTION'
        ? { institutionId: input.filter.institutionId }
        : input.filter.category === 'ACTION'
          ? { actionCode: input.filter.actionCode }
          : input.filter.category === 'CORRELATION'
            ? { correlationId: input.filter.correlationId }
            : { recordedAt: { gte: input.filter.recordedFrom, lt: input.filter.recordedUntil } };
  const cursorWhere: Prisma.AuditEventWhereInput | undefined = input.cursor ? {
    OR: [
      { recordedSequence: { lt: input.cursor.recordedSequence } },
      { recordedSequence: input.cursor.recordedSequence, id: { lt: input.cursor.id } },
    ],
  } : undefined;
  return transaction.auditEvent.findMany({
    where: { AND: [scopeWhere, filterWhere, ...(cursorWhere ? [cursorWhere] : [])] },
    orderBy: [{ recordedSequence: 'desc' }, { id: 'desc' }],
    take: input.pageSize,
    select: AUDIT_TIMELINE_ROW_SELECT,
  });
}
