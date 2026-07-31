import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const marker = 'do-not-print-this-secret';
const baseEnvironment = {
  ...process.env,
  NOMA_ENV: 'production',
  NOMA_CREDENTIAL_ENVIRONMENT: 'production',
  PUBLIC_WEB_ORIGIN: 'https://noma.invalid',
  API_PUBLIC_URL: 'https://api.noma.invalid',
  SESSION_SECRET: marker,
  DATABASE_URL: 'postgresql://noma:database-password@db.invalid:5432/noma?sslmode=require',
  REDIS_URL: 'rediss://default:redis-password@redis.invalid:6379',
  NOMA_RELEASE_SHA: '0123456789abcdef0123456789abcdef01234567',
};

function run(entry) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, [resolve(ROOT, entry)], {
      cwd: ROOT,
      env: baseEnvironment,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let output = '';
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`${entry} did not fail startup within five seconds`));
    }, 5_000);

    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { output += chunk; });
    child.once('error', reject);
    child.once('exit', (code) => {
      clearTimeout(timeout);
      resolveRun({ code, output });
    });
  });
}

for (const entry of ['apps/api/dist/main.js', 'apps/worker/dist/main.js']) {
  const result = await run(entry);
  if (result.code === 0) throw new Error(`${entry} accepted invalid production configuration`);
  if (!result.output.includes('runtime.configuration.invalid')) {
    throw new Error(`${entry} did not emit the safe configuration error contract`);
  }
  for (const forbidden of [marker, 'database-password', 'redis-password']) {
    if (result.output.includes(forbidden)) throw new Error(`${entry} leaked a secret value during startup failure`);
  }
}

console.log('PASS: API and Worker fail closed with redacted startup diagnostics');
