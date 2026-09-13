import { describe, expect, it } from 'vitest';

import { evaluateAuthenticationAssurance } from '../src/identity/assurance.js';
import type { AuthenticatedSessionRecord } from '../src/identity/contracts.js';

const instant = new Date('2026-09-13T12:00:00.000Z');

function record(overrides: Partial<AuthenticatedSessionRecord['session']> = {}): AuthenticatedSessionRecord {
  return {
    user: {
      id: 'user', publicReference: 'NOMA-USER', status: 'ACTIVE', displayName: 'Synthetic User', locale: 'en-NG',
      version: 0, securityVersion: 4, lastTransitionAt: instant, lastTransitionId: 'transition',
      statusReasonCode: null, createdAt: instant, updatedAt: instant, deactivatedAt: null,
    },
    contactVerified: true,
    activeMfaFactorId: 'factor',
    session: {
      id: 'session', userId: 'user', tokenDigest: 'digest', status: 'ACTIVE', assurance: 'PRIVILEGED_MFA_RECENT',
      issuedSecurityVersion: 4, issuedAt: instant, lastUsedAt: instant,
      idleExpiresAt: new Date(instant.getTime() + 60 * 60_000), absoluteExpiresAt: new Date(instant.getTime() + 24 * 60 * 60_000),
      revokedAt: null, revocationCode: null, deviceLabel: 'Synthetic', clientFamily: null,
      version: 0, lastTransitionAt: instant, lastTransitionId: 'transition',
      passwordAuthenticatedAt: instant, mfaVerifiedAt: instant, mfaMethod: 'TOTP', mfaFactorId: 'factor',
      ...overrides,
    },
  };
}

describe('request-time IAM-004 assurance', () => {
  const requirement = { requireContactVerified: true, passwordMaxAgeMilliseconds: 600_000, mfaMaxAgeMilliseconds: 43_200_000 };

  it('expires exactly at the password boundary without mutating the persisted enum', () => {
    expect(evaluateAuthenticationAssurance(record(), new Date(instant.getTime() + 599_999), requirement).assurance).toBe('PRIVILEGED_MFA_RECENT');
    const atBoundary = evaluateAuthenticationAssurance(record(), new Date(instant.getTime() + 600_000), requirement);
    expect(atBoundary.assurance).toBe('MFA_VERIFIED');
    expect(atBoundary.satisfiesRequirement).toBe(false);
  });

  it('ignores legacy elevated enums without persisted evidence', () => {
    expect(evaluateAuthenticationAssurance(record({ passwordAuthenticatedAt: null, mfaVerifiedAt: null, mfaMethod: null, mfaFactorId: null }), instant, requirement).assurance).toBe('CONTACT_VERIFIED');
  });

  it('fails closed for a replaced factor, changed security version, and future-dated proof', () => {
    expect(evaluateAuthenticationAssurance({ ...record(), activeMfaFactorId: null }, instant, requirement).mfaFresh).toBe(false);
    expect(evaluateAuthenticationAssurance({ ...record(), user: { ...record().user, securityVersion: 5 } }, instant, requirement).satisfiesRequirement).toBe(false);
    expect(evaluateAuthenticationAssurance(record({ passwordAuthenticatedAt: new Date(instant.getTime() + 1) }), instant, requirement).passwordFresh).toBe(false);
  });
});
