import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

import {
  blockEncryptionMigrationRun,
  checkpointEncryptionMigrationRecord,
  claimEncryptionMigrationRun,
  createDatabaseClient,
  createEncryptionMigrationRun,
  disconnectDatabaseClient,
  reconcileEncryptionMigrationRun,
  resumeBlockedEncryptionMigrationRun,
  runInDatabaseTransaction,
  type DatabaseClient,
} from '@noma/database';
import { TestOnlyManagedKeyProvider } from '@noma/integrations/testing';
import { SensitiveFieldProtector } from '@noma/security';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { startPostgreSqlTestHarness, type PostgreSqlTestHarness } from '../src/containers.js';

const execute = promisify(execFile);
const root = resolve(import.meta.dirname, '../../..');
const databaseDir = resolve(root, 'packages/database');
const requireFromDatabase = createRequire(resolve(databaseDir, 'package.json'));
const prismaCli = requireFromDatabase.resolve('prisma/build/index.js');
const initial = new Date('2026-09-12T10:00:00.000Z');
const later = (milliseconds: number) => new Date(initial.getTime() + milliseconds);
const context = {
  purpose: 'noma:mfa-seed', environment: 'test',
  bindings: { userId: 'synthetic-user-sec003', factorId: 'synthetic-factor-sec003', factorType: 'TOTP' },
} as const;
const capability = { principal: 'test', purpose: context.purpose, environment: context.environment, operations: ['encrypt', 'decrypt', 'rewrap'] } as const;

describe.sequential('SEC-003 real PostgreSQL migration and privacy', () => {
  let harness: PostgreSqlTestHarness;
  let database: DatabaseClient;

  beforeAll(async () => {
    harness = await startPostgreSqlTestHarness({ seed: 'sec003-postgresql', environmentSource: { NOMA_ENV: 'test', NOMA_CREDENTIAL_ENVIRONMENT: 'test' } });
    await execute(process.execPath, [prismaCli, 'migrate', 'deploy'], {
      cwd: databaseDir,
      env: { ...process.env, NOMA_ENV: 'test', NOMA_CREDENTIAL_ENVIRONMENT: 'test', DATABASE_URL: harness.connection.databaseUrl },
      timeout: 120_000,
      windowsHide: true,
    });
    database = createDatabaseClient({ databaseUrl: harness.connection.databaseUrl, applicationName: 'sec003_tests', maxConnections: 8 });
    await database.$executeRaw`CREATE TABLE sec003_test_values (id UUID PRIMARY KEY, envelope JSONB NOT NULL, version INTEGER NOT NULL DEFAULT 0)`;
  });

  afterAll(async () => {
    if (database) await disconnectDatabaseClient(database);
    if (harness) await harness.stop();
  });

  test('synthetic seed is encrypted before persistence and absent from raw PostgreSQL state', async () => {
    const provider = new TestOnlyManagedKeyProvider('sec003-postgres-seed', 'test');
    const protector = new SensitiveFieldProtector(provider, capability);
    const secret = Buffer.from('synthetic-totp-seed-never-durable');
    const envelope = await protector.encrypt(secret, context);
    const id = '00000000-0000-4000-8000-000000000301';
    await database.$executeRaw`INSERT INTO sec003_test_values (id, envelope) VALUES (${id}::uuid, ${JSON.stringify(envelope)}::jsonb)`;
    const rows = await database.$queryRaw<Array<{ envelope: string }>>`SELECT envelope::text AS envelope FROM sec003_test_values WHERE id = ${id}::uuid`;
    expect(rows[0]?.envelope).not.toContain(secret.toString());
    expect(rows[0]?.envelope).not.toContain('synthetic-user-sec003');
    expect(await protector.decrypt(JSON.parse(rows[0]!.envelope), context)).toEqual(secret);
    const columns = await database.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'encryption_migration_runs' ORDER BY column_name`;
    expect(columns.map((row) => row.column_name)).not.toContain('plaintext_key');
  });

  test('lease contention has one winner; CAS failure rolls back field and checkpoint', async () => {
    const id = '00000000-0000-4000-8000-000000000302';
    await createEncryptionMigrationRun(database, { id, consumerId: 'sec003.synthetic.mfa', environment: 'test', sourcePolicyId: 'envelope-v1-key-a', targetPolicyId: 'envelope-v1-key-b', correlationId: 'sec003-migration-test' });
    const claims = await Promise.all([
      claimEncryptionMigrationRun(database, { runId: id, leaseOwner: 'operator-a', now: initial }),
      claimEncryptionMigrationRun(database, { runId: id, leaseOwner: 'operator-b', now: initial }),
    ]);
    expect(claims.filter(Boolean)).toHaveLength(1);
    const claimed = claims.find(Boolean)!;
    await expect(runInDatabaseTransaction(database, (tx) => checkpointEncryptionMigrationRecord(tx, {
      runId: id, leaseOwner: claimed.leaseOwner!, expectedVersion: claimed.version, expectedCursor: null,
      nextCursor: 'value-1', outcome: 'migrated', now: later(1_000), applyRecordCas: async () => false,
    }))).rejects.toBeDefined();
    const unchanged = await database.encryptionMigrationRun.findUniqueOrThrow({ where: { id } });
    expect(unchanged.cursor).toBeNull();
    expect(unchanged.migratedCount).toBe(0n);
    expect(await claimEncryptionMigrationRun(database, { runId: id, leaseOwner: 'operator-c', now: later(30_001) })).not.toBeNull();
  });

  test('rewrap CAS commits with checkpoint; restart observes durable state and reconciles', async () => {
    const runId = '00000000-0000-4000-8000-000000000302';
    const valueId = '00000000-0000-4000-8000-000000000303';
    const provider = new TestOnlyManagedKeyProvider('sec003-postgres-seed', 'test');
    const protector = new SensitiveFieldProtector(provider, capability);
    const original = await protector.encrypt(Buffer.from('synthetic-migration-seed'), context);
    const replacement = await protector.rewrap(original, context, 'test-only:key:successor');
    await database.$executeRaw`INSERT INTO sec003_test_values (id, envelope) VALUES (${valueId}::uuid, ${JSON.stringify(original)}::jsonb)`;
    const run = await database.encryptionMigrationRun.findUniqueOrThrow({ where: { id: runId } });
    await expect(runInDatabaseTransaction(database, (tx) => checkpointEncryptionMigrationRecord(tx, {
      runId, leaseOwner: run.leaseOwner!, expectedVersion: run.version, expectedCursor: null,
      nextCursor: valueId, outcome: 'migrated', now: later(30_400),
      applyRecordCas: async (transaction) => {
        const count = await transaction.$executeRaw`
          UPDATE sec003_test_values SET envelope = ${JSON.stringify(replacement)}::jsonb
          WHERE id = ${valueId}::uuid AND version = 99`;
        return count === 1;
      },
    }))).rejects.toBeDefined();
    expect((await database.encryptionMigrationRun.findUniqueOrThrow({ where: { id: runId } })).cursor).toBeNull();
    const checkpoint = await runInDatabaseTransaction(database, (tx) => checkpointEncryptionMigrationRecord(tx, {
      runId, leaseOwner: run.leaseOwner!, expectedVersion: run.version, expectedCursor: null,
      nextCursor: valueId, outcome: 'migrated', now: later(30_500),
      applyRecordCas: async (transaction) => {
        const count = await transaction.$executeRaw`
          UPDATE sec003_test_values SET envelope = ${JSON.stringify(replacement)}::jsonb, version = version + 1
          WHERE id = ${valueId}::uuid AND envelope = ${JSON.stringify(original)}::jsonb AND version = 0`;
        return count === 1;
      },
    }));
    expect(checkpoint.cursor).toBe(valueId);
    expect(checkpoint.migratedCount).toBe(1n);
    const resumed = await database.encryptionMigrationRun.findUniqueOrThrow({ where: { id: runId } });
    expect(resumed.cursor).toBe(valueId);
    const row = await database.$queryRaw<Array<{ envelope: string; version: number }>>`SELECT envelope::text AS envelope, version FROM sec003_test_values WHERE id = ${valueId}::uuid`;
    expect(row[0]?.version).toBe(1);
    expect(row[0]?.envelope).not.toContain('synthetic-migration-seed');
    const successor = new SensitiveFieldProtector(new TestOnlyManagedKeyProvider('sec003-postgres-seed', 'test', 'test-only:key:successor'), capability);
    expect((await successor.decrypt(JSON.parse(row[0]!.envelope), context)).toString()).toBe('synthetic-migration-seed');
    const currentId = '00000000-0000-4000-8000-000000000304';
    const currentEnvelope = await successor.encrypt(Buffer.from('synthetic-already-current'), context);
    await database.$executeRaw`INSERT INTO sec003_test_values (id, envelope) VALUES (${currentId}::uuid, ${JSON.stringify(currentEnvelope)}::jsonb)`;
    const currentCheckpoint = await runInDatabaseTransaction(database, (tx) => checkpointEncryptionMigrationRecord(tx, {
      runId, leaseOwner: run.leaseOwner!, expectedVersion: checkpoint.version, expectedCursor: valueId,
      nextCursor: currentId, outcome: 'already-current', now: later(30_750),
    }));
    expect(currentCheckpoint.alreadyCurrentCount).toBe(1n);
    const reconciled = await reconcileEncryptionMigrationRun(database, {
      runId, leaseOwner: run.leaseOwner!, expectedVersion: currentCheckpoint.version, now: later(31_000),
      probe: {
        countOutdated: async () => {
          const count = await database.$queryRaw<Array<{ count: bigint }>>`SELECT count(*)::bigint AS count FROM sec003_test_values WHERE id IN (${valueId}::uuid, ${currentId}::uuid) AND envelope->>'keyReference' = 'test-only:key:initial'`;
          return count[0]!.count;
        },
        targetWritePolicyActive: async () => true,
      },
    });
    expect(reconciled.status).toBe('COMPLETED');
    expect(reconciled.remainingCount).toBe(0n);
  });

  test('blocked KMS work requires explicit resume and resolved failure before completion', async () => {
    const id = '00000000-0000-4000-8000-000000000305';
    await createEncryptionMigrationRun(database, { id, consumerId: 'sec003.synthetic.blocked', environment: 'test', sourcePolicyId: 'envelope-v1-key-a', targetPolicyId: 'envelope-v1-key-b', correlationId: 'sec003-blocked-test' });
    const claimed = (await claimEncryptionMigrationRun(database, { runId: id, leaseOwner: 'operator-d', now: initial }))!;
    await blockEncryptionMigrationRun(database, { runId: id, leaseOwner: 'operator-d', expectedVersion: claimed.version, failureCode: 'KEY_UNAVAILABLE', now: later(1_000) });
    const blocked = await database.encryptionMigrationRun.findUniqueOrThrow({ where: { id } });
    expect(blocked.status).toBe('BLOCKED');
    expect(blocked.failedCount).toBe(1n);
    expect(await claimEncryptionMigrationRun(database, { runId: id, leaseOwner: 'operator-e', now: later(60_000) })).toBeNull();
    await resumeBlockedEncryptionMigrationRun(database, { runId: id, expectedVersion: blocked.version });
    const resumed = (await claimEncryptionMigrationRun(database, { runId: id, leaseOwner: 'operator-e', now: later(61_000) }))!;
    const checkpoint = await runInDatabaseTransaction(database, (tx) => checkpointEncryptionMigrationRecord(tx, {
      runId: id, leaseOwner: 'operator-e', expectedVersion: resumed.version, expectedCursor: null,
      nextCursor: 'resolved-record', outcome: 'already-current', resolvesFailure: true, now: later(61_500),
    }));
    expect(checkpoint.failedCount).toBe(0n);
    const complete = await reconcileEncryptionMigrationRun(database, {
      runId: id, leaseOwner: 'operator-e', expectedVersion: checkpoint.version, now: later(62_000),
      probe: { countOutdated: async () => 0n, targetWritePolicyActive: async () => true },
    });
    expect(complete.status).toBe('COMPLETED');
  });
});
