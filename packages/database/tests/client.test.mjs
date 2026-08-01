import assert from 'node:assert/strict';
import { test } from 'vitest';

import { createDatabaseClient, disconnectDatabaseClient } from '../dist/index.js';

test('client factory rejects a non-PostgreSQL URL without echoing it', () => {
  assert.throws(
    () =>
      createDatabaseClient({
        applicationName: 'noma_api',
        databaseUrl: 'https://example.invalid/secret-value',
      }),
    (error) => {
      assert.match(error.message, /postgres/i);
      assert.doesNotMatch(error.message, /secret-value/);
      return true;
    },
  );
});

test('client factory enforces bounded pool settings', () => {
  assert.throws(
    () =>
      createDatabaseClient({
        applicationName: 'noma_api',
        databaseUrl: 'postgresql://local.invalid/noma',
        maxConnections: 0,
      }),
    /maxConnections/,
  );
});

test('client factory creates a disconnectable server client without connecting eagerly', async () => {
  const client = createDatabaseClient({
    applicationName: 'noma_worker',
    databaseUrl: 'postgresql://127.0.0.1:1/noma',
  });
  await disconnectDatabaseClient(client);
});
