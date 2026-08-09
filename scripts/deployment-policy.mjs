import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const DEPLOYMENT_REQUIRED_FILES = Object.freeze([
  'DEPLOYMENT.md',
  'render.yaml',
  'vercel.json',
  'docs/adr/0009-preview-staging-deployment-skeleton.md',
  'runbooks/staging-deployment.md',
  'runbooks/staging-rollback.md',
  'runbooks/environment-isolation.md',
  'scripts/deployment-command-policy.mjs',
  'scripts/run-deployed-command.mjs',
  'scripts/smoke-deployment.mjs',
  'scripts/create-deployment-evidence.mjs',
]);

const SECRET_KEY_PATTERN = /(?:SECRET|TOKEN|PASSWORD|PRIVATE_KEY|ACCESS_KEY|DATABASE_URL|REDIS_URL)/i;
const SECRET_VALUE_PATTERN = /(?:sk_live_|pk_live_|postgres(?:ql)?:\/\/[^\s:@]+:[^\s@]+@|rediss?:\/\/[^\s:@]+:[^\s@]+@|gh[oprsu]_[A-Za-z0-9_]{20,})/i;
const PRODUCTION_MARKER_PATTERN = /(?:\bproduction\b|\bprod\b|sk_live_|pk_live_|api\.noma\.ng|noma\.ng)/i;

function issue(code, message) {
  return Object.freeze({ code, message });
}

function requirePattern(issues, text, pattern, code, message) {
  if (!pattern.test(text)) issues.push(issue(code, message));
}

function rejectPattern(issues, text, pattern, code, message) {
  if (pattern.test(text)) issues.push(issue(code, message));
}

function namedBlock(source, name) {
  const lines = source.split(/\r?\n/);
  const listNameIndex = lines.findIndex((line) => line.trim() === `- name: ${name}`);
  const nameIndex = listNameIndex >= 0 ? listNameIndex : lines.findIndex((line) => line.trim() === `name: ${name}`);
  if (nameIndex < 0) return '';
  const nameIndentation = lines[nameIndex].match(/^\s*/)?.[0].length ?? 0;
  let start = nameIndex;
  if (!lines[nameIndex].trim().startsWith('- ')) {
    for (let index = nameIndex - 1; index >= 0; index -= 1) {
      const indentation = lines[index].match(/^\s*/)?.[0].length ?? 0;
      if (indentation < nameIndentation && lines[index].trim().startsWith('- ')) {
        start = index;
        break;
      }
    }
  }
  const indentation = lines[start].match(/^\s*/)?.[0].length ?? 0;
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) continue;
    const currentIndentation = line.match(/^\s*/)?.[0].length ?? 0;
    if (currentIndentation < indentation || (currentIndentation === indentation && line.trim().startsWith('- '))) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join('\n');
}

function validateVercel(issues, raw) {
  let config;
  try {
    config = JSON.parse(raw);
  } catch {
    issues.push(issue('VERCEL_INVALID_JSON', 'vercel.json must be valid JSON'));
    return;
  }

  if (config.$schema !== 'https://openapi.vercel.sh/vercel.json') {
    issues.push(issue('VERCEL_SCHEMA', 'vercel.json must use the official Vercel schema'));
  }
  if (config.framework !== 'nextjs') issues.push(issue('VERCEL_FRAMEWORK', 'Vercel must deploy Next.js only'));
  if (config.installCommand !== 'pnpm install --frozen-lockfile') {
    issues.push(issue('VERCEL_INSTALL', 'Vercel install must be frozen and pnpm-based'));
  }
  if (config.buildCommand !== 'pnpm turbo run build --filter=@noma/web...') {
    issues.push(issue('VERCEL_BUILD', 'Vercel must build only Web and its workspace dependencies'));
  }
  if (config.outputDirectory !== 'apps/web/.next') {
    issues.push(issue('VERCEL_OUTPUT', 'Vercel output must be the Web Next.js build'));
  }
  if (config.git?.deploymentEnabled?.main !== false) {
    issues.push(issue('VERCEL_PRODUCTION_BRANCH', 'main must not trigger a Vercel production deployment'));
  }
  if ('env' in config || 'build' in config) {
    issues.push(issue('VERCEL_INLINE_ENV', 'vercel.json must not carry deployment environment values or legacy builds'));
  }
  rejectPattern(issues, raw, SECRET_VALUE_PATTERN, 'VERCEL_SECRET', 'vercel.json must not contain credentials');
}

function validateRender(issues, raw) {
  const api = namedBlock(raw, 'noma-api-staging');
  const worker = namedBlock(raw, 'noma-worker-staging');
  const keyValue = namedBlock(raw, 'noma-key-value-staging');
  const database = namedBlock(raw, 'noma-postgres-staging');

  for (const [name, block] of Object.entries({ api, worker, keyValue, database })) {
    if (!block) issues.push(issue('RENDER_RESOURCE', `render.yaml is missing the ${name} resource`));
  }
  requirePattern(issues, raw, /^# yaml-language-server: \$schema=https:\/\/json\.schemastore\.org\/render\.json$/m, 'RENDER_SCHEMA', 'Render schema declaration is required');
  requirePattern(issues, raw, /^\s*- name: noma\s*$/m, 'RENDER_PROJECT', 'Render project must be named noma');
  requirePattern(issues, raw, /^\s*- name: staging\s*$/m, 'RENDER_ENVIRONMENT', 'Render environment must be staging');
  requirePattern(issues, raw, /networking:\s*\r?\n\s+isolation: enabled/, 'RENDER_NETWORK_ISOLATION', 'staging private-network isolation must be enabled');
  requirePattern(issues, raw, /permissions:\s*\r?\n\s+protection: enabled/, 'RENDER_ENV_PROTECTION', 'staging environment protection must be enabled');
  requirePattern(issues, raw, /^previews:\s*\r?\n\s+generation: off/m, 'RENDER_PREVIEWS', 'Render preview environments must remain off');

  rejectPattern(issues, raw, /^\s*region:\s*(?!frankfurt\s*$)\S+/m, 'RENDER_REGION', 'all Render resources must use Frankfurt');
  if ((raw.match(/^\s*region:\s*frankfurt\s*$/gm) ?? []).length !== 4) {
    issues.push(issue('RENDER_REGION_COUNT', 'API, Worker, PostgreSQL, and Key Value must each declare Frankfurt'));
  }

  requirePattern(issues, api, /type: web/, 'API_TYPE', 'API must be a Render Web Service');
  requirePattern(issues, api, /runtime: node/, 'API_RUNTIME', 'API must use the Node runtime');
  requirePattern(issues, api, /plan: starter/, 'API_PLAN', 'API staging plan must be explicit');
  requirePattern(issues, api, /branch: main/, 'API_BRANCH', 'API staging must deploy reviewed main commits');
  requirePattern(issues, api, /autoDeployTrigger: checksPass/, 'API_DEPLOY_GATE', 'API deploy must wait for checks');
  requirePattern(issues, api, /healthCheckPath: \/health\/ready/, 'API_HEALTH', 'API must use readiness as the Render health check');
  requirePattern(issues, api, /preDeployCommand: pnpm deploy:migrate/, 'API_MIGRATION', 'API must own the single pre-deploy migration command');
  requirePattern(issues, api, /startCommand: pnpm deploy:start:api/, 'API_START', 'API must start the built production runtime');
  for (const path of ['apps/api/**', 'packages/config/**', 'packages/contracts/**', 'packages/database/**', 'packages/integrations/**', 'render.yaml']) {
    requirePattern(issues, api, new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), 'API_BUILD_FILTER', `API build filter must include ${path}`);
  }

  requirePattern(issues, worker, /type: worker/, 'WORKER_TYPE', 'Worker must be a private Render Background Worker');
  requirePattern(issues, worker, /runtime: node/, 'WORKER_RUNTIME', 'Worker must use the Node runtime');
  requirePattern(issues, worker, /plan: starter/, 'WORKER_PLAN', 'Worker staging plan must be explicit');
  requirePattern(issues, worker, /autoDeployTrigger: checksPass/, 'WORKER_DEPLOY_GATE', 'Worker deploy must wait for checks');
  requirePattern(issues, worker, /preDeployCommand: pnpm deploy:wait-for-migrations/, 'WORKER_MIGRATION_GATE', 'Worker deploy must wait for the API-owned migration history');
  requirePattern(issues, worker, /startCommand: pnpm deploy:start:worker/, 'WORKER_START', 'Worker must start the built production runtime');
  for (const path of ['apps/worker/**', 'packages/config/**', 'packages/contracts/**', 'packages/database/**', 'packages/integrations/**', 'render.yaml']) {
    requirePattern(issues, worker, new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), 'WORKER_BUILD_FILTER', `Worker build filter must include ${path}`);
  }
  rejectPattern(issues, worker, /healthCheckPath:/, 'WORKER_INGRESS', 'Worker must have no public health ingress');
  rejectPattern(issues, worker, /preDeployCommand: pnpm deploy:migrate/, 'WORKER_MIGRATION_OWNER', 'Worker must verify migrations without applying them');

  requirePattern(issues, keyValue, /type: keyvalue/, 'KEY_VALUE_TYPE', 'queue storage must use the current keyvalue service type');
  requirePattern(issues, keyValue, /plan: starter/, 'KEY_VALUE_PLAN', 'persistent Key Value requires an explicit paid plan');
  requirePattern(issues, keyValue, /ipAllowList: \[\]/, 'KEY_VALUE_INGRESS', 'Key Value external access must be disabled');
  requirePattern(issues, keyValue, /maxmemoryPolicy: noeviction/, 'KEY_VALUE_EVICTION', 'Key Value must use noeviction');
  requirePattern(issues, keyValue, /persistenceMode: journal-snapshot/, 'KEY_VALUE_PERSISTENCE', 'Key Value must use journal and snapshot persistence');

  requirePattern(issues, database, /plan: basic-256mb/, 'DATABASE_PLAN', 'staging Postgres plan must be explicit');
  requirePattern(issues, database, /postgresMajorVersion: "18"/, 'DATABASE_VERSION', 'PostgreSQL major version must be pinned');
  requirePattern(issues, database, /ipAllowList: \[\]/, 'DATABASE_INGRESS', 'PostgreSQL external access must be disabled');
  requirePattern(issues, database, /databaseName: noma_staging/, 'DATABASE_NAME', 'database name must identify staging');

  for (const block of [api, worker]) {
    requirePattern(issues, block, /corepack enable && pnpm install --frozen-lockfile/, 'RENDER_INSTALL', 'Render builds must use frozen pnpm installation');
    rejectPattern(issues, block, /(?:dev|watch|tsx watch|next dev)/, 'RENDER_WATCH', 'deployed runtimes must not use development/watch commands');
    for (const key of ['NOMA_ENV', 'NOMA_CREDENTIAL_ENVIRONMENT', 'NOMA_PROVIDER_MODE', 'PUBLIC_WEB_ORIGIN', 'API_PUBLIC_URL', 'DATABASE_URL', 'REDIS_URL']) {
      requirePattern(issues, block, new RegExp(`key: ${key}(?:\\r?\\n|$)`), 'RENDER_ENV_KEY', `${key} must be defined for API and Worker`);
    }
  }
  requirePattern(issues, api, /key: NOMA_ENV\s*\r?\n\s+value: staging/, 'API_ENV', 'API environment must be staging');
  requirePattern(issues, worker, /key: NOMA_ENV\s*\r?\n\s+value: staging/, 'WORKER_ENV', 'Worker environment must be staging');
  requirePattern(issues, api, /key: SESSION_SECRET\s*\r?\n\s+sync: false/, 'SESSION_SECRET_SOURCE', 'API session secret must be dashboard-supplied');
  for (const block of [api, worker]) {
    requirePattern(
      issues,
      block,
      /key: REDIS_URL\s*\r?\n\s+fromService:\s*\r?\n\s+type: keyvalue\s*\r?\n\s+name: noma-key-value-staging\s*\r?\n\s+property: connectionString/,
      'REDIS_PRIVATE_REFERENCE',
      'API and Worker must reference the staging Key Value private connection string',
    );
  }
  rejectPattern(issues, raw, /(?:prisma\s+db\s+push|migrate\s+reset|db:reset|initialDeployHook|afterFirstDeployCommand)/i, 'DESTRUCTIVE_HOOK', 'destructive or one-time initialization hooks are prohibited');
  rejectPattern(issues, raw, SECRET_VALUE_PATTERN, 'RENDER_SECRET', 'render.yaml must not contain credentials');
  rejectPattern(issues, raw, /\*\.vercel\.app|https:\/\/vercel\.app/, 'CORS_WILDCARD', 'generic Vercel origin trust is prohibited');
  rejectPattern(issues, raw, /(?:https:\/\/)?(?:api\.)?noma\.ng/i, 'PRODUCTION_DOMAIN', 'production domains are prohibited from the staging Blueprint');
  rejectPattern(issues, raw, /NOMA_PROVIDER_MODE\s*\r?\n\s+value: (?:simulator|real)/, 'PROVIDER_MODE', 'staging deployment must keep external providers disabled');
  rejectPattern(issues, raw, /\b(?:latest|lts|node\s*>=|pnpm@\^)/i, 'MUTABLE_VERSION', 'deployment versions must not be mutable');

  const migrationCount = (raw.match(/preDeployCommand: pnpm deploy:migrate/g) ?? []).length;
  if (migrationCount !== 1) issues.push(issue('MIGRATION_OWNER', 'exactly one service must own pre-deploy migration'));
  const startCommands = [...raw.matchAll(/startCommand:\s*(.+)$/gm)].map((match) => match[1].trim());
  if (new Set(startCommands).size !== 2) issues.push(issue('START_COMMANDS', 'API and Worker start commands must be distinct'));
}

function validateRepositoryBoundaries(issues, files) {
  const combined = Object.values(files).join('\n');
  rejectPattern(issues, combined, /(?:deploy(?:ment)?Hook|hooks\.vercel\.com|api\.render\.com\/deploy)/i, 'DEPLOY_HOOK', 'unreviewed deploy hooks are prohibited');
  rejectPattern(issues, combined, /(?:promote|--prod|production deployment|production domain)\s*[:=]\s*(?:true|enabled)/i, 'PRODUCTION_ACTIVATION', 'production promotion or activation is prohibited');
  rejectPattern(issues, combined, /NEXT_PUBLIC_(?:DATABASE|REDIS|SESSION|SECRET|TOKEN|PASSWORD)/i, 'PUBLIC_SECRET', 'browser-exposed secret configuration is prohibited');

  for (const [path, content] of Object.entries(files)) {
    if (/\.env(?:\.|$)|\.vercel(?:\/|$)/.test(path.replaceAll('\\', '/'))) {
      issues.push(issue('TRACKED_PROVIDER_STATE', `${path} must not be tracked`));
    }
    if (path === 'render.yaml' || path === 'vercel.json') continue;
    if (SECRET_VALUE_PATTERN.test(content)) issues.push(issue('SECRET_VALUE', `${path} contains a credential-like value`));
  }

  const deployment = files['DEPLOYMENT.md'] ?? '';
  for (const token of ['rollback', 'environment owner', 'NOMA_RELEASE_SHA', 'production is not provisioned', 'cost authorization']) {
    if (!deployment.toLowerCase().includes(token.toLowerCase())) {
      issues.push(issue('DEPLOYMENT_DOCUMENTATION', `DEPLOYMENT.md must document ${token}`));
    }
  }
  if (!/DEV-009/.test(deployment)) issues.push(issue('DEPLOYMENT_TRACEABILITY', 'DEPLOYMENT.md must identify DEV-009'));

  const env = files['ENVIRONMENT.md'] ?? '';
  if (!/staging/i.test(env) || !/NOMA_RELEASE_SHA/.test(env)) {
    issues.push(issue('ENVIRONMENT_DOCUMENTATION', 'ENVIRONMENT.md must document staging release identity'));
  }
  const runner = files['scripts/run-deployed-command.mjs'] ?? '';
  const commandPolicy = files['scripts/deployment-command-policy.mjs'] ?? '';
  const smoke = files['scripts/smoke-deployment.mjs'] ?? '';
  const packageManifest = files['package.json'] ?? '';
  requirePattern(issues, runner, /RENDER_GIT_COMMIT/, 'RELEASE_SOURCE', 'deployed runtime must derive release identity from Render');
  requirePattern(issues, runner, /NOMA_RELEASE_SHA/, 'RELEASE_IDENTITY', 'deployed runtime must set NOMA_RELEASE_SHA');
  requirePattern(issues, runner, /db:migrate:status/, 'MIGRATION_STATUS', 'Worker deployment and startup must verify committed migration status');
  requirePattern(issues, commandPolicy, /verify-ca.*verify-full/, 'DATABASE_TLS_ALLOWLIST', 'deployment database validation must allow only encrypted PostgreSQL modes');
  requirePattern(issues, commandPolicy, /waitForCommittedMigrations/, 'MIGRATION_WAIT_POLICY', 'Worker migration gate must use bounded polling');
  requirePattern(issues, commandPolicy, /Promise\.race\s*\(/, 'MIGRATION_CHECK_DEADLINE', 'each Worker migration status check must race the remaining deployment deadline');
  requirePattern(issues, runner, /db:migrate:status[\s\S]{0,200}signal/, 'MIGRATION_CHECK_ABORT', 'the Worker migration status subprocess must receive the deadline abort signal');
  requirePattern(issues, smoke, /headers\.origin\s*=\s*requestOrigin\.origin/, 'DEPLOYMENT_CORS_ORIGIN', 'API deployment smoke must send the validated Web origin');
  requirePattern(issues, smoke, /validateCorsResponseHeaders\(response\.headers,\s*requestOrigin\)/, 'DEPLOYMENT_CORS_ASSERTION', 'API deployment smoke must verify exact credentialed CORS response headers');
  requirePattern(issues, packageManifest, /"deploy:wait-for-migrations": "node scripts\/run-deployed-command\.mjs wait-for-migrations"/, 'MIGRATION_WAIT_COMMAND', 'root commands must expose the Worker migration gate');
  rejectPattern(issues, runner, PRODUCTION_MARKER_PATTERN, 'RUNNER_PRODUCTION', 'deployed command wrapper must not target production');
}

export function validateDeploymentFiles(files) {
  const issues = [];
  for (const path of DEPLOYMENT_REQUIRED_FILES) {
    if (!(path in files)) issues.push(issue('MISSING_FILE', `missing required deployment file: ${path}`));
  }
  validateVercel(issues, files['vercel.json'] ?? '');
  validateRender(issues, files['render.yaml'] ?? '');
  validateRepositoryBoundaries(issues, files);
  return Object.freeze(issues);
}

export async function readDeploymentFiles(root) {
  const paths = new Set([...DEPLOYMENT_REQUIRED_FILES, 'ENVIRONMENT.md', 'package.json', '.gitignore', 'scripts/ci-command-catalog.mjs']);
  const files = {};
  for (const path of paths) files[path] = await readFile(resolve(root, path), 'utf8');
  return files;
}

export function assertDeploymentFiles(files) {
  const issues = validateDeploymentFiles(files);
  if (issues.length > 0) {
    throw new Error(issues.map(({ code, message }) => `${code}: ${message}`).join('\n'));
  }
  return Object.freeze({ files: Object.keys(files).length, renderResources: 4, environments: 2 });
}

export function isSecretKey(key) {
  return SECRET_KEY_PATTERN.test(key);
}
