
import { rm } from 'node:fs/promises';
for (const path of ['.turbo']) await rm(path, { recursive: true, force: true });
