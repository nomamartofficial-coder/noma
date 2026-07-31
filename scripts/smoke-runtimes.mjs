import { spawn } from 'node:child_process';

const commands = [
  { name: 'web', filter: '@noma/web', port: 3100 },
  { name: 'api', filter: '@noma/api', port: 3101 },
  { name: 'worker', filter: '@noma/worker', port: 3102 },
];
const pnpmExecutable = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const children = [];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(url) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await sleep(250);
  }
  throw new Error(`runtime did not become healthy: ${url}`);
}

try {
  for (const runtime of commands) {
    const child = spawn(pnpmExecutable, ['--filter', runtime.filter, 'start'], {
      env: { ...process.env, HOST: '127.0.0.1', PORT: String(runtime.port) },
      stdio: 'inherit',
      windowsHide: true,
    });
    children.push(child);
  }

  for (const runtime of commands) {
    await waitFor(`http://127.0.0.1:${runtime.port}/health/live`);
    await waitFor(`http://127.0.0.1:${runtime.port}/health/ready`);
  }
  console.log('PASS: Web, API, and Worker liveness/readiness smoke checks');
} finally {
  for (const child of children) child.kill('SIGTERM');
}
