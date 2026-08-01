import { readFile, readdir } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';

const base = resolve(process.argv[2] ?? '.');
const ignoredPaths = new Set(process.argv.slice(3).map((path) => resolve(base, path)));
const allowedExtensions = new Set(['.ts', '.js', '.mjs', '.json', '.md', '.yaml', '.yml']);
const ignoredDirectories = new Set(['node_modules', 'dist', '.turbo', '.next']);
const failures = [];

function extensionOf(name) {
  const index = name.lastIndexOf('.');
  return index >= 0 ? name.slice(index) : '';
}

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignoredDirectories.has(entry.name)) continue;

    const path = resolve(directory, entry.name);
    if (ignoredPaths.has(path)) continue;
    if (entry.isDirectory()) {
      await walk(path);
      continue;
    }

    if (!allowedExtensions.has(extensionOf(entry.name))) continue;

    const text = await readFile(path, 'utf8');
    const displayPath = relative(base, path);

    if (text.includes('\t')) failures.push(`${displayPath}: tab character`);
    text.split('\n').forEach((line, index) => {
      if (/[ \t]+$/.test(line)) failures.push(`${displayPath}:${index + 1}: trailing whitespace`);
    });

    const isCode = ['.ts', '.js', '.mjs'].includes(extensionOf(entry.name));
    if (isCode && /from\s+['"]@noma\/[^'"]+\/src\//.test(text)) {
      failures.push(`${displayPath}: forbidden deep workspace import`);
    }

    const webSuffix = `${sep}apps${sep}web`;
    if (isCode && base.endsWith(webSuffix)) {
      if (/@noma\/(database|platform|integrations|security)(?:['"/])/.test(text)) {
        failures.push(`${displayPath}: browser imports a server-only package`);
      }
      if (/@noma\/observability(?:['"]|\/server)/.test(text)) {
        failures.push(`${displayPath}: browser must import @noma/observability/client only`);
      }
      if (/@noma\/config(?:['"]|\/server)/.test(text)) {
        failures.push(`${displayPath}: browser must import @noma/config/public only`);
      }
    }
  }
}

await walk(base);
if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
