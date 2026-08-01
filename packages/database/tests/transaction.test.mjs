import assert from 'node:assert/strict';
import { test } from 'vitest';

import {
  isRetryableDatabaseTransactionError,
  runInDatabaseTransaction,
  runRetryableSerializableDatabaseTransaction,
} from '../dist/index.js';

function fakePrismaClient(implementation) {
  return { $transaction: implementation };
}

test('single database transaction uses bounded defaults', async () => {
  let receivedOptions;
  const client = fakePrismaClient(async (operation, options) => {
    receivedOptions = options;
    return operation(Object.freeze({ marker: 'transaction' }));
  });

  const result = await runInDatabaseTransaction(client, async (transaction) => transaction.marker);
  assert.equal(result, 'transaction');
  assert.deepEqual(receivedOptions, {
    maxWait: 2_000,
    timeout: 5_000,
    isolationLevel: 'ReadCommitted',
  });
});

test('retryable transaction retries only Prisma write conflicts', async () => {
  let calls = 0;
  const client = fakePrismaClient(async (operation) => {
    calls += 1;
    if (calls < 3) throw { code: 'P2034', clientVersion: '7.9.1' };
    return operation(Object.freeze({ marker: 'serializable' }));
  });

  const result = await runRetryableSerializableDatabaseTransaction(
    client,
    async (transaction, attempt) => `${transaction.marker}:${attempt}`,
    {
      retryIdentity: 'test:idempotent-command',
      baseDelayMilliseconds: 0,
      maximumDelayMilliseconds: 0,
    },
  );

  assert.equal(result, 'serializable:3');
  assert.equal(calls, 3);
});

test('retryable transaction propagates non-Prisma errors without retry', async () => {
  let calls = 0;
  const expected = new Error('network work is not retryable here');
  const client = fakePrismaClient(async () => {
    calls += 1;
    throw expected;
  });

  await assert.rejects(
    runRetryableSerializableDatabaseTransaction(client, async () => undefined, {
      retryIdentity: 'test:no-retry',
      baseDelayMilliseconds: 0,
      maximumDelayMilliseconds: 0,
    }),
    expected,
  );
  assert.equal(calls, 1);
  assert.equal(isRetryableDatabaseTransactionError(expected), false);
});

test('retryable transaction requires an explicit retry identity', async () => {
  const client = fakePrismaClient(async () => undefined);
  await assert.rejects(
    runRetryableSerializableDatabaseTransaction(client, async () => undefined, {
      retryIdentity: '   ',
    }),
    /retryIdentity/,
  );
});
