import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

import {
  createDatabaseClient,
  createIdentityPersistence,
  disconnectDatabaseClient,
  type DatabaseClient,
} from '@noma/database';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { AsyncBarrier } from '../src/async.js';
import {
  startPostgreSqlTestHarness,
  type PostgreSqlTestHarness,
  type PostgreSqlTestConnection,
} from '../src/containers.js';
import { DeterministicTestIds } from '../src/random.js';

const execFileAsync = promisify(execFile);
const ROOT = resolve(import.meta.dirname, '../../..');
const ids = new DeterministicTestIds('iam-001-identity-persistence');
const instant = new Date('2026-08-29T10:00:00.000Z');
const later = (minutes: number) => new Date(instant.getTime() + minutes * 60_000);
const digest = (value: string) => createHash('sha256').update(value).digest('hex');

async function deployMigrations(connection: PostgreSqlTestConnection): Promise<void> {
  const pnpmCli = process.env.npm_execpath;
  const command = pnpmCli ? process.execPath : process.platform === 'win32' ? 'cmd.exe' : 'pnpm';
  const arguments_ = pnpmCli
    ? [pnpmCli, '--filter', '@noma/database', 'db:migrate:deploy']
    : process.platform === 'win32'
      ? ['/d', '/s', '/c', 'pnpm.cmd --filter @noma/database db:migrate:deploy']
      : ['--filter', '@noma/database', 'db:migrate:deploy'];
  await execFileAsync(command, arguments_, {
    cwd: ROOT,
    env: {
      ...process.env,
      NOMA_ENV: 'test',
      NOMA_CREDENTIAL_ENVIRONMENT: 'test',
      DATABASE_URL: connection.databaseUrl,
    },
    timeout: 120_000,
    windowsHide: true,
  });
}

function userInput(email: string, reference: string) {
  return {
    id: ids.nextUuid(),
    publicReference: reference,
    displayName: 'Synthetic Identity',
    transitionId: ids.nextUuid(),
    occurredAt: instant,
    email: {
      id: ids.nextUuid(),
      displayEmail: email,
      primary: true,
    },
  } as const;
}

describe.sequential('IAM-001 real PostgreSQL persistence', () => {
  let harness: PostgreSqlTestHarness;
  let database: DatabaseClient;
  let identity: ReturnType<typeof createIdentityPersistence>;

  beforeAll(async () => {
    harness = await startPostgreSqlTestHarness({
      seed: 'iam-001-postgresql',
      environmentSource: {
        NOMA_ENV: 'test',
        NOMA_CREDENTIAL_ENVIRONMENT: 'test',
      },
    });
    await deployMigrations(harness.connection);
    database = createDatabaseClient({
      databaseUrl: harness.connection.databaseUrl,
      applicationName: 'iam001_tests',
      maxConnections: 12,
    });
    identity = createIdentityPersistence(database);
  });

  afterAll(async () => {
    if (database) await disconnectDatabaseClient(database);
    if (harness) await harness.stop();
  });

  test('User has no global role authority and normalized email lookup is conservative', async () => {
    const created = await identity.createUserIdentity(
      userInput('Person.Name+buyer@Example.COM', 'NOMA-IAM-0001'),
    );
    expect(created.user.status).toBe('PENDING_EMAIL');
    expect(created.user.version).toBe(0);
    expect(created.user.securityVersion).toBe(0);
    expect(created.email.normalizedEmail).toBe('person.name+buyer@example.com');
    expect((await identity.findUserByNormalizedEmail(' PERSON.NAME+BUYER@example.com '))?.id).toBe(
      created.user.id,
    );
    expect(await identity.findUserByNormalizedEmail('personname@example.com')).toBeNull();

    const columns = await database.$queryRaw<Array<{ column_name: string }>>`
      SELECT "column_name" FROM information_schema.columns WHERE "table_name" = 'users'`;
    expect(columns.map((column) => column.column_name)).not.toEqual(
      expect.arrayContaining(['role', 'is_admin', 'membership']),
    );
  });

  test('concurrent same-email creation allows exactly one active identity claim', async () => {
    const barrier = new AsyncBarrier(2);
    const attempt = async (reference: string) => {
      await barrier.arriveAndWait();
      return identity.createUserIdentity(userInput('same-person@noma.test', reference));
    };
    const results = await Promise.allSettled([
      attempt('NOMA-IAM-0002'),
      attempt('NOMA-IAM-0003'),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
  });

  test('primary-email and version constraints reject invalid identity state', async () => {
    const created = await identity.createUserIdentity(userInput('primary@noma.test', 'NOMA-IAM-0004'));
    await expect(database.userEmail.create({
      data: {
        id: ids.nextUuid(),
        userId: created.user.id,
        displayEmail: 'alternate@noma.test',
        normalizedEmail: 'alternate@noma.test',
        primaryAt: later(1),
        createdAt: later(1),
        updatedAt: later(1),
      },
    })).rejects.toBeDefined();

    const invalidBase = {
      id: ids.nextUuid(),
      publicReference: 'NOMA-IAM-0005',
      displayName: 'Invalid Version',
      lastTransitionAt: instant,
      lastTransitionId: ids.nextUuid(),
      createdAt: instant,
      updatedAt: instant,
    };
    await expect(database.user.create({ data: { ...invalidBase, version: -1 } })).rejects.toBeDefined();
    await expect(database.user.create({
      data: { ...invalidBase, id: ids.nextUuid(), publicReference: 'NOMA-IAM-0006', securityVersion: -1 },
    })).rejects.toBeDefined();
  });

  test('only one active password credential exists and only encoded metadata is persisted', async () => {
    const created = await identity.createUserIdentity(userInput('credential@noma.test', 'NOMA-IAM-0007'));
    const encodedHash = '$argon2id$v=19$m=65536,t=3,p=1$c3ludGhldGlj$bm90LXJlYWwtY3JlZGVudGlhbA';
    await identity.storePasswordCredential({
      id: ids.nextUuid(),
      userId: created.user.id,
      encodedHash,
      hashAlgorithm: 'ARGON2ID',
      hashPolicyVersion: 1,
      createdAt: instant,
    });
    await expect(identity.storePasswordCredential({
      id: ids.nextUuid(),
      userId: created.user.id,
      encodedHash: `${encodedHash}2`,
      hashAlgorithm: 'ARGON2ID',
      hashPolicyVersion: 1,
      createdAt: later(1),
    })).rejects.toBeDefined();
    expect((await identity.readActivePasswordCredential(created.user.id))?.encodedHash).toBe(encodedHash);
  });

  test('session resolution rejects duplicates, revocation, expiry, and stale security versions', async () => {
    const created = await identity.createUserIdentity(userInput('session@noma.test', 'NOMA-IAM-0008'));
    const createSession = (tokenDigest: string, idle: Date, absolute: Date) => identity.createSession({
      id: ids.nextUuid(),
      userId: created.user.id,
      tokenDigest,
      assurance: 'AUTHENTICATED',
      issuedSecurityVersion: 0,
      issuedAt: instant,
      idleExpiresAt: idle,
      absoluteExpiresAt: absolute,
      deviceLabel: 'Synthetic browser',
      clientFamily: 'Test Chromium',
      transitionId: ids.nextUuid(),
    });

    const activeDigest = digest('raw-session-secret-active');
    const active = await createSession(activeDigest, later(30), later(60));
    expect((await identity.resolveActiveSessionCandidate(activeDigest, later(5)))?.id).toBe(active.id);
    await expect(createSession(activeDigest, later(30), later(60))).rejects.toBeDefined();

    await identity.revokeSession({
      sessionId: active.id,
      expectedVersion: 0,
      revokedAt: later(6),
      revocationCode: 'USER_REVOKED',
      transitionId: ids.nextUuid(),
    });
    expect(await identity.resolveActiveSessionCandidate(activeDigest, later(7))).toBeNull();

    const idleDigest = digest('raw-session-secret-idle');
    await createSession(idleDigest, later(10), later(60));
    expect(await identity.resolveActiveSessionCandidate(idleDigest, later(11))).toBeNull();

    const absoluteDigest = digest('raw-session-secret-absolute');
    await createSession(absoluteDigest, later(20), later(20));
    expect(await identity.resolveActiveSessionCandidate(absoluteDigest, later(21))).toBeNull();

    const staleDigest = digest('raw-session-secret-stale-version');
    await createSession(staleDigest, later(30), later(60));
    await database.user.update({
      where: { id: created.user.id },
      data: { securityVersion: { increment: 1 }, version: { increment: 1 } },
    });
    expect(await identity.resolveActiveSessionCandidate(staleDigest, later(5))).toBeNull();
  });

  test('identity tokens are unique, expiring, invalidatable, replay-safe, and atomically one-time', async () => {
    const created = await identity.createUserIdentity(userInput('token@noma.test', 'NOMA-IAM-0009'));
    const issue = (tokenDigest: string, expiresAt = later(30)) => identity.issueIdentityToken({
      id: ids.nextUuid(),
      userEmailId: created.email.id,
      purpose: 'EMAIL_VERIFICATION',
      tokenDigest,
      issuedSecurityVersion: 0,
      issuedAt: instant,
      expiresAt,
    });

    const duplicateDigest = digest('raw-verification-link-duplicate');
    await issue(duplicateDigest);
    await expect(issue(duplicateDigest)).rejects.toBeDefined();

    const expiredDigest = digest('raw-verification-link-expired');
    await issue(expiredDigest, later(2));
    expect(await identity.consumeIdentityToken({
      tokenDigest: expiredDigest,
      purpose: 'EMAIL_VERIFICATION',
      consumedAt: later(3),
    })).toBeNull();

    const invalidatedDigest = digest('raw-verification-link-invalidated');
    const invalidated = await issue(invalidatedDigest);
    await database.identityToken.update({
      where: { id: invalidated.id },
      data: { invalidatedAt: later(1), invalidationCode: 'REPLACED' },
    });
    expect(await identity.consumeIdentityToken({
      tokenDigest: invalidatedDigest,
      purpose: 'EMAIL_VERIFICATION',
      consumedAt: later(2),
    })).toBeNull();

    const oneTimeDigest = digest('raw-verification-link-one-time');
    await issue(oneTimeDigest);
    const barrier = new AsyncBarrier(2);
    const consume = async () => {
      await barrier.arriveAndWait();
      return identity.consumeIdentityToken({
        tokenDigest: oneTimeDigest,
        purpose: 'EMAIL_VERIFICATION',
        consumedAt: later(1),
      });
    };
    const results = await Promise.all([consume(), consume()]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await identity.consumeIdentityToken({
      tokenDigest: oneTimeDigest,
      purpose: 'EMAIL_VERIFICATION',
      consumedAt: later(2),
    })).toBeNull();
  });

  test('recovery evidence supports unknown subjects, is append-only, and blocks cascading deletion', async () => {
    const created = await identity.createUserIdentity(userInput('recovery@noma.test', 'NOMA-IAM-0010'));
    const attempt = await identity.recordRecoveryAttempt({
      id: ids.nextUuid(),
      userId: null,
      subjectDigest: digest('unknown-recovery-subject'),
      correlationId: 'iam001-recovery-correlation',
      methodCode: 'EMAIL_LINK',
      outcomeCode: 'NO_ACCOUNT_DISCLOSED',
      assuranceEvidenceCode: null,
      containmentCode: null,
      occurredAt: instant,
    });
    expect(attempt.userId).toBeNull();
    await expect(database.recoveryAttempt.update({
      where: { id: attempt.id },
      data: { outcomeCode: 'CHANGED' },
    })).rejects.toBeDefined();
    await expect(database.recoveryAttempt.delete({ where: { id: attempt.id } })).rejects.toBeDefined();
    await expect(database.user.delete({ where: { id: created.user.id } })).rejects.toBeDefined();
  });

  test('raw password, session, verification, and recovery secrets are absent from identity storage', async () => {
    const prohibitedColumns = await database.$queryRaw<Array<{ column_name: string }>>`
      SELECT "column_name"
      FROM information_schema.columns
      WHERE "table_name" IN ('users', 'user_emails', 'credentials', 'sessions', 'identity_tokens', 'recovery_attempts')
        AND "column_name" IN ('plaintext_password', 'raw_password', 'session_token', 'raw_session_token', 'recovery_token', 'verification_token')`;
    expect(prohibitedColumns).toEqual([]);

    const serialized = await database.$queryRaw<Array<{ identity_storage: string }>>`
      SELECT concat_ws('|',
        (SELECT coalesce(string_agg("encoded_hash", '|'), '') FROM "credentials"),
        (SELECT coalesce(string_agg("token_digest", '|'), '') FROM "sessions"),
        (SELECT coalesce(string_agg("token_digest", '|'), '') FROM "identity_tokens"),
        (SELECT coalesce(string_agg("subject_digest", '|'), '') FROM "recovery_attempts")
      ) AS "identity_storage"`;
    for (const rawSecret of [
      'raw-password-do-not-store',
      'raw-session-secret-active',
      'raw-verification-link-one-time',
      'unknown-recovery-subject',
    ]) {
      expect(serialized[0]?.identity_storage).not.toContain(rawSecret);
    }
  });
});
