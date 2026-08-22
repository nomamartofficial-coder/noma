import { spawn, spawnSync } from 'node:child_process';

const PORT = 3110;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const STARTUP_TIMEOUT_MS = 60_000;
const PROBE_TIMEOUT_MS = 3_000;
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function spawnPnpm(args, options) {
  const pnpmCli = process.env.npm_execpath;
  if (pnpmCli && /pnpm(?:\.(?:cjs|mjs|js))?$/i.test(pnpmCli)) return spawn(process.execPath, [pnpmCli, ...args], options);
  return spawn('pnpm', args, { ...options, shell: process.platform === 'win32' });
}

function stopChild(child) {
  if (!child.pid || child.exitCode !== null) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore', windowsHide: true });
  } else {
    child.kill('SIGTERM');
  }
}

async function fetchBounded(path, init = {}) {
  return fetch(`${ORIGIN}${path}`, { ...init, redirect: 'manual', signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) });
}

async function waitForWeb(child) {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Web exited before protected-route probes with code ${child.exitCode}`);
    try {
      const response = await fetchBounded('/health/live');
      if (response.ok) return;
    } catch {}
    await sleep(250);
  }
  throw new Error(`Web did not become healthy within ${STARTUP_TIMEOUT_MS}ms`);
}

const forbiddenProtectedContent = [
  'data-noma-protected-shell',
  'Seller Centre',
  'Noma Rider',
  'Noma Operations',
  'Noma Restricted Administration',
  'Synthetic UI-005',
  'Available / Assigned Jobs',
  'Emergency Controls',
  'Seller overview',
  'Seller orders',
  'Current rider work',
  'Available and assigned jobs',
  'Operations overview',
  'Finance operations',
  'Administration overview',
  'Access and roles',
];

async function assertDenied(path, init) {
  const response = await fetchBounded(path, init);
  const body = await response.text();
  if (response.status !== 404) throw new Error(`${path}: expected non-enumerating 404, received ${response.status}`);
  if (!body.includes('Page unavailable')) throw new Error(`${path}: generic denial content is missing`);
  if (!body.includes('<title>Noma</title>')) throw new Error(`${path}: denial metadata is not neutral`);
  for (const forbidden of forbiddenProtectedContent) if (body.includes(forbidden)) throw new Error(`${path}: protected content escaped denial boundary: ${forbidden}`);
}

async function assertAvailable(path) {
  const response = await fetchBounded(path);
  if (!response.ok) throw new Error(`${path}: expected public/runtime route to remain available, received ${response.status}`);
}

const child = spawnPnpm(['--filter', '@noma/web', 'start'], {
  env: { ...process.env, HOST: '127.0.0.1', PORT: String(PORT) },
  stdio: 'inherit',
  windowsHide: true,
});

child.once('error', (error) => console.error(`failed to start Web for protected-route probes: ${error.message}`));

try {
  await waitForWeb(child);
  for (const path of ['/seller', '/seller/orders', '/rider', '/rider/jobs', '/operations', '/operations/finance', '/admin', '/admin/access']) await assertDenied(path);
  await assertDenied('/seller?role=seller&demo=true');
  await assertDenied('/rider/jobs?assigned=true', { headers: { cookie: 'noma_role=rider; demo_role=rider' } });
  await assertDenied('/operations/finance', { headers: { 'x-user-role': 'finance', 'x-demo-surface': 'operations' } });
  await assertDenied('/admin/access?isAdmin=true', { headers: { cookie: 'noma_admin=true', 'x-noma-admin': 'true' } });
  for (const path of ['/', '/account', '/health/live', '/health/ready']) await assertAvailable(path);
  console.log('PASS: protected role routes fail closed, bypass inputs are ignored, and public/runtime routes remain available');
} finally {
  stopChild(child);
}
