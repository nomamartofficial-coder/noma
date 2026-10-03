import type { DatabaseTransactionClient } from './transaction.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const ACCESS_REVIEW_FILTERS = Object.freeze(['ALL', 'DUE', 'OVERDUE', 'COMPLETED', 'UNRESOLVED'] as const);
export type AccessReviewFilter = (typeof ACCESS_REVIEW_FILTERS)[number];

export interface AccessReviewCursor {
  readonly dueAt: Date;
  readonly id: string;
}

export interface AccessReviewRowSource {
  readonly reviewItemId: string;
  readonly cycleId: string;
  readonly itemVersion: number;
  readonly subjectReference: string;
  readonly roleTemplateCode: string;
  readonly roleTemplateVersion: number;
  readonly scopeType: string;
  readonly dueAt: Date;
  readonly opensAt: Date;
  readonly cadence: string;
  readonly outcome: 'RETAIN_CONFIRMED' | 'REVOKE_REQUESTED' | 'NEEDS_FOLLOW_UP' | null;
  readonly completedAt: Date | null;
  readonly revocationPending: boolean;
  readonly stale: boolean;
}

function validateInput(input: Readonly<{
  scopeId: string; filter: AccessReviewFilter; at: Date; limit: number; cursor?: AccessReviewCursor;
}>): void {
  if (!UUID.test(input.scopeId) || !ACCESS_REVIEW_FILTERS.includes(input.filter)
    || !(input.at instanceof Date) || !Number.isFinite(input.at.getTime())
    || !Number.isSafeInteger(input.limit) || input.limit < 1 || input.limit > 501
    || (input.cursor && (!(input.cursor.dueAt instanceof Date)
      || !Number.isFinite(input.cursor.dueAt.getTime()) || !UUID.test(input.cursor.id)))) {
    throw new Error('Invalid scoped Access review query');
  }
}

/** Exact scope, fixed fields, due-time plus immutable-item-ID keyset ordering. */
export async function readScopedAccessReviewRows(
  transaction: DatabaseTransactionClient,
  input: Readonly<{ scopeId: string; filter: AccessReviewFilter; at: Date; limit: number; cursor?: AccessReviewCursor }>,
): Promise<readonly AccessReviewRowSource[]> {
  validateInput(input);
  const filterWhere = input.filter === 'DUE'
    ? { completedAt: null, cycle: { scopeId: input.scopeId, opensAt: { lte: input.at }, dueAt: { gte: input.at } } }
    : input.filter === 'OVERDUE'
      ? { completedAt: null, cycle: { scopeId: input.scopeId, dueAt: { lt: input.at } } }
      : input.filter === 'COMPLETED'
        ? { completedAt: { not: null }, cycle: { scopeId: input.scopeId } }
        : input.filter === 'UNRESOLVED'
          ? { completedAt: null, cycle: { scopeId: input.scopeId } }
          : { cycle: { scopeId: input.scopeId } };
  const records = await transaction.accessReviewItem.findMany({
    where: {
      AND: [
        filterWhere,
        ...(input.cursor ? [{ OR: [
          { cycle: { dueAt: { gt: input.cursor.dueAt } } },
          { cycle: { dueAt: input.cursor.dueAt }, id: { gt: input.cursor.id } },
        ] }] : []),
      ],
    },
    select: {
      id: true, version: true, assignmentVersion: true, outcome: true, completedAt: true, revocationRequestId: true,
      cycle: { select: { id: true, opensAt: true, dueAt: true, cadence: true } },
      roleAssignment: { select: {
        subjectType: true, version: true, scopeType: true,
        user: { select: { publicReference: true } },
        servicePrincipal: { select: { code: true } },
        roleTemplate: { select: { code: true, version: true } },
      } },
    },
    orderBy: [{ cycle: { dueAt: 'asc' } }, { id: 'asc' }],
    take: input.limit,
  });
  return Object.freeze(records.map((record) => Object.freeze({
    reviewItemId: record.id,
    cycleId: record.cycle.id,
    itemVersion: record.version,
    subjectReference: record.roleAssignment.subjectType === 'HUMAN'
      ? record.roleAssignment.user?.publicReference ?? ''
      : record.roleAssignment.servicePrincipal?.code ?? '',
    roleTemplateCode: record.roleAssignment.roleTemplate.code,
    roleTemplateVersion: record.roleAssignment.roleTemplate.version,
    scopeType: record.roleAssignment.scopeType,
    dueAt: record.cycle.dueAt,
    opensAt: record.cycle.opensAt,
    cadence: record.cycle.cadence,
    outcome: record.outcome,
    completedAt: record.completedAt,
    revocationPending: record.outcome === 'REVOKE_REQUESTED' && record.revocationRequestId !== null,
    stale: record.assignmentVersion !== record.roleAssignment.version,
  })));
}
