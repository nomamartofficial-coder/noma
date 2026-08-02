import { spawn, spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { commandsForSuite, segmentsForSuite } from './ci-command-catalog.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const parsed = parseArguments(process.argv.slice(2));
const selectedSegments = parsed.segment ? [parsed.segment] : segmentsForSuite(parsed.suite);
const commands = commandsForSuite(parsed.suite, parsed.segment);
const resultDirectory = resolve(ROOT, '.artifacts', 'ci', `${parsed.suite}-${parsed.segment ?? 'all'}`);
const resultPath = resolve(resultDirectory, 'results.json');
const startedAt = new Date().toISOString();
const commandResults = [];

await mkdir(resultDirectory, { recursive: true });
await persist('running');

let exitCode = 0;
for (const item of commands) {
  const result = await runCommand(item);
  commandResults.push(result);
  await persist(result.exit_code === 0 ? 'running' : 'failure');
  if (result.exit_code !== 0) {
    exitCode = result.exit_code || 1;
    break;
  }
}

if (
  exitCode === 0 &&
  parsed.suite === 'quality' &&
  (parsed.segment === undefined || parsed.segment === 'tests') &&
  process.env.NOMA_FORCE_CI_FAILURE === 'true'
) {
  if (!['workflow_dispatch', 'pull_request_label'].includes(process.env.NOMA_CI_FAILURE_AUTHORITY ?? '')) {
    throw new Error('NOMA_FORCE_CI_FAILURE requires an authorized manual CI event');
  }
  const instant = new Date().toISOString();
  console.error('DELIBERATE FAILURE: manual DEV-008 gate verification requested');
  commandResults.push({
    id: 'deliberate-failure',
    label: 'Manual deliberate CI failure',
    program: 'internal',
    args: [],
    started_at: instant,
    completed_at: instant,
    duration_ms: 0,
    exit_code: 86,
  });
  exitCode = 86;
}

await persist(exitCode === 0 ? 'success' : 'failure');
if (exitCode === 0) {
  console.log(`PASS: ${parsed.suite} CI suite (${selectedSegments.join(', ')})`);
} else {
  console.error(`FAIL: ${parsed.suite} CI suite (${selectedSegments.join(', ')}) exited ${exitCode}`);
}
process.exitCode = exitCode;

function parseArguments(args) {
  args = args.filter((value) => value !== '--');
  const suite = args[0];
  if (!suite || suite.startsWith('--')) throw new Error('usage: run-ci-suite.mjs <suite> [--segment <name>]');
  let segment;
  for (let index = 1; index < args.length; index += 1) {
    if (args[index] === '--segment') {
      segment = args[index + 1];
      index += 1;
      continue;
    }
    throw new Error(`unknown CI suite argument: ${args[index]}`);
  }
  commandsForSuite(suite, segment);
  return { suite, segment };
}

async function runCommand(item) {
  const started = Date.now();
  const startedAtForCommand = new Date(started).toISOString();
  const invocation = resolveInvocation(item.program, item.args);
  console.log(`CI COMMAND: ${item.label}`);
  const exit = await new Promise((resolveExit, reject) => {
    const child = spawn(invocation.program, invocation.args, {
      cwd: ROOT,
      env: { ...process.env, TZ: 'UTC', NOMA_TEST_SEED: process.env.NOMA_TEST_SEED ?? '6006' },
      stdio: 'inherit',
      windowsHide: true,
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => resolveExit({ code: code ?? 1, signal }));
  });
  const completed = Date.now();
  return {
    id: item.id,
    label: item.label,
    program: item.program,
    args: [...item.args],
    started_at: startedAtForCommand,
    completed_at: new Date(completed).toISOString(),
    duration_ms: completed - started,
    exit_code: exit.code,
    signal: exit.signal ?? null,
  };
}

function resolveInvocation(program, args) {
  if (program === 'node') return { program: process.execPath, args };
  if (program === 'python') return { program: process.platform === 'win32' ? 'python' : 'python3', args };
  if (program !== 'pnpm') return { program, args };
  const pnpmCli = process.env.npm_execpath;
  if (pnpmCli && /pnpm(?:\.(?:cjs|mjs|js))?$/i.test(pnpmCli)) {
    return { program: process.execPath, args: [pnpmCli, ...args] };
  }
  return { program: process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', args };
}

function gitValue(args) {
  const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', windowsHide: true });
  return result.status === 0 ? result.stdout.trim() : null;
}

async function persist(status) {
  const payload = {
    schema_version: '1.0.0',
    repository: gitValue(['remote', 'get-url', 'origin']),
    commit_sha: process.env.GITHUB_SHA ?? gitValue(['rev-parse', 'HEAD']),
    ref: process.env.GITHUB_REF ?? gitValue(['branch', '--show-current']),
    suite: parsed.suite,
    segment: parsed.segment ?? 'all',
    selected_segments: selectedSegments,
    test_seed: process.env.NOMA_TEST_SEED ?? '6006',
    started_at: startedAt,
    completed_at: status === 'running' ? null : new Date().toISOString(),
    status,
    commands: commandResults,
  };
  await writeFile(resultPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}
