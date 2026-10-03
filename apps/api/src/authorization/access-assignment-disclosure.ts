import { type DatabaseClient, type DatabaseTransactionClient } from '@noma/database';
import type { TrustedAuthorizationContext } from '@noma/platform/access';
import { createDisclosureProjectionRegistry, defineDisclosureProjection, projectDisclosure } from '@noma/platform/privacy';
import { AuthorizationService, ProtectedDisclosureUnavailableError } from './authorization.service.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const FILTERS = Object.freeze(['ALL', 'ACTIVE', 'EXPIRED', 'REVOKED', 'TEMPORARY'] as const);
export type AssignmentFilter = (typeof FILTERS)[number];
export const ACCESS_ASSIGNMENT_SUMMARY_PROJECTION_ID = 'access.assignment.summary.v1';

interface AssignmentSource {
  readonly id: string;
  readonly subjectReference: string;
  readonly subjectId: string;
  readonly subjectType: 'HUMAN' | 'SERVICE_PRINCIPAL';
  readonly roleTemplateCode: string;
  readonly roleTemplateId: string;
  readonly roleTemplateVersion: number;
  readonly scopeType: string;
  readonly validFrom: Date;
  readonly validUntil: Date | null;
  readonly revokedAt: Date | null;
  readonly temporary: boolean;
  readonly version: number;
  readonly observedAt: Date;
}

export const assignmentSummaryProjection = defineDisclosureProjection<AssignmentSource, {
  assignmentId: string;
  subjectReference: string;
  subjectId: string;
  subjectType: string;
  roleTemplateCode: string;
  roleTemplateId: string;
  roleTemplateVersion: number;
  scopeType: string;
  validFrom: string;
  validUntil: string | null;
  state: 'ACTIVE' | 'UPCOMING' | 'EXPIRED' | 'REVOKED';
  temporary: boolean;
  version: number;
}>({
  id: ACCESS_ASSIGNMENT_SUMMARY_PROJECTION_ID,
  version: 1,
  fields: [
    { key: 'assignmentId', classification: 'INTERNAL', mode: 'FULL', fullPurpose: 'Exact assignment reference' },
    { key: 'subjectReference', classification: 'CONFIDENTIAL', mode: 'FULL', fullPurpose: 'Identify authority without profile data' },
    { key: 'subjectId', classification: 'INTERNAL', mode: 'FULL', fullPurpose: 'Bind an exact approval-backed revocation target' },
    { key: 'subjectType', classification: 'INTERNAL', mode: 'FULL', fullPurpose: 'Distinguish human and service subjects' },
    { key: 'roleTemplateCode', classification: 'INTERNAL', mode: 'FULL', fullPurpose: 'Identify assigned role' },
    { key: 'roleTemplateId', classification: 'INTERNAL', mode: 'FULL', fullPurpose: 'Bind an exact role-template version' },
    { key: 'roleTemplateVersion', classification: 'INTERNAL', mode: 'FULL', fullPurpose: 'Identify exact role version' },
    { key: 'scopeType', classification: 'INTERNAL', mode: 'FULL', fullPurpose: 'Identify exact scope kind' },
    { key: 'validFrom', classification: 'INTERNAL', mode: 'DERIVED' },
    { key: 'validUntil', classification: 'INTERNAL', mode: 'DERIVED' },
    { key: 'state', classification: 'INTERNAL', mode: 'DERIVED' },
    { key: 'temporary', classification: 'INTERNAL', mode: 'DERIVED' },
    { key: 'version', classification: 'INTERNAL', mode: 'FULL', fullPurpose: 'Optimistic concurrency reference' },
  ],
  map(source) {
    return {
      assignmentId: source.id, subjectReference: source.subjectReference, subjectId: source.subjectId,
      subjectType: source.subjectType, roleTemplateCode: source.roleTemplateCode, roleTemplateId: source.roleTemplateId,
      roleTemplateVersion: source.roleTemplateVersion, scopeType: source.scopeType,
      validFrom: source.validFrom.toISOString(), validUntil: source.validUntil?.toISOString() ?? null,
      state: source.revokedAt ? 'REVOKED'
        : source.validFrom > source.observedAt ? 'UPCOMING'
          : source.validUntil && source.validUntil <= source.observedAt ? 'EXPIRED' : 'ACTIVE',
      temporary: source.temporary, version: source.version,
    };
  },
});

const registry = createDisclosureProjectionRegistry([assignmentSummaryProjection]);

export interface AssignmentQueryRequest {
  readonly scopeId: string;
  readonly filter: AssignmentFilter;
  readonly pageSize: number;
  readonly afterId?: string;
  readonly resolveContext: (transaction: DatabaseTransactionClient) => Promise<TrustedAuthorizationContext>;
}

export async function readAuthorizedScopedAssignments(
  database: DatabaseClient,
  authorization: AuthorizationService,
  request: AssignmentQueryRequest,
) {
  if (!UUID.test(request.scopeId) || (request.afterId && !UUID.test(request.afterId))
    || !FILTERS.includes(request.filter) || !Number.isSafeInteger(request.pageSize)
    || request.pageSize < 1 || request.pageSize > 100) throw new ProtectedDisclosureUnavailableError();
  let context: TrustedAuthorizationContext | null = null;
  return authorization.executeProtectedRead(database, {
    policyId: 'access.assignment.read.v1',
    async resolveContext(transaction) {
      context = await request.resolveContext(transaction);
      if (context.actionId !== 'access.assignment.read'
        || context.resource.authorityScopeId !== request.scopeId
        || context.resource.resourceId !== request.scopeId) throw new ProtectedDisclosureUnavailableError();
      return context;
    },
    async execute(transaction) {
      if (!context) throw new ProtectedDisclosureUnavailableError();
      const at = context.evaluatedAt;
      const stateWhere = request.filter === 'ACTIVE' ? {
        revokedAt: null, validFrom: { lte: at }, OR: [{ validUntil: null }, { validUntil: { gt: at } }],
      } : request.filter === 'EXPIRED' ? { revokedAt: null, validUntil: { lte: at } }
        : request.filter === 'REVOKED' ? { revokedAt: { not: null } }
          : request.filter === 'TEMPORARY' ? { temporaryAccessGrant: { isNot: null } } : {};
      const rows = await transaction.roleAssignment.findMany({
        where: { scopeId: request.scopeId, ...(request.afterId ? { id: { gt: request.afterId } } : {}), ...stateWhere },
        orderBy: { id: 'asc' }, take: request.pageSize + 1,
        include: { user: { select: { publicReference: true } }, servicePrincipal: { select: { code: true } },
          roleTemplate: { select: { code: true, version: true } }, temporaryAccessGrant: { select: { id: true } } },
      });
      const page = rows.slice(0, request.pageSize);
      return Object.freeze({
        projectionId: ACCESS_ASSIGNMENT_SUMMARY_PROJECTION_ID,
        rows: Object.freeze(page.map((row) => projectDisclosure(registry, assignmentSummaryProjection, {
          id: row.id, subjectReference: row.user?.publicReference ?? row.servicePrincipal?.code ?? '',
          subjectId: row.userId ?? row.servicePrincipalId ?? '',
          subjectType: row.subjectType, roleTemplateCode: row.roleTemplate.code, roleTemplateId: row.roleTemplateId,
          roleTemplateVersion: row.roleTemplate.version, scopeType: row.scopeType,
          validFrom: row.validFrom, validUntil: row.validUntil, revokedAt: row.revokedAt,
          temporary: row.temporaryAccessGrant !== null, version: row.version, observedAt: at,
        }))),
        nextCursor: rows.length > request.pageSize ? page.at(-1)?.id ?? null : null,
      });
    },
  });
}
