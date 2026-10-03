import type { DatabaseClient, DatabaseTransactionClient } from '@noma/database';
import type { TrustedAuthorizationContext } from '@noma/platform/access';
import { createDisclosureProjectionRegistry, defineDisclosureProjection, projectDisclosure } from '@noma/platform/privacy';
import { AuthorizationService, ProtectedDisclosureUnavailableError } from './authorization.service.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
export const ACCESS_EXPORT_APPROVAL_PROJECTION_ID = 'access.review.export.approval.row.v1';

interface ExportApprovalSource {
  readonly requestId: string;
  readonly requestorReference: string;
  readonly projectionId: string;
  readonly filterCategory: string;
  readonly rowCeiling: number;
  readonly reason: string;
  readonly state: string;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly consumed: boolean;
}

export const exportApprovalProjection = defineDisclosureProjection<ExportApprovalSource, {
  requestId: string; requestorReference: string; projectionId: string;
  filterCategory: string; rowCeiling: number; reason: string; state: string;
  createdAt: string; expiresAt: string; consumed: boolean;
}>({
  id: ACCESS_EXPORT_APPROVAL_PROJECTION_ID, version: 1,
  fields: [
    { key: 'requestId', classification: 'INTERNAL', mode: 'FULL', fullPurpose: 'Exact export request' },
    { key: 'requestorReference', classification: 'CONFIDENTIAL', mode: 'FULL', fullPurpose: 'Maker-checker independence' },
    { key: 'projectionId', classification: 'INTERNAL', mode: 'FULL', fullPurpose: 'Fixed export disclosure purpose' },
    { key: 'filterCategory', classification: 'INTERNAL', mode: 'FULL', fullPurpose: 'Approved review subset' },
    { key: 'rowCeiling', classification: 'INTERNAL', mode: 'FULL', fullPurpose: 'Approved row bound' },
    { key: 'reason', classification: 'CONFIDENTIAL', mode: 'FULL', fullPurpose: 'Independent export rationale' },
    { key: 'state', classification: 'INTERNAL', mode: 'FULL', fullPurpose: 'Approval state' },
    { key: 'createdAt', classification: 'INTERNAL', mode: 'DERIVED' },
    { key: 'expiresAt', classification: 'INTERNAL', mode: 'DERIVED' },
    { key: 'consumed', classification: 'INTERNAL', mode: 'DERIVED' },
  ],
  map(source) {
    return {
      requestId: source.requestId, requestorReference: source.requestorReference,
      projectionId: source.projectionId, filterCategory: source.filterCategory,
      rowCeiling: source.rowCeiling, reason: source.reason, state: source.state,
      createdAt: source.createdAt.toISOString(), expiresAt: source.expiresAt.toISOString(),
      consumed: source.consumed,
    };
  },
});

const registry = createDisclosureProjectionRegistry([exportApprovalProjection]);

export async function readAuthorizedExportApprovalQueue(
  database: DatabaseClient,
  authorization: AuthorizationService,
  input: Readonly<{
    scopeId: string; pageSize: number; afterId?: string;
    resolveContext: (transaction: DatabaseTransactionClient) => Promise<TrustedAuthorizationContext>;
  }>,
) {
  if (!UUID.test(input.scopeId) || (input.afterId && !UUID.test(input.afterId))
    || !Number.isSafeInteger(input.pageSize) || input.pageSize < 1 || input.pageSize > 100) {
    throw new ProtectedDisclosureUnavailableError();
  }
  let context: TrustedAuthorizationContext | null = null;
  return authorization.executeProtectedRead(database, {
    policyId: 'access.review.export.approval.read.v1',
    async resolveContext(transaction) {
      context = await input.resolveContext(transaction);
      if (context.actionId !== 'access.review.export.approval.read'
        || context.resource.authorityScopeId !== input.scopeId || context.resource.resourceId !== input.scopeId) {
        throw new ProtectedDisclosureUnavailableError();
      }
      return context;
    },
    async execute(transaction) {
      if (!context) throw new ProtectedDisclosureUnavailableError();
      const rows = await transaction.accessReviewExportRequest.findMany({
        where: { scopeId: input.scopeId, ...(input.afterId ? { id: { gt: input.afterId } } : {}) },
        orderBy: { id: 'asc' }, take: input.pageSize + 1,
        include: { requestedByUser: { select: { publicReference: true } }, effect: { select: { id: true } } },
      });
      const page = rows.slice(0, input.pageSize);
      return Object.freeze({
        projectionId: ACCESS_EXPORT_APPROVAL_PROJECTION_ID,
        rows: Object.freeze(page.map((row) => projectDisclosure(registry, exportApprovalProjection, {
          requestId: row.id, requestorReference: row.requestedByUser.publicReference,
          projectionId: row.projectionId, filterCategory: row.filterCategory,
          rowCeiling: row.rowCeiling, reason: row.reason, state: row.state,
          createdAt: row.createdAt, expiresAt: row.expiresAt, consumed: row.effect !== null,
        }))),
        nextCursor: rows.length > input.pageSize ? page.at(-1)?.id ?? null : null,
      });
    },
  });
}
