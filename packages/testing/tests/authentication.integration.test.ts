import { createHash } from 'node:crypto';
import { execFile, spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

import { createDatabaseClient, createIdentityPersistence, disconnectDatabaseClient, type DatabaseClient } from '@noma/database';
import { AuthRateLimiterUnavailableError, RedisIdentityAuthRateLimiter } from '@noma/integrations';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { AsyncBarrier } from '../src/async.js';
import { startNomaInfrastructureHarness, type NomaInfrastructureHarness, type PostgreSqlTestConnection } from '../src/containers.js';
import { DeterministicTestIds } from '../src/random.js';

const execFileAsync = promisify(execFile);
const ROOT = resolve(import.meta.dirname, '../../..');
const DATABASE_DIR = resolve(ROOT, 'packages/database');
const requireFromDatabase = createRequire(resolve(DATABASE_DIR, 'package.json'));
const prismaCli = requireFromDatabase.resolve('prisma/build/index.js');
const ids = new DeterministicTestIds('iam-002-authentication');
const instant = new Date('2026-08-31T12:00:00.000Z');
const digest = (value: string) => createHash('sha256').update(value).digest('hex');

async function reservePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolveReady, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolveReady);
  });
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  await new Promise<void>((resolveClosed, reject) => server.close((error) => error ? reject(error) : resolveClosed()));
  return port;
}

function stopChild(child: ChildProcess): void {
  if (!child.pid || child.exitCode !== null) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore', windowsHide: true });
  } else {
    child.kill('SIGTERM');
  }
}

async function waitForReady(origin: string, child: ChildProcess): Promise<void> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`API exited before readiness with code ${child.exitCode}`);
    try {
      const response = await fetch(`${origin}/health/ready`, { signal: AbortSignal.timeout(1_000) });
      if (response.ok) return;
    } catch {}
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw new Error('API did not become ready within 30 seconds');
}

async function deployMigrations(connection: PostgreSqlTestConnection): Promise<void> {
  await execFileAsync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
    cwd: DATABASE_DIR,
    env: { ...process.env, NOMA_ENV: 'test', NOMA_CREDENTIAL_ENVIRONMENT: 'test', DATABASE_URL: connection.databaseUrl },
    timeout: 120_000,
    windowsHide: true,
  });
}

function registration(email: string, reference: string) {
  return {
    id: ids.nextUuid(), publicReference: reference, displayName: 'Synthetic Password Identity', locale: 'en-NG',
    transitionId: ids.nextUuid(), occurredAt: instant,
    email: { id: ids.nextUuid(), displayEmail: email, primary: true },
    credential: {
      id: ids.nextUuid(), encodedHash: '$argon2id$v=19$m=65536,t=3,p=1$c3ludGhldGlj$bm90LXJlYWw',
      hashAlgorithm: 'ARGON2ID', hashPolicyVersion: 1, createdAt: instant,
    },
  } as const;
}

describe.sequential('IAM-002 real PostgreSQL and Redis authority', () => {
  let harness: NomaInfrastructureHarness;
  let database: DatabaseClient;
  let identity: ReturnType<typeof createIdentityPersistence>;

  beforeAll(async () => {
    harness = await startNomaInfrastructureHarness({
      seed: 'iam-002-infrastructure',
      environmentSource: { NOMA_ENV: 'test', NOMA_CREDENTIAL_ENVIRONMENT: 'test' },
      prepareDatabase: deployMigrations,
    });
    database = createDatabaseClient({ databaseUrl: harness.postgres.connection.databaseUrl, applicationName: 'iam002_tests', maxConnections: 12 });
    identity = createIdentityPersistence(database);
  });

  afterAll(async () => {
    if (database) await disconnectDatabaseClient(database);
    if (harness) await harness.stop();
  });

  test('registration commits User, primary UserEmail, and PASSWORD Credential atomically', async () => {
    const created = await identity.registerPasswordIdentity(registration('atomic@noma.test', 'NOMA-AUTH-0001'));
    expect(created.user.status).toBe('PENDING_EMAIL');
    expect(created.email.primaryAt).toEqual(instant);
    expect(created.email.verifiedAt).toBeNull();
    expect(created.credential).toMatchObject({ userId: created.user.id, hashAlgorithm: 'ARGON2ID', hashPolicyVersion: 1 });

    const invalid = registration('rollback@noma.test', 'NOMA-AUTH-0002');
    await expect(identity.registerPasswordIdentity({ ...invalid, credential: { ...invalid.credential, id: 'invalid-uuid' } })).rejects.toThrow();
    expect(await identity.findUserByNormalizedEmail('rollback@noma.test')).toBeNull();
    expect(await database.userEmail.count({ where: { normalizedEmail: 'rollback@noma.test' } })).toBe(0);
  });

  test('concurrent same normalized email produces one complete identity', async () => {
    const barrier = new AsyncBarrier(2);
    const attempt = async (reference: string) => {
      await barrier.arriveAndWait();
      return identity.registerPasswordIdentity(registration('same-auth@noma.test', reference));
    };
    const results = await Promise.allSettled([attempt('NOMA-AUTH-0003'), attempt('NOMA-AUTH-0004')]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    const owner = await identity.findUserByNormalizedEmail('same-auth@noma.test');
    expect(owner).not.toBeNull();
    expect(await database.credential.count({ where: { userId: owner!.id, type: 'PASSWORD', revokedAt: null } })).toBe(1);
  });

  test('rotation is atomic and touch cannot resurrect a concurrently revoked session', async () => {
    const registered = await identity.registerPasswordIdentity(registration('session-auth@noma.test', 'NOMA-AUTH-0005'));
    const oldDigest = digest('synthetic-old-session-secret');
    const old = await identity.createSession({
      id: ids.nextUuid(), userId: registered.user.id, tokenDigest: oldDigest, assurance: 'AUTHENTICATED',
      issuedSecurityVersion: 0, issuedAt: instant,
      idleExpiresAt: new Date(instant.getTime() + 7 * 86_400_000),
      absoluteExpiresAt: new Date(instant.getTime() + 30 * 86_400_000),
      deviceLabel: 'Synthetic browser', transitionId: ids.nextUuid(),
    });
    const newDigest = digest('synthetic-new-session-secret');
    const rotated = await identity.rotatePasswordSession({
      replacedTokenDigest: oldDigest, revokedAt: new Date(instant.getTime() + 60_000), revocationTransitionId: ids.nextUuid(),
      session: {
        id: ids.nextUuid(), userId: registered.user.id, tokenDigest: newDigest, assurance: 'AUTHENTICATED',
        issuedSecurityVersion: 0, issuedAt: new Date(instant.getTime() + 60_000),
        idleExpiresAt: new Date(instant.getTime() + 7 * 86_400_000),
        absoluteExpiresAt: new Date(instant.getTime() + 30 * 86_400_000),
        deviceLabel: 'Synthetic browser', transitionId: ids.nextUuid(),
      },
    });
    expect(await identity.resolveAuthenticatedSession(oldDigest, new Date(instant.getTime() + 120_000))).toBeNull();
    expect((await identity.resolveAuthenticatedSession(newDigest, new Date(instant.getTime() + 120_000)))?.session.id).toBe(rotated.id);

    const barrier = new AsyncBarrier(2);
    const touch = async () => {
      await barrier.arriveAndWait();
      return identity.touchSession({
        sessionId: rotated.id, expectedVersion: rotated.version, touchedAt: new Date(instant.getTime() + 180_000),
        idleExpiresAt: new Date(instant.getTime() + 7 * 86_400_000), transitionId: ids.nextUuid(),
      });
    };
    const revoke = async () => {
      await barrier.arriveAndWait();
      return identity.revokeSessionByTokenDigest(newDigest, new Date(instant.getTime() + 180_000), 'USER_SIGN_OUT', ids.nextUuid());
    };
    await Promise.all([touch(), revoke()]);
    expect(await identity.resolveAuthenticatedSession(newDigest, new Date(instant.getTime() + 240_000))).toBeNull();
    expect((await database.session.findUniqueOrThrow({ where: { id: old.id } })).revocationCode).toBe('SESSION_ROTATED');
  });

  test('privacy-safe Redis limits do not permanently block unrelated identities on a shared network', async () => {
    const limiter = new RedisIdentityAuthRateLimiter({
      redisUrl: harness.redis.connection.redisUrl,
      applicationEnvironment: 'test',
      correlationSecret: 'synthetic-auth-correlation-secret-32-characters',
    });
    for (let index = 0; index < 10; index += 1) {
      await expect(limiter.check({ action: 'SIGN_IN', normalizedEmail: 'target@noma.test', networkSignal: 'campus-nat' }))
        .resolves.toMatchObject({ allowed: true });
    }
    await expect(limiter.check({ action: 'SIGN_IN', normalizedEmail: 'target@noma.test', networkSignal: 'campus-nat' }))
      .resolves.toMatchObject({ allowed: false });
    await expect(limiter.check({ action: 'SIGN_IN', normalizedEmail: 'unrelated@noma.test', networkSignal: 'campus-nat' }))
      .resolves.toMatchObject({ allowed: true });
    const keys = await harness.redis.executeCli('KEYS', 'noma:test:auth-rate:*');
    expect(keys.output).not.toContain('target@noma.test');
    expect(keys.output).not.toContain('campus-nat');
    await limiter.close();
  });

  test('limiter outage fails new auth closed without affecting PostgreSQL session authority', async () => {
    const isolated = await startNomaInfrastructureHarness({ seed: 'iam-002-outage', environmentSource: { NOMA_ENV: 'test', NOMA_CREDENTIAL_ENVIRONMENT: 'test' } });
    const limiter = new RedisIdentityAuthRateLimiter({
      redisUrl: isolated.redis.connection.redisUrl,
      applicationEnvironment: 'test',
      correlationSecret: 'synthetic-auth-correlation-secret-32-characters',
    });
    await isolated.redis.stop();
    await expect(limiter.check({ action: 'SIGN_IN', normalizedEmail: 'person@noma.test', networkSignal: 'campus-nat' }))
      .rejects.toBeInstanceOf(AuthRateLimiterUnavailableError);
    await limiter.close();
    await isolated.postgres.stop();
  });

  test('real Nest API provides enumeration-safe registration, sign-in, session, origin, and sign-out contracts', async () => {
    const port = await reservePort();
    const origin = `http://127.0.0.1:${port}`;
    let output = '';
    const child = spawn(process.execPath, [resolve(ROOT, 'apps/api/dist/main.js')], {
      cwd: ROOT,
      env: {
        ...process.env,
        NOMA_ENV: 'test', NOMA_CREDENTIAL_ENVIRONMENT: 'test', HOST: '127.0.0.1', PORT: String(port),
        PUBLIC_WEB_ORIGIN: 'http://127.0.0.1:3000', API_PUBLIC_URL: origin,
        DATABASE_URL: harness.postgres.connection.databaseUrl, REDIS_URL: harness.redis.connection.redisUrl,
        SESSION_SECRET: 'synthetic-session-secret-with-more-than-32-characters',
        AUTH_CORRELATION_SECRET: 'synthetic-auth-correlation-secret-with-more-than-32-characters',
        NOMA_TELEMETRY_MODE: 'in-memory',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    child.stdout?.on('data', (chunk) => { output += String(chunk); });
    child.stderr?.on('data', (chunk) => { output += String(chunk); });
    const password = 'A private synthetic passphrase for IAM 002';
    try {
      await waitForReady(origin, child);
      const request = (path: string, init: RequestInit = {}) => fetch(`${origin}${path}`, {
        ...init,
        headers: { Origin: 'http://127.0.0.1:3000', 'Content-Type': 'application/json', ...init.headers },
      });
      const registrationBody = JSON.stringify({ email: 'api-auth@noma.test', password, displayName: 'API Synthetic User' });
      const firstRegistration = await request('/api/v1/auth/register', { method: 'POST', body: registrationBody });
      const duplicateRegistration = await request('/api/v1/auth/register', { method: 'POST', body: registrationBody });
      expect(firstRegistration.status).toBe(202);
      expect(await firstRegistration.json()).toEqual({ status: 'REQUEST_ACCEPTED' });
      expect(duplicateRegistration.status).toBe(202);
      expect(await duplicateRegistration.json()).toEqual({ status: 'REQUEST_ACCEPTED' });
      expect(firstRegistration.headers.get('set-cookie')).toBeNull();

      const wrong = await request('/api/v1/auth/sign-in', { method: 'POST', body: JSON.stringify({ email: 'api-auth@noma.test', password: 'A wrong synthetic passphrase' }) });
      const unknown = await request('/api/v1/auth/sign-in', { method: 'POST', body: JSON.stringify({ email: 'unknown-api@noma.test', password: 'A wrong synthetic passphrase' }) });
      expect(wrong.status).toBe(401);
      expect(unknown.status).toBe(401);
      expect(await wrong.json()).toEqual(await unknown.json());

      const signedIn = await request('/api/v1/auth/sign-in', { method: 'POST', body: JSON.stringify({ email: 'api-auth@noma.test', password }) });
      expect(signedIn.status).toBe(200);
      const principal = await signedIn.json() as Record<string, unknown>;
      expect(principal).toMatchObject({ accountStatus: 'PENDING_EMAIL', assurance: 'AUTHENTICATED' });
      expect(principal).not.toHaveProperty('role');
      expect(principal).not.toHaveProperty('capabilities');
      const setCookie = signedIn.headers.get('set-cookie') ?? '';
      expect(setCookie).toContain('noma_session=');
      expect(setCookie).toContain('HttpOnly');
      expect(setCookie).toContain('SameSite=Lax');
      expect(setCookie).not.toContain(password);
      const browserCookie = setCookie.split(';', 1)[0] ?? '';

      const session = await request('/api/v1/auth/session', { headers: { Cookie: browserCookie } });
      expect(session.status).toBe(200);
      expect(await session.json()).toMatchObject({ userId: principal.userId, sessionId: principal.sessionId });

      const crossOrigin = await fetch(`${origin}/api/v1/auth/sign-out`, { method: 'POST', headers: { Origin: 'https://attacker.invalid', Cookie: browserCookie } });
      expect(crossOrigin.status).toBe(403);
      const signOut = await request('/api/v1/auth/sign-out', { method: 'POST', headers: { Cookie: browserCookie } });
      expect(signOut.status).toBe(204);
      expect(signOut.headers.get('set-cookie')).toContain('Max-Age=0');
      const revoked = await request('/api/v1/auth/session', { headers: { Cookie: browserCookie } });
      expect(revoked.status).toBe(401);

      const serialized = await database.$queryRaw<Array<{ stored: string }>>`
        SELECT concat_ws('|',
          (SELECT coalesce(string_agg("encoded_hash", '|'), '') FROM "credentials"),
          (SELECT coalesce(string_agg("token_digest", '|'), '') FROM "sessions")
        ) AS "stored"`;
      expect(serialized[0]?.stored).not.toContain(password);
      expect(serialized[0]?.stored).not.toContain(browserCookie.split('=', 2)[1] ?? 'missing');
      expect(output).not.toContain(password);
      expect(output).not.toContain(browserCookie);
    } finally {
      stopChild(child);
    }
  });
});
