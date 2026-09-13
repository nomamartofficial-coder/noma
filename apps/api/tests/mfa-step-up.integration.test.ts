import 'reflect-metadata';

import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

import { Module, type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { ServerRuntimeConfig } from '@noma/config/server';
import { createDatabaseClient, createIdentityPersistence, createMfaAuthorityPersistence, disconnectDatabaseClient, type DatabaseClient } from '@noma/database';
import { RedisIdentityAuthRateLimiter } from '@noma/integrations';
import { TestOnlyManagedKeyProvider } from '@noma/integrations/testing';
import { IdentityAuthenticationService, PrivilegedMfaService } from '@noma/platform/identity';
import { Argon2idPasswordHasher, OfflinePasswordPolicy, OpaqueSessionTokenIssuer, SensitiveFieldProtector, createTotpSeed, digestRecoveryCode, generateRecoveryCodes, matchTotpTimeStep } from '@noma/security';
import { expect, test } from 'vitest';

import { startNomaInfrastructureHarness, type PostgreSqlTestConnection } from '../../../packages/testing/src/containers.js';
import { DeterministicTestIds } from '../../../packages/testing/src/random.js';
import { AuthController } from '../dist/auth/auth.controller.js';
import { AuthRuntimeService } from '../dist/auth/auth-runtime.service.js';
import { API_RUNTIME_CONFIG } from '../dist/runtime-dependencies.service.js';

const execFileAsync = promisify(execFile);
const ROOT = resolve(import.meta.dirname, '../../..');
const DATABASE_DIR = resolve(ROOT, 'packages/database');
const prismaCli = createRequire(resolve(DATABASE_DIR, 'package.json')).resolve('prisma/build/index.js');
const instant = new Date('2026-09-13T12:00:00.000Z');
const password = 'Synthetic HTTP step-up password 2026';
const webOrigin = 'https://shop.noma.test';
const digest = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

async function deployMigrations(connection: PostgreSqlTestConnection): Promise<void> {
  await execFileAsync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
    cwd: DATABASE_DIR,
    env: { ...process.env, NOMA_ENV: 'test', NOMA_CREDENTIAL_ENVIRONMENT: 'test', DATABASE_URL: connection.databaseUrl },
    timeout: 120_000,
    windowsHide: true,
  });
}

test('HTTP password step-up rotates an opaque cookie without exposing it in JSON or PostgreSQL', async () => {
  const harness = await startNomaInfrastructureHarness({
    seed: 'iam-004-http-step-up',
    environmentSource: { NOMA_ENV: 'test', NOMA_CREDENTIAL_ENVIRONMENT: 'test' },
    prepareDatabase: deployMigrations,
  });
  let database: DatabaseClient | undefined;
  let limiter: RedisIdentityAuthRateLimiter | undefined;
  let app: INestApplication | undefined;
  try {
    database = createDatabaseClient({ databaseUrl: harness.postgres.connection.databaseUrl, applicationName: 'iam004_http_test', maxConnections: 12 });
    limiter = new RedisIdentityAuthRateLimiter({
      redisUrl: harness.redis.connection.redisUrl,
      applicationEnvironment: 'test',
      correlationSecret: 'synthetic-iam004-http-correlation-secret-2026',
    });
    const ids = new DeterministicTestIds('iam-004-http-step-up');
    const tokens = new OpaqueSessionTokenIssuer();
    const hasher = new Argon2idPasswordHasher();
    const identity = createIdentityPersistence(database);
    const created = await identity.registerPasswordIdentity({
      id: ids.nextUuid(), publicReference: 'NOMA-IAM004-HTTP', displayName: 'Synthetic HTTP Account',
      transitionId: ids.nextUuid(), occurredAt: instant,
      email: { id: ids.nextUuid(), displayEmail: 'mfa-http-004@noma.test', primary: true },
      credential: { id: ids.nextUuid(), encodedHash: await hasher.hash(password), hashAlgorithm: 'ARGON2ID', hashPolicyVersion: 1, createdAt: instant },
    });
    await database.userEmail.update({ where: { id: created.email.id }, data: { verifiedAt: instant } });
    await database.user.update({ where: { id: created.user.id }, data: { status: 'ACTIVE' } });
    const predecessor = tokens.issue();
    const absoluteExpiresAt = new Date(instant.getTime() + 24 * 60 * 60_000);
    await identity.createSession({
      id: ids.nextUuid(), userId: created.user.id, tokenDigest: predecessor.tokenDigest,
      assurance: 'CONTACT_VERIFIED', issuedSecurityVersion: 0, issuedAt: instant,
      idleExpiresAt: new Date(instant.getTime() + 60 * 60_000), absoluteExpiresAt,
      deviceLabel: 'Synthetic test browser', transitionId: ids.nextUuid(),
    });

    const mfa = new PrivilegedMfaService({
      persistence: createMfaAuthorityPersistence(database), passwordHasher: hasher,
      sessionTokens: tokens, rateLimiter: limiter,
      protector: new SensitiveFieldProtector(
        new TestOnlyManagedKeyProvider('synthetic-iam004-http-key', 'test'),
        { principal: 'test', purpose: 'noma:mfa-seed', environment: 'test', operations: ['encrypt', 'decrypt'] },
      ),
      codes: { createTotpSeed, matchTotpTimeStep, generateRecoveryCodes, digestRecoveryCode },
    }, { environment: 'test', now: () => instant, nextUuid: () => ids.nextUuid() });
    const authentication = await IdentityAuthenticationService.create({
      persistence: identity, passwordPolicy: new OfflinePasswordPolicy(), passwordHasher: hasher,
      sessionTokens: tokens, rateLimiter: limiter,
    }, {
      idleMilliseconds: 30 * 60_000, absoluteMilliseconds: 24 * 60 * 60_000,
      touchAfterMilliseconds: 60_000, now: () => instant,
      nextUuid: () => ids.nextUuid(), nextPublicReference: () => 'NOMA-IAM004-HTTP-OTHER',
    });
    await mfa.requireSessionStepUp({
      rawSessionToken: predecessor.rawToken, requirement: 'RECENT_AUTH', contextCode: 'ACCOUNT_SECURITY_CHANGE',
    });

    // Only the cookie policy is synthetic production; all authority remains on isolated test infrastructure.
    const config = {
      applicationEnvironment: 'production', publicWebOrigin: webOrigin,
      authentication: { absoluteMilliseconds: 24 * 60 * 60_000 },
    } as ServerRuntimeConfig;
    const runtime = {
      configured: () => true, authentication: () => authentication,
      mfaConfigured: () => true, mfa: () => mfa,
    } as AuthRuntimeService;
    class TestAuthModule {}
    Module({
      controllers: [AuthController],
      providers: [
        { provide: API_RUNTIME_CONFIG, useValue: config },
        { provide: AuthRuntimeService, useValue: runtime },
      ],
    })(TestAuthModule);
    app = await NestFactory.create(TestAuthModule, { logger: false });
    await app.listen(0, '127.0.0.1');
    const apiOrigin = await app.getUrl();
    const predecessorCookie = `__Host-noma_session=${predecessor.rawToken}`;
    const request = (path: string, cookie: string) => fetch(`${apiOrigin}${path}`, {
      headers: { Origin: webOrigin, Cookie: cookie }, signal: AbortSignal.timeout(5_000),
    });

    const before = await request('/api/v1/auth/session', predecessorCookie);
    expect(before.status).toBe(200);
    expect(await before.json()).toMatchObject({ userId: created.user.id });

    const response = await fetch(`${apiOrigin}/api/v1/auth/step-up/password`, {
      method: 'POST',
      headers: { Origin: webOrigin, Cookie: predecessorCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }), signal: AbortSignal.timeout(5_000),
    });
    expect(response.status).toBe(200);
    const setCookie = response.headers.get('set-cookie');
    expect(setCookie).toBeTruthy();
    const [cookiePair, ...attributes] = setCookie!.split(';').map((part) => part.trim());
    expect(cookiePair).toMatch(/^__Host-noma_session=[A-Za-z0-9_-]{43}$/u);
    const successorToken = cookiePair!.slice('__Host-noma_session='.length);
    expect(successorToken).not.toBe(predecessor.rawToken);
    expect(attributes).toContain('Secure');
    expect(attributes).toContain('HttpOnly');
    expect(attributes).toContain('SameSite=Lax');
    expect(attributes).toContain('Path=/');
    expect(attributes.some((part) => /^Domain=/iu.test(part))).toBe(false);
    const responseText = await response.text();
    expect(JSON.parse(responseText)).toEqual({ status: 'COMPLETE' });
    expect(responseText).not.toContain(successorToken);

    const oldSession = await request('/api/v1/auth/session', predecessorCookie);
    expect(oldSession.status).toBe(401);
    expect(await oldSession.json()).toEqual({ code: 'AUTHENTICATION_FAILED' });
    const newSession = await request('/api/v1/auth/session', cookiePair!);
    expect(newSession.status).toBe(200);
    expect(await newSession.json()).toMatchObject({ userId: created.user.id });

    const oldRow = await database.session.findUniqueOrThrow({ where: { tokenDigest: predecessor.tokenDigest } });
    const successorDigest = digest(successorToken);
    const newRow = await database.session.findUniqueOrThrow({ where: { tokenDigest: successorDigest } });
    expect(oldRow).toMatchObject({ status: 'REVOKED', revocationCode: 'STEP_UP_COMPLETED' });
    expect(newRow.tokenDigest).toBe(successorDigest);
    expect(newRow.absoluteExpiresAt).toEqual(oldRow.absoluteExpiresAt);
    expect(newRow.absoluteExpiresAt).toEqual(absoluteExpiresAt);
    const stored = await database.$queryRaw<Array<{ rowJson: string }>>`
      SELECT row_to_json(s)::text AS "rowJson" FROM "sessions" s WHERE s."token_digest" = ${successorDigest}`;
    expect(stored).toHaveLength(1);
    expect(stored[0]!.rowJson).not.toContain(successorToken);
  } finally {
    if (app) await app.close();
    if (limiter) await limiter.close();
    if (database) await disconnectDatabaseClient(database);
    await harness.stop();
  }
});
