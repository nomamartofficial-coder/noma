import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

import { createDatabaseClient, createIdentityPersistence, createMfaAuthorityPersistence, disconnectDatabaseClient, type DatabaseClient } from '@noma/database';
import { RedisIdentityAuthRateLimiter } from '@noma/integrations';
import { TestOnlyManagedKeyProvider } from '@noma/integrations/testing';
import { PrivilegedMfaService } from '@noma/platform/identity';
import { Argon2idPasswordHasher, OpaqueSessionTokenIssuer, SensitiveFieldProtector, createTotpSeed, digestRecoveryCode, generateRecoveryCodes, matchTotpTimeStep } from '@noma/security';
import { Secret, TOTP } from 'otpauth';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { startNomaInfrastructureHarness, type NomaInfrastructureHarness, type PostgreSqlTestConnection } from '../src/containers.js';
import { DeterministicTestIds } from '../src/random.js';

const execFileAsync = promisify(execFile);
const ROOT = resolve(import.meta.dirname, '../../..');
const DATABASE_DIR = resolve(ROOT, 'packages/database');
const prismaCli = createRequire(resolve(DATABASE_DIR, 'package.json')).resolve('prisma/build/index.js');
const ids = new DeterministicTestIds('iam-004-integration');
const password = 'Synthetic MFA test password 2026';

async function deployMigrations(connection: PostgreSqlTestConnection): Promise<void> {
  await execFileAsync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
    cwd: DATABASE_DIR,
    env: { ...process.env, NOMA_ENV: 'test', NOMA_CREDENTIAL_ENVIRONMENT: 'test', DATABASE_URL: connection.databaseUrl },
    timeout: 120_000, windowsHide: true,
  });
}

describe.sequential('IAM-004 PostgreSQL replay and encrypted MFA authority', () => {
  let harness: NomaInfrastructureHarness;
  let database: DatabaseClient;
  let limiter: RedisIdentityAuthRateLimiter;
  let service: PrivilegedMfaService;
  let now = new Date('2026-09-13T12:00:00.000Z');
  let userId: string;
  let emailId: string;
  let rawSessionToken: string;
  let activeFactorId: string;
  let firstRecoveryCode: string;
  let recoveryCodes: readonly string[];
  const tokens = new OpaqueSessionTokenIssuer();
  const hasher = new Argon2idPasswordHasher();

  beforeAll(async () => {
    harness = await startNomaInfrastructureHarness({
      seed: 'iam-004-postgres-redis',
      environmentSource: { NOMA_ENV: 'test', NOMA_CREDENTIAL_ENVIRONMENT: 'test' },
      prepareDatabase: deployMigrations,
    });
    database = createDatabaseClient({ databaseUrl: harness.postgres.connection.databaseUrl, applicationName: 'iam004_tests', maxConnections: 16 });
    limiter = new RedisIdentityAuthRateLimiter({
      redisUrl: harness.redis.connection.redisUrl,
      applicationEnvironment: 'test', correlationSecret: 'synthetic-iam004-correlation-secret-2026',
    });
    const protector = new SensitiveFieldProtector(
      new TestOnlyManagedKeyProvider('synthetic-iam004-test-key-seed', 'test'),
      { principal: 'test', purpose: 'noma:mfa-seed', environment: 'test', operations: ['encrypt', 'decrypt'] },
    );
    service = new PrivilegedMfaService({
      persistence: createMfaAuthorityPersistence(database), passwordHasher: hasher,
      sessionTokens: tokens, rateLimiter: limiter, protector,
      codes: { createTotpSeed, matchTotpTimeStep, generateRecoveryCodes, digestRecoveryCode },
    }, { environment: 'test', now: () => now, nextUuid: () => ids.nextUuid() });
    const identity = createIdentityPersistence(database);
    const created = await identity.registerPasswordIdentity({
      id: ids.nextUuid(), publicReference: 'NOMA-IAM004-01', displayName: 'Synthetic MFA Account',
      transitionId: ids.nextUuid(), occurredAt: now,
      email: { id: ids.nextUuid(), displayEmail: 'mfa-004@noma.test', primary: true },
      credential: { id: ids.nextUuid(), encodedHash: await hasher.hash(password), hashAlgorithm: 'ARGON2ID', hashPolicyVersion: 1, createdAt: now },
    });
    userId = created.user.id;
    emailId = created.email.id;
    await database.userEmail.update({ where: { id: created.email.id }, data: { verifiedAt: now } });
    await database.user.update({ where: { id: userId }, data: { status: 'ACTIVE' } });
    const session = tokens.issue();
    rawSessionToken = session.rawToken;
    await identity.createSession({
      id: ids.nextUuid(), userId, tokenDigest: session.tokenDigest, assurance: 'CONTACT_VERIFIED',
      issuedSecurityVersion: 0, issuedAt: now, idleExpiresAt: new Date(now.getTime() + 60 * 60_000),
      absoluteExpiresAt: new Date(now.getTime() + 24 * 60 * 60_000),
      deviceLabel: 'Synthetic test browser', transitionId: ids.nextUuid(),
    });
  });

  afterAll(async () => {
    if (limiter) await limiter.close();
    if (database) await disconnectDatabaseClient(database);
    if (harness) await harness.stop();
  });

  test('first enrollment requires password and stores only an AAD-bound envelope', async () => {
    await expect(service.startTotpEnrollment({ rawSessionToken, networkSignal: '127.0.0.1' })).rejects.toMatchObject({ code: 'MFA_PROOF_FAILED' });
    await service.reauthenticatePassword({ rawSessionToken, password, networkSignal: '127.0.0.1' });
    const pending = await service.startTotpEnrollment({ rawSessionToken, networkSignal: '127.0.0.1' });
    const secret = new URL(pending.provisioningUri).searchParams.get('secret');
    expect(secret).toBeTruthy();
    const stored = await database.mfaFactor.findUniqueOrThrow({ where: { id: pending.factorId } });
    expect(JSON.stringify(stored)).not.toContain(secret!);
    expect(stored.encryptedSeedEnvelope).toMatchObject({ format: 'noma.encrypted-envelope', version: 1 });
    const decryptor = new SensitiveFieldProtector(
      new TestOnlyManagedKeyProvider('synthetic-iam004-test-key-seed', 'test'),
      { principal: 'test', purpose: 'noma:mfa-seed', environment: 'test', operations: ['decrypt'] },
    );
    const correct = await decryptor.decrypt(stored.encryptedSeedEnvelope, {
      purpose: 'noma:mfa-seed', environment: 'test', bindings: { userId, factorId: pending.factorId, factorType: 'TOTP' },
    });
    expect(correct).toHaveLength(20);
    correct.fill(0);
    await expect(decryptor.decrypt(stored.encryptedSeedEnvelope, {
      purpose: 'noma:mfa-seed', environment: 'test', bindings: { userId: ids.nextUuid(), factorId: pending.factorId, factorType: 'TOTP' },
    })).rejects.toThrow();
    await expect(decryptor.decrypt(stored.encryptedSeedEnvelope, {
      purpose: 'noma:mfa-seed', environment: 'test', bindings: { userId, factorId: ids.nextUuid(), factorType: 'TOTP' },
    })).rejects.toThrow();
    await expect(decryptor.decrypt(stored.encryptedSeedEnvelope, {
      purpose: 'noma:other-purpose', environment: 'test', bindings: { userId, factorId: pending.factorId, factorType: 'TOTP' },
    })).rejects.toThrow();
    await expect(decryptor.decrypt(stored.encryptedSeedEnvelope, {
      purpose: 'noma:mfa-seed', environment: 'production', bindings: { userId, factorId: pending.factorId, factorType: 'TOTP' },
    })).rejects.toThrow();
    const otp = new TOTP({ secret: Secret.fromBase32(secret!), algorithm: 'SHA1', digits: 6, period: 30 }).generate({ timestamp: now.getTime() });
    const confirm = () => service.confirmTotpEnrollment({ rawSessionToken, factorId: pending.factorId, token: otp, networkSignal: '127.0.0.1' });
    const confirmations = await Promise.allSettled([confirm(), confirm()]);
    expect(confirmations.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    expect(confirmations.filter((outcome) => outcome.status === 'rejected')).toHaveLength(1);
    const result = confirmations.find((outcome) => outcome.status === 'fulfilled')!.value;
    rawSessionToken = result.rawSessionToken;
    activeFactorId = pending.factorId;
    firstRecoveryCode = result.recoveryCodes[0]!;
    recoveryCodes = result.recoveryCodes;
    expect(result.recoveryCodes).toHaveLength(10);
    const user = await database.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.securityVersion).toBe(1);
    expect(await database.mfaRecoveryCode.count({ where: { batch: { userId } } })).toBe(10);
    expect(JSON.stringify(await database.mfaRecoveryCode.findMany({ where: { batch: { userId } } }))).not.toContain(firstRecoveryCode);
    expect(await database.outboxEvent.count({ where: { jobName: 'identity.security-notice', aggregateId: emailId } })).toBeGreaterThan(0);
  });

  test('concurrent replay of one TOTP has one PostgreSQL winner', async () => {
    const request = await service.requireSessionStepUp({ rawSessionToken, requirement: 'MFA', contextCode: 'ACCOUNT_SECURITY_CHANGE' });
    expect(request.requirement).toBe('MFA');
    const authority = createMfaAuthorityPersistence(database);
    const context = await authority.readSession(tokens.digest(rawSessionToken), now);
    expect(context?.activeFactor).toBeTruthy();
    const factor = context!.activeFactor!;
    const seed = await new SensitiveFieldProtector(
      new TestOnlyManagedKeyProvider('synthetic-iam004-test-key-seed', 'test'),
      { principal: 'test', purpose: 'noma:mfa-seed', environment: 'test', operations: ['decrypt'] },
    ).decrypt(factor.encryptedSeedEnvelope, { purpose: 'noma:mfa-seed', environment: 'test', bindings: { userId, factorId: factor.id, factorType: 'TOTP' } });
    try {
      now = new Date(now.getTime() + 30_000);
      const token = new TOTP({ secret: Secret.fromHex(seed.toString('hex')), algorithm: 'SHA1', digits: 6, period: 30 }).generate({ timestamp: now.getTime() });
      const step = matchTotpTimeStep(seed, token, now)!;
      const proof = () => authority.recordTotpProof({ tokenDigest: tokens.digest(rawSessionToken), userId,
        securityVersion: 1, factorId: activeFactorId, factorVersion: factor.version,
        matchedTimeStep: step, at: now, transitionId: ids.nextUuid() });
      const outcomes = await Promise.all([proof(), proof()]);
      expect(outcomes.filter(Boolean)).toHaveLength(1);
    } finally { seed.fill(0); }
  });

  test('recovery code is consumed once without removing TOTP', async () => {
    const authority = createMfaAuthorityPersistence(database);
    const context = await authority.readSession(tokens.digest(rawSessionToken), now);
    const codeDigest = digestRecoveryCode(firstRecoveryCode)!;
    const proof = () => authority.consumeRecoveryCodeProof({ tokenDigest: tokens.digest(rawSessionToken), userId,
      securityVersion: 1, factorId: activeFactorId, codeDigest, at: now, transitionId: ids.nextUuid() });
    const outcomes = await Promise.all([proof(), proof()]);
    expect(outcomes.filter(Boolean)).toHaveLength(1);
    expect((await database.mfaFactor.findUniqueOrThrow({ where: { id: activeFactorId } })).status).toBe('ACTIVE');
    expect((await database.mfaRecoveryCode.findUniqueOrThrow({ where: { codeDigest } })).consumedAt).toEqual(now);
    expect(context?.user.securityVersion).toBe(1);
  });

  test('step-up rotates the opaque secret without extending absolute expiry', async () => {
    const predecessor = await database.session.findUniqueOrThrow({ where: { tokenDigest: tokens.digest(rawSessionToken) } });
    const completed = await service.submitRecoveryCodeStepUp({ rawSessionToken, code: recoveryCodes[1]!, networkSignal: '127.0.0.1' });
    expect(completed.status).toBe('COMPLETE');
    expect(completed.rawSessionToken).toBeTruthy();
    const revoked = await database.session.findUniqueOrThrow({ where: { id: predecessor.id } });
    expect(revoked).toMatchObject({ status: 'REVOKED', revocationCode: 'STEP_UP_COMPLETED' });
    rawSessionToken = completed.rawSessionToken!;
    const successor = await database.session.findUniqueOrThrow({ where: { tokenDigest: tokens.digest(rawSessionToken) } });
    expect(successor.absoluteExpiresAt).toEqual(predecessor.absoluteExpiresAt);
    expect(successor.mfaMethod).toBe('RECOVERY_CODE');
    expect(successor.issuedSecurityVersion).toBe(1);
  });

  test('replacement keeps the old factor active until successor confirmation', async () => {
    now = new Date(now.getTime() + 60_000);
    const challenge = await service.requireSessionStepUp({ rawSessionToken, requirement: 'MFA_AND_RECENT', contextCode: 'ACCOUNT_SECURITY_CHANGE' });
    expect(challenge.requirement).toBe('MFA_AND_RECENT');
    expect((await service.submitPasswordStepUp({ rawSessionToken, password, networkSignal: '127.0.0.1' })).status).toBe('PENDING');
    const oldFactor = await database.mfaFactor.findUniqueOrThrow({ where: { id: activeFactorId } });
    const oldSeed = await new SensitiveFieldProtector(
      new TestOnlyManagedKeyProvider('synthetic-iam004-test-key-seed', 'test'),
      { principal: 'test', purpose: 'noma:mfa-seed', environment: 'test', operations: ['decrypt'] },
    ).decrypt(oldFactor.encryptedSeedEnvelope, { purpose: 'noma:mfa-seed', environment: 'test', bindings: { userId, factorId: oldFactor.id, factorType: 'TOTP' } });
    const oldOtp = new TOTP({ secret: Secret.fromHex(oldSeed.toString('hex')), algorithm: 'SHA1', digits: 6, period: 30 }).generate({ timestamp: now.getTime() });
    oldSeed.fill(0);
    const assurance = await service.submitTotpStepUp({ rawSessionToken, token: oldOtp, networkSignal: '127.0.0.1' });
    expect(assurance.status).toBe('COMPLETE');
    rawSessionToken = assurance.rawSessionToken!;
    const pending = await service.startTotpReplacement({ rawSessionToken, networkSignal: '127.0.0.1' });
    expect((await database.mfaFactor.findUniqueOrThrow({ where: { id: activeFactorId } })).status).toBe('ACTIVE');
    const secret = new URL(pending.provisioningUri).searchParams.get('secret')!;
    const successorOtp = new TOTP({ secret: Secret.fromBase32(secret), algorithm: 'SHA1', digits: 6, period: 30 }).generate({ timestamp: now.getTime() });
    const result = await service.confirmTotpEnrollment({ rawSessionToken, factorId: pending.factorId, token: successorOtp, networkSignal: '127.0.0.1' });
    rawSessionToken = result.rawSessionToken;
    expect((await database.mfaFactor.findUniqueOrThrow({ where: { id: activeFactorId } })).status).toBe('REPLACED');
    expect((await database.mfaFactor.findUniqueOrThrow({ where: { id: pending.factorId } })).status).toBe('ACTIVE');
    expect((await database.user.findUniqueOrThrow({ where: { id: userId } })).securityVersion).toBe(2);
    expect((await database.mfaRecoveryCode.findUniqueOrThrow({ where: { codeDigest: digestRecoveryCode(recoveryCodes[2]!)! } })).invalidatedAt).toEqual(now);
    activeFactorId = pending.factorId;
    recoveryCodes = result.recoveryCodes;
  });

  test('regeneration invalidates prior batch and removal clears all sessions', async () => {
    const oldDigest = digestRecoveryCode(recoveryCodes[0]!)!;
    const result = await service.regenerateRecoveryCodes({ rawSessionToken, networkSignal: '127.0.0.1' });
    rawSessionToken = result.rawSessionToken;
    expect((await database.mfaRecoveryCode.findUniqueOrThrow({ where: { codeDigest: oldDigest } })).invalidatedAt).toEqual(now);
    expect((await database.user.findUniqueOrThrow({ where: { id: userId } })).securityVersion).toBe(3);
    await service.removeTotpFactor({ rawSessionToken, networkSignal: '127.0.0.1' });
    expect((await database.mfaFactor.findUniqueOrThrow({ where: { id: activeFactorId } })).status).toBe('REVOKED');
    expect((await database.user.findUniqueOrThrow({ where: { id: userId } })).securityVersion).toBe(4);
    expect(await database.session.count({ where: { userId, status: 'ACTIVE' } })).toBe(0);
    expect((await database.mfaRecoveryCode.findUniqueOrThrow({ where: { codeDigest: digestRecoveryCode(result.recoveryCodes[0]!)! } })).invalidatedAt).toEqual(now);
  });

  test('IAM-003 password recovery revokes sessions but preserves an active MFA factor and unused codes', async () => {
    const identity = createIdentityPersistence(database);
    const created = await identity.registerPasswordIdentity({
      id: ids.nextUuid(), publicReference: 'NOMA-IAM004-REC', displayName: 'Synthetic Recovery Account',
      transitionId: ids.nextUuid(), occurredAt: now,
      email: { id: ids.nextUuid(), displayEmail: 'mfa-recovery-004@noma.test', primary: true },
      credential: { id: ids.nextUuid(), encodedHash: await hasher.hash(password), hashAlgorithm: 'ARGON2ID', hashPolicyVersion: 1, createdAt: now },
    });
    await database.userEmail.update({ where: { id: created.email.id }, data: { verifiedAt: now } });
    await database.user.update({ where: { id: created.user.id }, data: { status: 'ACTIVE' } });
    const factorId = ids.nextUuid();
    const seed = createTotpSeed();
    const envelope = await new SensitiveFieldProtector(
      new TestOnlyManagedKeyProvider('synthetic-iam004-test-key-seed', 'test'),
      { principal: 'test', purpose: 'noma:mfa-seed', environment: 'test', operations: ['encrypt'] },
    ).encrypt(seed.bytes, { purpose: 'noma:mfa-seed', environment: 'test', bindings: { userId: created.user.id, factorId, factorType: 'TOTP' } });
    seed.bytes.fill(0);
    const codeDigest = digestRecoveryCode(generateRecoveryCodes()[0]!)!;
    await database.mfaFactor.create({ data: { id: factorId, userId: created.user.id, status: 'ACTIVE',
      encryptedSeedEnvelope: JSON.parse(JSON.stringify(envelope)), algorithm: 'SHA1', digits: 6, periodSeconds: 30,
      enrollmentExpiresAt: new Date(now.getTime() + 10 * 60_000), activatedAt: now, createdAt: now, updatedAt: now } });
    await database.mfaRecoveryCodeBatch.create({ data: {
      id: ids.nextUuid(), userId: created.user.id, factorId, status: 'ACTIVE', issuedAt: now,
      codes: { create: { id: ids.nextUuid(), codeDigest } },
    } });
    const session = tokens.issue();
    await identity.createSession({ id: ids.nextUuid(), userId: created.user.id, tokenDigest: session.tokenDigest,
      assurance: 'CONTACT_VERIFIED', issuedSecurityVersion: 0, issuedAt: now,
      idleExpiresAt: new Date(now.getTime() + 60 * 60_000), absoluteExpiresAt: new Date(now.getTime() + 24 * 60 * 60_000),
      deviceLabel: 'Synthetic recovery browser', transitionId: ids.nextUuid() });
    const recoveryDigest = createHash('sha256').update('synthetic-recovery-proof').digest('hex');
    await identity.issueIdentityToken({ id: ids.nextUuid(), userEmailId: created.email.id, purpose: 'PASSWORD_RECOVERY',
      tokenDigest: recoveryDigest, issuedSecurityVersion: 0, issuedAt: now, expiresAt: new Date(now.getTime() + 30 * 60_000) });
    const preflight = await identity.preflightPasswordRecovery(recoveryDigest, now);
    expect(preflight).toBeTruthy();
    const completed = await identity.completePasswordRecovery({ ...preflight!, tokenDigest: recoveryDigest,
      encodedHash: await hasher.hash('A different synthetic password 2026'), hashAlgorithm: 'ARGON2ID', hashPolicyVersion: 1,
      completedAt: now, transitionId: ids.nextUuid(), containmentTransitionId: ids.nextUuid(), noticeEventId: ids.nextUuid(),
      recoveryAttemptId: ids.nextUuid(), subjectDigest: createHash('sha256').update('synthetic-subject').digest('hex'),
      correlationId: ids.nextUuid() });
    expect(completed).toBe(true);
    expect((await database.user.findUniqueOrThrow({ where: { id: created.user.id } })).securityVersion).toBe(1);
    expect((await database.session.findUniqueOrThrow({ where: { tokenDigest: session.tokenDigest } })).status).toBe('REVOKED');
    expect((await database.mfaFactor.findUniqueOrThrow({ where: { id: factorId } })).status).toBe('ACTIVE');
    expect((await database.mfaRecoveryCode.findUniqueOrThrow({ where: { codeDigest } })).invalidatedAt).toBeNull();
  });

});
