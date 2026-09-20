import {
  readAccessAssignmentSummarySource,
  type AccessAssignmentSummarySource,
  type DatabaseClient,
  type DatabaseTransactionClient,
} from '@noma/database';
import type { TrustedAuthorizationContext } from '@noma/platform/access';
import {
  createDisclosureProjectionRegistry,
  defineDisclosureProjection,
  projectDisclosure,
} from '@noma/platform/privacy';
import { AuthorizationService, ProtectedDisclosureUnavailableError } from './authorization.service.js';

/** Static server binding: policy, exact query and exact response contract. Not a route. */
export const ACCESS_ASSIGNMENT_SUMMARY_POLICY_ID = 'access.assignment.read.v1';

export const accessAssignmentSummaryProjection = defineDisclosureProjection<
  AccessAssignmentSummarySource & { readonly observedAt: Date },
  { assignmentId: string; subjectType: string; scopeType: string; state: string }
>({
  id: 'access.assignment.summary.v1',
  version: 1,
  fields: [
    { key: 'assignmentId', classification: 'INTERNAL', mode: 'FULL', fullPurpose: 'Exact authorized assignment reference' },
    { key: 'subjectType', classification: 'INTERNAL', mode: 'FULL', fullPurpose: 'Identify assignment subject kind' },
    { key: 'scopeType', classification: 'INTERNAL', mode: 'FULL', fullPurpose: 'Identify authorized scope kind' },
    { key: 'state', classification: 'INTERNAL', mode: 'DERIVED' },
    { key: 'grantReason', classification: 'CONFIDENTIAL', mode: 'OMIT' },
    { key: 'revocationReason', classification: 'CONFIDENTIAL', mode: 'OMIT' },
    { key: 'userId', classification: 'RESTRICTED', mode: 'OMIT' },
  ],
  map(source) {
    // The minimum source has no grant reason, user ID, role template or grantor.
    // No source spread, ORM serialization or implicit field disclosure.
    return {
      assignmentId: source.id,
      subjectType: source.subjectType,
      scopeType: source.scopeType,
      state: source.revokedAt ? 'REVOKED'
        : source.validFrom > source.observedAt ? 'PENDING'
          : source.validUntil && source.validUntil <= source.observedAt ? 'EXPIRED' : 'ACTIVE',
    };
  },
});

export const accessDisclosureRegistry = createDisclosureProjectionRegistry([accessAssignmentSummaryProjection]);

export interface AccessAssignmentSummaryRequest {
  readonly assignmentId: string;
  readonly authorizedScopeId: string;
  readonly resolveContext: (transaction: DatabaseTransactionClient) => Promise<TrustedAuthorizationContext>;
}

/** Invoked only from a future server-owned Access use case, never client projection input. */
export async function readAuthorizedAccessAssignmentSummary(
  database: DatabaseClient,
  authorization: AuthorizationService,
  request: AccessAssignmentSummaryRequest,
) {
  let evaluatedAt: Date | null = null;
  return authorization.executeProtectedRead(database, {
    policyId: ACCESS_ASSIGNMENT_SUMMARY_POLICY_ID,
    async resolveContext(transaction) {
      const context = await request.resolveContext(transaction);
      if (context.resource.resourceType !== 'access-assignment'
        || context.resource.resourceId !== request.assignmentId
        || context.resource.authorityScopeId !== request.authorizedScopeId) {
        throw new ProtectedDisclosureUnavailableError();
      }
      evaluatedAt = context.evaluatedAt;
      return context;
    },
    async execute(transaction) {
      const source = await readAccessAssignmentSummarySource(transaction, request.assignmentId, request.authorizedScopeId);
      if (!source || !evaluatedAt) throw new ProtectedDisclosureUnavailableError();
      return projectDisclosure(accessDisclosureRegistry, accessAssignmentSummaryProjection, {
        id: source.id,
        subjectType: source.subjectType,
        scopeType: source.scopeType,
        validFrom: source.validFrom,
        validUntil: source.validUntil,
        revokedAt: source.revokedAt,
        observedAt: evaluatedAt,
      });
    },
  });
}
