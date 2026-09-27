import { describe, expect, test } from 'vitest';

import {
  ACCESS_CAPABILITY_CODES,
  ACCESS_SCOPE_TYPES,
  evaluateAuthorityFactAssurance,
  isRoleAssignmentActive,
  requireAccessCapabilityCode,
  type ActiveAuthorityFact,
  type AuthenticatedSessionRecord,
} from '../src/index.js';

const at = new Date('2026-09-15T12:00:00.000Z');

function assignment(overrides: Partial<ActiveAuthorityFact['assignment']> = {}): ActiveAuthorityFact['assignment'] {
  return Object.freeze({
    id: '10000000-0000-4000-8000-000000000101', subjectType: 'HUMAN',
    userId: '10000000-0000-4000-8000-000000000102', servicePrincipalId: null,
    roleTemplateId: '10000000-0000-4000-8000-000000000103',
    scopeId: '10000000-0000-4000-8000-000000000104', scopeType: 'SELLER',
    validFrom: new Date(at.getTime() - 1_000), validUntil: new Date(at.getTime() + 1_000),
    grantedByUserId: '10000000-0000-4000-8000-000000000105', grantReason: 'Synthetic governed grant',
    grantedAt: new Date(at.getTime() - 1_000), revokedByUserId: null, revocationReason: null,
    revokedAt: null, version: 0, ...overrides,
  });
}

function session(): AuthenticatedSessionRecord {
  const userId = '10000000-0000-4000-8000-000000000102';
  return {
    user: {
      id: userId, publicReference: 'NOMA-IAM005-USER', status: 'ACTIVE', displayName: 'Synthetic Access User',
      locale: 'en-NG', version: 1, securityVersion: 3, lastTransitionAt: at,
      lastTransitionId: '10000000-0000-4000-8000-000000000106', statusReasonCode: null,
      createdAt: new Date(at.getTime() - 10_000), updatedAt: at, deactivatedAt: null,
    },
    session: {
      id: '10000000-0000-4000-8000-000000000107', userId, tokenDigest: 'a'.repeat(64), status: 'ACTIVE',
      assurance: 'PRIVILEGED_MFA_RECENT', issuedSecurityVersion: 3,
      passwordAuthenticatedAt: new Date(at.getTime() - 60_000), mfaVerifiedAt: new Date(at.getTime() - 60_000),
      mfaMethod: 'TOTP', mfaFactorId: '10000000-0000-4000-8000-000000000108',
      issuedAt: new Date(at.getTime() - 120_000), lastUsedAt: at,
      idleExpiresAt: new Date(at.getTime() + 600_000), absoluteExpiresAt: new Date(at.getTime() + 3_600_000),
      revokedAt: null, revocationCode: null, deviceLabel: 'Synthetic browser', clientFamily: null,
      version: 0, lastTransitionAt: at, lastTransitionId: '10000000-0000-4000-8000-000000000109',
    },
    contactVerified: true,
    activeMfaFactorId: '10000000-0000-4000-8000-000000000108',
  };
}

describe('IAM-005 Access contracts', () => {
  test('publishes only the bounded exact Access vocabulary', () => {
    expect(ACCESS_SCOPE_TYPES).toEqual(['SELF', 'SELLER', 'INSTITUTION', 'ORDER', 'CASE', 'ASSIGNMENT', 'FULFILMENT_LOCATION', 'QUEUE', 'CARRIER', 'PLATFORM']);
    expect(ACCESS_CAPABILITY_CODES).toHaveLength(14);
    expect(ACCESS_CAPABILITY_CODES.filter((code) => code.startsWith('access.'))).toHaveLength(13);
    expect(ACCESS_CAPABILITY_CODES.filter((code) => !code.startsWith('access.'))).toEqual(['audit.event.read']);
    expect(ACCESS_CAPABILITY_CODES.some((code) => code.includes('*'))).toBe(false);
  });

  test.each(['*', 'admin.*', 'seller.*', 'Access.assignment.read', 'access', 'access..read', ' access.assignment.read'])('rejects wildcard or noncanonical capability %j', (value) => {
    expect(() => requireAccessCapabilityCode(value)).toThrow();
  });

  test('uses half-open validity with no expiry grace period', () => {
    expect(isRoleAssignmentActive(assignment(), at)).toBe(true);
    expect(isRoleAssignmentActive(assignment({ validFrom: new Date(at.getTime() + 1) }), at)).toBe(false);
    expect(isRoleAssignmentActive(assignment({ validUntil: at }), at)).toBe(false);
    expect(isRoleAssignmentActive(assignment({ validUntil: new Date(at.getTime() + 1) }), at)).toBe(true);
    expect(isRoleAssignmentActive(assignment({ revokedAt: at }), at)).toBe(false);
  });

  test('reuses IAM-004 proof freshness without treating an assignment as assurance', () => {
    const fact: ActiveAuthorityFact = {
      assignment: assignment(), capabilities: ['access.assignment.read'],
      scope: { id: assignment().scopeId, type: 'SELLER', userId: null, resourceId: '10000000-0000-4000-8000-000000000110', parentInstitutionScopeId: '10000000-0000-4000-8000-000000000111', retiredAt: null, createdAt: at },
      template: { id: assignment().roleTemplateId, code: 'access.reviewer', version: 1, displayName: 'Access Reviewer', status: 'ACTIVE', privilegeClass: 'PRIVILEGED', assuranceRequirement: { requireContactVerified: true, passwordMaxAgeMilliseconds: 600_000, mfaMaxAgeMilliseconds: 43_200_000 }, activatedAt: at, retiredAt: null },
    };
    expect(evaluateAuthorityFactAssurance(fact, session(), at).satisfiesRequirement).toBe(true);
    const current = session();
    const stale: AuthenticatedSessionRecord = { ...current, session: { ...current.session, mfaVerifiedAt: new Date(at.getTime() - 43_200_000) } };
    expect(evaluateAuthorityFactAssurance(fact, stale, at).satisfiesRequirement).toBe(false);
  });
});
