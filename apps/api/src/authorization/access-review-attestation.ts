import { appendAuditEvent, type DatabaseClient } from '@noma/database';
import { requireAccessReviewOutcome, type AccessEnvironment, type AccessReviewOutcome, type TrustedAuthorizationContext } from '@noma/platform/access';
import { prepareAuditEvent } from '@noma/platform/audit';
import { resolveAccessReviewContext } from './access-context.js';
import { nextAccessReviewDueAt } from './access-review-schedule.js';
import { AuthorizationService, ProtectedDisclosureUnavailableError } from './authorization.service.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OPERATION = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;

export interface AccessReviewAttestationRequest {
  readonly rawSessionToken: string;
  readonly authorityAssignmentId: string;
  readonly scopeId: string;
  readonly reviewItemId: string;
  readonly expectedItemVersion: number;
  readonly outcome: AccessReviewOutcome;
  readonly reason: string;
  readonly operationId: string;
  readonly correlationId: string;
  readonly attestationId: string;
  readonly auditEventId: string;
  readonly revocationRequestId?: string;
  readonly revocationAuditEventId?: string;
  readonly nextCycleId?: string;
  readonly nextItemId?: string;
  readonly environment: AccessEnvironment;
  readonly at: Date;
}

function validateRequest(request: AccessReviewAttestationRequest): void {
  requireAccessReviewOutcome(request.outcome);
  if (![request.scopeId, request.reviewItemId, request.authorityAssignmentId, request.attestationId, request.auditEventId]
    .every((value) => UUID.test(value))
    || (request.outcome === 'REVOKE_REQUESTED') !== Boolean(request.revocationRequestId)
    || (request.outcome === 'REVOKE_REQUESTED') !== Boolean(request.revocationAuditEventId)
    || (request.revocationRequestId && !UUID.test(request.revocationRequestId))
    || (request.revocationAuditEventId && !UUID.test(request.revocationAuditEventId))
    || (request.outcome !== 'NEEDS_FOLLOW_UP') !== Boolean(request.nextCycleId && request.nextItemId)
    || (request.nextCycleId && !UUID.test(request.nextCycleId))
    || (request.nextItemId && !UUID.test(request.nextItemId))
    || !Number.isSafeInteger(request.expectedItemVersion) || request.expectedItemVersion < 0
    || !OPERATION.test(request.operationId) || !OPERATION.test(request.correlationId)
    || request.reason !== request.reason.trim() || request.reason.length < 1 || request.reason.length > 500
    || /[\u0000-\u001f\u007f]/u.test(request.reason)
    || !(request.at instanceof Date) || !Number.isFinite(request.at.getTime())) {
    throw new ProtectedDisclosureUnavailableError();
  }
}

/** Authority, review truth, linked revocation request and IAM-008 audit share one transaction. */
export async function attestAuthorizedAccessReviewItem(
  database: DatabaseClient,
  authorization: AuthorizationService,
  request: AccessReviewAttestationRequest,
): Promise<Readonly<{ reviewItemId: string; outcome: AccessReviewOutcome; repeated: boolean }>> {
  validateRequest(request);
  let trustedContext: TrustedAuthorizationContext | null = null;
  return authorization.executeProtectedMutation(database, {
    policyId: 'access.review.attest.v1',
    async resolveContext(transaction) {
      const locked = await transaction.$queryRaw<readonly { id: string }[]>`
        SELECT i."id" FROM "access_review_items" i
        JOIN "access_review_cycles" c ON c."id" = i."cycle_id"
        WHERE i."id" = CAST(${request.reviewItemId} AS uuid)
          AND c."scope_id" = CAST(${request.scopeId} AS uuid)
        FOR UPDATE OF i`;
      if (locked.length !== 1) throw new ProtectedDisclosureUnavailableError();
      trustedContext = await resolveAccessReviewContext(transaction, {
        rawSessionToken: request.rawSessionToken,
        authorityAssignmentId: request.authorityAssignmentId,
        scopeId: request.scopeId,
        reviewItemId: request.reviewItemId,
        actionId: 'access.review.attest', environment: request.environment, evaluatedAt: request.at,
      });
      return trustedContext;
    },
    async execute(transaction, decision) {
      const context = trustedContext;
      if (!context || context.actor.actorType !== 'HUMAN' || !context.actor.session) throw new ProtectedDisclosureUnavailableError();
      const actorId = context.actor.userId;
      const prior = await transaction.accessReviewAttestation.findUnique({
        where: { reviewerUserId_operationId: { reviewerUserId: actorId, operationId: request.operationId } },
        select: { itemId: true, outcome: true, reason: true },
      });
      if (prior) {
        if (prior.itemId !== request.reviewItemId || prior.outcome !== request.outcome || prior.reason !== request.reason) {
          throw new ProtectedDisclosureUnavailableError();
        }
        return Object.freeze({ reviewItemId: prior.itemId, outcome: prior.outcome, repeated: true });
      }
      const item = await transaction.accessReviewItem.findFirst({
        where: { id: request.reviewItemId, cycle: { scopeId: request.scopeId } },
        include: { cycle: true, roleAssignment: { include: { temporaryAccessGrant: true, roleTemplate: true } } },
      });
      if (!item || item.completedAt || item.version !== request.expectedItemVersion
        || item.assignmentVersion !== item.roleAssignment.version
        || item.roleAssignment.userId === actorId) throw new ProtectedDisclosureUnavailableError();
      if (request.outcome !== 'NEEDS_FOLLOW_UP'
        && (item.roleAssignment.revokedAt || (item.roleAssignment.validUntil && item.roleAssignment.validUntil <= request.at))) {
        throw new ProtectedDisclosureUnavailableError();
      }
      let linkedRevocationId: string | null = null;
      if (request.outcome === 'REVOKE_REQUESTED') {
        linkedRevocationId = request.revocationRequestId!;
        const assignment = item.roleAssignment;
        await transaction.approvalRequest.create({ data: {
          id: linkedRevocationId,
          operation: assignment.temporaryAccessGrant ? 'TEMPORARY_ACCESS_REVOKE' : 'ASSIGNMENT_REVOKE',
          subjectType: assignment.subjectType,
          targetUserId: assignment.userId,
          targetServicePrincipalId: assignment.servicePrincipalId,
          roleTemplateId: assignment.roleTemplateId, scopeId: assignment.scopeId, scopeType: assignment.scopeType,
          requestedValidFrom: assignment.validFrom, requestedValidUntil: assignment.validUntil,
          requestedByUserId: actorId, reason: request.reason,
          expiresAt: new Date(request.at.getTime() + 24 * 60 * 60_000),
          idempotencyKey: `review-revoke:${request.reviewItemId}`,
          independentApprovalRequired: true, createdAt: request.at, updatedAt: request.at,
        } });
        await transaction.accessApprovalRevocationTarget.create({ data: {
          approvalRequestId: linkedRevocationId,
          roleAssignmentId: assignment.id, expectedVersion: assignment.version,
        } });
        const fact = context.authorityFacts.find((candidate) => candidate.assignment.id === decision.authorityAssignmentId);
        if (!fact) throw new ProtectedDisclosureUnavailableError();
        await appendAuditEvent(transaction, prepareAuditEvent({
          eventId: request.revocationAuditEventId!, actionCode: 'access.approval.request', occurredAt: request.at,
          actor: { kind: 'HUMAN', userId: actorId, sessionId: context.actor.session.session.id },
          authority: {
            roleAssignmentId: fact.assignment.id, roleTemplateCode: fact.template.code,
            roleTemplateVersion: fact.template.version, capabilityCode: 'access.review.attest',
            policyId: 'access.review.attest.v1', scopeType: fact.scope.type, scopeId: fact.scope.id,
            assurance: context.actor.session.session.assurance,
          },
          resource: { type: 'APPROVAL_REQUEST', id: linkedRevocationId },
          reasonCode: 'ACCESS_CHANGE_REQUESTED', outcome: 'SUCCEEDED',
          correlationId: request.correlationId, operationId: `${request.operationId}:revoke`,
          afterSummary: { state: 'PENDING', operation: assignment.temporaryAccessGrant ? 'TEMPORARY_ACCESS_REVOKE' : 'ASSIGNMENT_REVOKE' },
        }));
      }
      await transaction.accessReviewAttestation.create({ data: {
        id: request.attestationId, itemId: item.id, reviewerUserId: actorId,
        outcome: request.outcome, reason: request.reason, itemVersion: item.version,
        attestedAt: request.at, operationId: request.operationId,
      } });
      const completed = request.outcome !== 'NEEDS_FOLLOW_UP';
      await transaction.accessReviewItem.update({ where: { id: item.id }, data: {
        outcome: request.outcome, completedAt: completed ? request.at : null,
        revocationRequestId: linkedRevocationId,
        version: { increment: 1 },
      } });
      if (completed) {
        const cadence = item.roleAssignment.roleTemplate.privilegeClass === 'PRIVILEGED'
          ? 'MONTHLY' as const : 'QUARTERLY' as const;
        const opensAt = item.cycle.cadence === 'EVENT_DRIVEN' ? request.at : item.cycle.dueAt;
        const dueAt = nextAccessReviewDueAt(opensAt, item.roleAssignment.roleTemplate.privilegeClass);
        if (!item.roleAssignment.validUntil || item.roleAssignment.validUntil > dueAt) {
          await transaction.accessReviewCycle.create({ data: {
            id: request.nextCycleId!, scopeId: request.scopeId, cadence,
            opensAt, dueAt, createdAt: request.at,
          } });
          await transaction.accessReviewItem.create({ data: {
            id: request.nextItemId!, cycleId: request.nextCycleId!,
            roleAssignmentId: item.roleAssignmentId, assignmentVersion: item.roleAssignment.version,
            createdAt: request.at,
          } });
        }
      }
      const fact = context.authorityFacts.find((candidate) => candidate.assignment.id === decision.authorityAssignmentId);
      if (!fact) throw new ProtectedDisclosureUnavailableError();
      await appendAuditEvent(transaction, prepareAuditEvent({
        eventId: request.auditEventId, actionCode: 'access.review.attest', occurredAt: request.at,
        actor: { kind: 'HUMAN', userId: actorId, sessionId: context.actor.session.session.id },
        authority: {
          roleAssignmentId: fact.assignment.id, roleTemplateCode: fact.template.code,
          roleTemplateVersion: fact.template.version, capabilityCode: 'access.review.attest',
          policyId: 'access.review.attest.v1', scopeType: fact.scope.type, scopeId: fact.scope.id,
          assurance: context.actor.session.session.assurance,
        },
        resource: { type: 'ACCESS_REVIEW_ITEM', id: item.id },
        reasonCode: 'ACCESS_REVIEW_ATTESTED', outcome: 'SUCCEEDED',
        correlationId: request.correlationId, operationId: request.operationId,
        beforeSummary: { state: item.outcome === 'NEEDS_FOLLOW_UP' ? 'NEEDS_FOLLOW_UP' : 'PENDING' },
        afterSummary: { outcome: request.outcome, completed },
        ...(linkedRevocationId ? { links: [{ targetType: 'APPROVAL_REQUEST', targetId: linkedRevocationId, relationshipType: 'REQUESTS_REVOCATION' }] } : {}),
      }));
      return Object.freeze({ reviewItemId: item.id, outcome: request.outcome, repeated: false });
    },
  });
}
