import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const requiredFiles = [
  'ENVIRONMENT.md',
  'apps/web/.env.example',
  'apps/api/.env.example',
  'apps/worker/.env.example',
  'apps/web/src/config/public-environment.ts',
  'packages/config/src/errors.ts',
  'packages/config/src/model.ts',
  'packages/config/src/parsers.ts',
  'packages/config/src/public.ts',
  'packages/config/src/redaction.ts',
  'packages/config/src/runtime.ts',
  'packages/config/src/server.ts',
  'packages/config/src/testing.ts',
  'packages/config/tests/environment.test.mjs',
  'scripts/test-environment-startup.mjs',
];
const secretAssignmentPattern = /^(?!\s*#)\s*(?:SESSION_SECRET|DATABASE_URL|REDIS_URL|NOMA_OTLP_AUTHORIZATION|PAYSTACK_SECRET_KEY|PRIVATE_KEY|API_KEY|ACCESS_KEY)\s*=\s*\S+/m;
const publicSecretPattern = /NEXT_PUBLIC_[A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|PRIVATE_KEY|ACCESS_KEY|DATABASE|REDIS|PAYSTACK)/;
const fail = (message) => { throw new Error(message); };
const read = (path) => readFile(resolve(ROOT, path), 'utf8');
const readJson = async (path) => JSON.parse(await read(path));

async function validate() {
  for (const path of requiredFiles) await access(resolve(ROOT, path));

  const configPackage = await readJson('packages/config/package.json');
  for (const exportPath of ['./public', './server', './testing']) {
    if (!configPackage.exports?.[exportPath]) fail(`@noma/config missing ${exportPath} export`);
  }
  if (!configPackage.scripts?.test) fail('@noma/config missing test script');

  const publicSource = [
    await read('packages/config/src/public.ts'),
    await read('apps/web/next.config.ts'),
    await read('apps/web/src/config/public-environment.ts'),
  ].join('\n');
  if (publicSecretPattern.test(publicSource)) fail('public environment source contains a secret-like NEXT_PUBLIC_ identifier');
  if (!publicSource.includes('NEXT_PUBLIC_API_BASE_URL')) fail('public API base URL contract missing');

  const apiMain = await read('apps/api/src/main.ts');
  const workerMain = await read('apps/worker/src/main.ts');
  for (const [runtime, source] of [['api', apiMain], ['worker', workerMain]]) {
    if (!source.includes('loadEnvFile')) fail(`${runtime} does not support the controlled local .env boundary`);
    if (!source.includes(`loadServerEnvironment('${runtime}'`)) fail(`${runtime} does not validate environment before startup`);
    if (!source.includes('toSafeStartupError')) fail(`${runtime} startup does not use safe error serialization`);
  }

  const serverSource = await read('packages/config/src/server.ts');
  for (const token of [
    'NOMA_CREDENTIAL_ENVIRONMENT',
    'PAYSTACK_SECRET_KEY',
    'SESSION_SECRET',
    'DATABASE_URL',
    'REDIS_URL',
    'NOMA_RELEASE_SHA',
    'NOMA_TELEMETRY_MODE',
    'NOMA_TRACE_SAMPLE_RATIO',
    'NOMA_OTLP_ENDPOINT',
    'NOMA_OTLP_AUTHORIZATION',
  ]) {
    if (!serverSource.includes(token)) fail(`server environment contract missing ${token}`);
  }

  for (const path of ['apps/web/.env.example', 'apps/api/.env.example', 'apps/worker/.env.example']) {
    const example = await read(path);
    if (secretAssignmentPattern.test(example)) fail(`${path} contains a secret assignment`);
  }

  return { files: requiredFiles.length, publicVariables: 2, serverRuntimes: 2 };
}

function selfTest() {
  const injectedPublicSecret = 'NEXT_PUBLIC_PAYSTACK_SECRET_KEY=sk_live_not_real';
  if (!publicSecretPattern.test(injectedPublicSecret)) fail('public-secret negative test did not fail');

  const injectedExample = 'SESSION_SECRET=not-real';
  if (!secretAssignmentPattern.test(injectedExample)) fail('example-secret negative test did not fail');
}

try {
  const result = await validate();
  console.log(`PASS: ${result.files} environment files, ${result.publicVariables} public variables, ${result.serverRuntimes} validated server runtimes`);
  if (process.argv.includes('--self-test')) {
    selfTest();
    console.log('PASS: injected public secret and example secret assignment were rejected');
  }
} catch (error) {
  console.error(`FAIL: ${error.message}`);
  process.exit(1);
}
