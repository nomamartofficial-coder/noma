import { access, readFile, readdir } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const REQUIRED_FILES = [
  'TESTING.md',
  'docs/adr/0006-deterministic-testing-foundation.md',
  'vitest.config.ts',
  'tsconfig.test.json',
  'scripts/vitest-component-setup.ts',
  'packages/testing/src/clock.ts',
  'packages/testing/src/random.ts',
  'packages/testing/src/fixtures.ts',
  'packages/testing/src/personas.ts',
  'packages/testing/src/outcomes.ts',
  'packages/testing/src/async.ts',
  'packages/testing/src/containers.ts',
  'packages/testing/tests/determinism.test.ts',
  'packages/testing/tests/containers.integration.test.ts',
  'tests/component/testing-library-harness.component.test.tsx',
];
const EXPECTED_ROOT_DEPENDENCIES = Object.freeze({
  '@testing-library/dom': '10.4.1',
  '@testing-library/jest-dom': '7.0.0',
  '@testing-library/react': '16.3.2',
  '@testing-library/user-event': '14.6.1',
  '@vitest/coverage-v8': '4.1.10',
  jsdom: '30.0.1',
  vite: '8.2.0',
  vitest: '4.1.10',
});
const EXPECTED_TESTING_DEPENDENCIES = Object.freeze({
  '@testcontainers/postgresql': '12.0.4',
  '@testcontainers/redis': '12.0.4',
  testcontainers: '12.0.4',
});
const POSTGRES_IMAGE =
  'postgres:18.4-alpine3.23@sha256:996d0920e4ff9df1fc19dacb904492f3c1ec0ec1cc338f0ad7123be7731c5f5e';
const REDIS_IMAGE =
  'redis:8.8.1-alpine3.23@sha256:8096655e437712b07503796fb64d81359256cfcff0ab29d95a7da72863786efb';

const fail = (message) => { throw new Error(message); };
const read = (path) => readFile(resolve(ROOT, path), 'utf8');
const readJson = async (path) => JSON.parse(await read(path));

function validatePins(actual, expected, subject) {
  for (const [name, version] of Object.entries(expected)) {
    if (actual?.[name] !== version) fail(`${subject} ${name} must be pinned to ${version}`);
  }
}

function validateContainerSource(source) {
  for (const required of [
    POSTGRES_IMAGE,
    REDIS_IMAGE,
    'NOMA_ENV: \'test\'',
    'NOMA_CREDENTIAL_ENVIRONMENT: \'test\'',
    'maxmemory-policy',
    'noeviction',
    'appendonly',
    'removeVolumes: true',
    'Testcontainers harness refuses pre-existing database or Redis URLs',
  ]) {
    if (!source.includes(required)) fail(`container harness missing ${required}`);
  }
  for (const prohibited of [
    /\.withReuse\s*\(/,
    /\bTRUNCATE\b/i,
    /\bDELETE\s+FROM\b/i,
    /prisma\s+(?:db\s+push|migrate\s+reset)/i,
  ]) {
    if (prohibited.test(source)) fail(`container harness contains prohibited cleanup or reuse: ${prohibited}`);
  }
}

async function filesBelow(path) {
  const directory = resolve(ROOT, path);
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const child = `${path}/${entry.name}`;
    return entry.isDirectory() ? filesBelow(child) : [child];
  }));
  return nested.flat();
}

async function validateProductionBoundary() {
  for (const root of ['apps', 'packages']) {
    for (const path of await filesBelow(root)) {
      if (path.startsWith('packages/testing/') || !['.ts', '.tsx', '.js', '.mjs'].includes(extname(path))) continue;
      if (path.includes('/tests/') || /\.(?:test|spec)\.[^.]+$/.test(path)) continue;
      const source = await read(path);
      if (source.includes('@noma/testing')) fail(`${path}: production source must not import @noma/testing`);
    }
  }

  for (const root of ['apps', 'packages']) {
    for (const entry of await readdir(resolve(ROOT, root), { withFileTypes: true })) {
      if (!entry.isDirectory() || (root === 'packages' && entry.name === 'testing')) continue;
      const packagePath = `${root}/${entry.name}/package.json`;
      let manifest;
      try {
        manifest = await readJson(packagePath);
      } catch (error) {
        if (error.code === 'ENOENT') continue;
        throw error;
      }
      if (manifest.dependencies?.['@noma/testing']) {
        fail(`${packagePath}: @noma/testing cannot be a production dependency`);
      }
    }
  }
}

async function validateFocusedTests() {
  for (const root of ['apps', 'packages', 'tests']) {
    for (const path of await filesBelow(root)) {
      if (!/\.(?:test|spec)\.(?:ts|tsx|js|mjs)$/.test(path)) continue;
      const source = await read(path);
      if (/\b(?:test|it|describe)\.only\s*\(/.test(source)) fail(`${path}: focused tests are prohibited`);
      if (/\b(?:test|it|describe)\.skip\s*\(/.test(source)) fail(`${path}: skipped tests require owned governance`);
      if (/new Promise\s*\([^)]*setTimeout|(?:^|\W)sleep\s*\(/m.test(source)) {
        fail(`${path}: arbitrary test sleeps are prohibited; use polling deadlines or barriers`);
      }
    }
  }
}

async function validate() {
  for (const path of REQUIRED_FILES) await access(resolve(ROOT, path));
  const rootPackage = await readJson('package.json');
  const testingPackage = await readJson('packages/testing/package.json');
  validatePins(rootPackage.devDependencies, EXPECTED_ROOT_DEPENDENCIES, 'root dev dependency');
  validatePins(testingPackage.dependencies, EXPECTED_TESTING_DEPENDENCIES, '@noma/testing dependency');

  const config = await read('vitest.config.ts');
  for (const required of [
    "name: 'unit'",
    "name: 'component'",
    "name: 'integration'",
    'retry: 0',
    'allowOnly: false',
    "provider: 'v8'",
    "environment: 'jsdom'",
    'fileParallelism: false',
    "process.env.TZ = 'UTC'",
    '[noma-testing] seed=',
  ]) {
    if (!config.includes(required)) fail(`Vitest configuration missing ${required}`);
  }

  validateContainerSource(await read('packages/testing/src/containers.ts'));
  await validateProductionBoundary();
  await validateFocusedTests();
  return { files: REQUIRED_FILES.length, rootPins: Object.keys(EXPECTED_ROOT_DEPENDENCIES).length };
}

function selfTest() {
  try {
    validatePins({ vitest: '^4.1.10' }, { vitest: '4.1.10' }, 'negative dependency');
    fail('floating dependency negative test did not fail');
  } catch (error) {
    if (!/must be pinned/.test(error.message)) throw error;
  }

  try {
    validateContainerSource(`${POSTGRES_IMAGE}\n${REDIS_IMAGE}\nTRUNCATE outbox_events`);
    fail('destructive cleanup negative test did not fail');
  } catch (error) {
    if (!/missing|prohibited/.test(error.message)) throw error;
  }
}

try {
  const result = await validate();
  console.log(`PASS: ${result.files} deterministic testing files and ${result.rootPins} pinned root tools`);
  if (process.argv.includes('--self-test')) {
    selfTest();
    console.log('PASS: floating tools and destructive cleanup were rejected');
  }
} catch (error) {
  console.error(`FAIL: ${error.message}`);
  process.exit(1);
}
