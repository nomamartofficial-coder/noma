import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const FILES = Object.freeze({
  web: 'apps/web/package.json',
  workspace: 'pnpm-workspace.yaml',
  lock: 'pnpm-lock.yaml',
});
const APPROVED = Object.freeze({
  next: '16.3.0',
  postcss: Object.freeze(['8.5.23', '8.5.25']),
  sharp: '0.35.3',
  fastUri: '3.1.5',
  nanoid: '3.3.18',
});

const sources = await readSources(ROOT);
const errors = validateSources(sources);
if (errors.length > 0) {
  for (const error of errors) console.error(`FAIL: ${error}`);
  process.exit(1);
}

console.log('PASS: dependency manifests, convergence overrides, lockfile packages, and dependency edges use approved patched versions');

if (process.argv.includes('--self-test')) {
  runSelfTest(sources);
  console.log('PASS: 11 weakened dependency-policy fixtures were rejected');
}

async function readSources(root) {
  return Object.fromEntries(await Promise.all(
    Object.entries(FILES).map(async ([name, path]) => [name, normalize(await readFile(resolve(root, path), 'utf8'))]),
  ));
}

function validateSources({ web, workspace, lock }) {
  const errors = [];
  let webManifest;
  try {
    webManifest = JSON.parse(web);
  } catch (error) {
    errors.push(`${FILES.web}: invalid JSON: ${error.message}`);
    return errors;
  }

  if (webManifest.dependencies?.next !== APPROVED.next) {
    errors.push(`${FILES.web}: Next.js must be pinned exactly to ${APPROVED.next}`);
  }

  for (const [name, version] of [['fast-uri', APPROVED.fastUri], ['nanoid', APPROVED.nanoid]]) {
    if (!workspace.includes(`  '${name}@': ${version}\n`)) {
      errors.push(`${FILES.workspace}: missing reviewed ${name}@ convergence override to ${version}`);
    }
    if (!lock.includes(`  ${name}@: ${version}\n`)) {
      errors.push(`${FILES.lock}: missing resolved ${name}@ convergence override to ${version}`);
    }
  }

  const importers = yamlSection(lock, 'importers');
  const webImporter = yamlEntryBlocks(importers, 'apps/web@').at(0)
    ?? yamlNamedEntry(importers, 'apps/web');
  if (!webImporter.includes(`      next:\n        specifier: ${APPROVED.next}\n        version: ${APPROVED.next}(`)) {
    errors.push(`${FILES.lock}: apps/web must resolve the exact Next.js ${APPROVED.next} importer`);
  }

  const packages = yamlSection(lock, 'packages');
  assertVersions(errors, packages, 'next', [APPROVED.next]);
  assertVersions(errors, packages, 'postcss', APPROVED.postcss);
  assertVersions(errors, packages, 'sharp', [APPROVED.sharp]);
  assertVersions(errors, packages, 'fast-uri', [APPROVED.fastUri]);
  assertVersions(errors, packages, 'nanoid', [APPROVED.nanoid]);

  const snapshots = yamlSection(lock, 'snapshots');
  const nextBlocks = yamlEntryBlocks(snapshots, `next@${APPROVED.next}`);
  if (nextBlocks.length !== 1) {
    errors.push(`${FILES.lock}: expected one Next.js ${APPROVED.next} snapshot, found ${nextBlocks.length}`);
  } else {
    requireDependency(errors, nextBlocks[0], 'Next.js', 'postcss', APPROVED.postcss[0]);
    requireDependency(errors, nextBlocks[0], 'Next.js', 'sharp', APPROVED.sharp);
  }

  const ajvBlocks = yamlEntryBlocks(snapshots, 'ajv@');
  if (ajvBlocks.length === 0) errors.push(`${FILES.lock}: no Ajv snapshot was available to validate fast-uri`);
  for (const block of ajvBlocks) requireDependency(errors, block, 'Ajv', 'fast-uri', APPROVED.fastUri);

  const postcssBlocks = yamlEntryBlocks(snapshots, 'postcss@');
  if (postcssBlocks.length !== APPROVED.postcss.length) {
    errors.push(`${FILES.lock}: expected ${APPROVED.postcss.length} reviewed PostCSS snapshots, found ${postcssBlocks.length}`);
  }
  for (const block of postcssBlocks) requireDependency(errors, block, 'PostCSS', 'nanoid', APPROVED.nanoid);

  return [...new Set(errors)];
}

function assertVersions(errors, section, name, expected) {
  const actual = [...section.matchAll(new RegExp(`^  ${escapeRegex(name)}@([^:\\s(]+)(?:\\([^\\n]*)?\\)?:\\s*$`, 'gm'))]
    .map((match) => match[1])
    .sort();
  const approved = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(approved)) {
    errors.push(`${FILES.lock}: ${name} package versions must be ${approved.join(', ')}, found ${actual.join(', ') || 'none'}`);
  }
}

function requireDependency(errors, block, owner, name, version) {
  if (!new RegExp(`^      ${escapeRegex(name)}: ${escapeRegex(version)}(?:\\([^\\n]*\\))?\\s*$`, 'm').test(block)) {
    errors.push(`${FILES.lock}: ${owner} must resolve ${name} ${version}`);
  }
}

function yamlSection(source, name) {
  const lines = source.split('\n');
  const start = lines.findIndex((line) => line === `${name}:`);
  if (start < 0) return '';
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^[A-Za-z][A-Za-z0-9_-]*:$/.test(lines[index])) {
      end = index;
      break;
    }
  }
  return lines.slice(start + 1, end).join('\n');
}

function yamlNamedEntry(section, name) {
  return yamlEntryBlocks(section, `${name}:`, { literalSuffix: true }).at(0) ?? '';
}

function yamlEntryBlocks(section, prefix, { literalSuffix = false } = {}) {
  const lines = section.split('\n');
  const blocks = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const matches = literalSuffix ? line === `  ${prefix}` : line.startsWith(`  ${prefix}`) && line.endsWith(':');
    if (!matches) continue;
    let end = index + 1;
    while (end < lines.length && !/^  \S/.test(lines[end])) end += 1;
    blocks.push(lines.slice(index, end).join('\n'));
  }
  return blocks;
}

function runSelfTest(original) {
  const tests = [
    fixture('downgraded Next manifest', 'web', '"next": "16.3.0"', '"next": "16.2.12"', 'Next.js must be pinned exactly'),
    fixture('removed fast-uri override', 'workspace', "  'fast-uri@': 3.1.5\n", '', 'missing reviewed fast-uri@ convergence override'),
    fixture('removed nanoid override', 'workspace', "  'nanoid@': 3.3.18\n", '', 'missing reviewed nanoid@ convergence override'),
    fixture('downgraded fast-uri package', 'lock', 'fast-uri@3.1.5:', 'fast-uri@3.1.4:', 'fast-uri package versions must be'),
    fixture('downgraded nanoid package', 'lock', 'nanoid@3.3.18:', 'nanoid@3.3.17:', 'nanoid package versions must be'),
    fixture('downgraded PostCSS package', 'lock', 'postcss@8.5.23:', 'postcss@8.4.31:', 'postcss package versions must be'),
    fixture('downgraded Sharp package', 'lock', 'sharp@0.35.3:', 'sharp@0.34.5:', 'sharp package versions must be'),
    fixture('downgraded Next PostCSS edge', 'lock', '      postcss: 8.5.23', '      postcss: 8.4.31', 'Next.js must resolve postcss'),
    fixture('downgraded Next Sharp edge', 'lock', '      sharp: 0.35.3(', '      sharp: 0.34.5(', 'Next.js must resolve sharp'),
    fixture('downgraded Ajv fast-uri edge', 'lock', '      fast-uri: 3.1.5', '      fast-uri: 3.1.4', 'Ajv must resolve fast-uri'),
    fixture('downgraded PostCSS nanoid edge', 'lock', '      nanoid: 3.3.18', '      nanoid: 3.3.17', 'PostCSS must resolve nanoid'),
  ];

  for (const test of tests) {
    const source = original[test.file];
    if (!source.includes(test.before)) throw new Error(`self-test fixture is stale: ${test.name}`);
    const mutated = { ...original, [test.file]: source.replace(test.before, test.after) };
    const rejected = validateSources(mutated);
    if (!rejected.some((error) => error.includes(test.expected))) {
      throw new Error(`dependency self-test did not reject ${test.name}: ${rejected.join('; ')}`);
    }
  }
}

function fixture(name, file, before, after, expected) {
  return { name, file, before, after, expected };
}

function normalize(source) {
  return source.replace(/\r\n/g, '\n');
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
