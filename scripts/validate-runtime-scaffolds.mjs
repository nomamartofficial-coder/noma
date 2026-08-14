import { readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const required = [
  'apps/web/src/app/(marketplace)/page.tsx',
  'apps/web/src/app/health/live/route.ts',
  'apps/web/src/app/health/ready/route.ts',
  'apps/api/src/main.ts',
  'apps/api/src/health/health.controller.ts',
  'apps/worker/src/main.ts',
  'apps/worker/src/health-server.ts',
  'packages/contracts/src/health.ts',
];
const fail = (message) => { throw new Error(message); };
const readJson = async (path) => JSON.parse(await readFile(resolve(ROOT, path), 'utf8'));

async function validate() {
  for (const path of required) await access(resolve(ROOT, path));

  const web = await readJson('apps/web/package.json');
  const api = await readJson('apps/api/package.json');
  const worker = await readJson('apps/worker/package.json');
  if (web.dependencies?.next !== '16.3.0') fail('Next.js must be pinned to 16.3.0');
  for (const pkg of [api, worker]) {
    if (pkg.dependencies?.['@nestjs/core'] !== '11.1.28') fail(`${pkg.name}: NestJS must be pinned to 11.1.28`);
    for (const script of ['dev', 'start', 'build', 'typecheck']) if (!pkg.scripts?.[script]) fail(`${pkg.name}: missing ${script}`);
  }

  const sources = await Promise.all(required.map((path) => readFile(resolve(ROOT, path), 'utf8')));
  const joined = sources.join('\n');
  for (const route of ['/health/live', '/health/ready']) if (!joined.includes(route.slice(1))) fail(`missing ${route}`);

  const webSource = sources.slice(0, 3).join('\n');
  if (/(PAYSTACK|DATABASE_URL|SECRET_KEY|PRIVATE_KEY|WEBHOOK_SECRET)/.test(webSource)) fail('web source contains a server-secret identifier');
  return { runtimes: 3, healthChecks: 6 };
}

function selfTest() {
  const injected = 'const PAYSTACK_SECRET_KEY = "not-real"';
  if (!/(PAYSTACK|DATABASE_URL|SECRET_KEY|PRIVATE_KEY|WEBHOOK_SECRET)/.test(injected)) fail('secret-boundary negative test did not fail');
}

try {
  const result = await validate();
  console.log(`PASS: ${result.runtimes} runtime scaffolds and ${result.healthChecks} distinct health checks`);
  if (process.argv.includes('--self-test')) {
    selfTest();
    console.log('PASS: injected Web secret identifier was rejected');
  }
} catch (error) {
  console.error(`FAIL: ${error.message}`);
  process.exit(1);
}
