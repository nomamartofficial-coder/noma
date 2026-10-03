import {
  readScopedAccessReviewRows,
  type AccessReviewCursor,
  type AccessReviewFilter,
  type AccessReviewRowSource,
  type DatabaseClient,
  type DatabaseTransactionClient,
} from '@noma/database';
import type { TrustedAuthorizationContext } from '@noma/platform/access';
import { createDisclosureProjectionRegistry, defineDisclosureProjection, projectDisclosure } from '@noma/platform/privacy';
import { AuthorizationService, ProtectedDisclosureUnavailableError } from './authorization.service.js';

export const ACCESS_REVIEW_QUEUE_POLICY_ID = 'access.review.read.v1';
export const ACCESS_REVIEW_QUEUE_PROJECTION_ID = 'access.review.queue.row.v1';

export const accessReviewQueueProjection = defineDisclosureProjection<AccessReviewRowSource & { observedAt: Date }, {
  reviewItemId: string;
  cycleId: string;
  itemVersion: number;
  subjectReference: string;
  roleTemplateCode: string;
  roleTemplateVersion: number;
  scopeType: string;
  dueAt: string;
  cadence: string;
  state: string;
  outcome: string | null;
  completedAt: string | null;
  revocationPending: boolean;
}>({
  id: ACCESS_REVIEW_QUEUE_PROJECTION_ID,
  version: 1,
  fields: [
    { key: 'reviewItemId', classification: 'INTERNAL', mode: 'FULL', fullPurpose: 'Exact review item reference' },
    { key: 'cycleId', classification: 'INTERNAL', mode: 'FULL', fullPurpose: 'Exact review cycle reference' },
    { key: 'itemVersion', classification: 'INTERNAL', mode: 'FULL', fullPurpose: 'Optimistic attestation version' },
    { key: 'subjectReference', classification: 'CONFIDENTIAL', mode: 'FULL', fullPurpose: 'Identify the reviewed authority without profile data' },
    { key: 'roleTemplateCode', classification: 'INTERNAL', mode: 'FULL', fullPurpose: 'Identify the role under review' },
    { key: 'roleTemplateVersion', classification: 'INTERNAL', mode: 'FULL', fullPurpose: 'Identify exact role version' },
    { key: 'scopeType', classification: 'INTERNAL', mode: 'FULL', fullPurpose: 'Show the exact scope kind' },
    { key: 'dueAt', classification: 'INTERNAL', mode: 'DERIVED' },
    { key: 'cadence', classification: 'INTERNAL', mode: 'FULL', fullPurpose: 'Distinguish periodic and event-driven reviews' },
    { key: 'state', classification: 'INTERNAL', mode: 'DERIVED' },
    { key: 'outcome', classification: 'INTERNAL', mode: 'DERIVED' },
    { key: 'completedAt', classification: 'INTERNAL', mode: 'DERIVED' },
    { key: 'revocationPending', classification: 'INTERNAL', mode: 'DERIVED' },
  ],
  map(source) {
    const state = source.stale ? 'STALE'
      : source.completedAt ? 'COMPLETED'
        : source.dueAt < source.observedAt ? 'OVERDUE'
          : source.opensAt <= source.observedAt ? 'DUE' : 'UPCOMING';
    return {
      reviewItemId: source.reviewItemId,
      cycleId: source.cycleId,
      itemVersion: source.itemVersion,
      subjectReference: source.subjectReference,
      roleTemplateCode: source.roleTemplateCode,
      roleTemplateVersion: source.roleTemplateVersion,
      scopeType: source.scopeType,
      dueAt: source.dueAt.toISOString(),
      cadence: source.cadence,
      state,
      outcome: source.outcome,
      completedAt: source.completedAt?.toISOString() ?? null,
      revocationPending: source.revocationPending,
    };
  },
});

const registry = createDisclosureProjectionRegistry([accessReviewQueueProjection]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function encodeAccessReviewCursor(cursor: AccessReviewCursor): string {
  if (!UUID.test(cursor.id) || !Number.isFinite(cursor.dueAt.getTime())) throw new ProtectedDisclosureUnavailableError();
  return Buffer.from(JSON.stringify({ v: 1, dueAt: cursor.dueAt.toISOString(), id: cursor.id }), 'utf8').toString('base64url');
}

export function decodeAccessReviewCursor(value: string): AccessReviewCursor {
  try {
    if (!value || value.length > 512) throw new Error('invalid');
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as unknown;
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)
      || Object.keys(parsed).sort().join(',') !== 'dueAt,id,v') throw new Error('invalid');
    const candidate = parsed as { v?: unknown; dueAt?: unknown; id?: unknown };
    if (candidate.v !== 1 || typeof candidate.dueAt !== 'string'
      || typeof candidate.id !== 'string' || !UUID.test(candidate.id)) throw new Error('invalid');
    const dueAt = new Date(candidate.dueAt);
    if (!Number.isFinite(dueAt.getTime()) || dueAt.toISOString() !== candidate.dueAt) throw new Error('invalid');
    return Object.freeze({ dueAt, id: candidate.id });
  } catch {
    throw new ProtectedDisclosureUnavailableError();
  }
}

export interface AccessReviewQueueRequest {
  readonly scopeId: string;
  readonly filter: AccessReviewFilter;
  readonly pageSize: number;
  readonly cursor?: string;
  readonly resolveContext: (transaction: DatabaseTransactionClient) => Promise<TrustedAuthorizationContext>;
}

export async function readAuthorizedAccessReviewQueue(
  database: DatabaseClient,
  authorization: AuthorizationService,
  request: AccessReviewQueueRequest,
) {
  if (!UUID.test(request.scopeId) || !Number.isSafeInteger(request.pageSize)
    || request.pageSize < 1 || request.pageSize > 100) throw new ProtectedDisclosureUnavailableError();
  const cursor = request.cursor ? decodeAccessReviewCursor(request.cursor) : undefined;
  let evaluatedAt: Date | null = null;
  return authorization.executeProtectedRead(database, {
    policyId: ACCESS_REVIEW_QUEUE_POLICY_ID,
    async resolveContext(transaction) {
      const context = await request.resolveContext(transaction);
      if (context.actionId !== 'access.review.read'
        || context.resource.resourceType !== 'access-review-scope'
        || context.resource.resourceId !== request.scopeId
        || context.resource.authorityScopeId !== request.scopeId) throw new ProtectedDisclosureUnavailableError();
      evaluatedAt = context.evaluatedAt;
      return context;
    },
    async execute(transaction) {
      if (!evaluatedAt) throw new ProtectedDisclosureUnavailableError();
      const rows = await readScopedAccessReviewRows(transaction, {
        scopeId: request.scopeId, filter: request.filter, at: evaluatedAt,
        limit: request.pageSize + 1, ...(cursor ? { cursor } : {}),
      });
      const page = rows.slice(0, request.pageSize);
      const last = page.at(-1);
      return Object.freeze({
        projectionId: ACCESS_REVIEW_QUEUE_PROJECTION_ID,
        rows: Object.freeze(page.map((row) => projectDisclosure(registry, accessReviewQueueProjection, { ...row, observedAt: evaluatedAt! }))),
        nextCursor: rows.length > request.pageSize && last
          ? encodeAccessReviewCursor({ dueAt: last.dueAt, id: last.reviewItemId }) : null,
      });
    },
  });
}
