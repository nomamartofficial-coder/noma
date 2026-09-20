import type { AccessScopeType, AccessSubjectType } from '@noma/platform/access';
import type { DatabaseTransactionClient } from './transaction.js';

/** The sole source shape for access.assignment.summary.v1. Never select a full RoleAssignment. */
export const ACCESS_ASSIGNMENT_SUMMARY_SELECT = Object.freeze({
  id: true,
  subjectType: true,
  scopeType: true,
  validFrom: true,
  validUntil: true,
  revokedAt: true,
} as const);

export interface AccessAssignmentSummarySource {
  readonly id: string;
  readonly subjectType: AccessSubjectType;
  readonly scopeType: AccessScopeType;
  readonly validFrom: Date;
  readonly validUntil: Date | null;
  readonly revokedAt: Date | null;
}

export async function readAccessAssignmentSummarySource(
  transaction: DatabaseTransactionClient,
  assignmentId: string,
  authorizedScopeId: string,
): Promise<AccessAssignmentSummarySource | null> {
  const row = await transaction.roleAssignment.findFirst({
    where: { id: assignmentId, scopeId: authorizedScopeId },
    select: ACCESS_ASSIGNMENT_SUMMARY_SELECT,
  });
  if (!row) return null;
  return Object.freeze({
    id: row.id,
    subjectType: row.subjectType,
    scopeType: row.scopeType,
    validFrom: row.validFrom,
    validUntil: row.validUntil,
    revokedAt: row.revokedAt,
  });
}
