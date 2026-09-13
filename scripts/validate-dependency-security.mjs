import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const FILES = Object.freeze({
  root: 'package.json',
  web: 'apps/web/package.json',
  security: 'packages/security/package.json',
  integrations: 'packages/integrations/package.json',
  workspace: 'pnpm-workspace.yaml',
  lock: 'pnpm-lock.yaml',
});
const APPROVED = Object.freeze({
  next: '16.3.3',
  postcss: Object.freeze(['8.5.23', '8.5.25']),
  sharp: '0.35.4',
  fastUri: '3.1.7',
  mysql2: '3.23.1',
  multer: '2.3.0',
  qs: '6.16.0',
  nanoid: '3.3.18',
  deepmergeTs: '8.0.2',
  argon2: '0.45.1',
  passwordDictionary: '4.1.3',
  awsKms: '3.1131.0',
  dictionaryCompression: '3.0.1',
  ui006: Object.freeze({
    '@playwright/test': '1.62.1',
    '@storybook/addon-a11y': '10.5.10',
    '@storybook/addon-docs': '10.5.10',
    '@storybook/addon-vitest': '10.5.10',
    '@storybook/react-vite': '10.5.10',
    '@vitest/browser-playwright': '4.1.11',
    mockdate: '3.0.5',
    storybook: '10.5.10',
    vite: '8.2.0',
    vitest: '4.1.11',
  }),
});

const sources = await readSources(ROOT);
const errors = validateSources(sources);
if (errors.length > 0) {
  for (const error of errors) console.error(`FAIL: ${error}`);
  process.exit(1);
}

console.log('PASS: dependency manifests, convergence overrides, UI test-tool pins, lockfile packages, and dependency edges use approved versions');

if (process.argv.includes('--self-test')) {
  runSelfTest(sources);
  console.log('PASS: dependency-policy weakened fixtures were rejected');
}

async function readSources(root) {
  return Object.fromEntries(await Promise.all(
    Object.entries(FILES).map(async ([name, path]) => [name, normalize(await readFile(resolve(root, path), 'utf8'))]),
  ));
}

function validateSources({ root, web, security, integrations, workspace, lock }) {
  const errors = [];
  let rootManifest;
  let webManifest;
  let securityManifest;
  let integrationsManifest;
  try {
    rootManifest = JSON.parse(root);
    webManifest = JSON.parse(web);
    securityManifest = JSON.parse(security);
    integrationsManifest = JSON.parse(integrations);
  } catch (error) {
    errors.push(`${FILES.web}: invalid JSON: ${error.message}`);
    return errors;
  }

  if (webManifest.dependencies?.next !== APPROVED.next) {
    errors.push(`${FILES.web}: Next.js must be pinned exactly to ${APPROVED.next}`);
  }
  for (const [name, version] of [
    ['@vitest/coverage-v8', APPROVED.ui006.vitest],
    ['vitest', APPROVED.ui006.vitest],
  ]) {
    if (rootManifest.devDependencies?.[name] !== version) {
      errors.push(`${FILES.root}: ${name} must be pinned exactly to ${version}`);
    }
  }
  for (const [name, version] of Object.entries(APPROVED.ui006)) {
    if (webManifest.devDependencies?.[name] !== version) {
      errors.push(`${FILES.web}: ${name} must be pinned exactly to ${version}`);
    }
  }
  if (securityManifest.dependencies?.argon2 !== APPROVED.argon2) {
    errors.push(`${FILES.security}: argon2 must be pinned exactly to ${APPROVED.argon2}`);
  }
  if (securityManifest.dependencies?.['@zxcvbn-ts/language-common'] !== APPROVED.passwordDictionary) {
    errors.push(`${FILES.security}: @zxcvbn-ts/language-common must be pinned exactly to ${APPROVED.passwordDictionary}`);
  }
  if (integrationsManifest.dependencies?.['@aws-sdk/client-kms'] !== APPROVED.awsKms) {
    errors.push(`${FILES.integrations}: @aws-sdk/client-kms must be pinned exactly to ${APPROVED.awsKms}`);
  }
  if (!workspace.includes('  argon2: true\n')) {
    errors.push(`${FILES.workspace}: argon2 must be the only approved IAM-002 native build addition`);
  }

  for (const [name, version] of [['fast-uri', APPROVED.fastUri], ['nanoid', APPROVED.nanoid]]) {
    if (!workspace.includes(`  '${name}@': ${version}\n`)) {
      errors.push(`${FILES.workspace}: missing reviewed ${name}@ convergence override to ${version}`);
    }
    if (!lock.includes(`  ${name}@: ${version}\n`)) {
      errors.push(`${FILES.lock}: missing resolved ${name}@ convergence override to ${version}`);
    }
  }
  for (const [name, version] of [
    ['mysql2', APPROVED.mysql2],
    ['multer', APPROVED.multer],
    ['qs', APPROVED.qs],
    ['sharp', APPROVED.sharp],
  ]) {
    if (!workspace.includes(`  ${name}: ${version}\n`)) {
      errors.push(`${FILES.workspace}: missing reviewed ${name} forced override to ${version}`);
    }
    if (!lock.includes(`  ${name}: ${version}\n`)) {
      errors.push(`${FILES.lock}: missing resolved ${name} forced override to ${version}`);
    }
  }
  if (!workspace.includes(`  deepmerge-ts: ${APPROVED.deepmergeTs}\n`)) {
    errors.push(`${FILES.workspace}: missing reviewed deepmerge-ts forced override to ${APPROVED.deepmergeTs}`);
  }
  if (!lock.includes(`  deepmerge-ts: ${APPROVED.deepmergeTs}\n`)) {
    errors.push(`${FILES.lock}: missing resolved deepmerge-ts forced override to ${APPROVED.deepmergeTs}`);
  }
  if (!workspace.includes(`minimumReleaseAgeExclude:\n  - deepmerge-ts@${APPROVED.deepmergeTs}\n`)) {
    errors.push(`${FILES.workspace}: missing reviewed deepmerge-ts release-age exception for ${APPROVED.deepmergeTs}`);
  }
  if (!workspace.includes(`  - '@aws-sdk/client-kms@${APPROVED.awsKms}'\n`)) {
    errors.push(`${FILES.workspace}: missing narrow AWS KMS SDK release-age exception`);
  }
  if (!workspace.includes("peerDependencyRules:\n  allowedVersions:\n    'tsconfck@3.1.6>typescript': 6.0.3\n")) {
    errors.push(`${FILES.workspace}: missing narrow tsconfck TypeScript 6.0.3 peer allowance`);
  }
  if (/^audit:\s*$[\s\S]*?^\s+ignore:\s*$/m.test(workspace)) {
    errors.push(`${FILES.workspace}: dependency audit advisory ignores are forbidden`);
  }
  for (const advisory of ['GHSA-5p2g-fcmc-qvqq', 'GHSA-w3rx-r6r6-pgpr']) {
    if (workspace.includes(advisory)) errors.push(`${FILES.workspace}: advisory exclusions are forbidden (${advisory})`);
  }

  const importers = yamlSection(lock, 'importers');
  const webImporter = yamlEntryBlocks(importers, 'apps/web@').at(0)
    ?? yamlNamedEntry(importers, 'apps/web');
  if (!webImporter.includes(`      next:\n        specifier: ${APPROVED.next}\n        version: ${APPROVED.next}(`)) {
    errors.push(`${FILES.lock}: apps/web must resolve the exact Next.js ${APPROVED.next} importer`);
  }
  for (const [name, version] of Object.entries(APPROVED.ui006)) {
    const importerName = name.startsWith('@') ? `'${name}'` : name;
    if (!webImporter.includes(`      ${importerName}:\n        specifier: ${version}\n        version: ${version}`)) {
      errors.push(`${FILES.lock}: apps/web must resolve exact ${name} ${version}`);
    }
  }
  const securityImporter = yamlEntryBlocks(importers, 'packages/security@').at(0)
    ?? yamlNamedEntry(importers, 'packages/security');
  for (const [name, version] of [
    ['argon2', APPROVED.argon2],
    ['@zxcvbn-ts/language-common', APPROVED.passwordDictionary],
  ]) {
    const importerName = name.startsWith('@') ? `'${name}'` : name;
    if (!securityImporter.includes(`      ${importerName}:\n        specifier: ${version}\n        version: ${version}`)) {
      errors.push(`${FILES.lock}: packages/security must resolve exact ${name} ${version}`);
    }
  }
  const integrationsImporter = yamlEntryBlocks(importers, 'packages/integrations@').at(0)
    ?? yamlNamedEntry(importers, 'packages/integrations');
  if (!integrationsImporter.includes(`      '@aws-sdk/client-kms':\n        specifier: ${APPROVED.awsKms}\n        version: ${APPROVED.awsKms}`)) {
    errors.push(`${FILES.lock}: packages/integrations must resolve exact @aws-sdk/client-kms ${APPROVED.awsKms}`);
  }

  const packages = yamlSection(lock, 'packages');
  assertVersions(errors, packages, 'next', [APPROVED.next]);
  assertVersions(errors, packages, 'postcss', APPROVED.postcss);
  assertVersions(errors, packages, 'sharp', [APPROVED.sharp]);
  assertVersions(errors, packages, 'fast-uri', [APPROVED.fastUri]);
  assertVersions(errors, packages, 'mysql2', [APPROVED.mysql2]);
  assertVersions(errors, packages, 'multer', [APPROVED.multer]);
  assertVersions(errors, packages, 'nanoid', [APPROVED.nanoid]);
  assertVersions(errors, packages, 'qs', [APPROVED.qs]);
  assertVersions(errors, packages, 'deepmerge-ts', [APPROVED.deepmergeTs]);
  assertVersions(errors, packages, 'argon2', [APPROVED.argon2]);
  if (!packages.includes(`  '@aws-sdk/client-kms@${APPROVED.awsKms}':`)) {
    errors.push(`${FILES.lock}: missing approved @aws-sdk/client-kms ${APPROVED.awsKms} package`);
  }
  if (!packages.includes(`  '@zxcvbn-ts/language-common@${APPROVED.passwordDictionary}':`)) {
    errors.push(`${FILES.lock}: missing exact @zxcvbn-ts/language-common ${APPROVED.passwordDictionary} package`);
  }
  if (!packages.includes(`  '@zxcvbn-ts/dictionary-compression@${APPROVED.dictionaryCompression}':`)) {
    errors.push(`${FILES.lock}: missing exact @zxcvbn-ts/dictionary-compression ${APPROVED.dictionaryCompression} package`);
  }
  for (const [name, version] of Object.entries(APPROVED.ui006)) {
    const entry = name.startsWith('@') ? `  '${name}@${version}':` : `  ${name}@${version}:`;
    if (!packages.includes(entry)) errors.push(`${FILES.lock}: missing approved ${name} ${version} package`);
  }

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

  const prismaConfigBlocks = yamlEntryBlocks(snapshots, "'@prisma/config@");
  if (prismaConfigBlocks.length !== 1) errors.push(`${FILES.lock}: expected one Prisma configuration snapshot, found ${prismaConfigBlocks.length}`);
  for (const block of prismaConfigBlocks) requireDependency(errors, block, 'Prisma configuration', 'deepmerge-ts', APPROVED.deepmergeTs);

  const dictionaryBlocks = yamlEntryBlocks(snapshots, "'@zxcvbn-ts/language-common@");
  if (dictionaryBlocks.length !== 1) errors.push(`${FILES.lock}: expected one password dictionary snapshot, found ${dictionaryBlocks.length}`);
  for (const block of dictionaryBlocks) requireDependency(errors, block, 'password dictionary', "'@zxcvbn-ts/dictionary-compression'", APPROVED.dictionaryCompression);

  for (const forbidden of ['@storybook/nextjs-vite', 'vite-plugin-storybook-nextjs', 'image-size@']) {
    if (lock.includes(forbidden)) errors.push(`${FILES.lock}: vulnerable Storybook dependency is forbidden (${forbidden})`);
  }

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
    fixture('restored vulnerable Next manifest', 'web', '"next": "16.3.3"', '"next": "16.3.0"', 'Next.js must be pinned exactly'),
    fixture('restored vulnerable root Vitest manifest', 'root', '"vitest": "4.1.11"', '"vitest": "4.1.10"', 'vitest must be pinned exactly'),
    fixture('restored vulnerable Web Vitest manifest', 'web', '"vitest": "4.1.11"', '"vitest": "4.1.10"', 'vitest must be pinned exactly'),
    fixture('removed fast-uri override', 'workspace', "  'fast-uri@': 3.1.7\n", '', 'missing reviewed fast-uri@ convergence override'),
    fixture('removed mysql2 override', 'workspace', '  mysql2: 3.23.1\n', '', 'missing reviewed mysql2 forced override'),
    fixture('removed multer override', 'workspace', '  multer: 2.3.0\n', '', 'missing reviewed multer forced override'),
    fixture('removed nanoid override', 'workspace', "  'nanoid@': 3.3.18\n", '', 'missing reviewed nanoid@ convergence override'),
    fixture('removed qs override', 'workspace', '  qs: 6.16.0\n', '', 'missing reviewed qs forced override'),
    fixture('removed sharp override', 'workspace', '  sharp: 0.35.4\n', '', 'missing reviewed sharp forced override'),
    fixture('removed deepmerge-ts override', 'workspace', '  deepmerge-ts: 8.0.2\n', '', 'missing reviewed deepmerge-ts forced override'),
    fixture('removed deepmerge-ts release-age exception', 'workspace', 'minimumReleaseAgeExclude:\n  - deepmerge-ts@8.0.2\n', '', 'missing reviewed deepmerge-ts release-age exception'),
    fixture('downgraded fast-uri package', 'lock', 'fast-uri@3.1.7:', 'fast-uri@3.1.5:', 'fast-uri package versions must be'),
    fixture('downgraded mysql2 package', 'lock', 'mysql2@3.23.1:', 'mysql2@3.15.3:', 'mysql2 package versions must be'),
    fixture('downgraded multer package', 'lock', 'multer@2.3.0:', 'multer@2.2.0:', 'multer package versions must be'),
    fixture('downgraded nanoid package', 'lock', 'nanoid@3.3.18:', 'nanoid@3.3.17:', 'nanoid package versions must be'),
    fixture('downgraded qs package', 'lock', 'qs@6.16.0:', 'qs@6.15.3:', 'qs package versions must be'),
    fixture('downgraded deepmerge-ts package', 'lock', 'deepmerge-ts@8.0.2:', 'deepmerge-ts@7.1.5:', 'deepmerge-ts package versions must be'),
    fixture('downgraded PostCSS package', 'lock', 'postcss@8.5.23:', 'postcss@8.4.31:', 'postcss package versions must be'),
    fixture('downgraded Sharp package', 'lock', 'sharp@0.35.4:', 'sharp@0.35.3:', 'sharp package versions must be'),
    fixture('downgraded Next PostCSS edge', 'lock', '      postcss: 8.5.23', '      postcss: 8.4.31', 'Next.js must resolve postcss'),
    fixture('downgraded Next Sharp edge', 'lock', '      sharp: 0.35.4(', '      sharp: 0.35.3(', 'Next.js must resolve sharp'),
    fixture('downgraded Ajv fast-uri edge', 'lock', '      fast-uri: 3.1.7', '      fast-uri: 3.1.5', 'Ajv must resolve fast-uri'),
    fixture('downgraded PostCSS nanoid edge', 'lock', '      nanoid: 3.3.18', '      nanoid: 3.3.17', 'PostCSS must resolve nanoid'),
    fixture('downgraded Prisma configuration edge', 'lock', '      deepmerge-ts: 8.0.2', '      deepmerge-ts: 7.1.5', 'Prisma configuration must resolve deepmerge-ts'),
    fixture('ranged Storybook manifest', 'web', '"storybook": "10.5.10"', '"storybook": "^10.5.10"', 'storybook must be pinned exactly'),
    fixture('downgraded Playwright manifest', 'web', '"@playwright/test": "1.62.1"', '"@playwright/test": "1.61.0"', '@playwright/test must be pinned exactly'),
    fixture('removed tsconfck peer allowance', 'workspace', "peerDependencyRules:\n  allowedVersions:\n    'tsconfck@3.1.6>typescript': 6.0.3\n", '', 'missing narrow tsconfck TypeScript 6.0.3 peer allowance'),
    fixture('reintroduced vulnerable Storybook adapter', 'web', '"@storybook/react-vite": "10.5.10"', '"@storybook/nextjs-vite": "10.5.10"', '@storybook/react-vite must be pinned exactly'),
    fixture('added audit advisory ignore', 'workspace', 'minimumReleaseAgeExclude:\n  - deepmerge-ts@8.0.2\n', 'minimumReleaseAgeExclude:\n  - deepmerge-ts@8.0.2\naudit:\n  ignore:\n    - GHSA-5p2g-fcmc-qvqq\n', 'dependency audit advisory ignores are forbidden'),
    fixture('reintroduced vulnerable adapter lock entry', 'lock', 'packages:\n', 'packages:\n  vite-plugin-storybook-nextjs@3.3.2:\n', 'vulnerable Storybook dependency is forbidden'),
    fixture('reintroduced image-size lock entry', 'lock', 'packages:\n', 'packages:\n  image-size@2.0.2:\n', 'vulnerable Storybook dependency is forbidden'),
    fixture('downgraded Storybook importer', 'lock', '      storybook:\n        specifier: 10.5.10', '      storybook:\n        specifier: 10.5.9', 'apps/web must resolve exact storybook 10.5.10'),
    fixture('ranged Argon2 manifest', 'security', '"argon2": "0.45.1"', '"argon2": "^0.45.1"', 'argon2 must be pinned exactly'),
    fixture('downgraded password dictionary manifest', 'security', '"@zxcvbn-ts/language-common": "4.1.3"', '"@zxcvbn-ts/language-common": "4.1.2"', '@zxcvbn-ts/language-common must be pinned exactly'),
    fixture('ranged KMS SDK manifest', 'integrations', '"@aws-sdk/client-kms": "3.1131.0"', '"@aws-sdk/client-kms": "^3.1131.0"', '@aws-sdk/client-kms must be pinned exactly'),
    fixture('removed KMS SDK release-age exception', 'workspace', "  - '@aws-sdk/client-kms@3.1131.0'\n", '', 'missing narrow AWS KMS SDK release-age exception'),
    fixture('downgraded KMS SDK importer', 'lock', "      '@aws-sdk/client-kms':\n        specifier: 3.1131.0", "      '@aws-sdk/client-kms':\n        specifier: 3.1130.0", 'packages/integrations must resolve exact @aws-sdk/client-kms'),
    fixture('removed Argon2 build approval', 'workspace', '  argon2: true\n', '', 'argon2 must be the only approved IAM-002 native build addition'),
    fixture('downgraded Argon2 lock package', 'lock', 'argon2@0.45.1:', 'argon2@0.45.0:', 'argon2 package versions must be'),
    fixture('downgraded dictionary compression edge', 'lock', "      '@zxcvbn-ts/dictionary-compression': 3.0.1", "      '@zxcvbn-ts/dictionary-compression': 3.0.0", 'password dictionary must resolve'),
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
