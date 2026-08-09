import { execFile } from 'node:child_process';
import { basename, resolve } from 'node:path';
import { promisify } from 'node:util';
import { defineQueueJobContract } from '@noma/contracts';
import {
  createDatabaseClient,
  createOutboxEvent,
  createOutboxEventEnvelope,
  disconnectDatabaseClient,
  runInDatabaseTransaction,
} from '@noma/database';
import { BullMqPublisher, QueueContractRegistry, createBullMqWorkers } from '@noma/integrations';
import { afterEach, describe, expect, test } from 'vitest';
import { RuntimeDependenciesService } from '../../../apps/api/src/runtime-dependencies.service.js';
import { HealthService } from '../../../apps/api/src/health/health.service.js';
import { createDatabaseBackedQueueHandler } from '../../../apps/worker/src/database-job-handler.js';
import { OutboxDispatcher } from '../../../apps/worker/src/outbox-dispatcher.js';
import { loadServerEnvironment } from '../../config/src/server.js';
import { startServerObservability, type ServerObservability } from '../../observability/src/server.js';
import { pollUntil } from '../src/async.js';
import {
  startNomaInfrastructureHarness,
  type NomaInfrastructureHarness,
  type PostgreSqlTestConnection,
} from '../src/containers.js';

const execFileAsync = promisify(execFile);
const ROOT = resolve(import.meta.dirname, '../../..');
const harnesses: NomaInfrastructureHarness[] = [];
const telemetryRuntimes: ServerObservability[] = [];

async function deployMigrations(connection: PostgreSqlTestConnection): Promise<void> {
  const pnpmCliFromEnv = process.env.npm_execpath;
  const pnpmCliBaseName = pnpmCliFromEnv ? basename(pnpmCliFromEnv).toLowerCase() : '';
  const isTrustedPnpmCli =
    pnpmCliBaseName === 'pnpm' || pnpmCliBaseName === 'pnpm.cjs' || pnpmCliBaseName === 'pnpm.js';
  const pnpmCli = isTrustedPnpmCli ? pnpmCliFromEnv : undefined;
  const command = pnpmCli ? process.execPath : process.platform === 'win32' ? 'cmd.exe' : 'pnpm';
  const arguments_ = pnpmCli
    ? [pnpmCli, '--filter', '@noma/database', 'db:migrate:deploy']
    : process.platform === 'win32'
      ? ['/d', '/s', '/c', 'pnpm.cmd --filter @noma/database db:migrate:deploy']
      : ['--filter', '@noma/database', 'db:migrate:deploy'];
  await execFileAsync(command, arguments_, {
    cwd: ROOT,
    env: { ...process.env, NOMA_ENV: 'test', NOMA_CREDENTIAL_ENVIRONMENT: 'test', DATABASE_URL: connection.databaseUrl },
    timeout: 120_000,
    windowsHide: true,
  });
}

afterEach(async () => {
  await Promise.allSettled(telemetryRuntimes.splice(0).map((runtime) => runtime.shutdown()));
  await Promise.allSettled(harnesses.splice(0).map((harness) => harness.stop()));
});

describe('DEV-010 real infrastructure observability', () => {
  test('connects API, outbox, BullMQ, Worker, idempotency evidence, and honest readiness', async () => {
    const harness = await startNomaInfrastructureHarness({
      seed: 'dev010-observability',
      environmentSource: { NOMA_ENV: 'test', NOMA_CREDENTIAL_ENVIRONMENT: 'test' },
      prepareDatabase: deployMigrations,
    });
    harnesses.push(harness);
    const telemetry = await startServerObservability({
      serviceName: 'noma-api', environment: 'test', mode: 'in-memory', writeLog: () => undefined,
      exportIntervalMilliseconds: 5_000,
    });
    telemetryRuntimes.push(telemetry);
    const database = createDatabaseClient({
      databaseUrl: harness.postgres.connection.databaseUrl,
      applicationName: 'dev010_observability',
      connectionTimeoutMilliseconds: 2_000,
      statementTimeoutMilliseconds: 2_000,
    });
    const publisher = new BullMqPublisher({
      redisUrl: harness.redis.connection.redisUrl,
      applicationEnvironment: 'test',
      telemetry,
    });
    const contract = defineQueueJobContract({
      queueName: 'maintenance',
      jobName: 'foundation.observe-probe',
      schemaVersion: 1,
      privacyClassification: 'audit',
      authorizedServicePrincipals: ['noma_api'],
      idempotency: { identity: 'outbox-event-id', completedDelivery: 'no-op', effectCommit: 'same-database-transaction' },
      successEvidence: { store: 'postgresql-job-executions', outcome: 'completed' },
      observabilityAttributes: ['queue', 'job', 'outcome'],
      retry: { attempts: 3, backoff: 'exponential', backoffDelayMilliseconds: 250, jitter: 0.5, timeoutMilliseconds: 5_000 },
      deadLetter: { owner: 'operations', attentionAfterMilliseconds: 60_000, recoveryAction: 'review-and-replay' },
      parsePayload(value: unknown) {
        if (typeof value !== 'object' || value === null || (value as { probe?: unknown }).probe !== 'dev010') {
          throw new Error('invalid observability probe payload');
        }
        return { probe: 'dev010' as const };
      },
    });
    const registry = new QueueContractRegistry();
    registry.register(createDatabaseBackedQueueHandler({
      database,
      workerIdentity: 'noma_worker_test',
      contract,
      operation: async () => undefined,
    }));
    const workers = createBullMqWorkers({
      redisUrl: harness.redis.connection.redisUrl,
      applicationEnvironment: 'test',
      workerIdentity: 'noma_worker_test',
      registry,
      telemetry,
      metrics: telemetry.metrics,
    });
    const dispatcher = new OutboxDispatcher({
      database,
      publisher,
      registry,
      metrics: telemetry.metrics,
      telemetry,
      identity: 'noma_worker_test',
      pollMilliseconds: 250,
    });
    let dependencyService: RuntimeDependenciesService | undefined;
    try {
      await publisher.connect();
      await Promise.all(workers.map((worker) => worker.waitUntilReady()));
      let eventId = '';
      await telemetry.withSpan('noma.synthetic.request', { 'noma.runtime': 'api' }, async () => {
        const traceContext = telemetry.currentTraceContext();
        expect(traceContext).toBeDefined();
        const event = createOutboxEventEnvelope({
          eventType: 'foundation.observe-requested',
          eventVersion: 1,
          aggregateType: 'foundation.observe-probe',
          aggregateId: 'dev010-probe',
          aggregateVersion: 1,
          payload: { probe: 'dev010' },
          privacyClassification: 'audit',
          servicePrincipal: 'noma_api',
          correlationId: 'dev010-correlation',
          telemetry: { requestId: 'dev010-request', ...(traceContext ? { traceContext } : {}) },
        });
        eventId = event.eventId;
        await runInDatabaseTransaction(database, (transaction) => createOutboxEvent(transaction, { contract, event }));
      });
      expect(await dispatcher.dispatchOnce()).toBe(1);
      await pollUntil(async () => {
        const execution = await database.jobExecution.findFirst({ where: { queueName: 'maintenance', jobId: eventId } });
        const outbox = await database.outboxEvent.findUnique({ where: { id: eventId } });
        return execution?.status === 'COMPLETED'
          && execution.correlationId === 'dev010-correlation'
          && outbox?.status === 'PROCESSED';
      }, { description: 'observed outbox job completion', timeoutMilliseconds: 15_000, intervalMilliseconds: 100 });
      await telemetry.forceFlush();
      const spans = telemetry.snapshot().spans;
      const connected = spans.filter((span) => ['noma.synthetic.request', 'noma.outbox.publish', 'noma.queue.process'].includes(span.name));
      expect(connected.map((span) => span.name)).toEqual(expect.arrayContaining([
        'noma.synthetic.request', 'noma.outbox.publish', 'noma.queue.process',
      ]));
      expect(new Set(connected.map((span) => span.spanContext().traceId)).size).toBe(1);

      const config = loadServerEnvironment('api', {
        NOMA_ENV: harness.runtimeEnvironment.NOMA_ENV,
        NOMA_CREDENTIAL_ENVIRONMENT: harness.runtimeEnvironment.NOMA_CREDENTIAL_ENVIRONMENT,
        DATABASE_URL: harness.runtimeEnvironment.DATABASE_URL,
        REDIS_URL: harness.runtimeEnvironment.REDIS_URL,
        PUBLIC_WEB_ORIGIN: harness.runtimeEnvironment.PUBLIC_WEB_ORIGIN,
        API_PUBLIC_URL: harness.runtimeEnvironment.API_PUBLIC_URL,
        NOMA_TELEMETRY_MODE: 'in-memory',
      });
      dependencyService = new RuntimeDependenciesService(config, telemetry);
      await dependencyService.onApplicationBootstrap();
      const health = new HealthService(dependencyService);
      expect(health.liveness().status).toBe('ok');
      expect(health.readiness().status).toBe('ok');

      let postgresSuspended = false;
      try {
        const suspend = await harness.postgres.execute(['sh', '-c', 'kill -STOP $(pidof postgres)']);
        expect(suspend.exitCode).toBe(0);
        postgresSuspended = true;
        await pollUntil(() => health.readiness().status === 'not-ready', {
          description: 'API readiness reports PostgreSQL loss', timeoutMilliseconds: 10_000, intervalMilliseconds: 100,
        });
        expect(health.liveness().status).toBe('ok');
      } finally {
        if (postgresSuspended) {
          const resume = await harness.postgres.execute(['sh', '-c', 'kill -CONT $(pidof postgres)']);
          expect(resume.exitCode).toBe(0);
        }
      }
      await pollUntil(() => health.readiness().status === 'ok', {
        description: 'API readiness recovers after PostgreSQL resumes', timeoutMilliseconds: 12_000, intervalMilliseconds: 100,
      });

      await harness.redis.executeCli('CLIENT', 'PAUSE', '5000', 'ALL');
      await pollUntil(() => health.readiness().status === 'not-ready', {
        description: 'API readiness reports Redis loss', timeoutMilliseconds: 10_000, intervalMilliseconds: 100,
      });
      expect(health.liveness().status).toBe('ok');
      await pollUntil(() => health.readiness().status === 'ok', {
        description: 'API readiness recovers after Redis resumes', timeoutMilliseconds: 12_000, intervalMilliseconds: 100,
      });
    } finally {
      await dependencyService?.onApplicationShutdown();
      await dispatcher.stop();
      await Promise.all(workers.map((worker) => worker.close()));
      await publisher.close();
      await disconnectDatabaseClient(database);
    }
  }, 180_000);
});
