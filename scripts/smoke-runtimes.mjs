import { spawn, spawnSync } from 'node:child_process';

const runtimes = [
  { name: 'web', filter: '@noma/web', port: 3100 },
  { name: 'api', filter: '@noma/api', port: 3101 },
  { name: 'worker', filter: '@noma/worker', port: 3102 },
];
const children = [];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function spawnPnpm(args, options) {
  const pnpmCli = process.env.npm_execpath;
  const isPnpmCli = pnpmCli && /pnpm(?:\.(?:cjs|mjs|js))?$/i.test(pnpmCli);

  if (isPnpmCli) {
    return spawn(process.execPath, [pnpmCli, ...args], options);
  }

  return spawn('pnpm', args, {
    ...options,
    shell: process.platform === 'win32',
  });
}

function stopChild(child) {
  if (!child.pid || child.exitCode !== null) return;

  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
      stdio: 'ignore',
      windowsHide: true,
    });
    return;
  }

  child.kill('SIGTERM');
}

function cleanup() {
  for (const child of children) stopChild(child);
}

async function waitFor(runtime, path) {
  const url = `http://127.0.0.1:${runtime.port}${path}`;

  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (runtime.child.exitCode !== null) {
      throw new Error(`${runtime.name} exited before becoming healthy with code ${runtime.child.exitCode}`);
    }

    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}

    await sleep(250);
  }

  throw new Error(`runtime did not become healthy: ${url}`);
}

try {
  for (const runtime of runtimes) {
    const child = spawnPnpm(['--filter', runtime.filter, 'start'], {
      env: { ...process.env, HOST: '127.0.0.1', PORT: String(runtime.port) },
      stdio: 'inherit',
      windowsHide: true,
    });

    child.once('error', (error) => {
      console.error(`failed to start ${runtime.name}: ${error.message}`);
    });

    runtime.child = child;
    children.push(child);
  }

  for (const runtime of runtimes) {
    await waitFor(runtime, '/health/live');
    await waitFor(runtime, '/health/ready');
  }

  console.log('PASS: Web, API, and Worker liveness/readiness smoke checks');
} finally {
  cleanup();
}
