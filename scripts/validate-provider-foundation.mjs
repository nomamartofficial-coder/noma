import { readFile, readdir } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const REQUIRED_FILES = [
  'PROVIDERS.md',
  'SIMULATORS.md',
  'docs/adr/0007-provider-ports-and-local-simulators.md',
  'packages/platform/src/providers/common.ts',
  'packages/platform/src/providers/ports.ts',
  'packages/integrations/src/provider-simulators.ts',
  'packages/testing/src/providers.ts',
  'packages/platform/tests/providers.test.ts',
  'packages/testing/tests/providers.test.ts',
];
const REQUIRED_PORTS = [
  'PaymentProviderPort', 'ProviderWebhookVerifierPort', 'ProviderEventMapperPort',
  'RefundProviderPort', 'BankAccountProviderPort', 'BeneficiaryProviderPort', 'TransferProviderPort',
  'ObjectStorageProviderPort', 'TransactionalEmailProviderPort', 'WebPushProviderPort',
  'MonitoringProviderPort', 'AnalyticsProviderPort', 'OperationalTelemetryProviderPort',
  'HostingConfigurationProviderPort', 'DnsConfigurationProviderPort', 'DeferredProviderPort',
];
const FORBIDDEN_VENDOR_IMPORT = /from\s+['"](?:paystack|postmark|@aws-sdk|aws-sdk|@sentry|posthog|cloudflare|vercel|render)/i;
const LIVE_HOST = /https:\/\/(?:api\.paystack\.co|api\.postmarkapp\.com|s3[.-][a-z0-9-]*\.amazonaws\.com|api\.cloudflare\.com|api\.vercel\.com|api\.render\.com)/i;
const SECRET_EXAMPLE = /\b(?:sk|pk)_(?:live|test)_[A-Za-z0-9_-]{8,}\b|-----BEGIN [A-Z ]*PRIVATE KEY-----/i;
const fail = (message) => { throw new Error(message); };
const read = (path) => readFile(resolve(ROOT, path), 'utf8');

async function filesBelow(path) {
  const directory = resolve(ROOT, path);
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const child = `${path}/${entry.name}`;
    return entry.isDirectory() ? filesBelow(child) : [child];
  }));
  return nested.flat();
}

function validateSource(path, source) {
  if (FORBIDDEN_VENDOR_IMPORT.test(source)) fail(`${path}: vendor SDK import crossed the provider boundary`);
  if (/(?:provider|simulator)/i.test(path) && SECRET_EXAMPLE.test(source)) fail(`${path}: production-like provider credential is prohibited`);
  if ((path.includes('provider-simulator') || path.includes('/testing/')) && LIVE_HOST.test(source)) {
    fail(`${path}: simulator/test source contains a live provider host`);
  }
  if (path.startsWith('apps/web/') && /@noma\/(?:integrations|platform\/providers)/.test(source)) {
    fail(`${path}: browser code cannot import server provider ports or integrations`);
  }
  if ((path.startsWith('apps/') || path.startsWith('packages/platform/') || path.startsWith('packages/database/')) &&
      !path.includes('/tests/') && /@noma\/(?:testing|integrations\/testing)/.test(source)) {
    fail(`${path}: production source cannot import provider simulator inspection APIs`);
  }
  if (path.startsWith('packages/platform/') && /@noma\/integrations/.test(source)) {
    fail(`${path}: platform cannot import provider implementations`);
  }
}

async function validate() {
  for (const path of REQUIRED_FILES) await read(path);
  const platform = await read('packages/platform/src/providers/ports.ts');
  const common = await read('packages/platform/src/providers/common.ts');
  const simulator = await read('packages/integrations/src/provider-simulators.ts');
  const testing = await read('packages/testing/src/providers.ts');
  for (const name of REQUIRED_PORTS) if (!platform.includes(name)) fail(`provider port is missing: ${name}`);
  for (const token of ['ProviderCallResult', "kind: 'uncertain'", 'parseProviderCallResult', 'parseMinorMoney', 'production cannot select provider simulator mode']) {
    if (!common.includes(token)) fail(`common provider contract is missing ${token}`);
  }
  for (const token of ['PROVIDER_SIMULATOR_OPERATIONS', 'possibly-accepted', 'duplicate', 'snapshot()', 'reset()', 'structuredClone']) {
    if (!simulator.includes(token)) fail(`provider simulator is missing ${token}`);
  }
  for (const token of ['ManualTestClock', 'DeterministicTestIds', 'ScriptedOutcomeController', 'createManualTestScheduler', 'verifyProviderConformance']) {
    if (!testing.includes(token)) fail(`DEV-006 provider harness reuse is missing ${token}`);
  }
  if (/\bMath\.random\s*\(|\bDate\.now\s*\(|setTimeout\s*\(/.test(simulator)) {
    fail('provider simulator must not depend on wall clock, Math.random, or arbitrary sleeps');
  }
  const sourcePaths = (await Promise.all(['apps', 'packages'].map(filesBelow))).flat()
    .filter((path) => ['.ts', '.tsx', '.js', '.mjs'].includes(extname(path)) && !path.includes('/dist/'));
  for (const path of sourcePaths) validateSource(path.replaceAll('\\', '/'), await read(path));
  const integrations = JSON.parse(await read('packages/integrations/package.json'));
  const dependencies = { ...(integrations.dependencies ?? {}), ...(integrations.devDependencies ?? {}) };
  for (const dependency of Object.keys(dependencies)) {
    if (FORBIDDEN_VENDOR_IMPORT.test(`from '${dependency}'`)) fail(`provider SDK dependency is prohibited in DEV-007: ${dependency}`);
  }
  if (!integrations.exports?.['./testing']) fail('@noma/integrations/testing export is required');
  if (!JSON.parse(await read('packages/testing/package.json')).exports?.['./providers']) fail('@noma/testing/providers export is required');
  const server = await read('packages/config/src/server.ts');
  if (!server.includes('NOMA_PROVIDER_MODE') || !server.includes("mode === 'real'")) fail('provider environment selection must fail closed');
  return { ports: REQUIRED_PORTS.length, operations: (simulator.match(/^\s*'[^']+',?$/gm) ?? []).length };
}

function selfTest() {
  const violations = [
    ['apps/web/src/probe.ts', "import '@noma/integrations';"],
    ['packages/platform/src/probe.ts', "import '@noma/integrations/testing';"],
    ['apps/api/src/probe.ts', "import '@noma/testing/providers';"],
    ['packages/integrations/src/provider-simulator-probe.ts', "const endpoint = 'https://api.paystack.co';"],
    ['packages/platform/src/probe.ts', "import Paystack from 'paystack';"],
  ];
  for (const [path, source] of violations) {
    let rejected = false;
    try { validateSource(path, source); } catch { rejected = true; }
    if (!rejected) fail(`negative provider boundary test did not reject ${path}`);
  }
}

try {
  const result = await validate();
  console.log(`PASS: ${result.ports} provider port families, deterministic simulator boundary, no live SDKs`);
  if (process.argv.includes('--self-test')) {
    selfTest();
    console.log('PASS: injected browser, production-inspection, vendor-SDK, and live-host violations were rejected');
  }
} catch (error) {
  console.error(`FAIL: ${error instanceof Error ? error.message : 'provider validation failed'}`);
  process.exit(1);
}
