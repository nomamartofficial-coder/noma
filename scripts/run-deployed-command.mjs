import { spawn } from 'node:child_process';
import {
  requireEncryptedPostgreSqlUrl,
  waitForCommittedMigrations,
} from './deployment-command-policy.mjs';

const command = process.argv[2];
const supported = new Set(['api', 'worker', 'migrate', 'wait-for-migrations']);

if (!supported.has(command)) throw new Error('deployed command is not supported');
if (process.env.NOMA_ENV !== 'staging') throw new Error('DEV-009 deployed commands are staging-only');
if (process.env.NOMA_CREDENTIAL_ENVIRONMENT !== 'staging') throw new Error('staging credential marker is required');
if (process.env.NOMA_PROVIDER_MODE !== 'disabled') throw new Error('external providers must remain disabled');

const releaseSha = process.env.RENDER_GIT_COMMIT?.trim();
if (!releaseSha || !/^[a-f0-9]{40}$/i.test(releaseSha)) {
  throw new Error('Render must supply a full immutable Git commit identity');
}
process.env.NOMA_RELEASE_SHA = releaseSha;

process.env.DATABASE_URL = requireEncryptedPostgreSqlUrl(process.env.DATABASE_URL);
if (!process.env.REDIS_URL?.trim()) throw new Error('staging queue configuration is required');

function runPnpm(args, { stdio = 'inherit', signal } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason instanceof Error ? signal.reason : new Error('deployment subprocess aborted'));
      return;
    }

    const child = spawn('pnpm', args, { env: process.env, stdio, shell: false });
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback(value);
    };
    const terminate = (childSignal = 'SIGTERM') => {
      if (!child.killed) child.kill(childSignal);
    };
    const abort = () => {
      terminate();
      finish(reject, signal.reason instanceof Error ? signal.reason : new Error('deployment subprocess aborted'));
    };
    const forwardSigterm = () => terminate('SIGTERM');
    const forwardSigint = () => terminate('SIGINT');
    const cleanup = () => {
      process.removeListener('SIGTERM', forwardSigterm);
      process.removeListener('SIGINT', forwardSigint);
      signal?.removeEventListener('abort', abort);
    };
    process.once('SIGTERM', forwardSigterm);
    process.once('SIGINT', forwardSigint);
    signal?.addEventListener('abort', abort, { once: true });
    child.once('error', (error) => {
      finish(reject, error);
    });
    child.once('exit', (code, signal) => {
      if (signal) finish(reject, new Error(`deployment subprocess stopped by ${signal}`));
      else finish(resolve, code ?? 1);
    });
  });
}

if (command === 'migrate') {
  process.exitCode = await runPnpm(['db:migrate:deploy']);
} else if (command === 'wait-for-migrations') {
  const result = await waitForCommittedMigrations({
    check: async ({ signal }) => (await runPnpm(['db:migrate:status'], { stdio: 'ignore', signal })) === 0,
    onRetry: ({ attempts, delayMs }) => {
      console.log(`Migration gate check ${attempts} is not ready; retrying in ${Math.ceil(delayMs / 1_000)} seconds.`);
    },
  });
  console.log(`Migration gate passed after ${result.attempts} check(s).`);
} else {
  if (command === 'worker' && (await runPnpm(['db:migrate:status'], { stdio: 'ignore' })) !== 0) {
    throw new Error('Worker startup refused because committed database migrations are not ready');
  }
  await import(`../apps/${command}/dist/main.js`);
}
