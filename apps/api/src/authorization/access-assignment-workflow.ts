import {
  appendAuditEvent, grantApprovedRoleAssignmentInTransaction, revokeApprovedRoleAssignmentInTransaction,
  type AccessSubject, type DatabaseClient, type DatabaseTransactionClient,
} from '@noma/database';
import { type AccessApprovalOperation, type AccessEnvironment, type AccessScopeType, type TrustedAuthorizationContext } from '@noma/platform/access';
import { prepareAuditEvent, type AuditAuthoritySnapshot } from '@noma/platform/audit';
import { resolveAccessAdminContext, type AccessAdminContextInput } from './access-context.js';
import { nextAccessReviewDueAt } from './access-review-schedule.js';
import { AuthorizationService, ProtectedDisclosureUnavailableError } from './authorization.service.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const OPERATIONS: readonly AccessApprovalOperation[] = Object.freeze([
  'ASSIGNMENT_GRANT', 'ASSIGNMENT_REVOKE', 'TEMPORARY_ACCESS_GRANT', 'TEMPORARY_ACCESS_REVOKE',
]);

interface ActorInput {
  readonly rawSessionToken: string;
  readonly authorityAssignmentId: string;
  readonly scopeId: string;
  readonly environment: AccessEnvironment;
  readonly at: Date;
  readonly operationId: string;
  readonly correlationId: string;
  readonly auditEventId: string;
}

export interface RequestAccessAssignmentInput extends ActorInput {
  readonly approvalRequestId: string;
  readonly operation: AccessApprovalOperation;
  readonly subject: AccessSubject;
  readonly roleTemplateId: string;
  readonly scopeType: AccessScopeType;
  readonly requestedValidFrom: Date;
  readonly requestedValidUntil: Date | null;
  readonly reason: string;
  readonly expiresAt: Date;
  readonly idempotencyKey: string;
  readonly revocationTarget?: Readonly<{ assignmentId: string; expectedVersion: number }>;
}

export interface DecideAccessAssignmentInput extends ActorInput {
  readonly approvalRequestId: string;
  readonly decisionId: string;
  readonly decision: 'APPROVE' | 'REJECT';
  readonly reason: string;
}

export interface ExecuteAccessAssignmentInput extends ActorInput {
  readonly approvalRequestId: string;
  readonly effectId: string;
  readonly roleAssignmentId: string;
  readonly temporaryGrantId?: string;
  readonly containmentTransitionId: string;
  readonly idempotencyKey: string;
  readonly reviewCycleId?: string;
  readonly reviewItemId?: string;
}

function unavailable(): never { throw new ProtectedDisclosureUnavailableError(); }

function validText(value: string): boolean {
  return typeof value === 'string' && value === value.trim() && value.length > 0 && value.length <= 500
    && !/[\u0000-\u001f\u007f]/u.test(value);
}

function validateActor(input: ActorInput): void {
  if (!UUID.test(input.authorityAssignmentId) || !UUID.test(input.scopeId) || !UUID.test(input.auditEventId)
    || !KEY.test(input.operationId) || !KEY.test(input.correlationId)
    || !input.rawSessionToken || !(input.at instanceof Date) || !Number.isFinite(input.at.getTime())) unavailable();
}

function actor(context: TrustedAuthorizationContext) {
  if (context.actor.actorType !== 'HUMAN' || !context.actor.session) return unavailable();
  return Object.freeze({ userId: context.actor.userId, session: context.actor.session.session });
}

function authority(context: TrustedAuthorizationContext, assignmentId: string, capabilityCode: string, policyId: string, approvalRequestId?: string): AuditAuthoritySnapshot {
  const fact = context.authorityFacts.find((candidate) => candidate.assignment.id === assignmentId);
  if (!fact) return unavailable();
  return {
    roleAssignmentId: fact.assignment.id, roleTemplateCode: fact.template.code,
    roleTemplateVersion: fact.template.version, capabilityCode, policyId,
    scopeType: fact.scope.type, scopeId: fact.scope.id,
    assurance: actor(context).session.assurance,
    ...(approvalRequestId ? { approvalRequestId } : {}),
  };
}

function subjectIds(subject: AccessSubject): Readonly<{ targetUserId: string | null; targetServicePrincipalId: string | null }> {
  return Object.freeze({
    targetUserId: subject.subjectType === 'HUMAN' ? subject.userId : null,
    targetServicePrincipalId: subject.subjectType === 'SERVICE_PRINCIPAL' ? subject.servicePrincipalId : null,
  });
}

function sameDate(left: Date | null, right: Date | null): boolean {
  return left === null ? right === null : right !== null && left.getTime() === right.getTime();
}

/** Role conflict categories without a current concrete capability mapping are closed, not guessed. */
async function assertGrantFacts(transaction: DatabaseTransactionClient, input: RequestAccessAssignmentInput, requesterId: string): Promise<void> {
  const template = await transaction.roleTemplate.findUnique({ where: { id: input.roleTemplateId }, include: {
    allowedScopes: true, allowedSubjects: true, capabilities: { include: { capability: true } },
  } });
  const scope = await transaction.accessScope.findUnique({ where: { id: input.scopeId } });
  if (!template || template.status !== 'ACTIVE' || template.retiredAt || !scope || scope.retiredAt
    || scope.type !== input.scopeType || template.capabilities.length === 0
    || !template.allowedScopes.some((item) => item.scopeType === input.scopeType)
    || !template.allowedSubjects.some((item) => item.subjectType === input.subject.subjectType)
    || template.capabilities.some((item) => item.capability.retiredAt !== null)) unavailable();
  // The repository has not yet defined live business-role template codes or a
  // complete subject-to-business-resource conflict map. Unknown mappings fail closed.
  if (template.capabilities.some((item) => !item.capability.code.startsWith('access.') && item.capability.code !== 'audit.event.read')) unavailable();
  if (input.subject.subjectType === 'HUMAN') {
    const target = await transaction.user.findUnique({ where: { id: input.subject.userId }, select: { status: true } });
    if (target?.status !== 'ACTIVE' || (template.privilegeClass === 'PRIVILEGED' && requesterId === input.subject.userId)) unavailable();
  } else {
    const principal = await transaction.servicePrincipal.findUnique({ where: { id: input.subject.servicePrincipalId } });
    if (!principal || principal.revokedAt || principal.environment !== input.environment) unavailable();
  }
  if (input.operation === 'TEMPORARY_ACCESS_GRANT' && input.scopeType === 'PLATFORM') unavailable();
  const overlapping = await transaction.roleAssignment.findFirst({ where: {
    subjectType: input.subject.subjectType,
    userId: input.subject.subjectType === 'HUMAN' ? input.subject.userId : null,
    servicePrincipalId: input.subject.subjectType === 'SERVICE_PRINCIPAL' ? input.subject.servicePrincipalId : null,
    scopeId: input.scopeId,
    revokedAt: null,
    validFrom: { lt: input.requestedValidUntil ?? new Date('9999-12-31T23:59:59.999Z') },
    OR: [{ validUntil: null }, { validUntil: { gt: input.requestedValidFrom } }],
  }, include: { roleTemplate: { include: { capabilities: { include: { capability: true } } } } } });
  if (overlapping) {
    // Multiple simultaneous scoped roles have no approved cross-template conflict map.
    // This also rejects duplicate authority and Auditor/write combinations.
    unavailable();
  }
}

export async function requestAuthorizedAccessAssignment(
  database: DatabaseClient,
  authorization: AuthorizationService,
  input: RequestAccessAssignmentInput,
): Promise<Readonly<{ approvalRequestId: string; state: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED'; repeated: boolean }>> {
  validateActor(input);
  const isGrant = input.operation === 'ASSIGNMENT_GRANT' || input.operation === 'TEMPORARY_ACCESS_GRANT';
  const isTemporary = input.operation === 'TEMPORARY_ACCESS_GRANT' || input.operation === 'TEMPORARY_ACCESS_REVOKE';
  if (!OPERATIONS.includes(input.operation) || !UUID.test(input.approvalRequestId)
    || !UUID.test(input.roleTemplateId) || !UUID.test(input.subject.subjectType === 'HUMAN' ? input.subject.userId : input.subject.servicePrincipalId)
    || !KEY.test(input.idempotencyKey) || !validText(input.reason)
    || !(input.requestedValidFrom instanceof Date) || !Number.isFinite(input.requestedValidFrom.getTime())
    || (input.requestedValidUntil !== null && (!(input.requestedValidUntil instanceof Date) || !Number.isFinite(input.requestedValidUntil.getTime())
      || input.requestedValidUntil <= input.requestedValidFrom))
    || !(input.expiresAt instanceof Date) || !Number.isFinite(input.expiresAt.getTime())
    || input.expiresAt <= input.at || input.expiresAt.getTime() - input.at.getTime() > 24 * 60 * 60_000
    || (isTemporary && input.requestedValidUntil === null)
    || isGrant === Boolean(input.revocationTarget)
    || (input.revocationTarget && (!UUID.test(input.revocationTarget.assignmentId)
      || !Number.isSafeInteger(input.revocationTarget.expectedVersion) || input.revocationTarget.expectedVersion < 0))) unavailable();
  const actionId = isTemporary
    ? (isGrant ? 'access.temporary.request' : 'access.temporary.revoke.request')
    : (isGrant ? 'access.assignment.request' : 'access.assignment.revoke.request');
  const policyId = `${actionId}.v1`;
  let context: TrustedAuthorizationContext | null = null;
  return authorization.executeProtectedMutation(database, {
    policyId,
    async resolveContext(transaction) {
      if (input.revocationTarget) {
        const locked = await transaction.$queryRaw<readonly { id: string }[]>`
          SELECT "id" FROM "role_assignments" WHERE "id" = CAST(${input.revocationTarget.assignmentId} AS uuid)
          AND "scope_id" = CAST(${input.scopeId} AS uuid) FOR UPDATE`;
        if (locked.length !== 1) unavailable();
      } else {
        const locked = await transaction.$queryRaw<readonly { id: string }[]>`
          SELECT "id" FROM "role_templates" WHERE "id" = CAST(${input.roleTemplateId} AS uuid) FOR UPDATE`;
        if (locked.length !== 1) unavailable();
      }
      context = await resolveAccessAdminContext(transaction, {
        rawSessionToken: input.rawSessionToken, authorityAssignmentId: input.authorityAssignmentId,
        scopeId: input.scopeId, actionId, environment: input.environment, evaluatedAt: input.at,
      });
      return context;
    },
    async execute(transaction, decision) {
      if (!context) unavailable();
      const currentActor = actor(context);
      const ids = subjectIds(input.subject);
      const prior = await transaction.approvalRequest.findUnique({ where: {
        requestedByUserId_idempotencyKey: { requestedByUserId: currentActor.userId, idempotencyKey: input.idempotencyKey },
      }, include: { revocationTarget: true } });
      if (prior) {
        if (prior.operation !== input.operation || prior.subjectType !== input.subject.subjectType
          || prior.targetUserId !== ids.targetUserId || prior.targetServicePrincipalId !== ids.targetServicePrincipalId
          || prior.roleTemplateId !== input.roleTemplateId || prior.scopeId !== input.scopeId
          || prior.scopeType !== input.scopeType || !sameDate(prior.requestedValidFrom, input.requestedValidFrom)
          || !sameDate(prior.requestedValidUntil, input.requestedValidUntil) || prior.reason !== input.reason
          || prior.revocationTarget?.roleAssignmentId !== input.revocationTarget?.assignmentId
          || prior.revocationTarget?.expectedVersion !== input.revocationTarget?.expectedVersion) unavailable();
        return Object.freeze({ approvalRequestId: prior.id, state: prior.state, repeated: true });
      }
      if (isGrant) await assertGrantFacts(transaction, input, currentActor.userId);
      else {
        const target = await transaction.roleAssignment.findFirst({ where: {
          id: input.revocationTarget!.assignmentId, scopeId: input.scopeId,
        }, include: { temporaryAccessGrant: true } });
        if (!target || target.revokedAt || target.version !== input.revocationTarget!.expectedVersion
          || target.subjectType !== input.subject.subjectType || target.userId !== ids.targetUserId
          || target.servicePrincipalId !== ids.targetServicePrincipalId || target.roleTemplateId !== input.roleTemplateId
          || target.scopeType !== input.scopeType || !sameDate(target.validFrom, input.requestedValidFrom)
          || !sameDate(target.validUntil, input.requestedValidUntil)
          || Boolean(target.temporaryAccessGrant) !== isTemporary) unavailable();
      }
      await transaction.approvalRequest.create({ data: {
        id: input.approvalRequestId, operation: input.operation, subjectType: input.subject.subjectType,
        targetUserId: ids.targetUserId, targetServicePrincipalId: ids.targetServicePrincipalId,
        roleTemplateId: input.roleTemplateId, scopeId: input.scopeId, scopeType: input.scopeType,
        requestedValidFrom: input.requestedValidFrom, requestedValidUntil: input.requestedValidUntil,
        requestedByUserId: currentActor.userId, reason: input.reason, expiresAt: input.expiresAt,
        idempotencyKey: input.idempotencyKey, independentApprovalRequired: true,
        createdAt: input.at, updatedAt: input.at,
      } });
      if (input.revocationTarget) await transaction.accessApprovalRevocationTarget.create({ data: {
        approvalRequestId: input.approvalRequestId, roleAssignmentId: input.revocationTarget.assignmentId,
        expectedVersion: input.revocationTarget.expectedVersion,
      } });
      await appendAuditEvent(transaction, prepareAuditEvent({
        eventId: input.auditEventId, actionCode: 'access.approval.request', occurredAt: input.at,
        actor: { kind: 'HUMAN', userId: currentActor.userId, sessionId: currentActor.session.id },
        authority: authority(context, decision.authorityAssignmentId,
          isTemporary ? 'access.temporary.request' : 'access.assignment.request', policyId),
        resource: { type: 'APPROVAL_REQUEST', id: input.approvalRequestId },
        reasonCode: 'ACCESS_CHANGE_REQUESTED', outcome: 'SUCCEEDED',
        correlationId: input.correlationId, operationId: input.operationId,
        afterSummary: { state: 'PENDING', operation: input.operation },
      }));
      return Object.freeze({ approvalRequestId: input.approvalRequestId, state: 'PENDING' as const, repeated: false });
    },
  });
}

export async function decideAuthorizedAccessAssignment(
  database: DatabaseClient,
  authorization: AuthorizationService,
  input: DecideAccessAssignmentInput,
): Promise<Readonly<{ approvalRequestId: string; state: 'APPROVED' | 'REJECTED'; repeated: boolean }>> {
  validateActor(input);
  if (!UUID.test(input.approvalRequestId) || !UUID.test(input.decisionId)
    || (input.decision !== 'APPROVE' && input.decision !== 'REJECT') || !validText(input.reason)) unavailable();
  let context: TrustedAuthorizationContext | null = null;
  return authorization.executeProtectedMutation(database, {
    policyId: 'access.approval.decide.v1',
    async resolveContext(transaction) {
      const locked = await transaction.$queryRaw<readonly { id: string }[]>`
        SELECT "id" FROM "approval_requests" WHERE "id" = CAST(${input.approvalRequestId} AS uuid)
          AND "scope_id" = CAST(${input.scopeId} AS uuid) FOR UPDATE`;
      if (locked.length !== 1) unavailable();
      context = await resolveAccessAdminContext(transaction, {
        rawSessionToken: input.rawSessionToken, authorityAssignmentId: input.authorityAssignmentId,
        scopeId: input.scopeId, actionId: 'access.approval.decide', environment: input.environment,
        evaluatedAt: input.at,
      });
      return context;
    },
    async execute(transaction, decision) {
      if (!context) unavailable();
      const currentActor = actor(context);
      const request = await transaction.approvalRequest.findFirst({ where: {
        id: input.approvalRequestId, scopeId: input.scopeId,
      }, include: { decisions: true, revocationTarget: { include: { roleAssignment: true } } } });
      if (!request) unavailable();
      const previous = request.decisions[0];
      if (previous) {
        if (previous.approverUserId !== currentActor.userId || previous.decision !== input.decision
          || previous.reason !== input.reason || request.state !== (input.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED')) unavailable();
        return Object.freeze({ approvalRequestId: request.id, state: request.state as 'APPROVED' | 'REJECTED', repeated: true });
      }
      if (request.state !== 'PENDING' || request.expiresAt <= input.at || !request.independentApprovalRequired
        || request.requestedByUserId === currentActor.userId || request.targetUserId === currentActor.userId
        || (request.revocationTarget && (request.revocationTarget.roleAssignment.revokedAt
          || request.revocationTarget.roleAssignment.version !== request.revocationTarget.expectedVersion))) unavailable();
      await transaction.approvalDecision.create({ data: {
        id: input.decisionId, approvalRequestId: request.id, approverUserId: currentActor.userId,
        decision: input.decision, reason: input.reason, decidedAt: input.at,
        sessionId: currentActor.session.id,
        securityVersion: context.actor.actorType === 'HUMAN' ? context.actor.session!.user.securityVersion : 0,
        passwordAuthenticatedAt: currentActor.session.passwordAuthenticatedAt ?? null,
        mfaVerifiedAt: currentActor.session.mfaVerifiedAt ?? null,
        mfaMethod: currentActor.session.mfaMethod ?? null, mfaFactorId: currentActor.session.mfaFactorId ?? null,
        assuranceEvaluatedAt: input.at, createdAt: input.at,
      } });
      const state = input.decision === 'APPROVE' ? 'APPROVED' as const : 'REJECTED' as const;
      await transaction.approvalRequest.update({ where: { id: request.id }, data: {
        state, version: { increment: 1 }, updatedAt: input.at,
      } });
      await appendAuditEvent(transaction, prepareAuditEvent({
        eventId: input.auditEventId, actionCode: 'access.approval.decide', occurredAt: input.at,
        actor: { kind: 'HUMAN', userId: currentActor.userId, sessionId: currentActor.session.id },
        authority: authority(context, decision.authorityAssignmentId, 'access.approval.decide',
          'access.approval.decide.v1', request.id),
        resource: { type: 'APPROVAL_REQUEST', id: request.id },
        reasonCode: 'INDEPENDENT_REVIEW_COMPLETED', outcome: 'SUCCEEDED',
        correlationId: input.correlationId, operationId: input.operationId,
        beforeSummary: { state: 'PENDING' }, afterSummary: { state, decision: input.decision },
      }));
      return Object.freeze({ approvalRequestId: request.id, state, repeated: false });
    },
  });
}

export async function executeAuthorizedAccessAssignment(
  database: DatabaseClient,
  authorization: AuthorizationService,
  input: ExecuteAccessAssignmentInput,
): Promise<Readonly<{ roleAssignmentId: string; operation: AccessApprovalOperation; repeated: boolean }>> {
  validateActor(input);
  if (![input.approvalRequestId, input.effectId, input.roleAssignmentId, input.containmentTransitionId]
    .every((value) => UUID.test(value)) || !KEY.test(input.idempotencyKey)
    || (input.temporaryGrantId !== undefined && !UUID.test(input.temporaryGrantId))
    || (input.reviewCycleId !== undefined && !UUID.test(input.reviewCycleId))
    || (input.reviewItemId !== undefined && !UUID.test(input.reviewItemId))) unavailable();
  const initial = await database.approvalRequest.findFirst({
    where: { id: input.approvalRequestId, scopeId: input.scopeId }, select: { operation: true },
  });
  if (!initial) unavailable();
  const selectedActionId = initial.operation === 'ASSIGNMENT_GRANT' ? 'access.assignment.grant'
    : initial.operation === 'ASSIGNMENT_REVOKE' ? 'access.assignment.revoke'
      : initial.operation === 'TEMPORARY_ACCESS_GRANT' ? 'access.temporary.grant' : 'access.temporary.revoke';
  let context: TrustedAuthorizationContext | null = null;
  let requestSnapshot: Awaited<ReturnType<DatabaseTransactionClient['approvalRequest']['findUnique']>> | null = null;
  let actionId: AccessAdminContextInput['actionId'] | null = null;
  return authorization.executeProtectedMutation(database, {
    // Each operation is mapped from the immutable request, never a client-selected policy.
    policyId: `${selectedActionId}.v1`,
    async resolveContext(transaction) {
      const locked = await transaction.$queryRaw<readonly { id: string }[]>`
        SELECT "id" FROM "approval_requests" WHERE "id" = CAST(${input.approvalRequestId} AS uuid)
          AND "scope_id" = CAST(${input.scopeId} AS uuid) FOR UPDATE`;
      if (locked.length !== 1) unavailable();
      const request = await transaction.approvalRequest.findUnique({ where: { id: input.approvalRequestId } });
      if (!request || request.operation !== initial.operation) unavailable();
      const isGrant = request.operation === 'ASSIGNMENT_GRANT' || request.operation === 'TEMPORARY_ACCESS_GRANT';
      actionId = request.operation === 'ASSIGNMENT_GRANT' ? 'access.assignment.grant'
        : request.operation === 'ASSIGNMENT_REVOKE' ? 'access.assignment.revoke'
          : request.operation === 'TEMPORARY_ACCESS_GRANT' ? 'access.temporary.grant' : 'access.temporary.revoke';
      // Serialize cross-template conflict checks for this exact scope before
      // selecting Access authority and then loading Identity.
      const scopeLocked = await transaction.$queryRaw<readonly { id: string }[]>`
        SELECT "id" FROM "access_scopes" WHERE "id" = CAST(${input.scopeId} AS uuid) FOR UPDATE`;
      if (scopeLocked.length !== 1) unavailable();
      if (!isGrant) {
        const target = await transaction.accessApprovalRevocationTarget.findUnique({ where: { approvalRequestId: request.id } });
        if (!target || target.roleAssignmentId !== input.roleAssignmentId) unavailable();
        const assignmentLocked = await transaction.$queryRaw<readonly { id: string }[]>`
          SELECT "id" FROM "role_assignments" WHERE "id" = CAST(${target.roleAssignmentId} AS uuid) FOR UPDATE`;
        if (assignmentLocked.length !== 1) unavailable();
      }
      requestSnapshot = request;
      context = await resolveAccessAdminContext(transaction, {
        rawSessionToken: input.rawSessionToken, authorityAssignmentId: input.authorityAssignmentId,
        scopeId: input.scopeId, actionId, environment: input.environment, evaluatedAt: input.at,
        approvalRequestId: request.id,
        approvalExpectation: {
          operation: request.operation, subjectType: request.subjectType,
          targetUserId: request.targetUserId, targetServicePrincipalId: request.targetServicePrincipalId,
          roleTemplateId: request.roleTemplateId, scopeId: request.scopeId, scopeType: request.scopeType,
          requestedValidFrom: request.requestedValidFrom, requestedValidUntil: request.requestedValidUntil,
        },
      });
      return context;
    },
    async execute(transaction, decision) {
      const request = requestSnapshot;
      if (!request || !context || !actionId) unavailable();
      const currentActor = actor(context);
      const prior = await transaction.accessApprovalEffect.findUnique({ where: { approvalRequestId: request.id } });
      if (prior) {
        if (prior.operation !== request.operation || prior.roleAssignmentId !== input.roleAssignmentId
          || prior.executedByUserId !== currentActor.userId || prior.idempotencyKey !== input.idempotencyKey) unavailable();
        return Object.freeze({ roleAssignmentId: prior.roleAssignmentId, operation: prior.operation, repeated: true });
      }
      if (request.state !== 'APPROVED' || request.expiresAt <= input.at || !request.independentApprovalRequired
        || !context.approvalFact || context.approvalFact.id !== request.id) unavailable();
      const isTemporary = request.operation === 'TEMPORARY_ACCESS_GRANT' || request.operation === 'TEMPORARY_ACCESS_REVOKE';
      const isGrant = request.operation === 'ASSIGNMENT_GRANT' || request.operation === 'TEMPORARY_ACCESS_GRANT';
      if (isGrant) {
        if (!input.reviewCycleId || !input.reviewItemId) unavailable();
        if (isTemporary !== Boolean(input.temporaryGrantId)) unavailable();
        if (isTemporary && (!request.targetUserId || request.scopeType === 'PLATFORM')) unavailable();
        const subject: AccessSubject = request.subjectType === 'HUMAN'
          ? { subjectType: 'HUMAN', userId: request.targetUserId ?? unavailable() }
          : { subjectType: 'SERVICE_PRINCIPAL', servicePrincipalId: request.targetServicePrincipalId ?? unavailable() };
        await assertGrantFacts(transaction, {
          ...input, operation: request.operation, approvalRequestId: request.id, subject,
          roleTemplateId: request.roleTemplateId, scopeType: request.scopeType,
          requestedValidFrom: request.requestedValidFrom, requestedValidUntil: request.requestedValidUntil,
          reason: request.reason, expiresAt: request.expiresAt,
        }, request.requestedByUserId);
        await grantApprovedRoleAssignmentInTransaction(transaction, {
          id: input.roleAssignmentId, subject, roleTemplateId: request.roleTemplateId,
          scopeId: request.scopeId, scopeType: request.scopeType,
          validFrom: request.requestedValidFrom,
          ...(request.requestedValidUntil ? { validUntil: request.requestedValidUntil } : {}),
          grantedByUserId: currentActor.userId, grantReason: request.reason,
          grantedAt: input.at, containmentTransitionId: input.containmentTransitionId,
        }, input.environment, isTemporary ? {
          id: input.temporaryGrantId!, ownerUserId: request.targetUserId!, reason: request.reason,
          approvalRequestId: request.id,
        } : undefined);
        const template = await transaction.roleTemplate.findUniqueOrThrow({ where: { id: request.roleTemplateId }, select: { privilegeClass: true } });
        const cadence = template.privilegeClass === 'PRIVILEGED' ? 'MONTHLY' as const : 'QUARTERLY' as const;
        await transaction.accessReviewCycle.create({ data: {
          id: input.reviewCycleId, scopeId: request.scopeId, cadence,
          opensAt: input.at, dueAt: nextAccessReviewDueAt(input.at, template.privilegeClass), createdAt: input.at,
        } });
        await transaction.accessReviewItem.create({ data: {
          id: input.reviewItemId, cycleId: input.reviewCycleId,
          roleAssignmentId: input.roleAssignmentId, assignmentVersion: 0, createdAt: input.at,
        } });
      } else {
        if (input.temporaryGrantId !== undefined || input.reviewCycleId !== undefined || input.reviewItemId !== undefined) unavailable();
        const target = await transaction.accessApprovalRevocationTarget.findUnique({ where: { approvalRequestId: request.id } });
        const assignment = await transaction.roleAssignment.findUnique({ where: { id: input.roleAssignmentId }, include: { temporaryAccessGrant: true } });
        if (!target || !assignment || target.roleAssignmentId !== assignment.id
          || assignment.version !== target.expectedVersion || assignment.revokedAt
          || assignment.scopeId !== request.scopeId || assignment.roleTemplateId !== request.roleTemplateId
          || Boolean(assignment.temporaryAccessGrant) !== isTemporary) unavailable();
        const revoked = await revokeApprovedRoleAssignmentInTransaction(
          transaction, assignment.id, target.expectedVersion, currentActor.userId,
          request.reason, input.at, input.containmentTransitionId,
        );
        if (!revoked) unavailable();
      }
      await transaction.accessApprovalEffect.create({ data: {
        id: input.effectId, approvalRequestId: request.id, operation: request.operation,
        roleAssignmentId: input.roleAssignmentId, idempotencyKey: input.idempotencyKey,
        executedByUserId: currentActor.userId, executedAt: input.at,
      } });
      const capability = actionId;
      const auditAction = isGrant
        ? (isTemporary ? 'access.temporary-access.grant' : 'access.assignment.grant')
        : (isTemporary ? 'access.temporary-access.revoke' : 'access.assignment.revoke');
      const common = {
        eventId: input.auditEventId, occurredAt: input.at,
        actor: { kind: 'HUMAN' as const, userId: currentActor.userId, sessionId: currentActor.session.id },
        authority: authority(context, decision.authorityAssignmentId, capability, `${actionId}.v1`, request.id),
        resource: { type: 'ROLE_ASSIGNMENT', id: input.roleAssignmentId },
        reasonCode: isTemporary && !isGrant ? 'TEMPORARY_ACCESS_ENDED' as const
          : isTemporary ? 'APPROVED_TEMPORARY_ACCESS' as const : 'APPROVED_ACCESS_CHANGE' as const,
        outcome: 'SUCCEEDED' as const, correlationId: input.correlationId, operationId: input.operationId,
      };
      if (auditAction === 'access.temporary-access.grant') {
        await appendAuditEvent(transaction, prepareAuditEvent({ ...common, actionCode: auditAction,
          reasonCode: 'APPROVED_TEMPORARY_ACCESS', afterSummary: { scopeType: request.scopeType, temporary: true },
        }));
      } else if (auditAction === 'access.assignment.grant') {
        await appendAuditEvent(transaction, prepareAuditEvent({ ...common, actionCode: auditAction,
          reasonCode: 'APPROVED_ACCESS_CHANGE', afterSummary: { scopeType: request.scopeType, temporary: false },
        }));
      } else if (auditAction === 'access.temporary-access.revoke') {
        await appendAuditEvent(transaction, prepareAuditEvent({ ...common, actionCode: auditAction,
          reasonCode: 'TEMPORARY_ACCESS_ENDED', beforeSummary: { revoked: false }, afterSummary: { revoked: true, temporary: true },
        }));
      } else {
        await appendAuditEvent(transaction, prepareAuditEvent({ ...common, actionCode: auditAction,
          reasonCode: 'APPROVED_ACCESS_CHANGE', beforeSummary: { revoked: false }, afterSummary: { revoked: true },
        }));
      }
      return Object.freeze({ roleAssignmentId: input.roleAssignmentId, operation: request.operation, repeated: false });
    },
  });
}
