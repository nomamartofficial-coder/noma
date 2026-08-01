
import { rm } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';

const base = resolve(process.argv[2] ?? '.');
const requestedTargets = ['dist', ...process.argv.slice(3)];

for (const requestedTarget of requestedTargets) {
  if (isAbsolute(requestedTarget)) throw new Error('clean targets must be package-relative');

  const target = resolve(base, requestedTarget);
  const targetRelativeToBase = relative(base, target);
  if (targetRelativeToBase.startsWith('..') || isAbsolute(targetRelativeToBase)) {
    throw new Error(`clean target escapes package boundary: ${requestedTarget}`);
  }

  await rm(target, { recursive: true, force: true });
}
