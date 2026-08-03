import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const args = parseArguments(process.argv.slice(2));
const directory = resolve(ROOT, '.artifacts', 'ci', `${args.suite}-${args.segment}`);
const resultsPath = resolve(directory, 'results.json');
await mkdir(directory, { recursive: true });

const results = await readOptionalJson(resultsPath) ?? {
  schema_version: '1.0.0',
  suite: args.suite,
  segment: args.segment,
  started_at: new Date().toISOString(),
  completed_at: new Date().toISOString(),
  status: args.jobResult,
  commands: [{
    id: args.platformCommand ?? 'platform-action',
    label: args.platformCommand ?? 'GitHub platform action',
    program: 'github-action',
    args: [],
    started_at: null,
    completed_at: null,
    duration_ms: null,
    exit_code: args.jobResult === 'success' ? 0 : 1,
    signal: null,
  }],
};

const commitSha = process.env.GITHUB_SHA ?? git(['rev-parse', 'HEAD']);
const repository = process.env.GITHUB_REPOSITORY ?? normalizeRepository(git(['remote', 'get-url', 'origin']));
const coverage = await coverageSummary();
const migrations = await migrationSummary();
const manifest = {
  schema_version: '1.0.0',
  evidence_id: `DEV-008-${args.suite}-${args.segment}-${process.env.GITHUB_RUN_ID ?? 'local'}-${process.env.GITHUB_RUN_ATTEMPT ?? '1'}`,
  task_ids: ['DEV-008'],
  requirement_ids: ['REQ-DEV-008'],
  risk_class: 'P0-RECOVERY',
  repository,
  commit_sha: commitSha,
  ref: process.env.GITHUB_REF ?? git(['branch', '--show-current']),
  pull_request_number: pullRequestNumber(process.env.GITHUB_REF),
  event_type: process.env.GITHUB_EVENT_NAME ?? 'local',
  workflow_name: process.env.GITHUB_WORKFLOW ?? 'local-ci',
  workflow_run_id: process.env.GITHUB_RUN_ID ?? null,
  workflow_run_attempt: integerOrNull(process.env.GITHUB_RUN_ATTEMPT),
  workflow_run_url: process.env.GITHUB_RUN_ID && repository
    ? `https://github.com/${repository}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : null,
  suite: args.suite,
  segment: args.segment,
  job_name: process.env.GITHUB_JOB ?? `${args.suite}-${args.segment}`,
  job_result: normalizeResult(args.jobResult),
  environment: process.env.GITHUB_ACTIONS === 'true' ? 'github-hosted-ci' : 'local-development',
  provider_environment: 'disabled',
  runner: {
    os: process.env.RUNNER_OS ?? process.platform,
    architecture: process.env.RUNNER_ARCH ?? process.arch,
    image: process.env.ImageOS ?? process.env.ImageVersion ?? null,
  },
  toolchain: {
    node: process.version.replace(/^v/, ''),
    pnpm: commandVersion('pnpm', ['--version']),
    git: commandVersion('git', ['--version']),
    docker: commandVersion('docker', ['--version'], true),
    docker_compose: commandVersion('docker', ['compose', 'version'], true),
  },
  lockfile_sha256: await sha256('pnpm-lock.yaml'),
  test_seed: process.env.NOMA_TEST_SEED ?? '6006',
  started_at: results.started_at,
  completed_at: results.completed_at ?? new Date().toISOString(),
  commands: (results.commands ?? []).map((command) => ({
    id: command.id,
    label: command.label,
    program: command.program,
    args: command.args ?? [],
    started_at: command.started_at ?? null,
    completed_at: command.completed_at ?? null,
    duration_ms: command.duration_ms ?? null,
    exit_code: command.exit_code,
    signal: command.signal ?? null,
  })),
  coverage,
  migrations,
  container_images: {
    postgresql: 'postgres:18.4-alpine3.23@sha256:996d0920e4ff9df1fc19dacb904492f3c1ec0ec1cc338f0ad7123be7731c5f5e',
    redis: 'redis:8.8.1-alpine3.23@sha256:8096655e437712b07503796fb64d81359256cfcff0ab29d95a7da72863786efb',
  },
  traceability: traceabilityStatus(results.commands ?? []),
  artifact_names: [
    process.env.NOMA_CI_ARTIFACT_NAME ?? `noma-${args.suite}-${args.segment}-${process.env.GITHUB_RUN_ID ?? 'local'}-${process.env.GITHUB_RUN_ATTEMPT ?? '1'}`,
  ],
  retention_days: 90,
  contains_personal_data: false,
  contains_secrets: false,
  redaction_review: 'PASS',
  known_limitations: args.limitations,
};

validateManifest(manifest);
const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
assertSafe(serialized);
await writeFile(resolve(directory, 'manifest.json'), serialized, 'utf8');
console.log(`PASS: safe CI evidence manifest written for ${args.suite}/${args.segment}`);

function parseArguments(values) {
  values = values.filter((value) => value !== '--');
  const parsed = { limitations: [] };
  for (let index = 0; index < values.length; index += 1) {
    const name = values[index];
    const value = values[index + 1];
    if (!name.startsWith('--') || value === undefined) throw new Error(`invalid CI evidence argument: ${name}`);
    index += 1;
    if (name === '--suite') parsed.suite = value;
    else if (name === '--segment') parsed.segment = value;
    else if (name === '--job-result') parsed.jobResult = value;
    else if (name === '--platform-command') parsed.platformCommand = value;
    else if (name === '--limitation') parsed.limitations.push(value);
    else throw new Error(`unknown CI evidence argument: ${name}`);
  }
  if (!parsed.suite || !parsed.segment || !parsed.jobResult) {
    throw new Error('--suite, --segment, and --job-result are required');
  }
  return parsed;
}

function normalizeResult(value) {
  if (['success', 'failure', 'cancelled', 'skipped'].includes(value)) return value;
  throw new Error(`unsupported CI job result: ${value}`);
}

function validateManifest(value) {
  const requiredStrings = [
    'schema_version', 'evidence_id', 'risk_class', 'repository', 'commit_sha', 'ref', 'event_type',
    'workflow_name', 'suite', 'segment', 'job_name', 'job_result', 'environment', 'test_seed',
    'started_at', 'completed_at', 'lockfile_sha256', 'redaction_review',
  ];
  for (const key of requiredStrings) {
    if (typeof value[key] !== 'string' || value[key].length === 0) throw new Error(`CI evidence missing ${key}`);
  }
  if (!/^[0-9a-f]{40}$/.test(value.commit_sha)) throw new Error('CI evidence commit SHA must be full length');
  if (!/^[0-9a-f]{64}$/.test(value.lockfile_sha256)) throw new Error('CI evidence lockfile SHA-256 is invalid');
  if (!Array.isArray(value.commands) || value.commands.length === 0) throw new Error('CI evidence must list commands');
  if (value.contains_personal_data || value.contains_secrets || value.redaction_review !== 'PASS') {
    throw new Error('CI evidence must be redacted and metadata-only');
  }
}

function assertSafe(source) {
  const patterns = [
    /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/,
    /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/,
    /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9_-]{20,}\b/,
    /\b(?:postgres(?:ql)?|redis):\/\/[^\s:@/]+:[^\s@/]+@/i,
    /\b(?:password|secret|token|private_key|account_number)\b\s*[:=]\s*['"][^'"]{8,}/i,
  ];
  if (patterns.some((pattern) => pattern.test(source))) {
    throw new Error('CI evidence redaction rejected credential-bearing content');
  }
}

async function readOptionalJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function coverageSummary() {
  const summary = await readOptionalJson(resolve(ROOT, 'coverage', 'coverage-summary.json'));
  if (!summary?.total) {
    return { available: false, repository: null, provider_contract: null, dev_008_source: null };
  }
  const providerEntry = Object.entries(summary).find(([path]) =>
    path.replaceAll('\\', '/').endsWith('/packages/platform/src/providers/common.ts'))?.[1] ?? null;
  return {
    available: true,
    repository: compactCoverage(summary.total),
    provider_contract: providerEntry ? compactCoverage(providerEntry) : null,
    dev_008_source: null,
  };
}

function compactCoverage(value) {
  return Object.fromEntries(['lines', 'statements', 'functions', 'branches'].map((key) => [key, {
    total: value[key].total,
    covered: value[key].covered,
    percentage: value[key].pct,
  }]));
}

async function migrationSummary() {
  const path = resolve(ROOT, 'packages', 'database', 'prisma', 'migrations');
  const entries = await readdir(path, { withFileTypes: true });
  return {
    count: entries.filter((entry) => entry.isDirectory()).length,
    checksum_manifest_sha256: await sha256('packages/database/prisma/migration-checksums.json'),
  };
}

function traceabilityStatus(commands) {
  const relevant = commands.filter((command) => command.id?.startsWith('traceability-'));
  return {
    executed: relevant.length > 0,
    passed: relevant.length > 0 && relevant.every((command) => command.exit_code === 0),
    lookups: relevant.filter((command) => command.id === 'traceability-dev008' || command.id === 'traceability-dev009')
      .map((command) => command.id.replace('traceability-', '').toUpperCase()),
  };
}

async function sha256(path) {
  const data = await readFile(resolve(ROOT, path));
  return createHash('sha256').update(data).digest('hex');
}

function commandVersion(program, commandArgs, optional = false) {
  const pnpmCli = program === 'pnpm' ? process.env.npm_execpath : null;
  const invocation = pnpmCli && /pnpm(?:\.(?:cjs|mjs|js))?$/i.test(pnpmCli)
    ? { executable: process.execPath, args: [pnpmCli, ...commandArgs] }
    : { executable: program, args: commandArgs };
  const result = spawnSync(invocation.executable, invocation.args, { cwd: ROOT, encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) {
    if (optional) return null;
    throw new Error(`unable to record ${program} version`);
  }
  return `${result.stdout}${result.stderr}`.trim().split(/\r?\n/)[0];
}

function git(commandArgs) {
  const result = spawnSync('git', commandArgs, { cwd: ROOT, encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) throw new Error(`git ${commandArgs[0]} failed while collecting CI evidence`);
  return result.stdout.trim();
}

function normalizeRepository(remote) {
  return remote
    .replace(/^git@github\.com:/, '')
    .replace(/^https:\/\/github\.com\//, '')
    .replace(/\.git$/, '');
}

function pullRequestNumber(ref) {
  const match = /^refs\/pull\/(\d+)\//.exec(ref ?? '');
  return match ? Number.parseInt(match[1], 10) : null;
}

function integerOrNull(value) {
  if (value === undefined) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) ? parsed : null;
}
