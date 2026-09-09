import { describe, expect, test, vi } from 'vitest';

import {
  AuthenticationFailure,
  IdentityAuthenticationService,
  IdentityRegistrationConflictError,
  type IdentityPersistence,
  type PasswordAuthenticationCandidate,
  type SessionRecord,
} from '../src/identity/index.js';

const instant = new Date('2026-08-31T12:00:00.000Z');
let sequence = 0;
const nextUuid = () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}`;
const user = Object.freeze({
  id: '10000000-0000-4000-8000-000000000001', publicReference: 'NOMA-AUTH-001', status: 'PENDING_EMAIL' as const,
  displayName: 'Synthetic User', locale: 'en-NG', version: 0, securityVersion: 0,
  lastTransitionAt: instant, lastTransitionId: '10000000-0000-4000-8000-000000000002',
  statusReasonCode: null, createdAt: instant, updatedAt: instant, deactivatedAt: null,
});
const credential = Object.freeze({
  id: '10000000-0000-4000-8000-000000000003', userId: user.id, encodedHash: 'encoded:correct password',
  hashAlgorithm: 'ARGON2ID', hashPolicyVersion: 1, version: 0, createdAt: instant, rotatedAt: null, revokedAt: null,
});

function sessionRecord(tokenDigest = 'd'.repeat(64)): SessionRecord {
  return Object.freeze({
    id: '10000000-0000-4000-8000-000000000004', userId: user.id, tokenDigest, status: 'ACTIVE',
    assurance: 'AUTHENTICATED', issuedSecurityVersion: 0, issuedAt: instant, lastUsedAt: instant,
    idleExpiresAt: new Date(instant.getTime() + 7 * 86_400_000), absoluteExpiresAt: new Date(instant.getTime() + 30 * 86_400_000),
    revokedAt: null, revocationCode: null, deviceLabel: 'Web browser', clientFamily: 'Chrome', version: 0,
    lastTransitionAt: instant, lastTransitionId: '10000000-0000-4000-8000-000000000005',
  });
}

function persistence(candidate: PasswordAuthenticationCandidate | null = { user, credential }) {
  const store = {
    registerPasswordIdentity: vi.fn(async () => ({ user, email: {}, credential })),
    readPasswordAuthenticationCandidate: vi.fn(async () => candidate),
    replacePasswordCredentialHash: vi.fn(async () => credential),
    rotatePasswordSession: vi.fn(async (input) => sessionRecord(input.session.tokenDigest)),
    resolveAuthenticatedSession: vi.fn(async () => ({ user, session: sessionRecord() })),
    touchSession: vi.fn(async () => null),
    revokeSessionByTokenDigest: vi.fn(async () => true),
  };
  return store as typeof store & IdentityPersistence;
}

async function service(identity: ReturnType<typeof persistence>, options: { limiterError?: boolean } = {}) {
  const verify = vi.fn(async (encoded: string, password: string) => encoded === `encoded:${password}`);
  const instance = await IdentityAuthenticationService.create({
    persistence: identity,
    passwordPolicy: { validate: (password) => password.normalize('NFC') },
    passwordHasher: {
      algorithm: 'ARGON2ID', policyVersion: 1,
      hash: async (password) => `encoded:${password}`,
      verify,
      needsRehash: () => false,
    },
    sessionTokens: { issue: () => ({ rawToken: 'r'.repeat(43), tokenDigest: 'd'.repeat(64) }), digest: () => 'd'.repeat(64) },
    rateLimiter: { check: async () => {
      if (options.limiterError) throw new Error('redis unavailable');
      return { allowed: true, retryAfterSeconds: 0 };
    }, close: async () => undefined },
  }, {
    idleMilliseconds: 7 * 86_400_000, absoluteMilliseconds: 30 * 86_400_000, touchAfterMilliseconds: 900_000,
    now: () => instant, nextUuid, nextPublicReference: () => 'NOMA-AUTH-NEW',
  });
  return { instance, verify };
}

describe('IAM-002 authentication application boundary', () => {
  test('suppresses duplicate registration without splitting persistence operations', async () => {
    const identity = persistence();
    identity.registerPasswordIdentity.mockRejectedValueOnce(new IdentityRegistrationConflictError());
    const { instance } = await service(identity);
    await expect(instance.register({
      email: 'person@example.test', password: 'a sufficiently long phrase', displayName: 'Person', networkSignal: '127.0.0.1',
    })).resolves.toEqual({ status: 'REQUEST_ACCEPTED' });
    expect(identity.registerPasswordIdentity).toHaveBeenCalledOnce();
  });

  test('uses the dummy hash path and one generic failure for an unknown identity', async () => {
    const identity = persistence(null);
    const { instance, verify } = await service(identity);
    await expect(instance.signIn({ email: 'unknown@example.test', password: 'candidate password', networkSignal: 'campus-nat', deviceLabel: 'Web browser' }))
      .rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    expect(verify).toHaveBeenCalledWith('encoded:synthetic unknown identity verifier 2026', 'candidate password');
  });

  test('creates a new authenticated-only session for PENDING_EMAIL accounts', async () => {
    const identity = persistence();
    const { instance } = await service(identity);
    const result = await instance.signIn({ email: 'person@example.test', password: 'correct password', networkSignal: 'campus-nat', deviceLabel: 'Web browser' });
    expect(result.rawSessionToken).toBe('r'.repeat(43));
    expect(result.principal).toMatchObject({ accountStatus: 'PENDING_EMAIL', assurance: 'AUTHENTICATED' });
    expect(identity.rotatePasswordSession).toHaveBeenCalledWith(expect.objectContaining({
      session: expect.objectContaining({ assurance: 'AUTHENTICATED' }),
    }));
  });

  test('fails new authentication closed when the limiter is unavailable', async () => {
    const { instance } = await service(persistence(), { limiterError: true });
    await expect(instance.signIn({ email: 'person@example.test', password: 'correct password', networkSignal: 'campus-nat', deviceLabel: 'Web browser' }))
      .rejects.toEqual(expect.objectContaining<Partial<AuthenticationFailure>>({ code: 'AUTH_DEPENDENCY_UNAVAILABLE' }));
  });
});
