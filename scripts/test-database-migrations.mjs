import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { connect, createServer } from 'node:net';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const ROOT = resolve(import.meta.dirname, '..');
const COMPOSE_FILE = resolve(ROOT, 'compose.yaml');
const BASELINE_MIGRATION_NAME = '20260801000000_pre_prisma_baseline';
const FOUNDATION_MIGRATION_NAME = '20260801000100_postgresql_foundation';
const EXPECTED_MIGRATION_CHECKSUMS = new Map([
  [BASELINE_MIGRATION_NAME, '9d9e22e2c4bb2d93831c62911ff5d0bdaecc039472d368ed1b1aad59408ee013'],
  [FOUNDATION_MIGRATION_NAME, 'a70a95dfa7c200d25b62a7ccb97e6a6cee970389431795b8b928d17c5dd9ddc9'],
]);
const projectName = `noma-dev004-${process.pid}`;
const databasePassword = randomBytes(24).toString('hex');

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
      child.stdout.on('data', (chunk) => {
        stdout += chunk;
      });
      child.stderr.on('data', (chunk) => {
        stderr += chunk;
      });
    }
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0 || options.allowFailure) {
        resolvePromise({ code: code ?? 1, stdout, stderr });
        return;
      }
      reject(new Error(`${command} exited with code ${code ?? 1}`));
    });
  });
}

function pnpmCommand(args, env) {
  const pnpmCli = process.env.npm_execpath;
  if (!pnpmCli || !/pnpm(?:\.(?:cjs|mjs|js))?$/i.test(pnpmCli)) {
    throw new Error('run database migration tests through pnpm db:migration-test');
  }
  return run(process.execPath, [pnpmCli, ...args], { env });
}

function availablePort() {
  return new Promise((resolvePromise, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen({ host: '127.0.0.1', port: 0, exclusive: true }, () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('could not reserve a PostgreSQL test port'));
        return;
      }
      const port = address.port;
      server.close((error) => (error ? reject(error) : resolvePromise(port)));
    });
  });
}

async function waitForHostPort(port) {
  let lastError;
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      await new Promise((resolvePromise, reject) => {
        const socket = connect({ host: '127.0.0.1', port });
        const finish = (error) => {
          socket.destroy();
          if (error) reject(error);
          else resolvePromise();
        };
        socket.setTimeout(1_000, () => finish(new Error('PostgreSQL host port timed out')));
        socket.once('connect', () => finish());
        socket.once('error', finish);
      });
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 30) await delay(250);
    }
  }
  throw new Error(`PostgreSQL host port did not become ready: ${lastError?.message ?? 'unknown error'}`);
}

function compose(args, environment, options = {}) {
  return run(
    'docker',
    ['compose', '--project-name', projectName, '--file', COMPOSE_FILE, ...args],
    { env: environment, ...options },
  );
}

function psql(database, sql, environment) {
  return compose(
    [
      'exec',
      '-T',
      'database',
      'psql',
      '--username',
      'noma',
      '--dbname',
      database,
      '--tuples-only',
      '--no-align',
      '--set',
      'ON_ERROR_STOP=1',
      '--command',
      sql,
    ],
    environment,
    { capture: true },
  );
}

async function createDatabase(name, environment) {
  await compose(
    ['exec', '-T', 'database', 'createdb', '--username', 'noma', name],
    environment,
  );
}

function databaseUrl(port, database) {
  return `postgresql://noma:${encodeURIComponent(databasePassword)}@127.0.0.1:${port}/${database}?schema=public`;
}

async function deployMigrations(port, database, environment) {
  await waitForHostPort(port);
  await pnpmCommand(
    ['--filter', '@noma/database', 'exec', 'prisma', 'migrate', 'deploy'],
    {
      ...environment,
      NOMA_ENV: 'test',
      NOMA_CREDENTIAL_ENVIRONMENT: 'test',
      DATABASE_URL: databaseUrl(port, database),
    },
  );
}

async function resolvePrePrismaBaseline(port, database, environment) {
  await waitForHostPort(port);
  await pnpmCommand(
    [
      '--filter',
      '@noma/database',
      'exec',
      'prisma',
      'migrate',
      'resolve',
      '--applied',
      BASELINE_MIGRATION_NAME,
    ],
    {
      ...environment,
      NOMA_ENV: 'test',
      NOMA_CREDENTIAL_ENVIRONMENT: 'test',
      DATABASE_URL: databaseUrl(port, database),
    },
  );
}

async function assertMigratedDatabase(database, environment, expectedProbe) {
  const extensions = await psql(
    database,
    "SELECT extname FROM pg_extension WHERE extname IN ('citext', 'pg_trgm') ORDER BY extname;",
    environment,
  );
  assert.deepEqual(extensions.stdout.trim().split(/\r?\n/), ['citext', 'pg_trgm']);

  const migrations = await psql(
    database,
    "SELECT migration_name || '|' || checksum FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name;",
    environment,
  );
  const expectedMigrations = [...EXPECTED_MIGRATION_CHECKSUMS].map(
    ([name, checksum]) => `${name}|${checksum}`,
  );
  assert.deepEqual(migrations.stdout.trim().split(/\r?\n/), expectedMigrations);

  if (expectedProbe) {
    const probe = await psql(
      database,
      'SELECT marker FROM pre_dev004_probe WHERE id = 1;',
      environment,
    );
    assert.equal(probe.stdout.trim(), expectedProbe);
  }
}

const port = await availablePort();
const environment = {
  ...process.env,
  NOMA_POSTGRES_PORT: String(port),
  NOMA_POSTGRES_USER: 'noma',
  NOMA_POSTGRES_PASSWORD: databasePassword,
  NOMA_POSTGRES_DATABASE: 'noma',
};

try {
  await run('docker', ['info', '--format', '{{.ServerVersion}}'], {
    env: environment,
    capture: true,
  });
  await compose(['up', '--detach', '--wait', 'database'], environment);
  await waitForHostPort(port);

  await deployMigrations(port, 'noma', environment);
  await assertMigratedDatabase('noma', environment);

  await createDatabase('noma_prior', environment);
  await psql(
    'noma_prior',
    "CREATE TABLE pre_dev004_probe (id integer PRIMARY KEY, marker text NOT NULL); INSERT INTO pre_dev004_probe (id, marker) VALUES (1, 'prior-schema-preserved');",
    environment,
  );
  await resolvePrePrismaBaseline(port, 'noma_prior', environment);
  await deployMigrations(port, 'noma_prior', environment);
  await assertMigratedDatabase('noma_prior', environment, 'prior-schema-preserved');

  await compose(
    [
      'exec',
      '-T',
      'database',
      'pg_dump',
      '--username',
      'noma',
      '--dbname',
      'noma_prior',
      '--format',
      'custom',
      '--file',
      '/tmp/noma-prior.dump',
    ],
    environment,
  );
  await createDatabase('noma_restored', environment);
  await compose(
    [
      'exec',
      '-T',
      'database',
      'pg_restore',
      '--username',
      'noma',
      '--dbname',
      'noma_restored',
      '--exit-on-error',
      '--no-owner',
      '--no-privileges',
      '/tmp/noma-prior.dump',
    ],
    environment,
  );
  await deployMigrations(port, 'noma_restored', environment);
  await assertMigratedDatabase('noma_restored', environment, 'prior-schema-preserved');

  console.log(
    'PASS: PostgreSQL clean migration, prior-schema upgrade, checksum verification, and isolated restore rehearsal',
  );
} catch (error) {
  await compose(['logs', '--no-color', 'database'], environment, { allowFailure: true });
  throw error;
} finally {
  await compose(['down', '--volumes', '--remove-orphans'], environment, { allowFailure: true });
}
