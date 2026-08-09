import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import {
  assertDeploymentFiles,
  readDeploymentFiles,
  validateDeploymentFiles,
} from './deployment-policy.mjs';
import {
  validateAutomationBypassSecret,
  validateDeploymentUrl,
  validateHealthResponse,
  validateReleaseSha,
} from './deployment-smoke-policy.mjs';
import {
  requireEncryptedPostgreSqlUrl,
  waitForCommittedMigrations,
} from './deployment-command-policy.mjs';

const ROOT = resolve(import.meta.dirname, '..');

const result = assertDeploymentFiles(await readDeploymentFiles(ROOT));
console.log(`PASS: ${result.files} deployment files, ${result.renderResources} Render resources, and ${result.environments} non-production surfaces validated`);

if (process.argv.includes('--self-test')) {
  const baseline = await readDeploymentFiles(ROOT);
  const cases = [
    ['production environment', 'render.yaml', (value) => value.replace(/(key: NOMA_ENV\s*\r?\n\s+value:) staging/, '$1 production')],
    ['live provider key', 'render.yaml', (value) => `${value}\n# sk_live_forbidden`],
    ['production domain', 'render.yaml', (value) => value.replace('noma-api-staging.onrender.com', 'api.noma.ng')],
    ['public database URL', 'vercel.json', (value) => value.replace('"framework": "nextjs"', '"framework": "nextjs", "env": {"NEXT_PUBLIC_DATABASE_URL":"x"}')],
    ['public Redis URL', 'vercel.json', (value) => value.replace('"framework": "nextjs"', '"framework": "nextjs", "env": {"NEXT_PUBLIC_REDIS_URL":"x"}')],
    ['generic Vercel CORS', 'render.yaml', (value) => `${value}\n# *.vercel.app`],
    ['cross-region API', 'render.yaml', (value) => value.replace('region: frankfurt', 'region: oregon')],
    ['missing API region', 'render.yaml', (value) => value.replace('            region: frankfurt\n            branch: main', '            branch: main')],
    ['missing API health', 'render.yaml', (value) => value.replace('            healthCheckPath: /health/ready\n', '')],
    ['public Worker', 'render.yaml', (value) => value.replace('- type: worker\n            name: noma-worker-staging', '- type: web\n            name: noma-worker-staging')],
    ['missing Worker migration gate', 'render.yaml', (value) => value.replace('            preDeployCommand: pnpm deploy:wait-for-migrations\n', '')],
    ['worker migration owner', 'render.yaml', (value) => value.replace('pnpm deploy:wait-for-migrations', 'pnpm deploy:migrate')],
    ['database push', 'render.yaml', (value) => value.replace('pnpm deploy:migrate', 'pnpm prisma db push')],
    ['database reset', 'render.yaml', (value) => `${value}\n# prisma migrate reset`],
    ['non-frozen install', 'render.yaml', (value) => value.replaceAll('pnpm install --frozen-lockfile', 'pnpm install')],
    ['watch command', 'render.yaml', (value) => value.replace('pnpm deploy:start:api', 'pnpm dev:api')],
    ['mutable version', 'render.yaml', (value) => value.replace('value: 24.18.0', 'value: latest')],
    ['tracked env file', 'apps/api/.env', () => 'SESSION_SECRET=forbidden'],
    ['tracked Vercel state', '.vercel/project.json', () => '{}'],
    ['deploy hook', 'DEPLOYMENT.md', (value) => `${value}\nhooks.vercel.com/forbidden`],
    ['real providers', 'render.yaml', (value) => value.replace('value: disabled', 'value: real')],
    ['production promotion', 'vercel.json', (value) => value.replace('"main": false', '"main": true')],
    ['missing rollback', 'DEPLOYMENT.md', (value) => value.replaceAll('rollback', 'recovery')],
    ['missing environment owner', 'DEPLOYMENT.md', (value) => value.replace(/environment owner/gi, 'custodian')],
    ['missing release identity', 'scripts/run-deployed-command.mjs', (value) => value.replaceAll('NOMA_RELEASE_SHA', 'RELEASE')],
    ['missing migration status gate', 'scripts/run-deployed-command.mjs', (value) => value.replaceAll('db:migrate:status', 'db:validate')],
    ['missing encrypted mode allowlist', 'scripts/deployment-command-policy.mjs', (value) => value.replace('verify-full', 'prefer')],
    ['missing Worker migration gate command', 'package.json', (value) => value.replace('deploy:wait-for-migrations', 'deploy:wait')],
    ['unsafe API filter', 'render.yaml', (value) => value.replace('                - packages/database/**\n', '')],
    ['unsafe Worker filter', 'render.yaml', (value) => value.replace('                - apps/worker/**\n', '')],
    ['Key Value eviction', 'render.yaml', (value) => value.replace('maxmemoryPolicy: noeviction', 'maxmemoryPolicy: allkeys-lru')],
    ['Key Value persistence', 'render.yaml', (value) => value.replace('persistenceMode: journal-snapshot', 'persistenceMode: off')],
    ['database public ingress', 'render.yaml', (value) => value.replace('            ipAllowList: []\n            storageAutoscalingEnabled', '            ipAllowList:\n              - source: 0.0.0.0/0\n            storageAutoscalingEnabled')],
    ['unprotected staging', 'render.yaml', (value) => value.replace('protection: enabled', 'protection: disabled')],
    ['unisolated network', 'render.yaml', (value) => value.replace('isolation: enabled', 'isolation: disabled')],
    ['Render preview resources', 'render.yaml', (value) => value.replace('generation: off', 'generation: automatic')],
    ['missing session secret', 'render.yaml', (value) => value.replace(/\s+- key: SESSION_SECRET\r?\n\s+sync: false\r?\n/, '\n')],
    ['public Redis reference', 'render.yaml', (value) => value.replace(/(key: REDIS_URL[\s\S]*?property:) connectionString/, '$1 hostport')],
    ['invalid Vercel framework', 'vercel.json', (value) => value.replace('"nextjs"', '"other"')],
  ];

  for (const [name, path, mutate] of cases) {
    const candidate = { ...baseline, [path]: mutate(baseline[path] ?? '') };
    if (validateDeploymentFiles(candidate).length === 0) {
      throw new Error(`deployment negative test did not fail: ${name}`);
    }
  }

  const targetCases = [
    () => validateDeploymentUrl('http://noma-git-staging.vercel.app', 'web'),
    () => validateDeploymentUrl('https://user:credential@noma-git-staging.vercel.app', 'web'),
    () => validateDeploymentUrl('https://localhost', 'web'),
    () => validateDeploymentUrl('https://noma.vercel.app', 'web'),
    () => validateDeploymentUrl('https://noma-api.onrender.com', 'api'),
    () => validateDeploymentUrl('https://api.noma.ng', 'api'),
    () => validateReleaseSha('short-sha'),
    () => validateAutomationBypassSecret('unsafe\r\nheader'),
    () => validateHealthResponse({ runtime: 'api', check: 'readiness', status: 'ok', environment: 'production', releaseSha: '0'.repeat(40), checkedAt: new Date().toISOString(), dependencies: {} }, { runtime: 'api', check: 'readiness', environment: 'staging', releaseSha: '0'.repeat(40) }),
    () => validateHealthResponse({ runtime: 'api', check: 'readiness', status: 'ok', environment: 'staging', releaseSha: '0'.repeat(40), checkedAt: new Date().toISOString(), dependencies: {}, databaseUrl: 'forbidden' }, { runtime: 'api', check: 'readiness', environment: 'staging', releaseSha: '0'.repeat(40) }),
    () => validateHealthResponse({ runtime: 'api', check: 'readiness', status: 'not-ready', environment: 'staging', releaseSha: '0'.repeat(40), checkedAt: new Date().toISOString(), dependencies: {} }, { runtime: 'api', check: 'readiness', environment: 'staging', releaseSha: '0'.repeat(40) }),
  ];
  for (const [index, negative] of targetCases.entries()) {
    assert.throws(negative, undefined, `deployment smoke negative test ${index + 1} did not fail`);
  }

  const baseDatabaseUrl = 'postgresql://noma:synthetic@db.internal:5432/noma';
  assert.match(requireEncryptedPostgreSqlUrl(baseDatabaseUrl), /sslmode=require/);
  for (const mode of ['require', 'verify-ca', 'verify-full']) {
    assert.equal(new URL(requireEncryptedPostgreSqlUrl(`${baseDatabaseUrl}?sslmode=${mode}`)).searchParams.get('sslmode'), mode);
  }
  const legacySecureUrl = new URL(requireEncryptedPostgreSqlUrl(`${baseDatabaseUrl}?ssl=true`));
  assert.equal(legacySecureUrl.searchParams.get('sslmode'), 'require');
  assert.equal(legacySecureUrl.searchParams.has('ssl'), false);
  for (const suffix of [
    '?sslmode=disable',
    '?sslmode=allow',
    '?sslmode=prefer',
    '?sslmode=unknown',
    '?ssl=false',
    '?sslmode=require&ssl=false',
    '?sslmode=require&sslmode=disable',
    '?SSLMODE=disable',
  ]) {
    assert.throws(() => requireEncryptedPostgreSqlUrl(`${baseDatabaseUrl}${suffix}`), undefined, `${suffix} did not fail closed`);
  }

  let now = 0;
  let checks = 0;
  const delays = [];
  const gate = await waitForCommittedMigrations({
    check: () => {
      checks += 1;
      return checks === 3;
    },
    timeoutMs: 10_000,
    initialDelayMs: 1_000,
    maxDelayMs: 4_000,
    now: () => now,
    delay: async (milliseconds) => {
      delays.push(milliseconds);
      now += milliseconds;
    },
  });
  assert.deepEqual(gate, { attempts: 3, elapsedMs: 3_000 });
  assert.deepEqual(delays, [1_000, 2_000]);

  let timeoutNow = 0;
  await assert.rejects(
    waitForCommittedMigrations({
      check: () => false,
      timeoutMs: 3_000,
      initialDelayMs: 1_000,
      maxDelayMs: 2_000,
      now: () => timeoutNow,
      delay: async (milliseconds) => { timeoutNow += milliseconds; },
    }),
    /deployment deadline/,
  );
  console.log(`PASS: ${cases.length} unsafe deployment mutations, ${targetCases.length} unsafe smoke cases, 8 insecure database modes, and bounded migration gating were rejected`);
}
