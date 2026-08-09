import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, rm, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const DATABASE_DIR = resolve(ROOT, 'packages', 'database');
const LOCK_ID = createHash('sha256').update(ROOT).digest('hex').slice(0, 16);
const LOCK_PATH = resolve(tmpdir(), `noma-prisma-generate-${LOCK_ID}`);
const WAIT_DEADLINE_MS = 120_000;
const STALE_LOCK_MS = 300_000;
const POLL_MS = 100;

const exitCode = await withGenerationLock(async () => {
  const requireFromDatabase = createRequire(resolve(DATABASE_DIR, 'package.json'));
  const prismaCli = requireFromDatabase.resolve('prisma/build/index.js');
  return run(process.execPath, [prismaCli, 'generate']);
});
if (exitCode !== 0) process.exitCode = exitCode ?? 1;

async function withGenerationLock(action) {
  const deadline = Date.now() + WAIT_DEADLINE_MS;
  while (true) {
    try {
      await mkdir(LOCK_PATH);
      break;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      if (await lockIsStale()) {
        await rm(LOCK_PATH, { recursive: true, force: true });
        continue;
      }
      if (Date.now() >= deadline) throw new Error('timed out waiting for the bounded Prisma generation lock');
      await delay(POLL_MS);
    }
  }

  try {
    return await action();
  } finally {
    await rm(LOCK_PATH, { recursive: true, force: true });
  }
}

async function lockIsStale() {
  try {
    const details = await stat(LOCK_PATH);
    return Date.now() - details.mtimeMs > STALE_LOCK_MS;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

function run(program, args) {
  return new Promise((resolveExit, reject) => {
    const child = spawn(program, args, {
      cwd: DATABASE_DIR,
      env: process.env,
      stdio: 'inherit',
      windowsHide: true,
    });
    child.once('error', reject);
    child.once('exit', resolveExit);
  });
}

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}
