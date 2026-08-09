import { access, readFile, readdir } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const REQUIRED = Object.freeze([
  'OBSERVABILITY.md',
  'docs/adr/0010-opentelemetry-structured-logging-correlation-health.md',
  'runbooks/observability.md',
  'runbooks/health-and-readiness.md',
  'runbooks/trace-correlation.md',
  'runbooks/observability-exporter-outage.md',
  'runbooks/dependency-readiness-failure.md',
  'packages/observability/src/server.ts',
  'packages/observability/tests/server.test.ts',
  'packages/config/src/server.ts',
  'packages/contracts/src/queue.ts',
  'packages/database/src/outbox.ts',
  'packages/integrations/src/queue.ts',
  'packages/testing/tests/observability.integration.test.ts',
  'apps/api/src/main.ts',
  'apps/worker/src/main.ts',
  'scripts/ci-command-catalog.mjs',
]);
const PINS = Object.freeze({
  '@opentelemetry/api': '1.9.1',
  '@opentelemetry/exporter-metrics-otlp-http': '0.221.0',
  '@opentelemetry/exporter-trace-otlp-http': '0.221.0',
  '@opentelemetry/resources': '2.10.0',
  '@opentelemetry/sdk-metrics': '2.10.0',
  '@opentelemetry/sdk-node': '0.221.0',
  '@opentelemetry/sdk-trace-base': '2.10.0',
  '@opentelemetry/semantic-conventions': '1.43.0',
});

const sources = await readSources();
const failures = await validate(sources);
if (failures.length > 0) {
  failures.forEach((failure) => console.error(`FAIL: ${failure}`));
  process.exit(1);
}
console.log(`PASS: ${REQUIRED.length} observability artefacts, ${Object.keys(PINS).length} exact pins, server-only imports, propagation, health, redaction, shutdown, tests, and CI policy`);

if (process.argv.includes('--self-test')) {
  runSelfTest(sources);
  console.log('PASS: 35 weakened observability-policy fixtures were rejected');
}

async function readSources() {
  const entries = await Promise.all(REQUIRED.map(async (path) => {
    await access(resolve(ROOT, path));
    return [path, normalize(await readFile(resolve(ROOT, path), 'utf8'))];
  }));
  entries.push(['packages/observability/package.json', normalize(await readFile(resolve(ROOT, 'packages/observability/package.json'), 'utf8'))]);
  entries.push(['package.json', normalize(await readFile(resolve(ROOT, 'package.json'), 'utf8'))]);
  entries.push(['pnpm-lock.yaml', normalize(await readFile(resolve(ROOT, 'pnpm-lock.yaml'), 'utf8'))]);
  const productionFiles = await sourceFiles(['apps', 'packages'], (path) => !path.includes('/tests/') && !path.includes('/dist/') && !path.includes('/generated/'));
  for (const path of productionFiles) {
    if (!entries.some(([existing]) => existing === path)) {
      entries.push([path, normalize(await readFile(resolve(ROOT, path), 'utf8'))]);
    }
  }
  for (const path of [
    '.github/workflows/ci-quality.yml',
    '.github/workflows/ci-integration.yml',
    '.github/workflows/ci-security.yml',
    '.github/workflows/ci-windows.yml',
    'apps/api/package.json',
    'apps/worker/package.json',
    'apps/web/package.json',
    'apps/api/.env.example',
    'apps/worker/.env.example',
  ]) {
    entries.push([path, normalize(await readFile(resolve(ROOT, path), 'utf8'))]);
  }
  return Object.fromEntries(entries);
}

async function validate(input) {
  const errors = validateStatic(input);
  const productionFiles = await sourceFiles(['apps', 'packages'], (path) => !path.includes('/tests/') && !path.includes('/dist/') && !path.includes('/generated/'));
  for (const path of productionFiles) {
    if (path.startsWith('packages/observability/') || path.startsWith('apps/api/') || path.startsWith('apps/worker/') || path.startsWith('packages/integrations/')) continue;
    const source = normalize(await readFile(resolve(ROOT, path), 'utf8'));
    if (source.includes("@noma/observability/server")) errors.push(`${path}: server observability import crosses an unapproved runtime boundary`);
  }
  return [...new Set(errors)];
}

function validateStatic(input) {
  const errors = [];
  const manifest = JSON.parse(input['packages/observability/package.json']);
  for (const [name, version] of Object.entries(PINS)) {
    if (manifest.dependencies?.[name] !== version) errors.push(`@noma/observability must pin ${name} exactly to ${version}`);
    if (!input['pnpm-lock.yaml'].includes(`  '${name}'`) && !input['pnpm-lock.yaml'].includes(`  ${name}@${version}:`)) {
      errors.push(`lockfile is missing ${name} ${version}`);
    }
  }
  const server = input['packages/observability/src/server.ts'];
  for (const token of ['AsyncLocalStorage', 'TraceContextCarrier', 'InMemorySpanExporter', 'OTLPTraceExporter', 'PeriodicExportingMetricReader', 'ParentBasedSampler', 'TraceIdRatioBasedSampler', 'traceSampleRatio', 'SECRET_KEY_PATTERN', 'shutdownTimeoutMilliseconds', 'cardinalityLimits']) {
    if (!server.includes(token)) errors.push(`server observability is missing ${token}`);
  }
  const config = input['packages/config/src/server.ts'];
  for (const token of ['NOMA_TELEMETRY_MODE', 'NOMA_TRACE_SAMPLE_RATIO', 'NOMA_OTLP_ENDPOINT', 'NOMA_OTLP_AUTHORIZATION', "mode === 'in-memory' && remote", "url.protocol !== 'https:'", 'url.username || url.password || url.search || url.hash']) {
    if (!config.includes(token)) errors.push(`typed telemetry configuration is missing ${token}`);
  }
  const contracts = input['packages/contracts/src/queue.ts'];
  if (!contracts.includes('TelemetryPropagationContext') || !contracts.includes('TRACEPARENT_PATTERN')) errors.push('outbox contract does not validate W3C propagation');
  const database = input['packages/database/src/outbox.ts'];
  if (!database.includes('OUTBOX_PAYLOAD_MARKER') || !database.includes('restoredPayload')) errors.push('outbox persistence does not preserve telemetry metadata');
  const queue = input['packages/integrations/src/queue.ts'];
  for (const token of ["'noma.outbox.publish'", "'noma.queue.process'", 'telemetry?.traceContext']) {
    if (!queue.includes(token)) errors.push(`queue propagation is missing ${token}`);
  }
  for (const runtime of ['apps/api/src/main.ts', 'apps/worker/src/main.ts']) {
    const source = input[runtime];
    for (const token of ['const config = loadServerEnvironment', 'startServerObservability', 'runtime.started', 'runtime.shutdown', 'observability.shutdown()']) {
      if (!source.includes(token)) errors.push(`${runtime} is missing ${token}`);
    }
  }
  const root = JSON.parse(input['package.json']);
  for (const script of ['observability:validate', 'observability:self-test', 'observability:test', 'observability:integration', 'observability:verify']) {
    if (!root.scripts?.[script]) errors.push(`root package is missing ${script}`);
  }
  const ci = input['scripts/ci-command-catalog.mjs'];
  for (const token of ['observability-validate', 'observability-self-test', 'observability-integration', 'traceability-dev010']) {
    if (!ci.includes(token)) errors.push(`CI command catalog is missing ${token}`);
  }
  const integration = input['packages/testing/tests/observability.integration.test.ts'];
  for (const token of ['pidof postgres', 'PostgreSQL loss', 'CLIENT\', \'PAUSE', 'Redis loss', 'noma.synthetic.request', 'noma.outbox.publish', 'noma.queue.process', "health.liveness().status"]) {
    if (!integration.includes(token)) errors.push(`real observability integration is missing ${token}`);
  }
  errors.push(...validateProhibitedShortcuts(input));
  return errors;
}

function validateProhibitedShortcuts(input) {
  const errors = [];
  const server = input['packages/observability/src/server.ts'] ?? '';
  const production = Object.entries(input).filter(([path]) =>
    /^(apps|packages)\/.+\.(?:ts|tsx|js|mjs)$/.test(path)
    && !path.includes('/tests/')
    && !path.includes('/dist/')
    && !path.includes('/generated/'));
  const browser = production.filter(([path]) =>
    path.startsWith('apps/web/')
    || path.startsWith('packages/ui/')
    || path === 'packages/observability/src/client.ts');
  const applicationAndDomain = production.filter(([path]) =>
    path.startsWith('apps/')
    || path.startsWith('packages/contracts/')
    || path.startsWith('packages/database/')
    || path.startsWith('packages/platform/')
    || path.startsWith('packages/security/'));

  for (const [path, source] of browser) {
    if (source.includes('@opentelemetry/sdk-node')) errors.push(`${path}: browser code imports the Node OpenTelemetry SDK`);
    if (source.includes('@noma/observability/server')) errors.push(`${path}: browser code imports the server logger`);
  }
  for (const [path, source] of Object.entries(input)) {
    if (/NEXT_PUBLIC_[A-Z0-9_]*(?:OTLP|TELEMETRY)/.test(source)) errors.push(`${path}: OTLP configuration must never be browser-visible`);
  }
  for (const [path, source] of production) {
    if (/(?:logger|console)\.(?:debug|info|warn|error|log)\([^\n]{0,240}\bDATABASE_URL\b/i.test(source)) errors.push(`${path}: raw DATABASE_URL logging is prohibited`);
    if (/(?:logger|console)\.(?:debug|info|warn|error|log)\([^\n]{0,240}\bREDIS_URL\b/i.test(source)) errors.push(`${path}: raw REDIS_URL logging is prohibited`);
    if (/logger\.(?:debug|info|warn|error)\([^\n]{0,300}\b(?:authorization|cookie)\b/i.test(source)) errors.push(`${path}: authorization or cookie logging is prohibited`);
    if (/logger\.(?:debug|info|warn|error)\([^\n]{0,300}\b(?:request|response|req|res)\.body\b/i.test(source)) errors.push(`${path}: request or response body logging is prohibited`);
    if (/(?:metrics?\.record|createCounter|createHistogram|createGauge)\([^;]{0,500}attributes\s*:\s*\{[^}]*\b(?:userId|user_id|requestId|request_id|traceId|trace_id|url|errorMessage|error_message)\b/is.test(source)) {
      errors.push(`${path}: high-cardinality metric attribute is prohibited`);
    }
    if (/(?:withSpan|startSpan)\(\s*(?:request|req|payload|job\.data|event\.)/i.test(source)) errors.push(`${path}: span names must not come from user or payload data`);
    if (/(?:logger\.(?:debug|info|warn|error)|withSpan|startSpan)\([^;]{0,400}\b(?:payload|job\.data|request\.body|response\.body)\b/is.test(source)) {
      errors.push(`${path}: raw queue or HTTP payload telemetry is prohibited`);
    }
    if (/\b(?:createBaggage|getBaggage|setBaggage|deleteBaggage)\s*\(/.test(source)) errors.push(`${path}: arbitrary OpenTelemetry baggage is prohibited`);
    if (/\b(?:gho_|glpat-|sk_live_|xox[baprs]-)[A-Za-z0-9_-]{8,}/.test(source)) errors.push(`${path}: hardcoded provider token is prohibited`);
    if (/(?:console\.error\(\s*error\s*\)|JSON\.stringify\(\s*error\s*\))/.test(source)) errors.push(`${path}: raw thrown-object logging is prohibited`);
    if (/logger\.(?:debug|info|warn|error)\(\s*['"][^'"]+['"]\s*,(?:\s*['"][^'"]+['"]\s*,)?\s*(?:req|res|request|response)\s*\)/i.test(source)) errors.push(`${path}: arbitrary request or response object logging is prohibited`);
    if (/\b(?:db\.statement|db\.query\.text|queryParameters|query_parameters)\b/.test(source)) errors.push(`${path}: database query text or parameter recording is prohibited`);
  }
  for (const [path, source] of applicationAndDomain) {
    if (/from\s+['"](?:@sentry\/node|dd-trace|posthog-node|@grafana\/)/.test(source)) errors.push(`${path}: vendor telemetry SDK is prohibited in application or domain code`);
  }

  const routeSource = input['packages/observability/src/server.ts'];
  if (!routeSource.includes(".split('?')[0]")) errors.push('HTTP telemetry does not discard query strings before recording routes');
  for (const healthPath of ['apps/api/src/health/health.service.ts', 'apps/worker/src/health-server.ts']) {
    const source = input[healthPath] ?? '';
    if (/secrets|databaseUrl|redisUrl|authorization/i.test(source)) errors.push(`${healthPath}: health response may expose secrets`);
  }
  const apiHealth = input['apps/api/src/health/health.service.ts'] ?? '';
  const liveness = apiHealth.match(/liveness\(\)[\s\S]*?(?=\n\s*readiness\(\))/)?.[0] ?? '';
  if (/snapshot\(|\.dependencies\(|\bdatabase\b|\bredis\b|\bqueue\b/i.test(liveness)) errors.push('API liveness depends on an external dependency');

  if (!server.includes('maxQueueSize') || !server.includes('maxExportBatchSize')) errors.push('OTLP exporter queue and batch bounds are missing');
  if (!server.includes('timeoutMillis: exportTimeout') || !server.includes('exportTimeoutMillis: exportTimeout')) errors.push('OTLP exporter timeout is missing');
  for (const runtime of ['apps/api/src/main.ts', 'apps/worker/src/main.ts']) {
    const source = input[runtime];
    if (source.indexOf('const config = loadServerEnvironment') > source.indexOf("import('@nestjs/core')")) {
      errors.push(`${runtime}: application imports occur before typed environment validation`);
    }
  }
  for (const runtime of ['apps/api/package.json', 'apps/worker/package.json', 'apps/web/package.json']) {
    const manifestSource = input[runtime];
    if (!manifestSource) continue;
    const manifest = JSON.parse(manifestSource);
    if (/\b(?:watch|dev)\b/.test(manifest.scripts?.start ?? '')) errors.push(`${runtime}: production start uses a development watcher`);
  }
  const workerSources = production.filter(([path]) => path.startsWith('apps/worker/')).map(([, source]) => source).join('\n');
  if (/['"]\/(?:metrics|debug|observability|telemetry)['"]/.test(workerSources)) errors.push('Worker exposes a new public observability endpoint');
  if (Object.keys(input).some((path) => path.includes('/prisma/migrations/') && input[path].includes('DEV010_MUTATION'))) {
    errors.push('DEV-010 modifies an applied database migration');
  }

  const workflows = Object.entries(input).filter(([path]) => path.startsWith('.github/workflows/')).map(([, source]) => source).join('\n');
  for (const gate of ['Noma / CI Policy', 'Noma / Quality Gate', 'Noma / Integration Gate', 'Noma / Security Gate', 'Noma / Windows Compatibility']) {
    if (!workflows.includes(`name: ${gate}`)) errors.push(`stable CI gate name is missing: ${gate}`);
  }
  const securityWorkflow = input['.github/workflows/ci-security.yml'] ?? '';
  if (!securityWorkflow.includes('fail-on-severity: moderate')) errors.push('security dependency threshold must remain moderate');
  return errors;
}

function runSelfTest(original) {
  const fixtures = [
    injectedFixture('browser Node SDK import', 'apps/web/src/dev010-policy-fixture.ts', "import '@opentelemetry/sdk-node';", 'browser code imports the Node OpenTelemetry SDK'),
    injectedFixture('browser server logger import', 'apps/web/src/dev010-policy-fixture.ts', "import '@noma/observability/server';", 'browser code imports the server logger'),
    injectedFixture('public OTLP secret', 'apps/web/src/dev010-policy-fixture.ts', "const NEXT_PUBLIC_OTLP_TOKEN = 'synthetic';", 'OTLP configuration must never be browser-visible'),
    fixture('insecure remote OTLP endpoint', 'packages/config/src/server.ts', "url.protocol !== 'https:'", 'false', 'typed telemetry configuration is missing url.protocol'),
    fixture('credential-bearing OTLP URL', 'packages/config/src/server.ts', 'url.username || url.password || url.search || url.hash', 'false', 'typed telemetry configuration is missing url.username'),
    injectedFixture('raw DATABASE_URL logging', 'apps/api/src/dev010-policy-fixture.ts', 'console.log(DATABASE_URL);', 'raw DATABASE_URL logging is prohibited'),
    injectedFixture('raw REDIS_URL logging', 'apps/worker/src/dev010-policy-fixture.ts', 'logger.info(REDIS_URL);', 'raw REDIS_URL logging is prohibited'),
    injectedFixture('authorization logging', 'apps/api/src/dev010-policy-fixture.ts', "logger.info('request', { authorization: request.headers.authorization });", 'authorization or cookie logging is prohibited'),
    injectedFixture('request body logging', 'apps/api/src/dev010-policy-fixture.ts', "logger.info('request', { body: request.body });", 'request or response body logging is prohibited'),
    fixture('query string recording', 'packages/observability/src/server.ts', ".split('?')[0]", '', 'does not discard query strings'),
    injectedFixture('user ID metric label', 'apps/api/src/dev010-policy-fixture.ts', "metrics.record({ name: 'x', value: 1, attributes: { userId } });", 'high-cardinality metric attribute is prohibited'),
    injectedFixture('request ID metric label', 'apps/api/src/dev010-policy-fixture.ts', "metrics.record({ name: 'x', value: 1, attributes: { requestId } });", 'high-cardinality metric attribute is prohibited'),
    injectedFixture('trace ID metric label', 'apps/api/src/dev010-policy-fixture.ts', "metrics.record({ name: 'x', value: 1, attributes: { traceId } });", 'high-cardinality metric attribute is prohibited'),
    injectedFixture('full URL metric label', 'apps/api/src/dev010-policy-fixture.ts', "metrics.record({ name: 'x', value: 1, attributes: { url } });", 'high-cardinality metric attribute is prohibited'),
    injectedFixture('error message metric label', 'apps/api/src/dev010-policy-fixture.ts', "metrics.record({ name: 'x', value: 1, attributes: { errorMessage } });", 'high-cardinality metric attribute is prohibited'),
    injectedFixture('user-provided span name', 'apps/api/src/dev010-policy-fixture.ts', 'observability.withSpan(request.path, {}, operation);', 'span names must not come from user or payload data'),
    injectedFixture('raw queue payload attribute', 'apps/worker/src/dev010-policy-fixture.ts', "logger.info('job', { payload: job.data });", 'raw queue or HTTP payload telemetry is prohibited'),
    injectedFixture('arbitrary baggage', 'apps/api/src/dev010-policy-fixture.ts', "propagation.createBaggage({ tenant: { value: 'x' } });", 'arbitrary OpenTelemetry baggage is prohibited'),
    injectedFixture('hardcoded provider token', 'apps/api/src/dev010-policy-fixture.ts', "const token = 'gho_1234567890abcdef';", 'hardcoded provider token is prohibited'),
    injectedFixture('vendor SDK in application', 'apps/api/src/dev010-policy-fixture.ts', "import sentry from '@sentry/node';", 'vendor telemetry SDK is prohibited'),
    fixture('implicit production sampling', 'packages/config/src/server.ts', 'NOMA_TRACE_SAMPLE_RATIO', 'NOMA_REMOVED_SAMPLE_RATIO', 'typed telemetry configuration is missing NOMA_TRACE_SAMPLE_RATIO'),
    injectedFixture('health secret exposure', 'apps/api/src/health/health.service.ts', 'export class HealthService { liveness() { return { databaseUrl: config.secrets.databaseUrl }; } readiness() {} }', 'health response may expose secrets'),
    injectedFixture('dependency-coupled liveness', 'apps/api/src/health/health.service.ts', 'export class HealthService {\n  liveness() { return this.runtimeDependencies.snapshot(); }\n  readiness() {}\n}', 'API liveness depends on an external dependency'),
    fixture('unbounded exporter queue', 'packages/observability/src/server.ts', 'maxQueueSize', 'removedQueueBound', 'exporter queue and batch bounds are missing'),
    fixture('missing exporter timeout', 'packages/observability/src/server.ts', 'timeoutMillis: exportTimeout', 'timeoutMillis: undefined', 'OTLP exporter timeout is missing'),
    fixture('missing telemetry shutdown', 'apps/api/src/main.ts', 'observability.shutdown()', 'observability.stop()', 'missing observability.shutdown()'),
    fixture('late OTel startup', 'apps/api/src/main.ts', 'const config = loadServerEnvironment', 'const deferredConfig = loadServerEnvironment', 'missing const config = loadServerEnvironment'),
    injectedFixture('raw request object logging', 'apps/api/src/dev010-policy-fixture.ts', "logger.info('request', 'failed', request);", 'arbitrary request or response object logging is prohibited'),
    injectedFixture('raw thrown object logging', 'apps/api/src/dev010-policy-fixture.ts', 'console.error(error);', 'raw thrown-object logging is prohibited'),
    injectedFixture('production watcher', 'apps/api/package.json', '{"scripts":{"start":"tsx watch src/main.ts"}}', 'production start uses a development watcher'),
    injectedFixture('public Worker telemetry endpoint', 'apps/worker/src/dev010-policy-fixture.ts', "const path = '/metrics';", 'Worker exposes a new public observability endpoint'),
    injectedFixture('database query parameter recording', 'apps/api/src/dev010-policy-fixture.ts', "span.setAttribute('db.statement', query);", 'database query text or parameter recording is prohibited'),
    injectedFixture('applied migration modification', 'packages/database/prisma/migrations/20260801000000_pre_prisma_baseline/migration.sql', 'DEV010_MUTATION', 'modifies an applied database migration'),
    fixture('stable gate rename', '.github/workflows/ci-quality.yml', 'name: Noma / Quality Gate', 'name: Noma / Renamed Gate', 'stable CI gate name is missing: Noma / Quality Gate'),
    fixture('weakened dependency threshold', '.github/workflows/ci-security.yml', 'fail-on-severity: moderate', 'fail-on-severity: high', 'security dependency threshold must remain moderate'),
  ];
  if (fixtures.length !== 35) throw new Error(`observability self-test must contain 35 fixtures, found ${fixtures.length}`);
  for (const test of fixtures) {
    const source = original[test.path];
    let mutated;
    if (test.before === undefined) {
      mutated = { ...original, [test.path]: test.after };
    } else {
      if (!source?.includes(test.before)) throw new Error(`stale self-test fixture: ${test.name}`);
      mutated = { ...original, [test.path]: source.split(test.before).join(test.after) };
    }
    const errors = validateStatic(mutated);
    if (!errors.some((error) => error.includes(test.expected))) {
      throw new Error(`observability self-test did not reject ${test.name}: ${errors.join('; ')}`);
    }
  }
}

async function sourceFiles(directories, include) {
  const output = [];
  const visit = async (path) => {
    for (const entry of await readdir(resolve(ROOT, path), { withFileTypes: true })) {
      const child = `${path}/${entry.name}`;
      if (entry.isDirectory() && !['node_modules', '.next', 'dist', 'generated', 'coverage'].includes(entry.name)) await visit(child);
      else if (['.ts', '.tsx', '.js', '.mjs'].includes(extname(entry.name)) && include(child)) output.push(child);
    }
  };
  for (const directory of directories) await visit(directory);
  return output;
}

function fixture(name, path, before, after, expected) { return { name, path, before, after, expected }; }
function injectedFixture(name, path, source, expected) { return { name, path, before: undefined, after: source, expected }; }
function normalize(value) { return value.replace(/\r\n/g, '\n'); }
