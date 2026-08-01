import { access, readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const EXPECTED_BULLMQ_VERSION = '5.81.2';
const EXPECTED_IOREDIS_VERSION = '5.11.1';
const EXPECTED_REDIS_IMAGE =
  'redis:8.8.1-alpine3.23@sha256:8096655e437712b07503796fb64d81359256cfcff0ab29d95a7da72863786efb';
const REQUIRED_FILES = [
  'QUEUE.md',
  'compose.yaml',
  'docs/adr/0005-redis-bullmq-outbox-foundation.md',
  'packages/contracts/src/queue.ts',
  'packages/database/src/outbox.ts',
  'packages/database/src/job-execution.ts',
  'packages/database/prisma/migrations/20260801000200_queue_outbox_foundation/migration.sql',
  'packages/integrations/src/queue.ts',
  'apps/worker/src/database-job-handler.ts',
  'apps/worker/src/outbox-dispatcher.ts',
  'apps/worker/src/queue-runtime.service.ts',
  'scripts/test-queue-foundation.mjs',
];

const fail = (message) => { throw new Error(message); };
const read = (path) => readFile(resolve(ROOT, path), 'utf8');
const readJson = async (path) => JSON.parse(await read(path));

function requireText(source, expected, subject) {
  if (!source.includes(expected)) fail(`${subject} missing ${expected}`);
}

function validateDependencies(integrationsPackage) {
  if (integrationsPackage.dependencies?.bullmq !== EXPECTED_BULLMQ_VERSION) {
    fail(`bullmq must be pinned to ${EXPECTED_BULLMQ_VERSION}`);
  }
  if (integrationsPackage.dependencies?.ioredis !== EXPECTED_IOREDIS_VERSION) {
    fail(`ioredis must be pinned to ${EXPECTED_IOREDIS_VERSION}`);
  }
}

function validateCompose(compose) {
  requireText(compose, EXPECTED_REDIS_IMAGE, 'Compose');
  for (const required of [
    '127.0.0.1:${NOMA_REDIS_PORT:-56379}:6379',
    '--appendonly',
    '--appendfsync',
    'everysec',
    '--maxmemory-policy',
    'noeviction',
    '--requirepass',
    'noma_redis_data:/data',
    'redis-cli --no-auth-warning ping',
    'no-new-privileges:true',
  ]) requireText(compose, required, 'Redis Compose service');
  if (/container_name\s*:/.test(compose)) fail('fixed container names break isolated queue tests');
}

async function filesBelow(path) {
  const directory = resolve(ROOT, path);
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const relative = `${path}/${entry.name}`;
    return entry.isDirectory() ? filesBelow(relative) : [relative];
  }));
  return nested.flat();
}

async function validateBoundaries() {
  for (const path of await filesBelow('packages/platform/src')) {
    const source = await read(path);
    if (/\b(?:bullmq|ioredis)\b/i.test(source)) fail(`${path}: concrete queue clients belong in integrations`);
  }
  for (const path of await filesBelow('apps/api/src')) {
    const source = await read(path);
    if (/from\s+['"]bullmq['"]|\bBullMqPublisher\b|\.publish\s*\(/.test(source)) {
      fail(`${path}: API must commit an outbox record rather than publish directly`);
    }
  }
}

async function validate() {
  for (const path of REQUIRED_FILES) await access(resolve(ROOT, path));
  const integrationsPackage = await readJson('packages/integrations/package.json');
  validateDependencies(integrationsPackage);

  const compose = await read('compose.yaml');
  validateCompose(compose);

  const workspace = await read('pnpm-workspace.yaml');
  requireText(workspace, 'msgpackr-extract: false', 'reviewed optional native dependency policy');

  const contracts = await read('packages/contracts/src/queue.ts');
  for (const required of [
    "'provider-events'",
    "'maintenance'",
    "readonly identity: 'outbox-event-id'",
    "readonly completedDelivery: 'no-op'",
    "readonly store: 'postgresql-job-executions'",
    'authorizedServicePrincipals',
    'MAXIMUM_PAYLOAD_BYTES',
    'jobId: event.eventId',
    "must not contain a colon",
  ]) requireText(contracts, required, 'queue contracts');

  const migration = await read(
    'packages/database/prisma/migrations/20260801000200_queue_outbox_foundation/migration.sql',
  );
  for (const required of [
    'CREATE TABLE "outbox_events"',
    'CREATE TABLE "job_executions"',
    'CREATE TABLE "job_execution_attempts"',
    'outbox_events_claim_idx',
    'outbox_events_recovery_idx',
    'job_executions_attention_idx',
  ]) requireText(migration, required, 'queue migration');

  const outbox = await read('packages/database/src/outbox.ts');
  requireText(outbox, 'FOR UPDATE SKIP LOCKED', 'outbox claim');
  requireText(outbox, 'DatabaseTransactionClient', 'transaction-bound outbox creation');
  requireText(outbox, 'deadLetteredByOwner', 'owned dead-letter metrics');

  const integration = await read('packages/integrations/src/queue.ts');
  for (const required of [
    'enableOfflineQueue: false',
    'maxRetriesPerRequest: 1',
    'maxRetriesPerRequest: null',
    'removeOnComplete: false',
    'removeOnFail: false',
    'UnrecoverableError',
    'jitter: contract.retry.jitter',
  ]) requireText(integration, required, 'BullMQ adapter');

  const dispatcher = await read('apps/worker/src/outbox-dispatcher.ts');
  for (const required of [
    'DEFAULT_POLL_MILLISECONDS = 250',
    'DEFAULT_BATCH_SIZE = 50',
    'DEFAULT_LEASE_MILLISECONDS = 30_000',
    'DEFAULT_RECOVERY_MILLISECONDS = 30_000',
    'MAXIMUM_RETRY_MILLISECONDS = 60_000',
    'this.#running',
  ]) requireText(dispatcher, required, 'outbox dispatcher');

  const runtime = await read('apps/worker/src/queue-runtime.service.ts');
  requireText(runtime, 'not-configured', 'Worker compatibility mode');
  requireText(runtime, "'unavailable'", 'Worker dependency-loss readiness');

  const config = await read('packages/config/src/server.ts');
  requireText(config, "runtime === 'worker' && Boolean(databaseUrl) !== Boolean(redisUrl)", 'Worker config isolation');
  await validateBoundaries();
  return { files: REQUIRED_FILES.length };
}

function selfTest() {
  try {
    validateDependencies({ dependencies: { bullmq: '^5.81.2', ioredis: '5.11.1' } });
    fail('floating BullMQ version negative test did not fail');
  } catch (error) {
    if (!/bullmq must be pinned/.test(error.message)) throw error;
  }

  try {
    validateCompose('redis: latest\nports: ["0.0.0.0:6379:6379"]');
    fail('unsafe Redis Compose negative test did not fail');
  } catch (error) {
    if (!/Compose/.test(error.message)) throw error;
  }
}

try {
  const result = await validate();
  console.log(`PASS: ${result.files} Redis/BullMQ and transactional-outbox foundation files and boundaries`);
  if (process.argv.includes('--self-test')) {
    selfTest();
    console.log('PASS: floating dependencies and unsafe Redis configuration were rejected');
  }
} catch (error) {
  console.error(`FAIL: ${error.message}`);
  process.exit(1);
}
