
import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
const base = resolve(process.argv[2] ?? '.');
await rm(resolve(base, 'dist'), { recursive: true, force: true });
