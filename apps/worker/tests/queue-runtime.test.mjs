import assert from 'node:assert/strict';
import test from 'node:test';

import { QueueRuntimeService } from '../dist/queue-runtime.service.js';
import { runQueueOperationWithSignal } from '../dist/database-job-handler.js';

function config(secrets = {}) {
  return {
    applicationEnvironment: 'test',
    credentialEnvironment: 'test',
    runtime: 'worker',
    address: { host: '127.0.0.1', port: 3002 },
    publicWebOrigin: 'http://127.0.0.1:3000',
    apiPublicUrl: 'http://127.0.0.1:3001',
    secrets,
  };
}

test('Worker compatibility mode remains ready with dependencies not configured', async () => {
  const service = new QueueRuntimeService(config());
  await service.onApplicationBootstrap();
  assert.deepEqual(service.health(), {
    ready: true,
    dependencies: { database: 'not-configured', queue: 'not-configured' },
  });
  await service.onApplicationShutdown();
});

test('Worker rejects partially configured persistence and queue dependencies', async () => {
  const service = new QueueRuntimeService(config({ databaseUrl: 'postgresql://127.0.0.1/noma' }));
  await assert.rejects(() => service.onApplicationBootstrap(), /configured together/);
});

test('job deadline cancellation rejects work with a retryable safe timeout', async () => {
  const controller = new AbortController();
  const operation = runQueueOperationWithSignal(
    controller.signal,
    () => new Promise(() => undefined),
  );
  controller.abort();
  await assert.rejects(operation, (error) =>
    error.name === 'RetryableJobError'
    && error.failure.code === 'JOB_TIMEOUT'
    && error.failure.classification === 'retryable');
});
