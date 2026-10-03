import {
  loadActiveAuthorityFactForUse,
  resolveAccessApprovalForAuthorization,
  resolveAuthenticatedSessionForAuthorization,
  type DatabaseTransactionClient,
} from '@noma/database';
import {
  createTrustedAuthorizationContext,
  type AccessEnvironment,
  type AuthorizationApprovalExpectation,
  type TrustedAuthorizationContext,
} from '@noma/platform/access';
import { OpaqueSessionTokenIssuer } from '@noma/security';
import { ProtectedDisclosureUnavailableError } from './authorization.service.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface AccessAdminContextInput {
  readonly rawSessionToken: string;
  readonly authorityAssignmentId: string;
  readonly scopeId: string;
  readonly actionId: 'access.review.read' | 'access.review.attest' | 'access.review.export'
    | 'access.review.export.request' | 'access.review.export.decide' | 'access.review.export.approval.read'
    | 'access.assignment.read' | 'access.assignment.request' | 'access.assignment.revoke.request'
    | 'access.assignment.grant' | 'access.assignment.revoke' | 'access.approval.read' | 'access.approval.decide'
    | 'access.temporary.request' | 'access.temporary.revoke.request'
    | 'access.temporary.grant' | 'access.temporary.revoke';
  readonly reviewItemId?: string;
  readonly approvalRequestId?: string;
  readonly approvalExpectation?: AuthorizationApprovalExpectation;
  readonly environment: AccessEnvironment;
  readonly evaluatedAt: Date;
}

/** A read still serializes on the chosen Access assignment before loading Identity. */
export async function resolveAccessAdminContext(
  transaction: DatabaseTransactionClient,
  input: AccessAdminContextInput,
): Promise<TrustedAuthorizationContext> {
  if (!UUID.test(input.authorityAssignmentId) || !UUID.test(input.scopeId)
    || (input.actionId === 'access.review.attest' && (!input.reviewItemId || !UUID.test(input.reviewItemId)))
    || (input.actionId !== 'access.review.attest' && input.reviewItemId !== undefined)
    || Boolean(input.approvalRequestId) !== Boolean(input.approvalExpectation)
    || (input.approvalRequestId !== undefined && !UUID.test(input.approvalRequestId))
    || !Number.isFinite(input.evaluatedAt.getTime())) throw new ProtectedDisclosureUnavailableError();
  let tokenDigest: string;
  try { tokenDigest = new OpaqueSessionTokenIssuer().digest(input.rawSessionToken); }
  catch { throw new ProtectedDisclosureUnavailableError(); }
  const candidate = await transaction.session.findUnique({ where: { tokenDigest }, select: { userId: true } });
  if (!candidate) throw new ProtectedDisclosureUnavailableError();
  const selected = await loadActiveAuthorityFactForUse(transaction, {
    assignmentId: input.authorityAssignmentId,
    subject: { subjectType: 'HUMAN', userId: candidate.userId },
    capabilityCode: input.actionId === 'access.review.export.decide' ? 'access.approval.decide'
      : input.actionId === 'access.review.export.approval.read' ? 'access.approval.read'
      : input.actionId === 'access.review.export.request' ? 'access.review.export'
        : input.actionId === 'access.assignment.revoke.request' ? 'access.assignment.request'
          : input.actionId === 'access.temporary.revoke.request' ? 'access.temporary.request' : input.actionId,
    environment: input.environment,
    at: input.evaluatedAt,
  });
  const session = await resolveAuthenticatedSessionForAuthorization(transaction, { tokenDigest, at: input.evaluatedAt });
  const scope = await transaction.accessScope.findFirst({
    where: { id: input.scopeId, retiredAt: null }, select: { type: true },
  });
  if (!session || session.user.id !== candidate.userId || !scope) throw new ProtectedDisclosureUnavailableError();
  const approvalFact = input.approvalRequestId && input.approvalExpectation
    ? await resolveAccessApprovalForAuthorization(transaction, {
      approvalRequestId: input.approvalRequestId,
      ...input.approvalExpectation,
      at: input.evaluatedAt,
    }) : null;
  return createTrustedAuthorizationContext({
    actionId: input.actionId,
    actor: { actorType: 'HUMAN', userId: session.user.id, session },
    resource: {
      resourceType: input.actionId === 'access.review.attest' ? 'access-review-item'
        : input.actionId.startsWith('access.review.') ? 'access-review-scope' : 'access-admin-scope',
      resourceId: input.reviewItemId ?? input.scopeId,
      authorityScopeId: input.scopeId, authorityScopeType: scope.type,
    },
    environment: input.environment,
    evaluatedAt: input.evaluatedAt,
    authorityFacts: selected ? [selected] : [],
    relationshipFacts: [], businessFacts: [], featureFacts: [], restrictionFacts: [], emergencyFacts: [],
    approvalExpectation: input.approvalExpectation ?? null, approvalFact,
  });
}

export const resolveAccessReviewContext = resolveAccessAdminContext;
