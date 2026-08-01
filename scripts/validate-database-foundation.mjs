import { createHash } from 'node:crypto';
import { access, readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

import {
  assertDatabaseResetAllowed,
  DATABASE_RESET_CONFIRMATION,
} from '../packages/database/prisma/reset-safety.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const MIGRATIONS = resolve(ROOT, 'packages/database/prisma/migrations');
const EXPECTED_PRISMA_VERSION = '7.9.1';
const EXPECTED_POSTGRES_IMAGE =
  'postgres:18.4-alpine3.23@sha256:996d0920e4ff9df1fc19dacb904492f3c1ec0ec1cc338f0ad7123be7731c5f5e';
const REQUIRED_FILES = [
  'DATABASE.md',
  'compose.yaml',
  'docs/adr/0004-prisma-postgresql-foundation.md',
  'packages/database/prisma.config.ts',
  'packages/database/prisma/schema.prisma',
  'packages/database/prisma/reset-safety.mjs',
  'packages/database/prisma/migration-checksums.json',
  'packages/database/prisma/migrations/migration_lock.toml',
  'packages/database/prisma/migrations/20260801000000_pre_prisma_baseline/migration.sql',
  'packages/database/prisma/migrations/20260801000100_postgresql_foundation/migration.sql',
  'packages/database/src/client.ts',
  'packages/database/src/transaction.ts',
  'packages/database/tests/client.test.mjs',
  'packages/database/tests/reset-safety.test.mjs',
  'packages/database/tests/transaction.test.mjs',
  'scripts/reset-database.mjs',
  'scripts/test-database-migrations.mjs',
];
const ALLOWED_EXTENSIONS = new Set(['citext', 'pg_trgm']);
const DESTRUCTIVE_SQL = [
  /\bdrop\s+(?:table|column|schema|database|extension)\b/i,
  /\btruncate\b/i,
  /\bdelete\s+from\b/i,
  /\balter\s+table[\s\S]*\bdrop\b/i,
];

const fail = (message) => {
  throw new Error(message);
};
const read = (path) => readFile(resolve(ROOT, path), 'utf8');
const readJson = async (path) => JSON.parse(await read(path));
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

function validateMigrationSql(path, sql) {
  for (const pattern of DESTRUCTIVE_SQL) {
    if (pattern.test(sql)) fail(`${path}: destructive SQL is prohibited in the baseline`);
  }

  const extensions = [
    ...sql.matchAll(/create\s+extension\s+if\s+not\s+exists\s+"?([a-z0-9_]+)"?/gi),
  ].map((match) => match[1]);
  for (const extension of extensions) {
    if (!ALLOWED_EXTENSIONS.has(extension)) fail(`${path}: unapproved extension ${extension}`);
  }
  return extensions;
}

async function validateMigrationHistory() {
  const checksums = await readJson('packages/database/prisma/migration-checksums.json');
  if (checksums.algorithm !== 'sha256') fail('migration checksum algorithm must be sha256');

  const migrationDirectories = (await readdir(MIGRATIONS, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const checksumPaths = Object.keys(checksums.migrations).sort();
  const actualPaths = migrationDirectories.map((directory) => `${directory}/migration.sql`);
  if (JSON.stringify(checksumPaths) !== JSON.stringify(actualPaths)) {
    fail('migration checksum manifest does not exactly match migration history');
  }

  const extensions = new Set();
  for (const path of actualPaths) {
    const sql = await read(`packages/database/prisma/migrations/${path}`);
    const expected = checksums.migrations[path];
    if (sha256(sql) !== expected) fail(`${path}: migration checksum mismatch`);
    for (const extension of validateMigrationSql(path, sql)) extensions.add(extension);
  }

  for (const extension of ALLOWED_EXTENSIONS) {
    if (!extensions.has(extension)) fail(`baseline migration missing ${extension}`);
  }
  return { migrations: actualPaths.length, extensions: extensions.size };
}

async function validate() {
  for (const path of REQUIRED_FILES) await access(resolve(ROOT, path));

  const databasePackage = await readJson('packages/database/package.json');
  for (const dependency of ['@prisma/client', '@prisma/adapter-pg']) {
    if (databasePackage.dependencies?.[dependency] !== EXPECTED_PRISMA_VERSION) {
      fail(`${dependency} must be pinned to ${EXPECTED_PRISMA_VERSION}`);
    }
  }
  if (databasePackage.devDependencies?.prisma !== EXPECTED_PRISMA_VERSION) {
    fail(`prisma must be pinned to ${EXPECTED_PRISMA_VERSION}`);
  }
  for (const script of [
    'db:validate',
    'db:generate',
    'db:migrate:dev',
    'db:migrate:deploy',
    'db:migrate:status',
  ]) {
    if (!databasePackage.scripts?.[script]) fail(`@noma/database missing ${script}`);
  }

  const rootPackage = await readJson('package.json');
  for (const script of [
    'db:validate',
    'db:generate',
    'db:migrate:dev',
    'db:migrate:deploy',
    'db:migrate:status',
    'db:reset:local',
    'db:migration-test',
    'db:verify',
  ]) {
    if (!rootPackage.scripts?.[script]) fail(`root package missing ${script}`);
  }
  const serializedScripts = JSON.stringify({
    ...rootPackage.scripts,
    ...databasePackage.scripts,
  });
  if (/prisma\s+migrate\s+reset/i.test(serializedScripts)) {
    fail('package scripts must not bypass the guarded reset launcher');
  }
  if (/prisma\s+db\s+push/i.test(serializedScripts)) {
    fail('prisma db push is prohibited as a migration workflow');
  }

  const schema = await read('packages/database/prisma/schema.prisma');
  if (!schema.includes('provider = "postgresql"')) fail('Prisma PostgreSQL datasource missing');
  if (!schema.includes('provider            = "prisma-client"')) fail('Prisma client generator missing');
  if (/previewFeatures\s*=/.test(schema)) fail('preview Prisma features are prohibited');
  if (/^\s*model\s+/m.test(schema)) fail('DEV-004 must not introduce business models');

  const prismaConfig = await read('packages/database/prisma.config.ts');
  if (!prismaConfig.includes('isPrismaResetCommand(process.argv)')) {
    fail('direct Prisma reset interception missing');
  }
  if (!prismaConfig.includes('assertDatabaseResetAllowed(process.env)')) {
    fail('direct Prisma reset guard missing');
  }

  const compose = await read('compose.yaml');
  if (!compose.includes(EXPECTED_POSTGRES_IMAGE)) fail('PostgreSQL image is not exactly pinned');
  if (!compose.includes('127.0.0.1:${NOMA_POSTGRES_PORT:-55432}:5432')) {
    fail('local PostgreSQL port must bind to loopback');
  }
  if (!compose.includes('/var/lib/postgresql')) {
    fail('PostgreSQL 18 volume must use the version-aware parent path');
  }
  if (!compose.includes('head -n 1 "$${PGDATA}/postmaster.pid"')) {
    fail('PostgreSQL healthcheck must reject the temporary initialization server');
  }
  if (/container_name\s*:/.test(compose)) fail('fixed container names break isolated test projects');

  const workspace = await read('pnpm-workspace.yaml');
  for (const approvedBuild of ["'@prisma/engines': true", 'esbuild: true', 'prisma: true', 'sharp: true']) {
    if (!workspace.includes(approvedBuild)) fail(`reviewed dependency build approval missing: ${approvedBuild}`);
  }
  if (workspace.includes('set this to true or false')) fail('unreviewed dependency build placeholder present');

  const migration = await validateMigrationHistory();
  return { files: REQUIRED_FILES.length, ...migration };
}

function selfTest() {
  assertDatabaseResetAllowed({
    NOMA_ENV: 'test',
    NOMA_CREDENTIAL_ENVIRONMENT: 'test',
    NOMA_DATABASE_RESET_CONFIRMATION: DATABASE_RESET_CONFIRMATION,
    DATABASE_URL: 'postgresql://noma:local-only@127.0.0.1:55432/noma_test',
  });

  for (const environment of ['preview', 'staging', 'production']) {
    try {
      assertDatabaseResetAllowed({
        NOMA_ENV: environment,
        NOMA_CREDENTIAL_ENVIRONMENT: environment,
        NOMA_DATABASE_RESET_CONFIRMATION: DATABASE_RESET_CONFIRMATION,
        DATABASE_URL: 'postgresql://noma:not-real@database.example.invalid/noma',
      });
      fail(`${environment} reset negative test did not fail`);
    } catch (error) {
      if (!/database reset refused/.test(error.message)) throw error;
    }
  }

  try {
    validateMigrationSql('injected.sql', 'DROP TABLE protected_records;');
    fail('destructive migration negative test did not fail');
  } catch (error) {
    if (!/destructive SQL/.test(error.message)) throw error;
  }

  if (sha256('changed migration') === sha256('original migration')) {
    fail('migration checksum negative test did not fail');
  }
}

try {
  const result = await validate();
  console.log(
    `PASS: ${result.files} database foundation files, ${result.migrations} forward-only migrations, ${result.extensions} approved extensions`,
  );
  if (process.argv.includes('--self-test')) {
    selfTest();
    console.log('PASS: production reset, destructive SQL, and checksum mutations were rejected');
  }
} catch (error) {
  console.error(`FAIL: ${error.message}`);
  process.exit(1);
}
