import type { AuthenticatedSessionRecord, AuthenticationAssurance } from './contracts.js';

export const DEFAULT_ASSURANCE_FRESHNESS = Object.freeze({
  passwordMaxAgeMilliseconds: 10 * 60_000,
  mfaMaxAgeMilliseconds: 12 * 60 * 60_000,
  challengeLifetimeMilliseconds: 5 * 60_000,
});

export interface AuthenticationAssuranceRequirement {
  readonly requireContactVerified: boolean;
  readonly passwordMaxAgeMilliseconds?: number;
  readonly mfaMaxAgeMilliseconds?: number;
}

function fresh(provenAt: Date | null | undefined, now: Date, maximumAge: number): boolean {
  if (!provenAt || !Number.isFinite(maximumAge) || maximumAge <= 0) return false;
  const age = now.getTime() - provenAt.getTime();
  return Number.isFinite(age) && age >= 0 && age < maximumAge;
}

export function evaluateAuthenticationAssurance(
  record: AuthenticatedSessionRecord,
  now: Date,
  requirement: AuthenticationAssuranceRequirement,
): Readonly<{ assurance: AuthenticationAssurance; satisfiesRequirement: boolean; passwordFresh: boolean; mfaFresh: boolean }> {
  const session = record.session;
  const valid = (record.user.status === 'ACTIVE' || record.user.status === 'PENDING_EMAIL')
    && session.status === 'ACTIVE'
    && session.revokedAt === null
    && session.issuedSecurityVersion === record.user.securityVersion
    && session.idleExpiresAt > now
    && session.absoluteExpiresAt > now;
  const eligible = valid && record.user.status === 'ACTIVE';
  const contactVerified = eligible && record.contactVerified === true;
  const passwordFresh = eligible && fresh(
    session.passwordAuthenticatedAt, now,
    Math.min(requirement.passwordMaxAgeMilliseconds ?? DEFAULT_ASSURANCE_FRESHNESS.passwordMaxAgeMilliseconds, DEFAULT_ASSURANCE_FRESHNESS.passwordMaxAgeMilliseconds),
  );
  const mfaFresh = valid
    && contactVerified
    && session.mfaMethod !== null && session.mfaMethod !== undefined
    && session.mfaFactorId !== null && session.mfaFactorId !== undefined
    && session.mfaFactorId === record.activeMfaFactorId
    && fresh(
      session.mfaVerifiedAt, now,
      Math.min(requirement.mfaMaxAgeMilliseconds ?? DEFAULT_ASSURANCE_FRESHNESS.mfaMaxAgeMilliseconds, DEFAULT_ASSURANCE_FRESHNESS.mfaMaxAgeMilliseconds),
    );
  const assurance: AuthenticationAssurance = !valid ? 'ANONYMOUS'
    : passwordFresh && mfaFresh ? 'PRIVILEGED_MFA_RECENT'
      : mfaFresh ? 'MFA_VERIFIED'
        : passwordFresh ? 'RECENTLY_AUTHENTICATED'
          : contactVerified ? 'CONTACT_VERIFIED' : 'AUTHENTICATED';
  return Object.freeze({
    assurance,
    satisfiesRequirement: valid
      && (!requirement.requireContactVerified || contactVerified)
      && (requirement.passwordMaxAgeMilliseconds === undefined || passwordFresh)
      && (requirement.mfaMaxAgeMilliseconds === undefined || mfaFresh),
    passwordFresh,
    mfaFresh,
  });
}
