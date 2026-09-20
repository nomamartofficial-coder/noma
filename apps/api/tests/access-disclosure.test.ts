import { describe, expect, test, vi } from 'vitest';
import { ACCESS_ASSIGNMENT_SUMMARY_SELECT, readAccessAssignmentSummarySource } from '@noma/database';
import { readAuthorizedAccessAssignmentSummary } from '../src/authorization/access-disclosure.js';
import { AuthorizationService, protectedDisclosureHeaders, publicAuthorizationFailure } from '../src/authorization/authorization.service.js';

const assignmentId = '11111111-1111-4111-8111-111111111111';
const scopeId = '22222222-2222-4222-8222-222222222222';
const context = {
  resource: { resourceType: 'access-assignment', resourceId: assignmentId, authorityScopeId: scopeId },
  evaluatedAt: new Date('2026-09-15T12:00:00.000Z'),
} as never;

describe('IAM-007 Access disclosure binding', () => {
  test('selects exactly six approved columns, scoped in the database, and maps a new source', async () => {
    const row = {
      id: assignmentId, subjectType: 'HUMAN', scopeType: 'PLATFORM',
      validFrom: new Date('2020-01-01T00:00:00.000Z'), validUntil: null, revokedAt: null,
    };
    const findFirst = vi.fn().mockResolvedValue(row);
    const source = await readAccessAssignmentSummarySource({ roleAssignment: { findFirst } } as never, assignmentId, scopeId);
    expect(findFirst).toHaveBeenCalledWith({ where: { id: assignmentId, scopeId }, select: ACCESS_ASSIGNMENT_SUMMARY_SELECT });
    expect(Object.keys(ACCESS_ASSIGNMENT_SUMMARY_SELECT).sort()).toEqual([
      'id', 'subjectType', 'scopeType', 'validFrom', 'validUntil', 'revokedAt',
    ].sort());
    expect(source).toEqual(row);
    expect(source).not.toBe(row);
  });

  test('DENY never reads source or maps; missing, wrong scope and DENY are publicly indistinguishable', async () => {
    const service = new AuthorizationService();
    const findFirst = vi.fn().mockResolvedValue(null);
    const transaction = { roleAssignment: { findFirst } };
    const database = { $transaction: (operation: (tx: object) => Promise<unknown>) => operation(transaction) } as never;
    const request = { assignmentId, authorizedScopeId: scopeId, resolveContext: async () => context };
    vi.spyOn(service, 'evaluate').mockReturnValue({ decision: 'DENY', policyId: 'access.assignment.read.v1', reasonCode: 'SCOPE_MISMATCH' });
    let denied: unknown;
    try { await readAuthorizedAccessAssignmentSummary(database, service, request); } catch (error) { denied = error; }
    expect(publicAuthorizationFailure(denied)).toEqual({ statusCode: 404, body: { status: 'UNAVAILABLE' } });
    expect(findFirst).not.toHaveBeenCalled();
    vi.spyOn(service, 'evaluate').mockReturnValue({ decision: 'ALLOW', policyId: 'access.assignment.read.v1', authorityAssignmentId: 'authority' });
    let missing: unknown;
    try { await readAuthorizedAccessAssignmentSummary(database, service, request); } catch (error) { missing = error; }
    expect(publicAuthorizationFailure(missing)).toEqual(publicAuthorizationFailure(denied));
    findFirst.mockClear();
    let wrongScope: unknown;
    try { await readAuthorizedAccessAssignmentSummary(database, service, { ...request, authorizedScopeId: 'forged-scope' }); } catch (error) { wrongScope = error; }
    expect(publicAuthorizationFailure(wrongScope)).toEqual(publicAuthorizationFailure(denied));
    expect(findFirst).not.toHaveBeenCalled();
  });

  test('ALLOW yields only the fixed server projection and no-store HTTP contract', async () => {
    const service = new AuthorizationService();
    vi.spyOn(service, 'evaluate').mockReturnValue({ decision: 'ALLOW', policyId: 'access.assignment.read.v1', authorityAssignmentId: 'authority' });
    const row = {
      id: assignmentId, subjectType: 'HUMAN', scopeType: 'PLATFORM',
      validFrom: new Date('2020-01-01T00:00:00.000Z'), validUntil: null, revokedAt: null,
    };
    const transaction = { roleAssignment: { findFirst: vi.fn().mockResolvedValue(row) } };
    const database = { $transaction: (operation: (tx: object) => Promise<unknown>) => operation(transaction) } as never;
    const forgedRequest = {
      assignmentId, authorizedScopeId: scopeId, resolveContext: async () => context,
      // Runtime-forged presentation controls are ignored by this server binding.
      projectionId: 'admin.all-fields.v1', fields: ['grantReason'], include: ['user'], expand: 'all', mode: 'FULL',
    };
    const dto = await readAuthorizedAccessAssignmentSummary(database, service, forgedRequest);
    expect(service.evaluate).toHaveBeenCalledWith('access.assignment.read.v1', context);
    expect(dto).toEqual({ assignmentId, subjectType: 'HUMAN', scopeType: 'PLATFORM', state: 'ACTIVE' });
    expect(Object.keys(dto).sort()).toEqual(['assignmentId', 'subjectType', 'scopeType', 'state'].sort());
    expect(protectedDisclosureHeaders()).toEqual({ 'Cache-Control': 'no-store' });
  });

  test('authority reductions never reach the protected source or disclosure mapper', async () => {
    for (const reasonCode of [
      'CAPABILITY_MISSING', 'SCOPE_MISMATCH', 'RELATIONSHIP_MISSING', 'STATE_INVALID',
      'ASSURANCE_REQUIRED', 'APPROVAL_REQUIRED', 'RESTRICTION_ACTIVE', 'AUTHORITY_MISSING',
    ] as const) {
      const service = new AuthorizationService();
      vi.spyOn(service, 'evaluate').mockReturnValue({ decision: 'DENY', policyId: 'access.assignment.read.v1', reasonCode });
      const findFirst = vi.fn();
      const database = { $transaction: (operation: (tx: object) => Promise<unknown>) => operation({ roleAssignment: { findFirst } }) } as never;
      let failure: unknown;
      try {
        await readAuthorizedAccessAssignmentSummary(database, service, {
          assignmentId, authorizedScopeId: scopeId, resolveContext: async () => context,
        });
      } catch (error) { failure = error; }
      expect(publicAuthorizationFailure(failure)).toEqual({ statusCode: 404, body: { status: 'UNAVAILABLE' } });
      expect(findFirst).not.toHaveBeenCalled();
    }
  });
});
