import { readFile, readdir } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const staticDirectory = resolve(ROOT, 'apps/web/.next/static');
const cssFiles = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (extname(entry.name) === '.css') cssFiles.push(path);
  }
}

await walk(staticDirectory);
const productionCss = (await Promise.all(cssFiles.map((path) => readFile(path, 'utf8')))).join('\n');
const requiredFragments = [
  '--noma-color-text-primary:',
  '--noma-color-surface-page:',
  '--noma-font-family-sans:',
  '--noma-motion-duration-page:',
  'prefers-reduced-motion:reduce',
  'forced-colors:active',
  '--noma-component-control-target:',
  '--noma-component-button-primary-background:',
  '.noma-button',
  '.noma-field',
  '.noma-dialog-popup',
  '--noma-commerce-status-info-background:',
  '--noma-commerce-money-font-variant-numeric:',
  '.noma-commerce-status',
  '.noma-money-breakdown',
  '.noma-timeline',
  '.noma-evidence-card',
  '.noma-high-risk-summary',
];
const missing = requiredFragments.filter((fragment) => !productionCss.includes(fragment));
if (missing.length > 0) {
  console.error(`Production Web CSS is missing Noma foundation output: ${missing.join(', ')}`);
  process.exit(1);
}

for (const legacy of ['#f5f6f8', '#15171a', '#dfe2e7', 'Arial,Helvetica,sans-serif']) {
  if (productionCss.includes(legacy)) {
    console.error(`Production Web CSS still contains legacy scaffold authority: ${legacy}`);
    process.exit(1);
  }
}

console.log(`PASS: production Web CSS contains Noma tokens, foundations, and component styles across ${cssFiles.length} stylesheet(s)`);
