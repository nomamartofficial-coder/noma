import { describe, expect, test, vi } from 'vitest';
import {
  IdentityProofFailure,
  IdentityVerificationRecoveryService,
  type AuthRateLimitAction,
  type IdentityPersistence,
} from '../src/identity/index.js';

const instant = new Date('2026-09-11T10:00:00.000Z');
let sequence = 0;
const nextUuid = () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}`;

function setup() {
  const actions: AuthRateLimitAction[] = [];
  const persistence = {
    requestIdentityDelivery: vi.fn(async () => false),
    confirmEmailVerification: vi.fn(async () => ({ userId: nextUuid(), emailId: nextUuid(), elevatedSessionId: null })),
    preflightPasswordRecovery: vi.fn(async () => ({ userId: nextUuid(), emailId: nextUuid(), credentialId: nextUuid(), credentialVersion: 0, userVersion: 0, securityVersion: 0 })),
    completePasswordRecovery: vi.fn(async () => true),
  } as unknown as IdentityPersistence;
  const passwordHasher = { algorithm: 'ARGON2ID' as const, policyVersion: 1, hash: vi.fn(async (value: string) => `encoded:${value}`), verify: vi.fn(), needsRehash: vi.fn() };
  const service = new IdentityVerificationRecoveryService({
    persistence,
    passwordPolicy: { validate: (value) => value.normalize('NFC') },
    passwordHasher,
    proofTokens: { issue: () => ({ rawToken: 'r'.repeat(43), tokenDigest: 'd'.repeat(64) }), digest: (value) => {
      if (value !== 'r'.repeat(43)) throw new Error('malformed');
      return 'd'.repeat(64);
    } },
    sessionTokens: { issue: () => ({ rawToken: 's'.repeat(43), tokenDigest: 'e'.repeat(64) }), digest: () => 'e'.repeat(64) },
    rateLimiter: { check: async (input) => { actions.push(input.action); return { allowed: true, retryAfterSeconds: 0 }; }, close: async () => undefined },
  }, { now: () => instant, nextUuid, tokenTtlMilliseconds: 30 * 60_000 });
  return { service, persistence, passwordHasher, actions };
}

describe('IAM-003 identity verification and recovery application boundary', () => {
  test('returns the same accepted response when no identity is eligible', async () => {
    const { service, persistence, actions } = setup();
    await expect(service.requestPasswordRecovery({ email: 'Unknown@Example.test', networkSignal: 'campus-nat', correlationId: nextUuid() })).resolves.toEqual({ status: 'REQUEST_ACCEPTED' });
    expect(persistence.requestIdentityDelivery).toHaveBeenCalledWith(expect.objectContaining({ normalizedEmail: 'unknown@example.test', purpose: 'PASSWORD_RECOVERY' }));
    expect(actions).toEqual(['PASSWORD_RECOVERY_REQUEST']);
  });

  test('confirms verification through one authoritative persistence command', async () => {
    const { service, persistence } = setup();
    await expect(service.confirmEmailVerification({ rawToken: 'r'.repeat(43), networkSignal: 'network' })).resolves.toEqual({ status: 'EMAIL_VERIFIED' });
    expect(persistence.confirmEmailVerification).toHaveBeenCalledWith(expect.objectContaining({ tokenDigest: 'd'.repeat(64) }));
  });

  test('uses one generic verification failure for malformed and rejected proofs', async () => {
    const first = setup();
    await expect(first.service.confirmEmailVerification({ rawToken: 'bad', networkSignal: 'network' })).rejects.toEqual(expect.objectContaining<Partial<IdentityProofFailure>>({ code: 'VERIFICATION_LINK_INVALID' }));
    const second = setup();
    vi.mocked(second.persistence.confirmEmailVerification).mockResolvedValueOnce(null);
    await expect(second.service.confirmEmailVerification({ rawToken: 'r'.repeat(43), networkSignal: 'network' })).rejects.toMatchObject({ code: 'VERIFICATION_LINK_INVALID' });
  });

  test('performs bounded preflight before hashing and revalidates in completion', async () => {
    const { service, persistence, passwordHasher, actions } = setup();
    await expect(service.completePasswordRecovery({ rawToken: 'r'.repeat(43), newPassword: 'new secure password', networkSignal: 'network', correlationId: nextUuid() })).resolves.toEqual({ status: 'PASSWORD_RECOVERED' });
    expect(persistence.preflightPasswordRecovery).toHaveBeenCalledBefore(passwordHasher.hash);
    expect(persistence.completePasswordRecovery).toHaveBeenCalledWith(expect.objectContaining({ encodedHash: 'encoded:new secure password', containmentTransitionId: expect.any(String), noticeEventId: expect.any(String) }));
    expect(actions).toEqual(['PASSWORD_RECOVERY_COMPLETE']);
  });

  test('never runs Argon2 for an arbitrary invalid recovery proof', async () => {
    const { service, persistence, passwordHasher } = setup();
    vi.mocked(persistence.preflightPasswordRecovery).mockResolvedValueOnce(null);
    await expect(service.completePasswordRecovery({ rawToken: 'r'.repeat(43), newPassword: 'candidate', networkSignal: 'network', correlationId: nextUuid() })).rejects.toMatchObject({ code: 'RECOVERY_LINK_INVALID' });
    expect(passwordHasher.hash).not.toHaveBeenCalled();
  });
});

