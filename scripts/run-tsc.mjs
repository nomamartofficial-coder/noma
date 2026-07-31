
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const noEmit = process.argv.includes('--noEmit');
const local = resolve(process.cwd(), '../../node_modules/typescript/bin/tsc');
const command = existsSync(local) ? process.execPath : 'tsc';
const args = existsSync(local) ? [local, '-p', 'tsconfig.json'] : ['-p', 'tsconfig.json'];
if (noEmit) args.push('--noEmit');
const result = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
