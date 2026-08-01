import { spawn } from 'node:child_process';

import { assertDatabaseResetAllowed } from '../packages/database/prisma/reset-safety.mjs';

assertDatabaseResetAllowed(process.env);

function spawnPnpm(args) {
  const pnpmCli = process.env.npm_execpath;
  if (pnpmCli && /pnpm(?:\.(?:cjs|mjs|js))?$/i.test(pnpmCli)) {
    return spawn(process.execPath, [pnpmCli, ...args], {
      env: process.env,
      stdio: 'inherit',
      windowsHide: true,
    });
  }

  return spawn(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', args, {
    env: process.env,
    stdio: 'inherit',
    windowsHide: true,
  });
}

const child = spawnPnpm([
  '--filter',
  '@noma/database',
  'exec',
  'prisma',
  'migrate',
  'reset',
  '--force',
]);

child.once('error', (error) => {
  console.error(`database reset launcher failed: ${error.message}`);
  process.exitCode = 1;
});

child.once('exit', (code) => {
  process.exitCode = code ?? 1;
});
