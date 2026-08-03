import { spawn } from 'node:child_process';

const command = process.argv[2];
const supported = new Set(['api', 'worker', 'migrate']);

if (!supported.has(command)) throw new Error('deployed command must be api, worker, or migrate');
if (process.env.NOMA_ENV !== 'staging') throw new Error('DEV-009 deployed commands are staging-only');
if (process.env.NOMA_CREDENTIAL_ENVIRONMENT !== 'staging') throw new Error('staging credential marker is required');
if (process.env.NOMA_PROVIDER_MODE !== 'disabled') throw new Error('external providers must remain disabled');

const releaseSha = process.env.RENDER_GIT_COMMIT?.trim();
if (!releaseSha || !/^[a-f0-9]{40}$/i.test(releaseSha)) {
  throw new Error('Render must supply a full immutable Git commit identity');
}
process.env.NOMA_RELEASE_SHA = releaseSha;

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) throw new Error('staging database configuration is required');
const parsedDatabaseUrl = new URL(databaseUrl);
if (!['postgres:', 'postgresql:'].includes(parsedDatabaseUrl.protocol)) {
  throw new Error('staging database configuration must use PostgreSQL');
}
if (!parsedDatabaseUrl.searchParams.has('sslmode') && parsedDatabaseUrl.searchParams.get('ssl') !== 'true') {
  parsedDatabaseUrl.searchParams.set('sslmode', 'require');
  process.env.DATABASE_URL = parsedDatabaseUrl.toString();
}
if (!process.env.REDIS_URL?.trim()) throw new Error('staging queue configuration is required');

function runPnpm(args) {
  const child = spawn('pnpm', args, { env: process.env, stdio: 'inherit', shell: false });
  const forward = (signal) => { if (!child.killed) child.kill(signal); };
  process.once('SIGTERM', forward);
  process.once('SIGINT', forward);
  child.once('error', (error) => { throw error; });
  child.once('exit', (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    process.exit(code ?? 1);
  });
}

if (command === 'migrate') {
  runPnpm(['db:migrate:deploy']);
} else {
  await import(`../apps/${command}/dist/main.js`);
}
