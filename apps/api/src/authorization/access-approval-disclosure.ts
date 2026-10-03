import type { DatabaseClient, DatabaseTransactionClient } from '@noma/database';
import type { TrustedAuthorizationContext } from '@noma/platform/access';
import { createDisclosureProjectionRegistry, defineDisclosureProjection, projectDisclosure } from '@noma/platform/privacy';
import { AuthorizationService, ProtectedDisclosureUnavailableError } from './authorization.service.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const STATES = Object.freeze(['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED'] as const);
export type ApprovalFilter = (typeof STATES)[number];
export const ACCESS_APPROVAL_QUEUE_PROJECTION_ID = 'access.approval.queue.row.v1';

interface ApprovalSource {
  readonly id: string;
  readonly operation: string;
  readonly state: string;
  readonly requestorReference: string;
  readonly targetReference: string;
  readonly targetId: string;
  readonly subjectType: string;
  readonly roleTemplateCode: string;
  readonly roleTemplateVersion: number;
  readonly roleTemplateId: string;
  readonly scopeType: string;
  readonly requestedValidFrom: Date;
  readonly requestedValidUntil: Date | null;
  readonly expiresAt: Date;
  readonly reason: string;
  readonly revocationAssignmentId: string | null;
  readonly revocationExpectedVersion: number | null;
  readonly consumed: boolean;
}

export const approvalQueueProjection = defineDisclosureProjection<ApprovalSource, {
  requestId: string; operation: string; state: string; requestorReference: string;
  targetReference: string; targetId: string; subjectType: string;
  roleTemplateCode: string; roleTemplateVersion: number; roleTemplateId: string;
  scopeType: string; requestedValidFrom: string; requestedValidUntil: string | null;
  expiresAt: string; reason: string; revocationAssignmentId: string | null;
  revocationExpectedVersion: number | null; consumed: boolean;
}>({
  id: ACCESS_APPROVAL_QUEUE_PROJECTION_ID, version: 1,
  fields: [
    { key: 'requestId', classification: 'INTERNAL', mode: 'FULL', fullPurpose: 'Exact approval request' },
    { key: 'operation', classification: 'INTERNAL', mode: 'FULL', fullPurpose: 'Specific effect kind' },
    { key: 'state', classification: 'INTERNAL', mode: 'FULL', fullPurpose: 'Maker-checker state' },
    { key: 'requestorReference', classification: 'CONFIDENTIAL', mode: 'FULL', fullPurpose: 'Independent-actor check' },
    { key: 'targetReference', classification: 'CONFIDENTIAL', mode: 'FULL', fullPurpose: 'Exact target review' },
    { key: 'targetId', classification: 'INTERNAL', mode: 'FULL', fullPurpose: 'Exact target binding' },
    { key: 'subjectType', classification: 'INTERNAL', mode: 'FULL', fullPurpose: 'Human or service target' },
    { key: 'roleTemplateCode', classification: 'INTERNAL', mode: 'FULL', fullPurpose: 'Requested role' },
    { key: 'roleTemplateVersion', classification: 'INTERNAL', mode: 'FULL', fullPurpose: 'Requested role version' },
    { key: 'roleTemplateId', classification: 'INTERNAL', mode: 'FULL', fullPurpose: 'Exact template binding' },
    { key: 'scopeType', classification: 'INTERNAL', mode: 'FULL', fullPurpose: 'Exact scope kind' },
    { key: 'requestedValidFrom', classification: 'INTERNAL', mode: 'DERIVED' },
    { key: 'requestedValidUntil', classification: 'INTERNAL', mode: 'DERIVED' },
    { key: 'expiresAt', classification: 'INTERNAL', mode: 'DERIVED' },
    { key: 'reason', classification: 'CONFIDENTIAL', mode: 'FULL', fullPurpose: 'Human maker-checker rationale' },
    { key: 'revocationAssignmentId', classification: 'INTERNAL', mode: 'DERIVED' },
    { key: 'revocationExpectedVersion', classification: 'INTERNAL', mode: 'DERIVED' },
    { key: 'consumed', classification: 'INTERNAL', mode: 'DERIVED' },
  ],
  map(source) {
    return {
      requestId: source.id, operation: source.operation, state: source.state,
      requestorReference: source.requestorReference, targetReference: source.targetReference,
      targetId: source.targetId, subjectType: source.subjectType,
      roleTemplateCode: source.roleTemplateCode, roleTemplateVersion: source.roleTemplateVersion,
      roleTemplateId: source.roleTemplateId, scopeType: source.scopeType,
      requestedValidFrom: source.requestedValidFrom.toISOString(),
      requestedValidUntil: source.requestedValidUntil?.toISOString() ?? null,
      expiresAt: source.expiresAt.toISOString(), reason: source.reason,
      revocationAssignmentId: source.revocationAssignmentId,
      revocationExpectedVersion: source.revocationExpectedVersion,
      consumed: source.consumed,
    };
  },
});

const registry = createDisclosureProjectionRegistry([approvalQueueProjection]);

export async function readAuthorizedApprovalQueue(
  database: DatabaseClient,
  authorization: AuthorizationService,
  input: Readonly<{
    scopeId: string; filter: ApprovalFilter; pageSize: number; afterId?: string;
    resolveContext: (transaction: DatabaseTransactionClient) => Promise<TrustedAuthorizationContext>;
  }>,
) {
  if (!UUID.test(input.scopeId) || (input.afterId && !UUID.test(input.afterId))
    || !STATES.includes(input.filter) || !Number.isSafeInteger(input.pageSize)
    || input.pageSize < 1 || input.pageSize > 100) throw new ProtectedDisclosureUnavailableError();
  let context: TrustedAuthorizationContext | null = null;
  return authorization.executeProtectedRead(database, {
    policyId: 'access.approval.read.v1',
    async resolveContext(transaction) {
      context = await input.resolveContext(transaction);
      if (context.actionId !== 'access.approval.read'
        || context.resource.authorityScopeId !== input.scopeId || context.resource.resourceId !== input.scopeId) {
        throw new ProtectedDisclosureUnavailableError();
      }
      return context;
    },
    async execute(transaction) {
      if (!context) throw new ProtectedDisclosureUnavailableError();
      const rows = await transaction.approvalRequest.findMany({
        where: { scopeId: input.scopeId,
          ...(input.filter === 'ALL' ? {} : { state: input.filter }),
          ...(input.afterId ? { id: { gt: input.afterId } } : {}),
        },
        orderBy: { id: 'asc' }, take: input.pageSize + 1,
        include: {
          requestedByUser: { select: { publicReference: true } },
          targetUser: { select: { publicReference: true } },
          targetServicePrincipal: { select: { code: true } },
          roleTemplate: { select: { code: true, version: true } },
          revocationTarget: true, effect: { select: { id: true } },
        },
      });
      const page = rows.slice(0, input.pageSize);
      return Object.freeze({
        projectionId: ACCESS_APPROVAL_QUEUE_PROJECTION_ID,
        rows: Object.freeze(page.map((row) => projectDisclosure(registry, approvalQueueProjection, {
          id: row.id, operation: row.operation, state: row.state,
          requestorReference: row.requestedByUser.publicReference,
          targetReference: row.targetUser?.publicReference ?? row.targetServicePrincipal?.code ?? '',
          targetId: row.targetUserId ?? row.targetServicePrincipalId ?? '', subjectType: row.subjectType,
          roleTemplateCode: row.roleTemplate.code, roleTemplateVersion: row.roleTemplate.version,
          roleTemplateId: row.roleTemplateId, scopeType: row.scopeType,
          requestedValidFrom: row.requestedValidFrom, requestedValidUntil: row.requestedValidUntil,
          expiresAt: row.expiresAt, reason: row.reason,
          revocationAssignmentId: row.revocationTarget?.roleAssignmentId ?? null,
          revocationExpectedVersion: row.revocationTarget?.expectedVersion ?? null,
          consumed: row.effect !== null,
        }))),
        nextCursor: rows.length > input.pageSize ? page.at(-1)?.id ?? null : null,
      });
    },
  });
}
