import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

import { createDatabaseClient, disconnectDatabaseClient } from '@noma/database';
import { afterEach, describe, expect, test } from 'vitest';

import {
  startNomaInfrastructureHarness,
  type NomaInfrastructureHarness,
  type PostgreSqlTestConnection,
} from '../src/containers.js';

const execFileAsync = promisify(execFile);
const ROOT = resolve(import.meta.dirname, '../../..');
const SAFE_ENVIRONMENT = Object.freeze({
  NOMA_ENV: 'test',
  NOMA_CREDENTIAL_ENVIRONMENT: 'test',
});
const harnesses: NomaInfrastructureHarness[] = [];

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

afterEach(async () => {
  const active = harnesses.splice(0);
  const results = await Promise.allSettled(active.map((harness) => harness.stop()));
  const failures = results.filter((result) => result.status === 'rejected');
  if (failures.length > 0) throw new AggregateError(failures.map((result) => result.reason));
});

describe('real PostgreSQL and Redis Testcontainers harness', () => {
  test('applies migrations, enforces Redis policy, and isolates concurrent harnesses', async () => {
    const [first, second] = await Promise.all([
      startNomaInfrastructureHarness({
        seed: 'dev006-first',
        environmentSource: SAFE_ENVIRONMENT,
        prepareDatabase: deployMigrations,
      }),
      startNomaInfrastructureHarness({
        seed: 'dev006-second',
        environmentSource: SAFE_ENVIRONMENT,
      }),
    ]);
    harnesses.push(first, second);

    expect(first.postgres.connection.databaseUrl).not.toBe(second.postgres.connection.databaseUrl);
    expect(first.redis.connection.redisUrl).not.toBe(second.redis.connection.redisUrl);
    expect(first.runtimeEnvironment.NOMA_ENV).toBe('test');
    expect(first.runtimeEnvironment.NOMA_CREDENTIAL_ENVIRONMENT).toBe('test');

    const firstDatabase = createDatabaseClient({
      databaseUrl: first.postgres.connection.databaseUrl,
      applicationName: 'dev006_first',
    });
    const secondDatabase = createDatabaseClient({
      databaseUrl: second.postgres.connection.databaseUrl,
      applicationName: 'dev006_second',
    });
    try {
      const migratedTables = await firstDatabase.$queryRawUnsafe<Array<{ table_name: string }>>(
        `SELECT table_name FROM information_schema.tables
         WHERE table_schema = 'public'
           AND table_name IN ('outbox_events', 'job_executions', 'job_execution_attempts')
         ORDER BY table_name`,
      );
      expect(migratedTables.map((row) => row.table_name)).toEqual([
        'job_execution_attempts',
        'job_executions',
        'outbox_events',
      ]);

      await firstDatabase.$executeRawUnsafe('CREATE TABLE dev006_isolation_probe (id integer PRIMARY KEY)');
      const isolated = await secondDatabase.$queryRawUnsafe<Array<{ table_name: string | null }>>(
        "SELECT to_regclass('public.dev006_isolation_probe')::text AS table_name",
      );
      expect(isolated[0]?.table_name).toBeNull();
    } finally {
      await Promise.all([
        disconnectDatabaseClient(firstDatabase),
        disconnectDatabaseClient(secondDatabase),
      ]);
    }

    const redisPolicy = await first.redis.executeCli('CONFIG', 'GET', 'maxmemory-policy');
    const appendOnly = await first.redis.executeCli('CONFIG', 'GET', 'appendonly');
    expect(redisPolicy.output).toContain('noeviction');
    expect(appendOnly.output).toContain('yes');
    await first.redis.executeCli('SET', 'dev006:isolation', 'first');
    const secondValue = await second.redis.executeCli('GET', 'dev006:isolation');
    expect(secondValue.output.trim()).not.toBe('first');

    const serialized = JSON.stringify(first);
    expect(serialized).not.toContain(first.postgres.connection.databaseUrl);
    expect(serialized).not.toContain(first.redis.connection.redisUrl);
    expect(serialized).toContain('synthetic-test-only');
    expect(JSON.stringify(first.postgres.connection)).toContain('[REDACTED_URL]');
    expect(JSON.stringify(first.redis.connection)).toContain('[REDACTED_URL]');
    expect(JSON.stringify(first.runtimeEnvironment)).toContain('[REDACTED_URL]');
    expect(JSON.stringify(first.runtimeEnvironment)).not.toContain(first.postgres.connection.databaseUrl);
  });

  test('preparation failure is redacted and cleans partially started infrastructure', async () => {
    await expect(startNomaInfrastructureHarness({
      seed: 'dev006-failed-preparation',
      environmentSource: SAFE_ENVIRONMENT,
      prepareDatabase: async (connection) => {
        throw new Error(`${connection.databaseUrl} preparation failed`);
      },
    })).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('[REDACTED]');
      expect((error as Error).message).not.toMatch(/postgres(?:ql)?:\/\//i);
      return true;
    });
  });

  test('production environments, existing URLs, and live credentials fail before Docker access', async () => {
    await expect(startNomaInfrastructureHarness({
      environmentSource: { NOMA_ENV: 'production' },
    })).rejects.toThrow(/prohibited/);
    await expect(startNomaInfrastructureHarness({
      environmentSource: { DATABASE_URL: 'postgresql://external.invalid/noma' },
    })).rejects.toThrow(/pre-existing/);
    await expect(startNomaInfrastructureHarness({
      environmentSource: { PAYSTACK_SECRET_KEY: 'sk_live_prohibited' },
    })).rejects.toThrow(/live provider/);
  });
});
