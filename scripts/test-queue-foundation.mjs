import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import {
  beginJobExecution,
  claimOutboxEvents,
  completeJobExecution,
  createDatabaseClient,
  createOutboxEvent,
  createOutboxEventEnvelope,
  disconnectDatabaseClient,
  markOutboxDispatched,
  readOutboxMetrics,
  runInDatabaseTransaction,
} from '../packages/database/dist/index.js';
import { toSafeJobFailure } from '../packages/contracts/dist/index.js';
import {
  BullMqPublisher,
  PermanentJobError,
  QueueContractRegistry,
  RetryableJobError,
  createBullMqWorkers,
} from '../packages/integrations/dist/index.js';
import { createInMemoryQueueMetricRecorder } from '../packages/observability/dist/server.js';
import { createDatabaseBackedQueueHandler } from '../apps/worker/dist/database-job-handler.js';
import { OutboxDispatcher } from '../apps/worker/dist/outbox-dispatcher.js';
import { QueueRuntimeService } from '../apps/worker/dist/queue-runtime.service.js';
import { createProbeContract } from './fixtures/dev005-probe-contract.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const COMPOSE_FILE = resolve(ROOT, 'compose.yaml');
const projectName = `noma-dev005-${process.pid}`.toLowerCase();
const databasePassword = randomBytes(24).toString('hex');
const redisPassword = randomBytes(24).toString('hex');

function run(command, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      env: options.env ?? process.env,
      stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    if (options.capture) {
      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', (chunk) => { stdout += chunk; });
      child.stderr.on('data', (chunk) => { stderr += chunk; });
    }
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0 || options.allowFailure) {
        resolvePromise({ code: code ?? 1, stdout, stderr });
      } else {
        reject(new Error(`${command} exited with code ${code ?? 1}: ${stderr.trim()}`));
      }
    });
  });
}

function pnpmCommand(args, environment) {
  const pnpmCli = process.env.npm_execpath;
  if (!pnpmCli || !/pnpm(?:\.(?:cjs|mjs|js))?$/i.test(pnpmCli)) {
    throw new Error('run queue integration through pnpm queue:integration-test');
  }
  return run(process.execPath, [pnpmCli, ...args], { env: environment });
}

function availablePort() {
  return new Promise((resolvePromise, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen({ host: '127.0.0.1', port: 0, exclusive: true }, () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('could not reserve an integration-test port'));
        return;
      }
      server.close((error) => error ? reject(error) : resolvePromise(address.port));
    });
  });
}

function compose(args, environment, options = {}) {
  return run(
    'docker',
    ['compose', '--project-name', projectName, '--file', COMPOSE_FILE, ...args],
    { env: environment, ...options },
  );
}

async function waitFor(check, description, timeoutMilliseconds = 30_000) {
  const deadline = Date.now() + timeoutMilliseconds;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const result = await check();
      if (result) return result;
    } catch (error) {
      lastError = error;
    }
    await delay(100);
  }
  throw new Error(`timed out waiting for ${description}: ${lastError?.message ?? 'condition not met'}`);
}

const databasePort = await availablePort();
const redisPort = await availablePort();
const environment = {
  ...process.env,
  NOMA_POSTGRES_PORT: String(databasePort),
  NOMA_POSTGRES_USER: 'noma',
  NOMA_POSTGRES_PASSWORD: databasePassword,
  NOMA_POSTGRES_DATABASE: 'noma',
  NOMA_REDIS_PORT: String(redisPort),
  NOMA_REDIS_PASSWORD: redisPassword,
};
const databaseUrl = `postgresql://noma:${encodeURIComponent(databasePassword)}@127.0.0.1:${databasePort}/noma?schema=public`;
const redisUrl = `redis://default:${encodeURIComponent(redisPassword)}@127.0.0.1:${redisPort}`;

async function deployMigrations() {
  await pnpmCommand(
    ['--filter', '@noma/database', 'exec', 'prisma', 'migrate', 'deploy'],
    {
      ...environment,
      NOMA_ENV: 'test',
      NOMA_CREDENTIAL_ENVIRONMENT: 'test',
      DATABASE_URL: databaseUrl,
    },
  );
}

function probeValue(database, probeId) {
  return database.$queryRaw`
    SELECT "value", "last_version" FROM "dev005_probe_state" WHERE "id" = ${probeId}
  `.then((rows) => rows[0]);
}

async function addEvent(database, contract, input) {
  const event = createOutboxEventEnvelope({
    eventId: input.eventId ?? randomUUID(),
    eventType: input.eventType ?? 'foundation.probe-requested',
    eventVersion: 1,
    aggregateType: 'foundation.probe',
    aggregateId: input.probeId,
    aggregateVersion: input.version,
    payload: { probeId: input.probeId, version: String(input.version), delta: input.delta },
    privacyClassification: 'audit',
    servicePrincipal: 'noma_api',
    correlationId: `integration-${input.probeId}-${input.version}`,
    ...(input.availableAt ? { availableAt: input.availableAt } : {}),
  });
  await runInDatabaseTransaction(database, (transaction) => createOutboxEvent(transaction, { event, contract }));
  return event;
}

function normalRegistration(database, contract, workerIdentity) {
  return createDatabaseBackedQueueHandler({
    database,
    workerIdentity,
    contract,
    operation: async (transaction, payload) => {
      await transaction.$executeRaw`
        UPDATE "dev005_probe_state"
        SET "value" = "value" + ${payload.delta}, "last_version" = ${BigInt(payload.version)}
        WHERE "id" = ${payload.probeId} AND "last_version" < ${BigInt(payload.version)}
      `;
    },
  });
}

function createDispatcher(database, publisher, registry, metrics, identity, options = {}) {
  return new OutboxDispatcher({
    database,
    publisher,
    registry,
    metrics,
    identity,
    batchSize: options.batchSize ?? 50,
    leaseMilliseconds: 1_000,
    recoveryAfterMilliseconds: 1_000,
    random: () => 0,
  });
}

let database;
let publisher;
let runtime;
let workers = [];
try {
  await run('docker', ['info', '--format', '{{.ServerVersion}}'], { env: environment, capture: true });
  await compose(['up', '--detach', '--wait', 'database', 'redis'], environment);
  await deployMigrations();

  database = createDatabaseClient({ databaseUrl, applicationName: 'noma_worker_dev005_test' });
  await database.$executeRawUnsafe(`
    CREATE TABLE "dev005_probe_state" (
      "id" text PRIMARY KEY,
      "value" integer NOT NULL,
      "last_version" bigint NOT NULL
    )
  `);

  runtime = new QueueRuntimeService({
    applicationEnvironment: 'test',
    credentialEnvironment: 'test',
    runtime: 'worker',
    address: { host: '127.0.0.1', port: 3002 },
    publicWebOrigin: 'http://127.0.0.1:3000',
    apiPublicUrl: 'http://127.0.0.1:3001',
    secrets: { databaseUrl, redisUrl },
  });
  await runtime.onApplicationBootstrap();
  assert.deepEqual(runtime.health(), {
    ready: true,
    dependencies: { database: 'ready', queue: 'ready' },
  });
  await compose(['stop', 'redis'], environment);
  await waitFor(() => runtime.health().dependencies.queue === 'unavailable', 'Redis readiness loss');
  assert.equal(runtime.health().ready, false);
  await compose(['start', 'redis'], environment);
  await waitFor(() => runtime.health().ready, 'Redis readiness recovery');
  await compose(['stop', 'database'], environment);
  await waitFor(() => runtime.health().dependencies.database === 'unavailable', 'PostgreSQL readiness loss');
  assert.equal(runtime.health().ready, false);
  await compose(['start', 'database'], environment);
  await waitFor(() => runtime.health().ready, 'PostgreSQL readiness recovery');
  await runtime.onApplicationShutdown();
  runtime = undefined;
  console.log('PASS: configured Worker readiness follows live PostgreSQL and Redis state');

  publisher = new BullMqPublisher({ redisUrl, applicationEnvironment: 'test' });
  await publisher.connect();

  const normalContract = createProbeContract();
  const poisonContract = createProbeContract({ jobName: 'foundation.poison-probe', attempts: 3 });
  const retryContract = createProbeContract({ jobName: 'foundation.retry-probe', attempts: 2 });
  const workerIdentity = 'noma_worker_test';
  const metrics = createInMemoryQueueMetricRecorder();
  const registry = new QueueContractRegistry([
    normalRegistration(database, normalContract, workerIdentity),
    createDatabaseBackedQueueHandler({
      database,
      workerIdentity,
      contract: poisonContract,
      operation: async () => { throw new PermanentJobError('POISON_PROBE', 'Probe is permanently invalid'); },
    }),
    createDatabaseBackedQueueHandler({
      database,
      workerIdentity,
      contract: retryContract,
      operation: async () => { throw new RetryableJobError('TRANSIENT_PROBE', 'Probe failed transiently'); },
    }),
  ]);
  const dispatcher = createDispatcher(database, publisher, registry, metrics, 'dispatcher_one');

  // Atomic state + outbox rollback leaves neither record.
  const rollbackProbe = `rollback-${randomUUID()}`;
  const rollbackEvent = randomUUID();
  await assert.rejects(
    () => runInDatabaseTransaction(database, async (transaction) => {
      await transaction.$executeRaw`
        INSERT INTO "dev005_probe_state" ("id", "value", "last_version") VALUES (${rollbackProbe}, 0, 0)
      `;
      const event = createOutboxEventEnvelope({
        eventId: rollbackEvent,
        eventType: 'foundation.probe-requested',
        eventVersion: 1,
        aggregateType: 'foundation.probe',
        aggregateId: rollbackProbe,
        aggregateVersion: 1,
        payload: { probeId: rollbackProbe, version: '1', delta: 1 },
        privacyClassification: 'audit',
        servicePrincipal: 'noma_api',
        correlationId: 'rollback-probe',
      });
      await createOutboxEvent(transaction, { event, contract: normalContract });
      throw new Error('ROLLBACK_PROBE');
    }),
    /ROLLBACK_PROBE/,
  );
  assert.equal(await database.outboxEvent.count({ where: { id: rollbackEvent } }), 0);
  assert.equal((await database.$queryRaw`SELECT COUNT(*)::int AS count FROM "dev005_probe_state" WHERE "id" = ${rollbackProbe}`)[0].count, 0);
  console.log('PASS: atomic rollback leaves neither state nor outbox obligation');

  // Abrupt API-side exit after commit cannot lose the obligation.
  const crashProbe = `crash-${randomUUID()}`;
  const crashEvent = randomUUID();
  const crash = await run(
    process.execPath,
    [resolve(ROOT, 'scripts/fixtures/commit-outbox-and-exit.mjs')],
    {
      env: {
        ...environment,
        DEV005_DATABASE_URL: databaseUrl,
        DEV005_PROBE_ID: crashProbe,
        DEV005_EVENT_ID: crashEvent,
      },
      capture: true,
      allowFailure: true,
    },
  );
  assert.equal(crash.code, 73);
  assert.equal(await database.outboxEvent.count({ where: { id: crashEvent, status: 'PENDING' } }), 1);
  assert.equal(await dispatcher.dispatchOnce(), 1);
  assert.equal((await publisher.readCounts())[0].waiting, 1);

  workers = createBullMqWorkers({
    redisUrl,
    applicationEnvironment: 'test',
    workerIdentity,
    registry,
    metrics,
  });
  await Promise.all(workers.map((worker) => worker.waitUntilReady()));
  await waitFor(async () => (await probeValue(database, crashProbe))?.value === 1, 'crash outbox processing');
  assert.equal(await database.outboxEvent.count({ where: { id: crashEvent, status: 'PROCESSED' } }), 1);
  console.log('PASS: abrupt producer exit still dispatches and processes committed work');

  // Crash after database effect but before queue acknowledgement is a no-op on redelivery.
  await Promise.all(workers.map((worker) => worker.close()));
  workers = [];
  const ackProbe = `ack-${randomUUID()}`;
  await database.$executeRaw`
    INSERT INTO "dev005_probe_state" ("id", "value", "last_version") VALUES (${ackProbe}, 0, 0)
  `;
  const ackEvent = await addEvent(database, normalContract, { probeId: ackProbe, version: 1, delta: 1 });
  await dispatcher.dispatchOnce();
  const ackEnvelope = {
    schemaVersion: 1,
    jobId: ackEvent.eventId,
    jobName: normalContract.jobName,
    jobVersion: normalContract.schemaVersion,
    queueName: normalContract.queueName,
    event: ackEvent,
    servicePrincipal: ackEvent.servicePrincipal,
    correlationId: ackEvent.correlationId,
  };
  const lease = await beginJobExecution(database, { job: ackEnvelope, workerIdentity });
  assert.equal(lease.disposition, 'execute');
  await completeJobExecution(database, lease, async (transaction) => {
    await transaction.$executeRaw`
      UPDATE "dev005_probe_state" SET "value" = "value" + 1, "last_version" = 1 WHERE "id" = ${ackProbe}
    `;
  });
  workers = createBullMqWorkers({ redisUrl, applicationEnvironment: 'test', workerIdentity, registry, metrics });
  await waitFor(async () => (await publisher.readCounts())[0].completed >= 2, 'duplicate acknowledgement completion');
  assert.equal((await probeValue(database, ackProbe)).value, 1);
  console.log('PASS: redelivery after committed effect is an idempotent no-op');

  // A publication crash window reuses the event UUID and produces one logical BullMQ job.
  await Promise.all(workers.map((worker) => worker.close()));
  workers = [];
  const duplicateProbe = `duplicate-${randomUUID()}`;
  await database.$executeRaw`
    INSERT INTO "dev005_probe_state" ("id", "value", "last_version") VALUES (${duplicateProbe}, 0, 0)
  `;
  const duplicateEvent = await addEvent(database, normalContract, { probeId: duplicateProbe, version: 1, delta: 1 });
  const firstClaim = await claimOutboxEvents(database, {
    leaseOwner: 'crashed_dispatcher',
    batchSize: 1,
    leaseMilliseconds: 1_000,
    recoveryAfterMilliseconds: 1_000,
  });
  assert.equal(firstClaim[0].id, duplicateEvent.eventId);
  await publisher.publish(normalContract, firstClaim[0].event);
  const reclaimed = await claimOutboxEvents(database, {
    leaseOwner: 'restarted_dispatcher',
    batchSize: 1,
    leaseMilliseconds: 1_000,
    recoveryAfterMilliseconds: 1_000,
    now: new Date(Date.now() + 2_000),
  });
  assert.equal(reclaimed[0].id, duplicateEvent.eventId);
  await publisher.publish(normalContract, reclaimed[0].event);
  await markOutboxDispatched(database, {
    eventId: duplicateEvent.eventId,
    leaseOwner: 'restarted_dispatcher',
  });
  const waitingAfterDuplicate = (await publisher.readCounts())[0].waiting;
  assert.equal(waitingAfterDuplicate, 1);
  console.log('PASS: publication crash window reuses one deterministic BullMQ identity');

  // Redis outage leaves the committed event pending and automatically recovers.
  const outageProbe = `outage-${randomUUID()}`;
  await database.$executeRaw`
    INSERT INTO "dev005_probe_state" ("id", "value", "last_version") VALUES (${outageProbe}, 0, 0)
  `;
  const outageEvent = await addEvent(database, normalContract, { probeId: outageProbe, version: 1, delta: 1 });
  await compose(['stop', 'redis'], environment);
  await dispatcher.dispatchOnce();
  assert.equal(await database.outboxEvent.count({ where: { id: outageEvent.eventId, status: 'PENDING' } }), 1);
  await compose(['start', 'redis'], environment);
  await waitFor(() => publisher.ping(), 'Redis reconnection');
  await dispatcher.dispatchOnce(new Date(Date.now() + 2_000));
  console.log('PASS: Redis outage returns publication to PostgreSQL retry');

  // Complete Redis data loss re-drives dispatched-but-unprocessed truth from PostgreSQL.
  const redisLossProbe = `redis-loss-${randomUUID()}`;
  await database.$executeRaw`
    INSERT INTO "dev005_probe_state" ("id", "value", "last_version") VALUES (${redisLossProbe}, 0, 0)
  `;
  const redisLossEvent = await addEvent(database, normalContract, { probeId: redisLossProbe, version: 1, delta: 1 });
  await dispatcher.dispatchOnce(new Date(Date.now() + 3_000));
  assert.equal(await database.outboxEvent.count({ where: { id: redisLossEvent.eventId, status: 'DISPATCHED' } }), 1);
  await compose(['stop', 'redis'], environment);
  await compose(['rm', '--force', 'redis'], environment);
  await run('docker', ['volume', 'rm', `${projectName}_noma_redis_data`], { env: environment });
  await compose(['up', '--detach', '--wait', 'redis'], environment);
  await waitFor(() => publisher.ping(), 'Redis reconnection after data loss');
  assert.equal((await publisher.readCounts())[0].waiting, 0);
  await dispatcher.dispatchOnce(new Date(Date.now() + 5_000));

  workers = createBullMqWorkers({ redisUrl, applicationEnvironment: 'test', workerIdentity, registry, metrics });
  await Promise.all(workers.map((worker) => worker.waitUntilReady()));
  await waitFor(async () => (await probeValue(database, redisLossProbe))?.value === 1, 'Redis-loss recovery');
  await waitFor(async () => (await probeValue(database, outageProbe))?.value === 1, 'outage recovery');
  await waitFor(async () => (await probeValue(database, duplicateProbe))?.value === 1, 'duplicate processing');
  console.log('PASS: complete Redis loss is rebuilt from PostgreSQL obligations');

  // Out-of-order aggregate versions complete safely without reversing newer state.
  const orderedProbe = `ordered-${randomUUID()}`;
  await database.$executeRaw`
    INSERT INTO "dev005_probe_state" ("id", "value", "last_version") VALUES (${orderedProbe}, 0, 0)
  `;
  await addEvent(database, normalContract, { probeId: orderedProbe, version: 2, delta: 2 });
  await dispatcher.dispatchOnce(new Date(Date.now() + 6_000));
  await waitFor(async () => (await probeValue(database, orderedProbe))?.last_version === 2n, 'newer event');
  await addEvent(database, normalContract, { probeId: orderedProbe, version: 1, delta: 100 });
  await dispatcher.dispatchOnce(new Date(Date.now() + 7_000));
  await waitFor(
    async () => await database.outboxEvent.count({
      where: { aggregateId: orderedProbe, aggregateVersion: 1n, status: 'PROCESSED' },
    }) === 1,
    'older event safe completion',
  );
  assert.deepEqual(await probeValue(database, orderedProbe), { value: 2, last_version: 2n });
  console.log('PASS: out-of-order aggregate versions complete without reversing state');

  // Permanent and exhausted failures remain visible and owned in both stores.
  for (const [contract, suffix] of [[poisonContract, 'poison'], [retryContract, 'retry']]) {
    const probeId = `${suffix}-${randomUUID()}`;
    await database.$executeRaw`
      INSERT INTO "dev005_probe_state" ("id", "value", "last_version") VALUES (${probeId}, 0, 0)
    `;
    await addEvent(database, contract, {
      probeId,
      version: 1,
      delta: 1,
      eventType: `foundation.${suffix}-probe-requested`,
    });
    await dispatcher.dispatchOnce(new Date(Date.now() + 8_000));
  }
  await waitFor(
    async () => await database.jobExecution.count({ where: { status: 'DEAD_LETTERED' } }) >= 2,
    'owned dead letters',
  );
  const dead = await database.jobExecution.findMany({ where: { status: 'DEAD_LETTERED' } });
  assert.ok(dead.every((execution) =>
    execution.attentionOwner === 'OPERATIONS'
    && execution.attentionStatus === 'OPEN'
    && execution.recoveryAction === 'REVIEW_AND_REPLAY'
    && execution.attentionDeadlineAt,
  ));
  await waitFor(async () => (await publisher.readCounts())[0].failed >= 2, 'BullMQ failed visibility');
  console.log('PASS: permanent and exhausted jobs remain visible with owned attention');

  // Two dispatchers claim distinct work and stalled publication is measurable.
  await Promise.all(workers.map((worker) => worker.close()));
  workers = [];
  for (let index = 0; index < 4; index += 1) {
    const probeId = `race-${index}-${randomUUID()}`;
    await database.$executeRaw`
      INSERT INTO "dev005_probe_state" ("id", "value", "last_version") VALUES (${probeId}, 0, 0)
    `;
    await addEvent(database, normalContract, { probeId, version: 1, delta: 1 });
  }
  const dispatcherA = createDispatcher(database, publisher, registry, metrics, 'dispatcher_a', { batchSize: 2 });
  const dispatcherB = createDispatcher(database, publisher, registry, metrics, 'dispatcher_b', { batchSize: 2 });
  const claimed = await Promise.all([
    dispatcherA.dispatchOnce(new Date(Date.now() + 10_000)),
    dispatcherB.dispatchOnce(new Date(Date.now() + 10_000)),
  ]);
  assert.equal(claimed[0] + claimed[1], 4);
  const snapshot = await readOutboxMetrics(database, new Date(Date.now() + 20_000));
  assert.ok(snapshot.dispatched >= 4);
  assert.ok(snapshot.oldestUnpublishedAgeSeconds > 0);
  assert.ok(snapshot.deadLetteredByOwner.operations >= 2);
  metrics.record({ name: 'noma.outbox.pending', value: snapshot.pending });
  metrics.record({ name: 'noma.outbox.oldest_unpublished_seconds', value: snapshot.oldestUnpublishedAgeSeconds });
  assert.ok(metrics.snapshot().some((metric) => metric.name === 'noma.outbox.oldest_unpublished_seconds'));
  console.log('PASS: concurrent SKIP LOCKED claims and stalled-publication metrics are visible');

  // Safe failure helper never retains credential URLs used by outage diagnostics.
  assert.doesNotMatch(
    toSafeJobFailure('retryable', 'REDIS_UNAVAILABLE', `${redisUrl} unavailable`).message,
    new RegExp(redisPassword),
  );

  console.log(
    'PASS: real PostgreSQL/Redis atomic outbox, API crash, duplicate dispatch, outage/data-loss replay, idempotent execution, ordering, dead-letter ownership, claiming, and metrics',
  );
} catch (error) {
  await compose(['logs', '--no-color', 'database', 'redis'], environment, { allowFailure: true });
  throw error;
} finally {
  await Promise.all(workers.map((worker) => worker.close().catch(() => undefined)));
  await runtime?.onApplicationShutdown().catch(() => undefined);
  await publisher?.close().catch(() => undefined);
  if (database) await disconnectDatabaseClient(database).catch(() => undefined);
  await compose(['down', '--volumes', '--remove-orphans'], environment, { allowFailure: true });
}
