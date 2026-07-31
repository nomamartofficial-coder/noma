
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
const root = resolve(process.argv[2] ?? '.');
const files = await readdir(root);
if (!files.includes('package.json')) throw new Error('package.json is required');
JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
for (const file of files.filter((x) => x.endsWith('.json'))) JSON.parse(await readFile(resolve(root, file), 'utf8'));
