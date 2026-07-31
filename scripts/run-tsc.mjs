import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(scriptDirectory, '..');
const typescriptCli = resolve(workspaceRoot, 'node_modules', 'typescript', 'bin', 'tsc');
const project = resolve(process.cwd(), 'tsconfig.json');
const noEmit = process.argv.includes('--noEmit');

if (!existsSync(typescriptCli)) {
  console.error(
    'TypeScript is not installed in the workspace. Run pnpm install --frozen-lockfile from the repository root.',
  );
  process.exit(1);
}

if (!existsSync(project)) {
  console.error(`TypeScript project not found: ${project}`);
  process.exit(1);
}

const args = [typescriptCli, '-p', project];
if (noEmit) args.push('--noEmit');

const result = spawnSync(process.execPath, args, {
  stdio: 'inherit',
  shell: false,
  windowsHide: true,
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
