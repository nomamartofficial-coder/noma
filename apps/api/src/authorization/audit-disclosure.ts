import {
  appendAuditEvent,
  readAuditTimelineSources,
  type AuditTimelineFilter,
  type AuditTimelineRowSource,
  type AuditTimelineScope,
  type DatabaseClient,
  type DatabaseTransactionClient,
} from '@noma/database';
import { formatAuditSummary, prepareAuditEvent, safeAuditReasonCode, type PreparedAuditEvent } from '@noma/platform/audit';
import type { ActiveAuthorityFact } from '@noma/platform/access';
import type { TrustedAuthorizationContext } from '@noma/platform/access';
import {
  createDisclosureProjectionRegistry,
  defineDisclosureProjection,
  projectDisclosure,
} from '@noma/platform/privacy';
import { AuthorizationService, ProtectedDisclosureUnavailableError } from './authorization.service.js';

export const AUDIT_TIMELINE_POLICY_ID = 'audit.event.read.v1';
export const AUDIT_TIMELINE_PROJECTION_ID = 'audit.timeline.row.v1';

export const auditTimelineRowProjection = defineDisclosureProjection<AuditTimelineRowSource, {
  eventId: string;
  sequence: string;
  occurredAt: string;
  action: string;
  actorType: string;
  actorReference: string;
  targetType: string;
  targetReference: string;
  outcome: string;
  reasonCode: string | null;
  correlationReference: string;
  beforeSummary: string | null;
  afterSummary: string | null;
  correctsEventId: string | null;
}>({
  id: AUDIT_TIMELINE_PROJECTION_ID,
  version: 1,
  fields: [
    { key: 'eventId', classification: 'INTERNAL', mode: 'FULL', fullPurpose: 'Immutable audit event reference' },
    { key: 'sequence', classification: 'INTERNAL', mode: 'DERIVED' },
    { key: 'occurredAt', classification: 'INTERNAL', mode: 'DERIVED' },
    { key: 'action', classification: 'INTERNAL', mode: 'FULL', fullPurpose: 'Reviewed audit action code' },
    { key: 'actorType', classification: 'INTERNAL', mode: 'FULL', fullPurpose: 'Actor category without identity profile' },
    { key: 'actorReference', classification: 'CONFIDENTIAL', mode: 'FULL', fullPurpose: 'Scoped investigation reference' },
    { key: 'targetType', classification: 'INTERNAL', mode: 'FULL', fullPurpose: 'Reviewed audit resource type' },
    { key: 'targetReference', classification: 'CONFIDENTIAL', mode: 'FULL', fullPurpose: 'Scoped investigation reference' },
    { key: 'outcome', classification: 'INTERNAL', mode: 'FULL', fullPurpose: 'Closed audit outcome' },
    { key: 'reasonCode', classification: 'INTERNAL', mode: 'FULL', fullPurpose: 'Bounded reason code; free-form reason is omitted' },
    { key: 'correlationReference', classification: 'INTERNAL', mode: 'FULL', fullPurpose: 'Operational correlation without request payload' },
    { key: 'beforeSummary', classification: 'CONFIDENTIAL', mode: 'DERIVED' },
    { key: 'afterSummary', classification: 'CONFIDENTIAL', mode: 'DERIVED' },
    { key: 'correctsEventId', classification: 'INTERNAL', mode: 'FULL', fullPurpose: 'Append-only correction relationship' },
  ],
  map(source) {
    const actorReference = source.actorKind === 'HUMAN' ? source.actorUserId
      : source.actorKind === 'SERVICE_PRINCIPAL' ? source.actorServicePrincipalId : source.systemActorCode;
    if (!actorReference) throw new Error('Disclosure unavailable');
    return {
      eventId: source.id,
      sequence: source.recordedSequence.toString(),
      occurredAt: source.occurredAt.toISOString(),
      action: source.actionCode,
      actorType: source.actorKind,
      actorReference,
      targetType: source.resourceType,
      targetReference: source.resourceId,
      outcome: source.outcome,
      reasonCode: safeAuditReasonCode(source.actionCode, source.reasonCode),
      correlationReference: source.correlationId,
      beforeSummary: formatAuditSummary(source.actionCode, source.beforeSummary, 'beforeFields'),
      afterSummary: formatAuditSummary(source.actionCode, source.afterSummary, 'afterFields'),
      correctsEventId: source.correctsAuditEventId,
    };
  },
});

export const auditDisclosureRegistry = createDisclosureProjectionRegistry([auditTimelineRowProjection]);
export type AuditTimelineRow = ReturnType<typeof auditTimelineRowProjection.map>;

type AuditCursor = Readonly<{ recordedSequence: bigint; id: string }>;

export function encodeAuditTimelineCursor(cursor: AuditCursor): string {
  return Buffer.from(JSON.stringify({ v: 1, sequence: cursor.recordedSequence.toString(), id: cursor.id }), 'utf8').toString('base64url');
}

export function decodeAuditTimelineCursor(value: string): AuditCursor {
  try {
    if (!value || value.length > 512) throw new Error('invalid');
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as unknown;
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)
      || Object.keys(parsed).sort().join(',') !== 'id,sequence,v') throw new Error('invalid');
    const candidate = parsed as { v?: unknown; sequence?: unknown; id?: unknown };
    if (candidate.v !== 1 || typeof candidate.sequence !== 'string' || !/^[1-9][0-9]*$/.test(candidate.sequence)
      || typeof candidate.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(candidate.id)) throw new Error('invalid');
    return Object.freeze({ recordedSequence: BigInt(candidate.sequence), id: candidate.id });
  } catch {
    throw new ProtectedDisclosureUnavailableError();
  }
}

export interface AuditTimelineRequest {
  readonly auditEventId: string;
  readonly correlationId: string;
  readonly operationId: string;
  readonly reasonCode?: string;
  readonly filter: AuditTimelineFilter;
  readonly pageSize: number;
  readonly cursor?: string;
  readonly resolveContext: (transaction: DatabaseTransactionClient) => Promise<TrustedAuthorizationContext>;
}

function selectedAuthority(context: TrustedAuthorizationContext, assignmentId: string): ActiveAuthorityFact {
  const fact = context.authorityFacts.find((candidate) => candidate.assignment.id === assignmentId);
  if (!fact || context.actor.actorType !== 'HUMAN' || !context.actor.session) throw new ProtectedDisclosureUnavailableError();
  return fact;
}

function readScope(fact: ActiveAuthorityFact): AuditTimelineScope {
  if (fact.scope.type === 'INSTITUTION' && fact.scope.resourceId) return Object.freeze({ kind: 'INSTITUTION', institutionId: fact.scope.resourceId });
  return Object.freeze({ kind: 'EXACT_SCOPE', scopeId: fact.scope.id });
}

function prepareAuditReadEvent(
  context: TrustedAuthorizationContext,
  fact: ActiveAuthorityFact,
  request: AuditTimelineRequest,
  resultCount: number,
): PreparedAuditEvent {
  if (context.actor.actorType !== 'HUMAN' || !context.actor.session) throw new ProtectedDisclosureUnavailableError();
  const session = context.actor.session.session;
  return prepareAuditEvent({
    eventId: request.auditEventId,
    actionCode: 'audit.event.read',
    occurredAt: context.evaluatedAt,
    actor: { kind: 'HUMAN', userId: context.actor.userId, sessionId: session.id },
    authority: {
      roleAssignmentId: fact.assignment.id,
      roleTemplateCode: fact.template.code,
      roleTemplateVersion: fact.template.version,
      capabilityCode: 'audit.event.read',
      policyId: AUDIT_TIMELINE_POLICY_ID,
      scopeType: fact.scope.type,
      scopeId: fact.scope.id,
      ...(fact.scope.type === 'INSTITUTION' && fact.scope.resourceId ? { institutionId: fact.scope.resourceId } : {}),
      assurance: session.assurance,
    },
    resource: {
      type: 'AUDIT_TIMELINE',
      id: context.resource.resourceId,
      ...(fact.scope.type === 'INSTITUTION' && fact.scope.resourceId ? { institutionId: fact.scope.resourceId } : {}),
    },
    ...(request.reasonCode ? { reasonCode: request.reasonCode } : {}),
    outcome: 'SUCCEEDED',
    correlationId: request.correlationId,
    operationId: request.operationId,
    afterSummary: {
      projectionId: AUDIT_TIMELINE_PROJECTION_ID,
      filterCategory: request.filter.category,
      resultCount,
    },
  });
}

export async function readAuthorizedAuditTimeline(
  database: DatabaseClient,
  authorization: AuthorizationService,
  request: AuditTimelineRequest,
): Promise<Readonly<{ rows: readonly Readonly<AuditTimelineRow>[]; nextCursor: string | null }>> {
  let context: TrustedAuthorizationContext | null = null;
  return authorization.executeProtectedRead(database, {
    policyId: AUDIT_TIMELINE_POLICY_ID,
    async resolveContext(transaction) {
      const resolved = await request.resolveContext(transaction);
      if (resolved.actionId !== 'audit.event.read' || resolved.resource.resourceType !== 'audit-timeline') {
        throw new ProtectedDisclosureUnavailableError();
      }
      context = resolved;
      return resolved;
    },
    async execute(transaction, decision) {
      if (!context || context.actor.actorType !== 'HUMAN' || !context.actor.session) throw new ProtectedDisclosureUnavailableError();
      const fact = selectedAuthority(context, decision.authorityAssignmentId);
      const cursor = request.cursor ? decodeAuditTimelineCursor(request.cursor) : undefined;
      // Validate the complete audit obligation before the source query so a
      // malformed request cannot disclose rows and then fail its audit write.
      try {
        prepareAuditReadEvent(context, fact, request, 0);
      } catch {
        throw new ProtectedDisclosureUnavailableError();
      }
      let sources: readonly AuditTimelineRowSource[];
      try {
        sources = await readAuditTimelineSources(transaction, {
          scope: readScope(fact),
          filter: request.filter,
          pageSize: request.pageSize,
          ...(cursor ? { cursor } : {}),
        });
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('Invalid audit')) throw new ProtectedDisclosureUnavailableError();
        throw error;
      }
      await appendAuditEvent(transaction, prepareAuditReadEvent(context, fact, request, sources.length));
      const rows = Object.freeze(sources.map((source) => projectDisclosure(auditDisclosureRegistry, auditTimelineRowProjection, source)));
      const last = sources.at(-1);
      return Object.freeze({
        rows,
        nextCursor: last && sources.length === request.pageSize
          ? encodeAuditTimelineCursor({ recordedSequence: last.recordedSequence, id: last.id }) : null,
      });
    },
  });
}
