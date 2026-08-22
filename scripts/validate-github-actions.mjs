import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = resolve(import.meta.dirname, '..');
const WORKFLOWS = Object.freeze([
  '.github/workflows/ci-quality.yml',
  '.github/workflows/ci-integration.yml',
  '.github/workflows/ci-security.yml',
  '.github/workflows/ci-windows.yml',
]);
const LOCAL_ACTION = '.github/actions/setup-workspace/action.yml';
const COMMAND_CATALOG = 'scripts/ci-command-catalog.mjs';
const REQUIRED_FILES = Object.freeze([
  ...WORKFLOWS,
  LOCAL_ACTION,
  'CI.md',
  'SECURITY_DEPENDENCIES.md',
  'docs/adr/0008-github-actions-quality-pipeline.md',
  'runbooks/github-required-checks.md',
  'evidence/schemas/ci-evidence-manifest.schema.json',
  COMMAND_CATALOG,
  'scripts/run-ci-suite.mjs',
  'scripts/create-ci-evidence.mjs',
  'scripts/evaluate-ci-gate.mjs',
  'scripts/scan-repository-secrets.mjs',
  'scripts/validate-dependency-security.mjs',
  'scripts/cleanup-ci-infrastructure.mjs',
]);
const ACTION_PINS = Object.freeze({
  'actions/checkout': Object.freeze({ version: 'v7.0.1', sha: '3d3c42e5aac5ba805825da76410c181273ba90b1' }),
  'actions/setup-node': Object.freeze({ version: 'v7.0.0', sha: '820762786026740c76f36085b0efc47a31fe5020' }),
  'actions/cache': Object.freeze({ version: 'v6.1.0', sha: '55cc8345863c7cc4c66a329aec7e433d2d1c52a9' }),
  'actions/upload-artifact': Object.freeze({ version: 'v7.0.1', sha: '043fb46d1a93c77aae656e7c1c64a875d1fc6a0a' }),
  'actions/dependency-review-action': Object.freeze({ version: 'v5.0.0', sha: 'a1d282b36b6f3519aa1f3fc636f609c47dddb294' }),
  'github/codeql-action': Object.freeze({ version: 'codeql-bundle-v2.26.2', sha: '18420e3271f74589575af831a523c833acda327f' }),
  'pnpm/action-setup': Object.freeze({ version: 'v6.0.9', sha: '0ebf47130e4866e96fce0953f49152a61190b271' }),
});
const STABLE_GATES = Object.freeze([
  'Noma / CI Policy',
  'Noma / Quality Gate',
  'Noma / Integration Gate',
  'Noma / Security Gate',
  'Noma / Windows Compatibility',
]);

const result = await validateRepository(ROOT);
if (result.errors.length > 0) {
  for (const error of result.errors) console.error(`FAIL: ${error}`);
  process.exit(1);
}
console.log(`PASS: ${result.workflows} workflows, ${result.jobs} bounded jobs, ${result.actionUses} immutable action uses, ${STABLE_GATES.length} stable gates`);

if (process.argv.includes('--self-test')) {
  await runSelfTest();
  selfTestGateEvaluator();
  console.log('PASS: 31 injected workflow policy violations were rejected in isolated fixtures');
  console.log('PASS: stable gate accepted success and rejected failure, skip, and cancellation');
}

async function validateRepository(root, { fixture = false } = {}) {
  const errors = [];
  if (!fixture) {
    for (const path of REQUIRED_FILES) {
      try {
        await readFile(resolve(root, path));
      } catch {
        errors.push(`${path}: required DEV-008 file is missing`);
      }
    }
  }

  let commandCatalog = '';
  try {
    commandCatalog = await readFile(resolve(root, COMMAND_CATALOG), 'utf8');
  } catch {
    errors.push(`${COMMAND_CATALOG}: required CI command catalog is missing`);
  }
  for (const token of ['security:dependencies:validate', 'security:dependencies:self-test', "'UI-005'", "'UI-006'", 'scripts/test-protected-role-routes.mjs', 'ui:storybook:validate', 'ui:storybook:self-test', 'ui:storybook:test', 'ui:visual:test']) {
    if (!commandCatalog.includes(token)) errors.push(`${COMMAND_CATALOG}: missing required command token ${token}`);
  }

  const sources = new Map();
  for (const path of [...WORKFLOWS, LOCAL_ACTION]) {
    try {
      sources.set(path, await readFile(resolve(root, path), 'utf8'));
    } catch {
      errors.push(`${path}: workflow/action fixture is missing`);
    }
  }
  if (sources.size !== WORKFLOWS.length + 1) return { errors, workflows: 0, jobs: 0, actionUses: 0 };

  let jobCount = 0;
  let actionUses = 0;
  for (const path of WORKFLOWS) {
    const source = sources.get(path);
    const workflow = validateWorkflow(path, source);
    errors.push(...workflow.errors);
    jobCount += workflow.jobs;
  }

  for (const [path, source] of sources) {
    const actions = validateActionUses(path, source);
    errors.push(...actions.errors);
    actionUses += actions.count;
  }

  const combined = [...sources.values()].join('\n');
  for (const name of STABLE_GATES) {
    const count = [...sources.values()].reduce((total, source) => total + exactNameCount(source, name), 0);
    if (count !== 1) errors.push(`stable gate must appear exactly once: ${name}`);
  }
  for (const forbidden of [
    ['pull_request_target', /\bpull_request_target\s*:/],
    ['paths-ignore', /\bpaths-ignore\s*:/],
    ['continue-on-error', /\bcontinue-on-error\s*:/],
    ['contents write permission', /\bcontents:\s*write\b/],
    ['packages write permission', /\bpackages:\s*write\b/],
    ['deployments write permission', /\bdeployments:\s*write\b/],
    ['OIDC write permission', /\bid-token:\s*write\b/],
    ['actions write permission', /\bactions:\s*write\b/],
    ['administration write permission', /\badministration:\s*write\b/],
    ['repository secret access', /\bsecrets\.[A-Za-z0-9_]+/],
    ['production environment', /\b(?:environment|NOMA_ENV|NOMA_CREDENTIAL_ENVIRONMENT):\s*production\b/i],
    ['live provider endpoint', /https:\/\/(?:api\.paystack\.co|api\.postmarkapp\.com|api\.cloudflare\.com|api\.vercel\.com|api\.render\.com)/i],
    ['deployment command', /\b(?:vercel\s+(?:deploy|--prod)|render\s+deploy|kubectl\s+apply|terraform\s+apply|flyctl\s+deploy)\b/i],
    ['shell download-and-execute', /(?:curl|wget)[^\n|]*\|\s*(?:bash|sh)|Invoke-Expression/i],
    ['automatic test retry', /(?:--retry(?:=|\s+)[1-9]|\bretry:\s*[1-9])/i],
    ['non-frozen installation', /pnpm\s+install(?!\s+--frozen-lockfile)/],
  ]) {
    if (forbidden[1].test(combined)) errors.push(`workflow policy contains prohibited ${forbidden[0]}`);
  }

  const setup = sources.get(LOCAL_ACTION);
  for (const token of [
    'node-version-file: .node-version',
    'version: 11.17.0',
    'pnpm install --frozen-lockfile',
    'runner.os',
    'runner.arch',
    'node-24.18.0',
    'pnpm-11.17.0',
    "hashFiles('pnpm-lock.yaml')",
    'git diff --exit-code -- pnpm-lock.yaml pnpm-workspace.yaml package.json',
  ]) {
    if (!setup.includes(token)) errors.push(`${LOCAL_ACTION}: missing deterministic setup token ${token}`);
  }
  if (/\bnode_modules\b/.test(extractCachePaths(setup))) errors.push(`${LOCAL_ACTION}: node_modules caching is prohibited`);

  const integration = sources.get('.github/workflows/ci-integration.yml');
  if (countOccurrences(integration, 'run: pnpm ci:cleanup') < 3 || countOccurrences(integration, 'if: always()') < 5) {
    errors.push('ci-integration.yml: bounded always-on infrastructure cleanup is required');
  }
  const quality = sources.get('.github/workflows/ci-quality.yml');
  for (const token of ['force_ci_failure:', 'default: false', "github.event_name == 'workflow_dispatch'", "github.event.label.name == 'ci-force-failure'", 'NOMA_FORCE_CI_FAILURE', 'NOMA_CI_FAILURE_AUTHORITY']) {
    if (!quality.includes(token)) errors.push(`ci-quality.yml: manual deliberate-failure guard missing ${token}`);
  }
  if (countOccurrences(commandCatalog, 'scripts/test-protected-role-routes.mjs') !== 2) errors.push(`${COMMAND_CATALOG}: protected role route smoke must run in Quality runtime and Windows compatibility`);
  if (!quality.includes('needs: [policy, static, tests, runtime, storybook]')) errors.push('ci-quality.yml: Quality Gate must require the Storybook browser and visual segment');
  if (countOccurrences(combined, 'playwright install') !== 2) errors.push('Storybook Chromium must be installed only in Linux Quality and Windows Compatibility');
  if (combined.includes('ui:visual:update')) errors.push('CI workflows must never update reviewed visual baselines');
  const security = sources.get('.github/workflows/ci-security.yml');
  for (const token of ['security-events: write', 'fail-on-severity: moderate', 'javascript-typescript', 'security-extended']) {
    if (!security.includes(token)) errors.push(`ci-security.yml: security control missing ${token}`);
  }
  if (countOccurrences(combined, 'security-events: write') !== 1) {
    errors.push('security-events: write must be granted only to the CodeQL job');
  }

  return { errors: [...new Set(errors)], workflows: WORKFLOWS.length, jobs: jobCount, actionUses };
}

function validateWorkflow(path, source) {
  const errors = [];
  if (!/^permissions:\r?\n  contents: read\s*$/m.test(source)) {
    errors.push(`${path}: default permissions must be exactly contents: read`);
  }
  for (const trigger of ['pull_request:', 'push:', 'merge_group:', 'workflow_dispatch:']) {
    if (!source.includes(trigger)) errors.push(`${path}: required trigger missing ${trigger}`);
  }
  if (!/^concurrency:\r?\n  group:/m.test(source) || !source.includes("cancel-in-progress: ${{ github.event_name == 'pull_request' }}")) {
    errors.push(`${path}: workflow-specific concurrency is missing`);
  }
  if (!source.includes('timeout-minutes:')) errors.push(`${path}: job timeout is missing`);

  const jobs = extractJobBlocks(source);
  for (const [jobId, block] of jobs) {
    if (!/^    timeout-minutes:\s*\d+\s*$/m.test(block)) errors.push(`${path}:${jobId}: missing timeout-minutes`);
    if (!block.includes('actions/checkout@')) errors.push(`${path}:${jobId}: checkout is required`);
    const name = /^    name:\s*(.+)$/m.exec(block)?.[1]?.trim() ?? jobId;
    if (name.startsWith('Noma /')) {
      if (!block.includes('if: always()')) errors.push(`${path}:${jobId}: stable gate must use if: always()`);
      if (!block.includes('needs:')) errors.push(`${path}:${jobId}: stable gate must declare mandatory needs`);
      if (!block.includes('scripts/evaluate-ci-gate.mjs')) errors.push(`${path}:${jobId}: stable gate must use the checked-in evaluator`);
    } else if (!block.includes('uses: ./.github/actions/setup-workspace')) {
      errors.push(`${path}:${jobId}: ordinary CI job must use the pinned workspace setup action`);
    }
  }

  for (const step of splitSteps(source)) {
    if (step.includes('actions/checkout@') && !/persist-credentials:\s*false/.test(step)) {
      errors.push(`${path}: checkout must set persist-credentials: false`);
    }
    if (step.includes('actions/upload-artifact@')) {
      if (!/if:\s*always\(\)/.test(step)) errors.push(`${path}: evidence upload must run with if: always()`);
      if (!/if-no-files-found:\s*error/.test(step)) errors.push(`${path}: evidence upload must fail when files are absent`);
      if (!/retention-days:\s*90/.test(step)) errors.push(`${path}: evidence retention must be 90 days`);
      const uploadPaths = extractUploadPaths(step);
      if (uploadPaths.length === 0) errors.push(`${path}: evidence upload path is missing`);
      for (const uploadPath of uploadPaths) {
        if (!/^(?:\.artifacts\/ci\/[A-Za-z0-9_./${} -]+|coverage\/?)$/.test(uploadPath)) {
          errors.push(`${path}: unsafe artifact upload path ${uploadPath}`);
        }
        if (/\.env|node_modules|\.dump|provider.*payload|database.*volume|redis.*volume/i.test(uploadPath)) {
          errors.push(`${path}: prohibited artifact upload path ${uploadPath}`);
        }
      }
    }
  }

  return { errors, jobs: jobs.size };
}

function validateActionUses(path, source) {
  const errors = [];
  let count = 0;
  for (const line of source.split(/\r?\n/)) {
    if (!line.includes('uses:')) continue;
    const local = /^\s*uses:\s*\.\//.test(line);
    if (local) continue;
    const match = /^\s*uses:\s*([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)(?:\/[A-Za-z0-9_.-]+)?@([^\s#]+)(?:\s+#\s*(.+))?\s*$/.exec(line);
    if (!match) {
      errors.push(`${path}: unparseable or unsupported external action use`);
      continue;
    }
    count += 1;
    const [, repository, ref, comment = ''] = match;
    const expected = ACTION_PINS[repository];
    if (!expected) {
      errors.push(`${path}: unapproved external action ${repository}`);
      continue;
    }
    if (!/^[0-9a-f]{40}$/.test(ref) || ref !== expected.sha) {
      errors.push(`${path}: ${repository} must use reviewed full SHA ${expected.sha}`);
    }
    if (!comment.includes(expected.version)) {
      errors.push(`${path}: ${repository} pin must identify ${expected.version} in a comment`);
    }
  }
  return { errors, count };
}

function extractJobBlocks(source) {
  const lines = source.split(/\r?\n/);
  const jobsIndex = lines.findIndex((line) => line === 'jobs:');
  const jobs = new Map();
  if (jobsIndex < 0) return jobs;
  let currentId;
  let current = [];
  for (let index = jobsIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    const match = /^  ([a-z0-9_-]+):\s*$/.exec(line);
    if (match) {
      if (currentId) jobs.set(currentId, current.join('\n'));
      currentId = match[1];
      current = [line];
      continue;
    }
    if (currentId) current.push(line);
  }
  if (currentId) jobs.set(currentId, current.join('\n'));
  return jobs;
}

function splitSteps(source) {
  return source.split(/(?=^\s{6}- name:)/m);
}

function extractUploadPaths(step) {
  const lines = step.split(/\r?\n/);
  const index = lines.findIndex((line) => /^\s+path:\s*/.test(line));
  if (index < 0) return [];
  const inline = lines[index].replace(/^\s+path:\s*/, '').trim();
  if (inline && inline !== '|') return [stripQuotes(inline)];
  const indent = lines[index].match(/^\s*/)[0].length;
  const paths = [];
  for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
    const lineIndent = lines[cursor].match(/^\s*/)[0].length;
    if (lineIndent <= indent) break;
    const value = lines[cursor].trim();
    if (value) paths.push(stripQuotes(value));
  }
  return paths;
}

function extractCachePaths(source) {
  return splitSteps(source).filter((step) => step.includes('actions/cache@')).join('\n');
}

function stripQuotes(value) {
  return value.replace(/^['"]|['"]$/g, '');
}

function countOccurrences(source, token) {
  return source.split(token).length - 1;
}

function exactNameCount(source, name) {
  return source.split(/\r?\n/).filter((line) => line.trim() === `name: ${name}`).length;
}

async function runSelfTest() {
  const fixtureRoot = await mkdtemp(resolve(tmpdir(), 'noma-ci-policy-'));
  const githubTarget = resolve(fixtureRoot, '.github');
  await cp(resolve(ROOT, '.github'), githubTarget, { recursive: true });
  await mkdir(resolve(fixtureRoot, 'scripts'), { recursive: true });
  const originals = new Map();
  for (const path of [...WORKFLOWS, LOCAL_ACTION, COMMAND_CATALOG]) originals.set(path, await readFile(resolve(ROOT, path), 'utf8'));

  const quality = '.github/workflows/ci-quality.yml';
  const integration = '.github/workflows/ci-integration.yml';
  const tests = [
    testCase('floating action', quality, (s) => s.replace(ACTION_PINS['actions/checkout'].sha, 'v7'), 'must use reviewed full SHA'),
    testCase('pull_request_target', quality, (s) => s.replace('pull_request:', 'pull_request_target:'), 'pull_request_target'),
    testCase('top-level write', quality, (s) => s.replace('contents: read', 'contents: write'), 'contents write'),
    testCase('job contents write', quality, (s) => s.replace('runs-on: ubuntu-24.04', 'permissions:\n      contents: write\n    runs-on: ubuntu-24.04'), 'contents write'),
    testCase('missing timeout', quality, (s) => s.replace(/    timeout-minutes:\s*\d+\r?\n/, ''), 'missing timeout-minutes'),
    testCase('continue on error', quality, (s) => s.replace('steps:', 'continue-on-error: true\n    steps:'), 'continue-on-error'),
    testCase('paths ignore', quality, (s) => s.replace('branches: [main]', 'branches: [main]\n    paths-ignore: ["docs/**"]'), 'paths-ignore'),
    testCase('persisted credentials', quality, (s) => s.replace('persist-credentials: false', 'persist-credentials: true'), 'persist-credentials'),
    testCase('production environment', quality, (s) => `${s}\n# environment: production\n`, 'production environment'),
    testCase('deployment command', quality, (s) => `${s}\n# vercel deploy --prod\n`, 'deployment command'),
    testCase('secret access', quality, (s) => `${s}\n# value: \${{ secrets.PRODUCTION_KEY }}\n`, 'repository secret access'),
    testCase('environment upload', quality, (s) => s.replace('.artifacts/ci/quality-policy/', '.env'), 'unsafe artifact upload path'),
    testCase('database dump upload', quality, (s) => s.replace('.artifacts/ci/quality-policy/', 'database.dump'), 'unsafe artifact upload path'),
    testCase('provider payload upload', quality, (s) => s.replace('.artifacts/ci/quality-policy/', 'provider-payload.json'), 'unsafe artifact upload path'),
    testCase('missing concurrency', quality, (s) => s.replace(/concurrency:\r?\n  group:[^\n]+\r?\n  cancel-in-progress:[^\n]+\r?\n/, ''), 'concurrency is missing'),
    testCase('unstable gate name', quality, (s) => s.replace('Noma / Quality Gate', 'Noma / Quality Gate (ubuntu)'), 'stable gate must appear exactly once'),
    testCase('automatic retry', quality, (s) => `${s}\n# --retry=2\n`, 'automatic test retry'),
    testCase('non-frozen install', LOCAL_ACTION, (s) => s.replace('pnpm install --frozen-lockfile', 'pnpm install'), 'non-frozen installation'),
    testCase('download execute', quality, (s) => `${s}\n# curl https://invalid.example/tool | bash\n`, 'shell download-and-execute'),
    testCase(
      'silent gate skip',
      quality,
      (s) => s.replace(/name: Noma \/ CI Policy\r?\n    if: always\(\)/, 'name: Noma / CI Policy\n    if: success()'),
      'stable gate must use if: always()',
    ),
    testCase('OIDC permission', quality, (s) => s.replace('contents: read', 'contents: read\n  id-token: write'), 'OIDC write permission'),
    testCase('live provider endpoint', quality, (s) => `${s}\n# https://api.paystack.co\n`, 'live provider endpoint'),
    testCase('unsafe artifact absence', quality, (s) => s.replace('if-no-files-found: error', 'if-no-files-found: ignore'), 'must fail when files are absent'),
    testCase('missing cleanup', integration, (s) => s.replace('run: pnpm ci:cleanup', 'run: node --version'), 'infrastructure cleanup is required'),
    testCase('weakened dependency severity', '.github/workflows/ci-security.yml', (s) => s.replace('fail-on-severity: moderate', 'fail-on-severity: high'), 'security control missing fail-on-severity: moderate'),
    testCase('missing dependency floor command', COMMAND_CATALOG, (s) => s.replace('security:dependencies:validate', 'security:dependencies:removed'), 'missing required command token security:dependencies:validate'),
    testCase('missing protected route smoke', COMMAND_CATALOG, (s) => s.replaceAll('scripts/test-protected-role-routes.mjs', 'scripts/protected-smoke-removed.mjs'), 'missing required command token scripts/test-protected-role-routes.mjs'),
    testCase('missing UI-005 trace lookup', COMMAND_CATALOG, (s) => s.replace("'UI-005'", "'UI-REMOVED'"), "missing required command token 'UI-005'"),
    testCase('missing UI-006 trace lookup', COMMAND_CATALOG, (s) => s.replace("'UI-006'", "'UI-REMOVED'"), "missing required command token 'UI-006'"),
    testCase('missing Storybook browser command', COMMAND_CATALOG, (s) => s.replaceAll('ui:storybook:test', 'ui:storybook:removed'), 'missing required command token ui:storybook:test'),
    testCase('CI baseline update', quality, (s) => `${s}\n# run: pnpm ui:visual:update\n`, 'must never update reviewed visual baselines'),
  ];

  try {
    for (const item of tests) {
      for (const [path, source] of originals) await writeFile(resolve(fixtureRoot, path), source, 'utf8');
      const original = originals.get(item.path);
      await writeFile(resolve(fixtureRoot, item.path), item.mutate(original), 'utf8');
      const checked = await validateRepository(fixtureRoot, { fixture: true });
      if (!checked.errors.some((error) => error.includes(item.expected))) {
        throw new Error(`CI policy self-test did not reject ${item.name}: ${checked.errors.join('; ')}`);
      }
    }
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
}

function testCase(name, path, mutate, expected) {
  return { name, path, mutate, expected };
}

function selfTestGateEvaluator() {
  const cases = [
    [{ one: { result: 'success' }, two: { result: 'success' } }, 0],
    [{ one: { result: 'failure' } }, 1],
    [{ one: { result: 'skipped' } }, 1],
    [{ one: { result: 'cancelled' } }, 1],
  ];
  for (const [needs, expected] of cases) {
    const result = spawnSync(process.execPath, ['scripts/evaluate-ci-gate.mjs'], {
      cwd: ROOT,
      env: { ...process.env, NOMA_CI_REQUIRED_RESULTS: JSON.stringify(needs) },
      encoding: 'utf8',
      windowsHide: true,
    });
    if (result.status !== expected) throw new Error(`gate evaluator self-test expected ${expected}, received ${result.status}`);
  }
}
