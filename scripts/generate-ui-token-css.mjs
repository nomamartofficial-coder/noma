import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const workspaceRoot = resolve(import.meta.dirname, '..');
const outputDirectory = resolve(workspaceRoot, 'packages/ui/dist');
const outputModule = await import(pathToFileURL(resolve(outputDirectory, 'token-output.js')).href);
const outputs = new Map([
  [resolve(outputDirectory, 'tokens.css'), outputModule.renderTokenCss()],
  [resolve(outputDirectory, 'foundations.css'), outputModule.renderFoundationCss()],
  [resolve(outputDirectory, 'components.css'), outputModule.renderComponentCss()],
]);

if (process.argv.includes('--check')) {
  const failures = [];
  for (const [path, expected] of outputs) {
    let actual;
    try {
      actual = await readFile(path, 'utf8');
    } catch {
      failures.push(`${path}: generated stylesheet is missing`);
      continue;
    }
    if (actual !== expected) failures.push(`${path}: generated stylesheet differs from the canonical registry`);
  }
  if (failures.length > 0) {
    console.error(failures.join('\n'));
    process.exit(1);
  }
  console.log('PASS: @noma/ui generated stylesheets match the canonical registry');
} else {
  for (const [path, contents] of outputs) await writeFile(path, contents, 'utf8');
  console.log('Generated @noma/ui token and foundation stylesheets');
}
