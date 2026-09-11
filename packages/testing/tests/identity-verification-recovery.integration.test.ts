import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

import { createDatabaseClient, createIdentityPersistence, createOutboxEventEnvelope, disconnectDatabaseClient, type DatabaseClient } from '@noma/database';
import { createQueueJobEnvelope } from '@noma/contracts';
import { QueueContractRegistry, type BullMqPublisher } from '@noma/integrations';
import { IDENTITY_EMAIL_DELIVERY_CONTRACT } from '@noma/platform/identity';
import type { TransactionalEmailProviderPort } from '@noma/platform/providers';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { createIdentityEmailQueueRegistrations } from '../../../apps/worker/src/identity-email-handler.js';
import { OutboxDispatcher } from '../../../apps/worker/src/outbox-dispatcher.js';
import { startNomaInfrastructureHarness, type NomaInfrastructureHarness, type PostgreSqlTestConnection } from '../src/containers.js';
import { createProviderSimulatorHarness } from '../src/providers.js';
import { DeterministicTestIds } from '../src/random.js';

const execFileAsync = promisify(execFile);
const ROOT = resolve(import.meta.dirname, '../../..');
const DATABASE_DIR = resolve(ROOT, 'packages/database');
const prismaCli = createRequire(resolve(DATABASE_DIR, 'package.json')).resolve('prisma/build/index.js');
const ids = new DeterministicTestIds('iam-003-authority');
const instant = new Date('2026-09-11T10:00:00.000Z');
const digest = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

async function deployMigrations(connection: PostgreSqlTestConnection): Promise<void> {
  await execFileAsync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
    cwd: DATABASE_DIR,
    env: { ...process.env, NOMA_ENV: 'test', NOMA_CREDENTIAL_ENVIRONMENT: 'test', DATABASE_URL: connection.databaseUrl },
    timeout: 120_000,
    windowsHide: true,
  });
}

describe.sequential('IAM-003 real PostgreSQL and Redis authority', () => {
  let harness: NomaInfrastructureHarness;
  let database: DatabaseClient;
  let identity: ReturnType<typeof createIdentityPersistence>;
  let registeredEmailId: string;
  let registrationEventId: string;
  let registeredUserVersion: number;

  beforeAll(async () => {
    harness = await startNomaInfrastructureHarness({ seed: 'iam-003-infrastructure', environmentSource: { NOMA_ENV: 'test', NOMA_CREDENTIAL_ENVIRONMENT: 'test' }, prepareDatabase: deployMigrations });
    database = createDatabaseClient({ databaseUrl: harness.postgres.connection.databaseUrl, applicationName: 'iam003_tests', maxConnections: 16 });
    identity = createIdentityPersistence(database);
  });

  afterAll(async () => {
    if (database) await disconnectDatabaseClient(database);
    if (harness) await harness.stop();
  });

  test('registration atomically queues only a safe verification intent', async () => {
    const eventId = ids.nextUuid();
    const created = await identity.registerPasswordIdentity({
      id: ids.nextUuid(), publicReference: 'NOMA-IAM003-01', displayName: 'Synthetic IAM 003', locale: 'en-NG', transitionId: ids.nextUuid(), occurredAt: instant,
      email: { id: ids.nextUuid(), displayEmail: 'iam003@noma.test', primary: true },
      credential: { id: ids.nextUuid(), encodedHash: '$argon2id$v=19$m=65536,t=3,p=1$c3ludGhldGlj$bm90LXJlYWw', hashAlgorithm: 'ARGON2ID', hashPolicyVersion: 1, createdAt: instant },
      verificationDelivery: { eventId, correlationId: ids.nextUuid(), occurredAt: instant, purpose: 'EMAIL_VERIFICATION' },
    });
    const outbox = await database.outboxEvent.findUniqueOrThrow({ where: { id: eventId } });
    expect(outbox).toMatchObject({ jobName: 'identity.email-delivery', aggregateId: created.email.id, status: 'PENDING' });
    expect(outbox.payload).toEqual({ userEmailId: created.email.id, purpose: 'EMAIL_VERIFICATION', operationId: eventId });
    expect(JSON.stringify(outbox)).not.toContain('iam003@noma.test');
    registeredEmailId = created.email.id;
    registrationEventId = eventId;
    registeredUserVersion = created.user.version;
  });

  test('Worker mints the raw proof only in memory and simulator evidence remains safe', async () => {
    const providers = createProviderSimulatorHarness({
      seed: 'iam-003-provider',
      now: instant,
      scripts: {
        'email.send': [{ result: { kind: 'accepted', providerReference: 'sim-email-iam003', data: { status: 'accepted' } } }],
      },
    });
    const registrations = createIdentityEmailQueueRegistrations({
      database,
      provider: providers.ports.email,
      publicWebOrigin: 'https://web.noma.test',
      applicationEnvironment: 'test',
      workerIdentity: 'iam003-test-worker',
      now: () => instant,
    });
    const registration = registrations.find((entry) => entry.contract.jobName === IDENTITY_EMAIL_DELIVERY_CONTRACT.jobName);
    expect(registration).toBeDefined();
    const event = createOutboxEventEnvelope({
      eventId: registrationEventId,
      eventType: 'identity.email-delivery.requested',
      eventVersion: 1,
      aggregateType: 'identity-user-email',
      aggregateId: registeredEmailId,
      aggregateVersion: registeredUserVersion,
      payload: { userEmailId: registeredEmailId, purpose: 'EMAIL_VERIFICATION' as const, operationId: registrationEventId },
      privacyClassification: 'account-private',
      servicePrincipal: 'noma_api_identity',
      correlationId: ids.nextUuid(),
      occurredAt: instant,
      availableAt: instant,
    });
    await registration!.handler(createQueueJobEnvelope(IDENTITY_EMAIL_DELIVERY_CONTRACT, event), { attemptsMade: 0 });
    const stored = await database.identityToken.findFirstOrThrow({ where: { userEmailId: registeredEmailId, purpose: 'EMAIL_VERIFICATION', invalidatedAt: null } });
    expect(stored.tokenDigest).toMatch(/^[0-9a-f]{64}$/);
    const snapshot = providers.snapshot();
    expect(snapshot.calls).toHaveLength(1);
    expect(JSON.stringify(snapshot)).not.toContain('iam003@noma.test');
    expect(JSON.stringify(snapshot)).not.toContain('https://');
    expect(JSON.stringify(snapshot)).not.toMatch(/[A-Za-z0-9_-]{43}/);
  });

  test('provider-disabled dispatch preserves eligible email work without publishing or dead-lettering it', async () => {
    const eventId = ids.nextUuid();
    await identity.registerPasswordIdentity({
      id: ids.nextUuid(), publicReference: 'NOMA-IAM003-DEFER', displayName: 'Deferred Provider', locale: 'en-NG', transitionId: ids.nextUuid(), occurredAt: instant,
      email: { id: ids.nextUuid(), displayEmail: 'deferred@noma.test', primary: true },
      credential: { id: ids.nextUuid(), encodedHash: '$argon2id$v=19$m=65536,t=3,p=1$c3ludGhldGlj$bm90LXJlYWw', hashAlgorithm: 'ARGON2ID', hashPolicyVersion: 1, createdAt: instant },
      verificationDelivery: { eventId, correlationId: ids.nextUuid(), occurredAt: instant, purpose: 'EMAIL_VERIFICATION' },
    });
    let publications = 0;
    const publisher = {
      publish: async () => { publications += 1; },
    } as unknown as BullMqPublisher;
    const dispatcher = new OutboxDispatcher({
      database,
      publisher,
      registry: new QueueContractRegistry(),
      metrics: { record: () => undefined },
      identity: 'iam003-deferred-worker',
      deferredJobNames: [IDENTITY_EMAIL_DELIVERY_CONTRACT.jobName],
    });

    expect(await dispatcher.dispatchOnce(instant)).toBe(1);
    expect(publications).toBe(0);
    expect(await database.outboxEvent.findUniqueOrThrow({ where: { id: eventId } })).toMatchObject({
      status: 'PENDING',
      deadLetteredAt: null,
      lastFailureCode: 'JOB_CONTRACT_DEFERRED',
    });
  });

  test('an ambiguous crash re-delivery does not mint a second provider attempt', async () => {
    const eventId = ids.nextUuid();
    const created = await identity.registerPasswordIdentity({
      id: ids.nextUuid(), publicReference: 'NOMA-IAM003-AMBIG', displayName: 'Ambiguous Delivery', locale: 'en-NG', transitionId: ids.nextUuid(), occurredAt: instant,
      email: { id: ids.nextUuid(), displayEmail: 'ambiguous@noma.test', primary: true },
      credential: { id: ids.nextUuid(), encodedHash: '$argon2id$v=19$m=65536,t=3,p=1$c3ludGhldGlj$bm90LXJlYWw', hashAlgorithm: 'ARGON2ID', hashPolicyVersion: 1, createdAt: instant },
      verificationDelivery: { eventId, correlationId: ids.nextUuid(), occurredAt: instant, purpose: 'EMAIL_VERIFICATION' },
    });
    let providerCalls = 0;
    const provider: TransactionalEmailProviderPort = {
      sendEmail: async () => {
        providerCalls += 1;
        throw new Error('synthetic transport outcome is unknown');
      },
      mapDeliveryEvent: async () => { throw new Error('not used by this bounded test'); },
      lookupSuppression: async () => { throw new Error('not used by this bounded test'); },
    };
    const registration = createIdentityEmailQueueRegistrations({
      database,
      provider,
      publicWebOrigin: 'https://web.noma.test',
      applicationEnvironment: 'test',
      workerIdentity: 'iam003-ambiguous-worker',
      now: () => instant,
    }).find((entry) => entry.contract.jobName === IDENTITY_EMAIL_DELIVERY_CONTRACT.jobName)!;
    const event = createOutboxEventEnvelope({
      eventId,
      eventType: 'identity.email-delivery.requested',
      eventVersion: 1,
      aggregateType: 'identity-user-email',
      aggregateId: created.email.id,
      aggregateVersion: created.user.version,
      payload: { userEmailId: created.email.id, purpose: 'EMAIL_VERIFICATION' as const, operationId: eventId },
      privacyClassification: 'account-private',
      servicePrincipal: 'noma_api_identity',
      correlationId: ids.nextUuid(),
      occurredAt: instant,
      availableAt: instant,
    });
    const job = createQueueJobEnvelope(IDENTITY_EMAIL_DELIVERY_CONTRACT, event);

    await expect(registration.handler(job, { attemptsMade: 0 })).rejects.toThrow('synthetic transport outcome is unknown');
    await expect(registration.handler(job, { attemptsMade: 0 })).rejects.toThrow('A prior delivery attempt ended without durable provider evidence');
    expect(providerCalls).toBe(1);
    expect(await database.outboxEvent.findUniqueOrThrow({ where: { id: eventId } })).toMatchObject({
      status: 'DEAD_LETTERED',
      lastFailureCode: 'EMAIL_DELIVERY_ACCEPTANCE_UNKNOWN',
    });
  });

  test('replacement and concurrent verification leave one authoritative winner', async () => {
    const candidate = await identity.readIdentityDeliveryCandidate((await database.userEmail.findFirstOrThrow({ where: { normalizedEmail: 'iam003@noma.test' } })).id, 'EMAIL_VERIFICATION');
    expect(candidate).not.toBeNull();
    const firstId = ids.nextUuid();
    const first = await identity.issueReplacementIdentityToken({ id: firstId, userEmailId: candidate!.email.id, purpose: 'EMAIL_VERIFICATION', tokenDigest: digest('verification-one'), issuedSecurityVersion: candidate!.user.securityVersion, issuedAt: instant, expiresAt: new Date(instant.getTime() + 30 * 60_000) });
    expect(first.disposition).toBe('issued');
    const secondId = ids.nextUuid();
    const secondDigest = digest('verification-two');
    await identity.issueReplacementIdentityToken({ id: secondId, userEmailId: candidate!.email.id, purpose: 'EMAIL_VERIFICATION', tokenDigest: secondDigest, issuedSecurityVersion: candidate!.user.securityVersion, issuedAt: new Date(instant.getTime() + 1_000), expiresAt: new Date(instant.getTime() + 30 * 60_000) });
    await expect(identity.issueReplacementIdentityToken({ id: ids.nextUuid(), userEmailId: candidate!.email.id, purpose: 'EMAIL_VERIFICATION', tokenDigest: digest('out-of-order-older-delivery'), issuedSecurityVersion: candidate!.user.securityVersion, issuedAt: new Date(instant.getTime() + 500), expiresAt: new Date(instant.getTime() + 30 * 60_000) }))
      .resolves.toEqual({ disposition: 'superseded' });
    expect(await identity.consumeIdentityToken({ tokenDigest: digest('verification-one'), purpose: 'EMAIL_VERIFICATION', consumedAt: new Date(instant.getTime() + 2_000) })).toBeNull();

    const sessionDigest = digest('pre-verification-session');
    await identity.createSession({ id: ids.nextUuid(), userId: candidate!.user.id, tokenDigest: sessionDigest, assurance: 'AUTHENTICATED', issuedSecurityVersion: 0, issuedAt: instant, idleExpiresAt: new Date(instant.getTime() + 86_400_000), absoluteExpiresAt: new Date(instant.getTime() + 172_800_000), deviceLabel: 'Synthetic browser', transitionId: ids.nextUuid() });
    const confirm = () => identity.confirmEmailVerification({ tokenDigest: secondDigest, verifiedAt: new Date(instant.getTime() + 3_000), transitionId: ids.nextUuid(), noticeEventId: ids.nextUuid(), correlationId: ids.nextUuid(), presentedSessionTokenDigest: sessionDigest });
    const outcomes = await Promise.all([confirm(), confirm()]);
    expect(outcomes.filter(Boolean)).toHaveLength(1);
    expect((await database.user.findUniqueOrThrow({ where: { id: candidate!.user.id } })).status).toBe('ACTIVE');
    expect((await database.session.findFirstOrThrow({ where: { tokenDigest: sessionDigest } })).assurance).toBe('CONTACT_VERIFIED');
    expect(await database.outboxEvent.count({ where: { jobName: 'identity.security-notice', aggregateId: candidate!.email.id } })).toBe(1);
  });

  test('recovery completion has one winner and revokes every existing session', async () => {
    const email = await database.userEmail.findFirstOrThrow({ where: { normalizedEmail: 'iam003@noma.test' }, include: { user: true } });
    for (const value of ['session-a', 'session-b']) {
      await identity.createSession({ id: ids.nextUuid(), userId: email.userId, tokenDigest: digest(value), assurance: 'CONTACT_VERIFIED', issuedSecurityVersion: email.user.securityVersion, issuedAt: instant, idleExpiresAt: new Date(instant.getTime() + 86_400_000), absoluteExpiresAt: new Date(instant.getTime() + 172_800_000), deviceLabel: 'Synthetic browser', transitionId: ids.nextUuid() });
    }
    const recoveryDigest = digest('recovery-proof');
    await identity.issueReplacementIdentityToken({ id: ids.nextUuid(), userEmailId: email.id, purpose: 'PASSWORD_RECOVERY', tokenDigest: recoveryDigest, issuedSecurityVersion: email.user.securityVersion, issuedAt: instant, expiresAt: new Date(instant.getTime() + 30 * 60_000) });
    const preflight = await identity.preflightPasswordRecovery(recoveryDigest, new Date(instant.getTime() + 1_000));
    expect(preflight).not.toBeNull();
    const complete = () => identity.completePasswordRecovery({ ...preflight!, tokenDigest: recoveryDigest, encodedHash: '$argon2id$v=19$m=65536,t=3,p=1$cm90YXRlZA$cm90YXRlZA', hashAlgorithm: 'ARGON2ID', hashPolicyVersion: 1, completedAt: new Date(instant.getTime() + 2_000), containmentTransitionId: ids.nextUuid(), transitionId: ids.nextUuid(), noticeEventId: ids.nextUuid(), recoveryAttemptId: ids.nextUuid(), subjectDigest: recoveryDigest, correlationId: ids.nextUuid() });
    const outcomes = await Promise.all([complete(), complete()]);
    expect(outcomes.filter(Boolean)).toHaveLength(1);
    const user = await database.user.findUniqueOrThrow({ where: { id: email.userId } });
    expect(user).toMatchObject({ status: 'ACTIVE', securityVersion: email.user.securityVersion + 1, statusReasonCode: 'PASSWORD_RECOVERY_COMPLETED' });
    expect(await database.session.count({ where: { userId: email.userId, revokedAt: null } })).toBe(0);
    expect(await database.recoveryAttempt.count({ where: { userId: email.userId, outcomeCode: 'RECOVERY_COMPLETED' } })).toBe(1);
    await expect(identity.rotatePasswordSession({
      session: { id: ids.nextUuid(), userId: email.userId, tokenDigest: digest('stale-password-race'), assurance: 'CONTACT_VERIFIED', issuedSecurityVersion: email.user.securityVersion, issuedAt: new Date(instant.getTime() + 3_000), idleExpiresAt: new Date(instant.getTime() + 86_400_000), absoluteExpiresAt: new Date(instant.getTime() + 172_800_000), deviceLabel: 'Stale password race', transitionId: ids.nextUuid() },
      revokedAt: new Date(instant.getTime() + 3_000), revocationTransitionId: ids.nextUuid(),
    })).rejects.toThrow('authentication authority changed concurrently');
    expect(await database.session.count({ where: { userId: email.userId, revokedAt: null } })).toBe(0);
  });
});
