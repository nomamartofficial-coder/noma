import { describe, expect, test, vi } from 'vitest';
import { AUDIT_TIMELINE_ROW_SELECT } from '@noma/database';
import { createTrustedAuthorizationContext, type ActiveAuthorityFact, type TrustedAuthorizationContext } from '@noma/platform/access';
import type { AuthenticatedSessionRecord } from '@noma/platform/identity';
import {
  AUDIT_TIMELINE_POLICY_ID,
  AUDIT_TIMELINE_PROJECTION_ID,
  decodeAuditTimelineCursor,
  encodeAuditTimelineCursor,
  readAuthorizedAuditTimeline,
} from '../src/authorization/audit-disclosure.js';
import { AuthorizationService, protectedDisclosureHeaders, publicAuthorizationFailure } from '../src/authorization/authorization.service.js';

const AT = new Date('2026-09-25T10:00:00.000Z');
const USER = '10000000-0000-4000-8000-000000000001';
const SCOPE = '10000000-0000-4000-8000-000000000002';
const ASSIGNMENT = '10000000-0000-4000-8000-000000000003';
const TEMPLATE = '10000000-0000-4000-8000-000000000004';
const SESSION = '10000000-0000-4000-8000-000000000005';
const FACTOR = '10000000-0000-4000-8000-000000000006';
const EVENT = '10000000-0000-4000-8000-000000000007';

function session(overrides: Partial<AuthenticatedSessionRecord['session']> = {}): AuthenticatedSessionRecord {
  return Object.freeze({
    user: Object.freeze({ id: USER, publicReference: 'NOMA-AUDIT-USER', status: 'ACTIVE', displayName: 'Synthetic investigator', locale: 'en-NG', version: 1, securityVersion: 2, lastTransitionAt: AT, lastTransitionId: EVENT, statusReasonCode: null, createdAt: AT, updatedAt: AT, deactivatedAt: null }),
    session: Object.freeze({ id: SESSION, userId: USER, tokenDigest: 'a'.repeat(64), status: 'ACTIVE', assurance: 'PRIVILEGED_MFA_RECENT', issuedSecurityVersion: 2, passwordAuthenticatedAt: new Date(AT.getTime() - 1_000), mfaVerifiedAt: new Date(AT.getTime() - 1_000), mfaMethod: 'TOTP', mfaFactorId: FACTOR, issuedAt: new Date(AT.getTime() - 2_000), lastUsedAt: AT, idleExpiresAt: new Date(AT.getTime() + 60_000), absoluteExpiresAt: new Date(AT.getTime() + 3_600_000), revokedAt: null, revocationCode: null, deviceLabel: 'Synthetic browser', clientFamily: null, version: 0, lastTransitionAt: AT, lastTransitionId: EVENT, ...overrides }),
    contactVerified: true,
    activeMfaFactorId: FACTOR,
  });
}

function authority(): ActiveAuthorityFact {
  return Object.freeze({
    assignment: Object.freeze({ id: ASSIGNMENT, subjectType: 'HUMAN', userId: USER, servicePrincipalId: null, roleTemplateId: TEMPLATE, scopeId: SCOPE, scopeType: 'SELLER', validFrom: new Date(AT.getTime() - 10_000), validUntil: null, grantedByUserId: USER, grantReason: 'Synthetic audit authority', grantedAt: AT, revokedByUserId: null, revocationReason: null, revokedAt: null, version: 0 }),
    template: Object.freeze({ id: TEMPLATE, code: 'audit.investigator', version: 1, displayName: 'Audit investigator', status: 'ACTIVE', privilegeClass: 'PRIVILEGED', assuranceRequirement: { requireContactVerified: true, passwordMaxAgeMilliseconds: 600_000, mfaMaxAgeMilliseconds: 300_000 }, activatedAt: AT, retiredAt: null }),
    scope: Object.freeze({ id: SCOPE, type: 'SELLER', userId: null, resourceId: '10000000-0000-4000-8000-000000000008', parentInstitutionScopeId: '10000000-0000-4000-8000-000000000009', retiredAt: null, createdAt: AT }),
    capabilities: Object.freeze(['audit.event.read']),
  });
}

function context(overrides: Partial<TrustedAuthorizationContext> = {}) {
  return createTrustedAuthorizationContext({
    actionId: 'audit.event.read',
    actor: { actorType: 'HUMAN', userId: USER, session: session() },
    resource: { resourceType: 'audit-timeline', resourceId: SCOPE, authorityScopeId: SCOPE, authorityScopeType: 'SELLER' },
    environment: 'test', evaluatedAt: AT, authorityFacts: [authority()], relationshipFacts: [], businessFacts: [], featureFacts: [], restrictionFacts: [], emergencyFacts: [], approvalExpectation: null, approvalFact: null,
    ...overrides,
  });
}

function source(id: string, sequence: bigint, actionCode = 'identity.mfa.factor.remove') {
  return {
    id, recordedSequence: sequence, actionCode, occurredAt: AT,
    actorKind: 'HUMAN' as const, actorUserId: USER, actorServicePrincipalId: null, systemActorCode: null,
    resourceType: 'MFA_FACTOR', resourceId: FACTOR, outcome: 'SUCCEEDED' as const,
    reasonCode: 'USER_REQUESTED_FACTOR_REMOVAL', correlationId: 'iam008-correlation',
    beforeSummary: { factorState: 'ACTIVE' }, afterSummary: { factorState: 'REVOKED', sessionsRevoked: true },
    correctsAuditEventId: null,
  };
}

function harness(rows: readonly ReturnType<typeof source>[]) {
  const findMany = vi.fn().mockResolvedValue(rows);
  const create = vi.fn().mockResolvedValue({ id: EVENT, recordedSequence: 99n });
  const transaction = { auditEvent: { findMany, create } };
  const database = { $transaction: (operation: (tx: object) => Promise<unknown>) => operation(transaction) } as never;
  return { database, findMany, create };
}

function request(overrides: Record<string, unknown> = {}) {
  return {
    auditEventId: EVENT,
    correlationId: 'iam008-read-correlation',
    operationId: 'iam008-read-operation',
    filter: { category: 'RESOURCE', resourceType: 'MFA_FACTOR', resourceId: FACTOR },
    pageSize: 2,
    resolveContext: async () => context(),
    ...overrides,
  } as never;
}

describe('IAM-008 governed audit disclosure', () => {
  test('policy permits only fresh human exact-scope authority and fails closed for every reduction', () => {
    const service = new AuthorizationService();
    expect(service.evaluate(AUDIT_TIMELINE_POLICY_ID, context())).toEqual(expect.objectContaining({ decision: 'ALLOW', authorityAssignmentId: ASSIGNMENT }));
    const cases: readonly [string, TrustedAuthorizationContext, string][] = [
      ['missing capability', context({ authorityFacts: [{ ...authority(), capabilities: [] }] }), 'CAPABILITY_MISSING'],
      ['wrong scope', context({ resource: { resourceType: 'audit-timeline', resourceId: SCOPE, authorityScopeId: '90000000-0000-4000-8000-000000000001', authorityScopeType: 'SELLER' } }), 'SCOPE_MISMATCH'],
      ['revoked assignment', context({ authorityFacts: [{ ...authority(), assignment: { ...authority().assignment, revokedAt: AT } }] }), 'AUTHORITY_MISSING'],
      ['expired assignment', context({ authorityFacts: [{ ...authority(), assignment: { ...authority().assignment, validUntil: AT } }] }), 'AUTHORITY_MISSING'],
      ['stale assurance', context({ actor: { actorType: 'HUMAN', userId: USER, session: session({ passwordAuthenticatedAt: new Date(AT.getTime() - 700_000), mfaVerifiedAt: new Date(AT.getTime() - 400_000) }) } }), 'ASSURANCE_REQUIRED'],
      ['service principal', context({ actor: { actorType: 'SERVICE_PRINCIPAL', servicePrincipalId: USER, authenticated: false, principal: null } }), 'AUTHORITY_MISSING'],
    ];
    for (const [_name, candidate, reasonCode] of cases) expect(service.evaluate(AUDIT_TIMELINE_POLICY_ID, candidate)).toEqual(expect.objectContaining({ decision: 'DENY', reasonCode }));
    expect(service.evaluate('audit.event.read.*', context())).toEqual(expect.objectContaining({ decision: 'DENY', reasonCode: 'POLICY_UNKNOWN' }));
    expect(service.evaluate('unknown.audit.policy', context())).toEqual(expect.objectContaining({ decision: 'DENY', reasonCode: 'POLICY_UNKNOWN' }));
    expect(service.evaluate(AUDIT_TIMELINE_POLICY_ID, { role: 'ADMIN' } as never)).toEqual(expect.objectContaining({ decision: 'DENY', reasonCode: 'FACT_UNAVAILABLE' }));
  });

  test('authorizes before the minimum query, returns the fixed projection, and writes one read event', async () => {
    const rows = [source('20000000-0000-4000-8000-000000000001', 8n), source('20000000-0000-4000-8000-000000000002', 7n)];
    const { database, findMany, create } = harness(rows);
    const authorization = new AuthorizationService();
    vi.spyOn(authorization, 'evaluate').mockReturnValue({ decision: 'ALLOW', policyId: AUDIT_TIMELINE_POLICY_ID, authorityAssignmentId: ASSIGNMENT });
    const result = await readAuthorizedAuditTimeline(database, authorization, request());

    expect(authorization.evaluate).toHaveBeenCalledWith(AUDIT_TIMELINE_POLICY_ID, expect.objectContaining({ actionId: 'audit.event.read' }));
    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ select: AUDIT_TIMELINE_ROW_SELECT, take: 2 }));
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0]![0].data).toEqual(expect.objectContaining({
      actionCode: 'audit.event.read', operationId: 'iam008-read-operation', authorityCapabilityCode: 'audit.event.read',
      afterSummary: { projectionId: AUDIT_TIMELINE_PROJECTION_ID, filterCategory: 'RESOURCE', resultCount: 2 },
    }));
    expect(result.rows).toHaveLength(2);
    expect(Object.keys(result.rows[0]!).sort()).toEqual([
      'action', 'actorReference', 'actorType', 'afterSummary', 'beforeSummary', 'correlationReference',
      'correctsEventId', 'eventId', 'occurredAt', 'outcome', 'reasonCode', 'sequence', 'targetReference', 'targetType',
    ].sort());
    expect(result.nextCursor).not.toBeNull();
    expect(decodeAuditTimelineCursor(result.nextCursor!)).toEqual({ recordedSequence: 7n, id: rows[1]!.id });
    expect(protectedDisclosureHeaders()).toEqual({ 'Cache-Control': 'no-store' });
  });

  test('DENY and malformed requests disclose no source and create no permanent history', async () => {
    const { database, findMany, create } = harness([]);
    const authorization = new AuthorizationService();
    vi.spyOn(authorization, 'evaluate').mockReturnValue({ decision: 'DENY', policyId: AUDIT_TIMELINE_POLICY_ID, reasonCode: 'CAPABILITY_MISSING' });
    let denied: unknown;
    try { await readAuthorizedAuditTimeline(database, authorization, request()); } catch (error) { denied = error; }
    expect(publicAuthorizationFailure(denied)).toEqual({ statusCode: 404, body: { status: 'UNAVAILABLE' } });
    expect(findMany).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();

    vi.spyOn(authorization, 'evaluate').mockReturnValue({ decision: 'ALLOW', policyId: AUDIT_TIMELINE_POLICY_ID, authorityAssignmentId: ASSIGNMENT });
    for (const malformed of [
      request({ cursor: 'not-a-cursor' }),
      request({ pageSize: 0 }),
      request({ filter: { category: 'ACTION', actionCode: 'access.*' } }),
      request({ auditEventId: 'not-a-uuid' }),
    ]) {
      let failure: unknown;
      try { await readAuthorizedAuditTimeline(database, authorization, malformed); } catch (error) { failure = error; }
      expect(publicAuthorizationFailure(failure)).toEqual({ statusCode: 404, body: { status: 'UNAVAILABLE' } });
    }
    expect(findMany).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  test('a prior audit-read row does not recurse and unsafe source metadata cannot enter the DTO', async () => {
    const row = { ...source('30000000-0000-4000-8000-000000000001', 3n, 'audit.event.read'),
      resourceType: 'AUDIT_TIMELINE', resourceId: SCOPE, reasonCode: null,
      beforeSummary: null,
      afterSummary: { projectionId: AUDIT_TIMELINE_PROJECTION_ID, filterCategory: 'RESOURCE', resultCount: 1, rawPayload: 'private-evidence-sentinel' },
      sessionId: 'session-token-sentinel', reasonText: 'private-reason-sentinel', authorityPolicyId: 'hidden-policy',
    };
    const { database, create } = harness([row]);
    const authorization = new AuthorizationService();
    vi.spyOn(authorization, 'evaluate').mockReturnValue({ decision: 'ALLOW', policyId: AUDIT_TIMELINE_POLICY_ID, authorityAssignmentId: ASSIGNMENT });
    const result = await readAuthorizedAuditTimeline(database, authorization, request({ pageSize: 10 }));
    expect(create).toHaveBeenCalledTimes(1);
    const serialized = JSON.stringify(result);
    for (const sentinel of ['private-evidence-sentinel', 'session-token-sentinel', 'private-reason-sentinel', 'hidden-policy']) expect(serialized).not.toContain(sentinel);
    expect(result.rows[0]!.afterSummary).toBeNull();
  });

  test('cursor encoding is versioned and rejects extra fields or zero sequences', () => {
    const encoded = encodeAuditTimelineCursor({ recordedSequence: 4n, id: EVENT });
    expect(decodeAuditTimelineCursor(encoded)).toEqual({ recordedSequence: 4n, id: EVENT });
    for (const value of [
      Buffer.from(JSON.stringify({ v: 1, sequence: '0', id: EVENT })).toString('base64url'),
      Buffer.from(JSON.stringify({ v: 1, sequence: '1', id: EVENT, extra: true })).toString('base64url'),
      Buffer.from(JSON.stringify({ v: 2, sequence: '1', id: EVENT })).toString('base64url'),
    ]) expect(() => decodeAuditTimelineCursor(value)).toThrow('protected operation is unavailable');
  });
});
