import { appendAuditEvent, readScopedAccessReviewRows, type AccessReviewFilter, type DatabaseClient } from '@noma/database';
import { type AccessEnvironment, type TrustedAuthorizationContext } from '@noma/platform/access';
import { prepareAuditEvent, type AuditAuthoritySnapshot } from '@noma/platform/audit';
import { resolveAccessReviewContext } from './access-context.js';
import { accessReviewCsvHeaders, ACCESS_REVIEW_EXPORT_PROJECTION_ID, renderAccessReviewCsv } from './access-review-export.js';
import { AuthorizationService, ProtectedDisclosureUnavailableError } from './authorization.service.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OPERATION = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const FILTERS = Object.freeze(['ALL', 'DUE', 'OVERDUE', 'COMPLETED', 'UNRESOLVED'] as const);

interface ExportActorInput {
  readonly rawSessionToken: string;
  readonly authorityAssignmentId: string;
  readonly scopeId: string;
  readonly environment: AccessEnvironment;
  readonly at: Date;
  readonly operationId: string;
  readonly correlationId: string;
  readonly auditEventId: string;
}

export interface RequestAccessReviewExportInput extends ExportActorInput {
  readonly exportRequestId: string;
  readonly filter: AccessReviewFilter;
  readonly rowCeiling: number;
  readonly reason: string;
  readonly idempotencyKey: string;
}

export interface DecideAccessReviewExportInput extends ExportActorInput {
  readonly exportRequestId: string;
  readonly decisionId: string;
  readonly decision: 'APPROVE' | 'REJECT';
  readonly reason: string;
}

export interface ExecuteAccessReviewExportInput extends ExportActorInput {
  readonly exportRequestId: string;
  readonly exportEffectId: string;
}

function validateActor(input: ExportActorInput): void {
  if (![input.authorityAssignmentId, input.scopeId, input.auditEventId].every((value) => UUID.test(value))
    || !OPERATION.test(input.operationId) || !OPERATION.test(input.correlationId)
    || !(input.at instanceof Date) || !Number.isFinite(input.at.getTime())) throw new ProtectedDisclosureUnavailableError();
}

function reason(value: string): string {
  if (typeof value !== 'string' || value !== value.trim() || value.length < 1 || value.length > 500
    || /[\u0000-\u001f\u007f]/u.test(value)) throw new ProtectedDisclosureUnavailableError();
  return value;
}

function actor(context: TrustedAuthorizationContext): Readonly<{ userId: string; sessionId: string; securityVersion: number; assurance: 'PRIVILEGED_MFA_RECENT' }> {
  if (context.actor.actorType !== 'HUMAN' || !context.actor.session
    || context.actor.session.session.assurance !== 'PRIVILEGED_MFA_RECENT') throw new ProtectedDisclosureUnavailableError();
  return Object.freeze({
    userId: context.actor.userId,
    sessionId: context.actor.session.session.id,
    securityVersion: context.actor.session.user.securityVersion,
    assurance: 'PRIVILEGED_MFA_RECENT' as const,
  });
}

function auditAuthority(context: TrustedAuthorizationContext, assignmentId: string, capabilityCode: string, policyId: string, approvalRequestId?: string): AuditAuthoritySnapshot {
  const fact = context.authorityFacts.find((candidate) => candidate.assignment.id === assignmentId);
  if (!fact) throw new ProtectedDisclosureUnavailableError();
  return {
    roleAssignmentId: fact.assignment.id,
    roleTemplateCode: fact.template.code,
    roleTemplateVersion: fact.template.version,
    capabilityCode, policyId,
    scopeType: fact.scope.type,
    scopeId: fact.scope.id,
    assurance: actor(context).assurance,
    ...(approvalRequestId ? { approvalRequestId } : {}),
  };
}

export async function requestAuthorizedAccessReviewExport(
  database: DatabaseClient,
  authorization: AuthorizationService,
  input: RequestAccessReviewExportInput,
): Promise<Readonly<{ exportRequestId: string; state: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED'; repeated: boolean }>> {
  validateActor(input);
  if (!UUID.test(input.exportRequestId) || !FILTERS.includes(input.filter)
    || !Number.isSafeInteger(input.rowCeiling) || input.rowCeiling < 1 || input.rowCeiling > 500
    || !OPERATION.test(input.idempotencyKey)) throw new ProtectedDisclosureUnavailableError();
  reason(input.reason);
  let context: TrustedAuthorizationContext | null = null;
  return authorization.executeProtectedMutation(database, {
    policyId: 'access.review.export.request.v1',
    async resolveContext(transaction) {
      context = await resolveAccessReviewContext(transaction, {
        rawSessionToken: input.rawSessionToken, authorityAssignmentId: input.authorityAssignmentId,
        scopeId: input.scopeId, actionId: 'access.review.export.request',
        environment: input.environment, evaluatedAt: input.at,
      });
      return context;
    },
    async execute(transaction, decision) {
      if (!context) throw new ProtectedDisclosureUnavailableError();
      const currentActor = actor(context);
      const prior = await transaction.accessReviewExportRequest.findUnique({
        where: { requestedByUserId_idempotencyKey: { requestedByUserId: currentActor.userId, idempotencyKey: input.idempotencyKey } },
      });
      if (prior) {
        if (prior.scopeId !== input.scopeId || prior.filterCategory !== input.filter
          || prior.rowCeiling !== input.rowCeiling || prior.reason !== input.reason
          || prior.projectionId !== ACCESS_REVIEW_EXPORT_PROJECTION_ID) throw new ProtectedDisclosureUnavailableError();
        return Object.freeze({ exportRequestId: prior.id, state: prior.state, repeated: true });
      }
      await transaction.accessReviewExportRequest.create({ data: {
        id: input.exportRequestId, scopeId: input.scopeId,
        projectionId: ACCESS_REVIEW_EXPORT_PROJECTION_ID, filterCategory: input.filter,
        rowCeiling: input.rowCeiling, reason: input.reason,
        requestedByUserId: currentActor.userId,
        expiresAt: new Date(input.at.getTime() + 60 * 60_000),
        idempotencyKey: input.idempotencyKey, createdAt: input.at,
      } });
      await appendAuditEvent(transaction, prepareAuditEvent({
        eventId: input.auditEventId, actionCode: 'access.approval.request', occurredAt: input.at,
        actor: { kind: 'HUMAN', userId: currentActor.userId, sessionId: currentActor.sessionId },
        authority: auditAuthority(context, decision.authorityAssignmentId, 'access.review.export', 'access.review.export.request.v1'),
        resource: { type: 'APPROVAL_REQUEST', id: input.exportRequestId },
        reasonCode: 'ACCESS_CHANGE_REQUESTED', outcome: 'SUCCEEDED',
        correlationId: input.correlationId, operationId: input.operationId,
        afterSummary: { state: 'PENDING', operation: 'ACCESS_REVIEW_EXPORT' },
      }));
      return Object.freeze({ exportRequestId: input.exportRequestId, state: 'PENDING' as const, repeated: false });
    },
  });
}

export async function decideAuthorizedAccessReviewExport(
  database: DatabaseClient,
  authorization: AuthorizationService,
  input: DecideAccessReviewExportInput,
): Promise<Readonly<{ exportRequestId: string; state: 'APPROVED' | 'REJECTED' }>> {
  validateActor(input);
  if (!UUID.test(input.exportRequestId) || !UUID.test(input.decisionId)
    || (input.decision !== 'APPROVE' && input.decision !== 'REJECT')) throw new ProtectedDisclosureUnavailableError();
  reason(input.reason);
  let context: TrustedAuthorizationContext | null = null;
  return authorization.executeProtectedMutation(database, {
    policyId: 'access.review.export.decide.v1',
    async resolveContext(transaction) {
      const locked = await transaction.$queryRaw<readonly { id: string }[]>`
        SELECT "id" FROM "access_review_export_requests"
        WHERE "id" = CAST(${input.exportRequestId} AS uuid)
          AND "scope_id" = CAST(${input.scopeId} AS uuid) FOR UPDATE`;
      if (locked.length !== 1) throw new ProtectedDisclosureUnavailableError();
      context = await resolveAccessReviewContext(transaction, {
        rawSessionToken: input.rawSessionToken, authorityAssignmentId: input.authorityAssignmentId,
        scopeId: input.scopeId, actionId: 'access.review.export.decide',
        environment: input.environment, evaluatedAt: input.at,
      });
      return context;
    },
    async execute(transaction, decision) {
      if (!context) throw new ProtectedDisclosureUnavailableError();
      const currentActor = actor(context);
      const request = await transaction.accessReviewExportRequest.findFirst({
        where: { id: input.exportRequestId, scopeId: input.scopeId }, include: { decision: true },
      });
      if (request?.decision) {
        if (request.decision.approverUserId !== currentActor.userId
          || request.decision.decision !== input.decision || request.decision.reason !== input.reason
          || request.state !== (input.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED')) {
          throw new ProtectedDisclosureUnavailableError();
        }
        return Object.freeze({ exportRequestId: request.id, state: request.state as 'APPROVED' | 'REJECTED' });
      }
      if (!request || request.state !== 'PENDING' || request.expiresAt <= input.at
        || request.requestedByUserId === currentActor.userId) throw new ProtectedDisclosureUnavailableError();
      await transaction.accessReviewExportDecision.create({ data: {
        id: input.decisionId, requestId: request.id, approverUserId: currentActor.userId,
        decision: input.decision, reason: input.reason, sessionId: currentActor.sessionId,
        securityVersion: currentActor.securityVersion, decidedAt: input.at,
      } });
      const state = input.decision === 'APPROVE' ? 'APPROVED' as const : 'REJECTED' as const;
      await transaction.accessReviewExportRequest.update({ where: { id: request.id }, data: {
        state, version: { increment: 1 },
      } });
      await appendAuditEvent(transaction, prepareAuditEvent({
        eventId: input.auditEventId, actionCode: 'access.approval.decide', occurredAt: input.at,
        actor: { kind: 'HUMAN', userId: currentActor.userId, sessionId: currentActor.sessionId },
        authority: auditAuthority(context, decision.authorityAssignmentId, 'access.approval.decide', 'access.review.export.decide.v1', request.id),
        resource: { type: 'APPROVAL_REQUEST', id: request.id },
        reasonCode: 'INDEPENDENT_REVIEW_COMPLETED', outcome: 'SUCCEEDED',
        correlationId: input.correlationId, operationId: input.operationId,
        beforeSummary: { state: 'PENDING' }, afterSummary: { state, decision: input.decision },
      }));
      return Object.freeze({ exportRequestId: request.id, state });
    },
  });
}

export async function executeAuthorizedAccessReviewExport(
  database: DatabaseClient,
  authorization: AuthorizationService,
  input: ExecuteAccessReviewExportInput,
): Promise<Readonly<{ body: string; headers: Readonly<Record<string, string>> }>> {
  validateActor(input);
  if (!UUID.test(input.exportRequestId) || !UUID.test(input.exportEffectId)) throw new ProtectedDisclosureUnavailableError();
  let context: TrustedAuthorizationContext | null = null;
  return authorization.executeProtectedMutation(database, {
    policyId: 'access.review.export.v1',
    async resolveContext(transaction) {
      const locked = await transaction.$queryRaw<readonly { id: string }[]>`
        SELECT "id" FROM "access_review_export_requests"
        WHERE "id" = CAST(${input.exportRequestId} AS uuid)
          AND "scope_id" = CAST(${input.scopeId} AS uuid) FOR UPDATE`;
      if (locked.length !== 1) throw new ProtectedDisclosureUnavailableError();
      context = await resolveAccessReviewContext(transaction, {
        rawSessionToken: input.rawSessionToken, authorityAssignmentId: input.authorityAssignmentId,
        scopeId: input.scopeId, actionId: 'access.review.export',
        environment: input.environment, evaluatedAt: input.at,
      });
      return context;
    },
    async execute(transaction, decision) {
      if (!context) throw new ProtectedDisclosureUnavailableError();
      const currentActor = actor(context);
      const request = await transaction.accessReviewExportRequest.findFirst({
        where: { id: input.exportRequestId, scopeId: input.scopeId },
        include: { decision: { include: { approverUser: true, session: true } }, effect: { select: { id: true } } },
      });
      const approved = request?.decision;
      const factorId = approved?.session.mfaFactorId;
      const currentFactor = factorId ? await transaction.mfaFactor.findFirst({
        where: { id: factorId, userId: approved!.approverUserId, status: 'ACTIVE' }, select: { id: true },
      }) : null;
      if (!request || request.state !== 'APPROVED' || request.expiresAt <= input.at
        || request.requestedByUserId !== currentActor.userId || request.effect
        || request.projectionId !== ACCESS_REVIEW_EXPORT_PROJECTION_ID
        || !FILTERS.includes(request.filterCategory as AccessReviewFilter)
        || request.rowCeiling < 1 || request.rowCeiling > 500
        || !approved || approved.decision !== 'APPROVE'
        || approved.approverUserId === currentActor.userId
        || approved.approverUser.status !== 'ACTIVE'
        || approved.securityVersion !== approved.approverUser.securityVersion
        || approved.session.issuedSecurityVersion !== approved.securityVersion
        || !currentFactor) throw new ProtectedDisclosureUnavailableError();
      const rows = await readScopedAccessReviewRows(transaction, {
        scopeId: request.scopeId, filter: request.filterCategory as AccessReviewFilter,
        at: input.at, limit: request.rowCeiling + 1,
      });
      if (rows.length > request.rowCeiling) throw new ProtectedDisclosureUnavailableError();
      const body = renderAccessReviewCsv(rows, request.rowCeiling);
      await transaction.accessReviewExportEffect.create({ data: {
        id: input.exportEffectId, requestId: request.id, executedByUserId: currentActor.userId,
        resultCount: rows.length, operationId: input.operationId, executedAt: input.at,
      } });
      await appendAuditEvent(transaction, prepareAuditEvent({
        eventId: input.auditEventId, actionCode: 'access.review.export', occurredAt: input.at,
        actor: { kind: 'HUMAN', userId: currentActor.userId, sessionId: currentActor.sessionId },
        authority: auditAuthority(context, decision.authorityAssignmentId, 'access.review.export', 'access.review.export.v1', request.id),
        resource: { type: 'ACCESS_REVIEW_EXPORT', id: request.id },
        reasonCode: 'APPROVED_ACCESS_REVIEW_EXPORT', outcome: 'SUCCEEDED',
        correlationId: input.correlationId, operationId: input.operationId,
        afterSummary: {
          projectionId: ACCESS_REVIEW_EXPORT_PROJECTION_ID,
          scopeType: context.resource.authorityScopeType,
          resultCount: rows.length, rowCeiling: request.rowCeiling,
        },
      }));
      return Object.freeze({ body, headers: accessReviewCsvHeaders() });
    },
  });
}
