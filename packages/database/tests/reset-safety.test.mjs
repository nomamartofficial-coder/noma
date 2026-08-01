import assert from 'node:assert/strict';
import { test } from 'vitest';

import {
  assertDatabaseResetAllowed,
  DATABASE_RESET_CONFIRMATION,
  isPrismaResetCommand,
  resolvePrismaDatabaseUrl,
} from '../prisma/reset-safety.mjs';

const localResetEnvironment = Object.freeze({
  NOMA_ENV: 'development',
  NOMA_CREDENTIAL_ENVIRONMENT: 'development',
  NOMA_DATABASE_RESET_CONFIRMATION: DATABASE_RESET_CONFIRMATION,
  DATABASE_URL: 'postgresql://noma:local-only@127.0.0.1:55432/noma',
});

test('local reset requires an explicit safe target and confirmation', () => {
  assert.deepEqual(assertDatabaseResetAllowed(localResetEnvironment), {
    applicationEnvironment: 'development',
    databaseName: 'noma',
    hostname: '127.0.0.1',
  });
});

for (const environment of ['preview', 'staging', 'production']) {
  test(`${environment} reset is refused before connection`, () => {
    assert.throws(
      () =>
        assertDatabaseResetAllowed({
          ...localResetEnvironment,
          NOMA_ENV: environment,
          NOMA_CREDENTIAL_ENVIRONMENT: environment,
        }),
      /reset refused/,
    );
  });
}

test('remote reset target is refused even when environment claims development', () => {
  assert.throws(
    () =>
      assertDatabaseResetAllowed({
        ...localResetEnvironment,
        DATABASE_URL: 'postgresql://noma:not-real@database.example.invalid/noma',
      }),
    /loopback/,
  );
});

test('production database commands require encrypted transport', () => {
  assert.throws(
    () =>
      resolvePrismaDatabaseUrl({
        NOMA_ENV: 'production',
        DATABASE_URL: 'postgresql://noma:not-real@database.example.invalid/noma',
      }),
    /encrypted/,
  );
});

test('direct Prisma reset command is detected regardless of executable prefix', () => {
  assert.equal(isPrismaResetCommand(['node', 'prisma', 'migrate', 'reset', '--force']), true);
  assert.equal(isPrismaResetCommand(['node', 'prisma', 'migrate', 'deploy']), false);
});
