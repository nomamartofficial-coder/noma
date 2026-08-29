import { access, readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(import.meta.dirname, '..');
const FILES = Object.freeze({
  rootPackage: 'package.json',
  webPackage: 'apps/web/package.json',
  main: 'apps/web/.storybook/main.ts',
  preview: 'apps/web/.storybook/preview.tsx',
  navigationMock: 'apps/web/.storybook/next-navigation.mock.ts',
  vitest: 'apps/web/vitest.storybook.config.ts',
  playwright: 'apps/web/playwright.visual.config.ts',
  contracts: 'apps/web/stories/contracts.ts',
  visualRunner: 'scripts/run-ui-visual-tests.mjs',
  lintPackage: 'scripts/lint-package.mjs',
  qualityWorkflow: '.github/workflows/ci-quality.yml',
  windowsWorkflow: '.github/workflows/ci-windows.yml',
  taskIndex: 'delivery/traceability/task-index.csv',
  uiIndex: 'packages/ui/src/index.ts',
});

const PINS = Object.freeze({
  '@playwright/test': '1.62.1',
  '@storybook/addon-a11y': '10.5.10',
  '@storybook/addon-docs': '10.5.10',
  '@storybook/addon-vitest': '10.5.10',
  '@storybook/react-vite': '10.5.10',
  '@vitest/browser-playwright': '4.1.10',
  mockdate: '3.0.5',
  storybook: '10.5.10',
  vite: '8.2.0',
  vitest: '4.1.10',
});

const requiredStates = Object.freeze(['LOADING', 'EMPTY', 'NO_RESULTS', 'ERROR', 'PENDING', 'DISABLED', 'PERMISSION_RESTRICTED', 'UNAUTHENTICATED', 'EXPIRED', 'RATE_LIMITED', 'OFFLINE', 'CONFLICT']);
const requiredCommands = Object.freeze(['storybook', 'storybook:build', 'ui:storybook:validate', 'ui:storybook:self-test', 'ui:storybook:test', 'ui:storybook:verify', 'ui:visual:test', 'ui:visual:update']);
const forbiddenStoryPatterns = Object.freeze([
  ['uncontrolled random source', /Math\.random\s*\(/],
  ['uncontrolled current time', /Date\.now\s*\(/],
  ['network request', /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource)\b/],
  ['server testing package', /@noma\/testing/],
  ['server or authority package', /@noma\/(?:database|integrations|platform|security)/],
  ['direct Base UI import', /@base-ui\/react/],
  ['environment access', /(?:process\.env|import\.meta\.env)/],
  ['hosted visual provider', /\b(?:chromatic|percy|applitools)(?:\b|_)/i],
  ['story accessibility bypass', /a11y\s*:\s*\{[^}]*?(?:test\s*:\s*['"](?:off|todo)['"]|manual\s*:\s*true)/s],
  ['test exclusion', /['"]!test['"]|\.only\s*\(|\.skip\s*\(/],
  ['numeric Money input', /amountMinor=\{\s*-?\d+(?:\.\d+)?\s*\}/],
  ['role bypass', /(?:localStorage|document\.cookie|searchParams|getRequestHeader|role-header)/i],
  ['premature business route', /\/(?:checkout|payments|live-orders|provider-callback)/],
]);

async function readSources() {
  const entries = await Promise.all(Object.values(FILES).map(async (path) => [path, await readFile(resolve(ROOT, path), 'utf8')]));
  const storyNames = (await readdir(resolve(ROOT, 'apps/web/stories'))).filter((name) => name.endsWith('.stories.tsx'));
  for (const name of storyNames) entries.push([`apps/web/stories/${name}`, await readFile(resolve(ROOT, 'apps/web/stories', name), 'utf8')]);
  const productionNames = (await readdir(resolve(ROOT, 'apps/web/src'), { recursive: true }))
    .filter((name) => typeof name === 'string' && /\.(?:ts|tsx)$/.test(name));
  for (const name of productionNames) entries.push([`apps/web/src/${name.replaceAll('\\', '/')}`, await readFile(resolve(ROOT, 'apps/web/src', name), 'utf8')]);
  return new Map(entries);
}

function validateTextSources(sources) {
  const errors = [];
  const rootPackage = JSON.parse(sources.get(FILES.rootPackage));
  const webPackage = JSON.parse(sources.get(FILES.webPackage));
  for (const command of requiredCommands) if (!rootPackage.scripts?.[command]) errors.push(`${FILES.rootPackage}: missing ${command}`);
  for (const [name, version] of Object.entries(PINS)) {
    if (webPackage.devDependencies?.[name] !== version) errors.push(`${FILES.webPackage}: ${name} must be pinned exactly to ${version}`);
  }
  for (const forbidden of ['@storybook/test', '@storybook/nextjs-vite', 'chromatic', 'playwright']) {
    if (webPackage.devDependencies?.[forbidden]) errors.push(`${FILES.webPackage}: forbidden direct dependency ${forbidden}`);
  }

  const main = sources.get(FILES.main);
  for (const token of ['@storybook/react-vite', '@storybook/addon-docs', '@storybook/addon-a11y', '@storybook/addon-vitest', '../stories/**/*.stories', "jsx: { runtime: 'automatic' }", "'next/navigation'", 'next-navigation.mock.ts']) {
    if (!main.includes(token)) errors.push(`${FILES.main}: missing ${token}`);
  }
  for (const forbidden of ['@storybook/nextjs-vite', 'vite-plugin-storybook-nextjs']) {
    if (main.includes(forbidden)) errors.push(`${FILES.main}: vulnerable adapter is forbidden (${forbidden})`);
  }
  if (/src\/app.*stories|stories.*src\/app/.test(main)) errors.push(`${FILES.main}: production App Router paths must not be Storybook sources`);

  const preview = sources.get(FILES.preview);
  for (const token of ["a11y: { test: 'error' }", 'FIXED_STORY_INSTANT', "locale: 'en-NG'", 'Africa/Lagos', "tags: ['autodocs', 'test']", 'setStoryPathname(context.parameters.noma?.pathname)']) {
    if (!preview.includes(token)) errors.push(`${FILES.preview}: missing deterministic policy ${token}`);
  }
  const navigationMock = sources.get(FILES.navigationMock);
  for (const token of ['setStoryPathname', 'usePathname', "storyPathname = '/'", 'pathnamePattern']) {
    if (!navigationMock.includes(token)) errors.push(`${FILES.navigationMock}: missing deterministic navigation contract ${token}`);
  }
  for (const forbidden of ['notFound', 'redirect', 'permanentRedirect', 'useRouter', 'useSearchParams']) {
    if (new RegExp(`\\b${forbidden}\\b`).test(navigationMock)) errors.push(`${FILES.navigationMock}: broader Next.js authority mock is forbidden (${forbidden})`);
  }

  const vitest = sources.get(FILES.vitest);
  for (const token of ['storybookTest', '@vitest/browser-playwright', "browser: 'chromium'", 'retry: 0', 'maxWorkers: 1']) {
    if (!vitest.includes(token)) errors.push(`${FILES.vitest}: missing browser policy ${token}`);
  }
  const playwright = sources.get(FILES.playwright);
  for (const token of ['maxDiffPixels: 0', 'threshold: 0', 'retries: 0', 'workers: 1']) {
    if (!playwright.includes(token)) errors.push(`${FILES.playwright}: missing visual policy ${token}`);
  }
  const runner = sources.get(FILES.visualRunner);
  for (const token of ['Visual baselines must never be updated in CI', 'Canonical baselines may only be updated on Linux/Ubuntu 24.04', "NOMA_VISUAL_MODE: isLinux ? 'compare' : 'smoke'"]) {
    if (!runner.includes(token)) errors.push(`${FILES.visualRunner}: missing baseline guard ${token}`);
  }
  const qualityWorkflow = sources.get(FILES.qualityWorkflow);
  const canonicalImage = 'mcr.microsoft.com/playwright:v1.62.1-noble@sha256:dcc5531e97840b9b5e794f2814476b21571c5124a3fca2267d73041f56e7580e';
  if (!qualityWorkflow.includes(canonicalImage)) errors.push(`${FILES.qualityWorkflow}: canonical Playwright image must be pinned by digest`);
  const containerWorkspaceTrust = 'git config --global --add safe.directory "$GITHUB_WORKSPACE"';
  if (!qualityWorkflow.includes(containerWorkspaceTrust)) errors.push(`${FILES.qualityWorkflow}: pinned Storybook container must trust only the checked-out workspace`);
  const lintPackage = sources.get(FILES.lintPackage);
  for (const outputDirectory of ['storybook-static', 'playwright-report', 'test-results']) {
    if (!lintPackage.includes(`'${outputDirectory}'`)) errors.push(`${FILES.lintPackage}: generated ${outputDirectory} must be excluded from source linting`);
  }

  const contracts = sources.get(FILES.contracts);
  for (const state of requiredStates) if (!new RegExp(`\\b${state}:`).test(contracts)) errors.push(`${FILES.contracts}: missing state ${state}`);
  if (!contracts.includes("kind: 'NOT_APPLICABLE', rationale")) errors.push(`${FILES.contracts}: NOT_APPLICABLE entries require a rationale`);
  if (!contracts.includes("kind: 'COMPOSITION', ownerStoryId, storyIds, rationale")) errors.push(`${FILES.contracts}: COMPOSITION entries require an owner and rationale`);
  const [inventorySource, visualSource = ''] = contracts.split('export const visualBaselineManifest');
  const inventoryStoryIds = new Set([...inventorySource.matchAll(/['"]([a-z0-9-]+--[a-z0-9-]+)['"]/g)].map((match) => match[1]));
  for (const match of visualSource.matchAll(/storyId:\s*['"]([^'"]+)['"]/g)) {
    if (!inventoryStoryIds.has(match[1])) errors.push(`${FILES.contracts}: visual story ${match[1]} is absent from inventory`);
  }
  if (qualityWorkflow.includes('ui:visual:update') || sources.get(FILES.windowsWorkflow).includes('ui:visual:update')) errors.push('GitHub Actions must never update visual baselines');
  if (/apps[\\/]storybook/.test(sources.get(FILES.rootPackage))) errors.push('Storybook must remain associated with apps/web');
  if (!sources.get(FILES.taskIndex).includes('UI-006,EP02,Create Storybook/component documentation and visual regression,P0,P2-PRESENTATION,COMPLETE')) errors.push('UI-006 must be COMPLETE after its reviewed merge');

  for (const [path, source] of sources) {
    if (path.startsWith('apps/web/src/') && /(?:next-navigation\.mock|\.storybook)/.test(source)) {
      errors.push(`${path}: production source must not import Storybook navigation mocks`);
    }
    if (!path.includes('/stories/') || (!path.endsWith('.tsx') && !path.endsWith('.ts'))) continue;
    if (/\bnextjs\s*:/.test(source)) errors.push(`${path}: adapter-specific Next.js story parameters are forbidden`);
    for (const [label, pattern] of forbiddenStoryPatterns) if (pattern.test(source)) errors.push(`${path}: forbidden ${label}`);
    if (/https?:\/\//.test(source)) errors.push(`${path}: external URLs are forbidden in deterministic stories`);
  }
  const deterministicPaths = Object.freeze({
    'apps/web/stories/admin.stories.tsx': '/admin',
    'apps/web/stories/consumer-shells.stories.tsx': '/',
    'apps/web/stories/operations.stories.tsx': '/operations/support',
    'apps/web/stories/rider.stories.tsx': '/rider',
    'apps/web/stories/seller.stories.tsx': '/seller',
  });
  for (const [path, pathname] of Object.entries(deterministicPaths)) {
    if (!sources.get(path).includes(`noma: { pathname: '${pathname}' }`)) errors.push(`${path}: missing deterministic Storybook pathname ${pathname}`);
  }
  return [...new Set(errors)];
}

async function validateRuntimeContracts(errors) {
  const moduleUrl = `${pathToFileURL(resolve(ROOT, FILES.contracts)).href}?validation=${Date.now()}`;
  const { stateApplicability, storyInventory, visualBaselineManifest } = await import(moduleUrl);
  const inventoryIds = new Set();
  const documentedExports = new Set();
  for (const item of storyInventory) {
    if (inventoryIds.has(item.id)) errors.push(`${FILES.contracts}: duplicate inventory id ${item.id}`);
    inventoryIds.add(item.id);
    try { await access(resolve(ROOT, item.source)); } catch { errors.push(`${FILES.contracts}: inventory source does not exist: ${item.source}`); }
    for (const exportName of item.exportNames) {
      if (documentedExports.has(exportName)) errors.push(`${FILES.contracts}: export ${exportName} is documented by more than one owner`);
      documentedExports.add(exportName);
    }
  }
  const uiIndex = await readFile(resolve(ROOT, FILES.uiIndex), 'utf8');
  const runtimeExports = new Set([...uiIndex.matchAll(/export\s*\{([\s\S]*?)\}\s*from/g)].flatMap((match) =>
    match[1].split(',').map((name) => name.trim().split(/\s+as\s+/)[1] ?? name.trim()).filter(Boolean),
  ));
  for (const exportName of runtimeExports) if (!documentedExports.has(exportName)) errors.push(`${FILES.contracts}: undocumented @noma/ui runtime export ${exportName}`);
  for (const exportName of documentedExports) if (!runtimeExports.has(exportName)) errors.push(`${FILES.contracts}: stale documented @noma/ui export ${exportName}`);
  if (visualBaselineManifest.length !== 31) errors.push(`${FILES.contracts}: expected 31 visual baselines, found ${visualBaselineManifest.length}`);
  const visualIds = new Set();
  for (const entry of visualBaselineManifest) {
    if (visualIds.has(entry.id)) errors.push(`${FILES.contracts}: duplicate visual baseline id ${entry.id}`);
    visualIds.add(entry.id);
  }
  const storyIds = new Set(storyInventory.flatMap((item) => item.storyIds));
  for (const entry of visualBaselineManifest) if (!storyIds.has(entry.storyId)) errors.push(`${FILES.contracts}: visual story ${entry.storyId} is absent from inventory`);
  for (const state of requiredStates) {
    const entry = stateApplicability[state];
    if (!entry) errors.push(`${FILES.contracts}: state ${state} has no applicability entry`);
    if (entry?.kind === 'NOT_APPLICABLE' && !entry.rationale.trim()) errors.push(`${FILES.contracts}: state ${state} lacks a NOT_APPLICABLE rationale`);
    if (entry?.kind === 'COMPOSITION' && (!entry.ownerStoryId || !entry.rationale.trim() || entry.storyIds.length === 0)) errors.push(`${FILES.contracts}: state ${state} has an incomplete composition`);
    for (const storyId of entry?.storyIds ?? []) if (!storyIds.has(storyId)) errors.push(`${FILES.contracts}: state ${state} refers to undocumented story ${storyId}`);
  }

  const indexPath = resolve(ROOT, 'apps/web/storybook-static/index.json');
  try {
    const index = JSON.parse(await readFile(indexPath, 'utf8'));
    const entries = Object.entries(index.entries ?? {});
    const builtIds = new Set(entries.map(([id]) => id));
    for (const storyId of storyIds) if (!builtIds.has(storyId)) errors.push(`storybook-static/index.json: missing story ${storyId}`);
    for (const [builtId, entry] of entries) if (entry.type === 'story' && !storyIds.has(builtId)) errors.push(`storybook-static/index.json: undocumented built story ${builtId}`);
  } catch (error) {
    if (error?.code !== 'ENOENT') errors.push(`storybook-static/index.json: ${error.message}`);
  }
}

async function validateRepository() {
  const sources = await readSources();
  const errors = validateTextSources(sources);
  for (const path of ['apps/web/.storybook', 'apps/web/stories', 'apps/web/tsconfig.storybook.json']) {
    try { await access(resolve(ROOT, path)); } catch { errors.push(`${path}: required UI-006 artifact is missing`); }
  }
  for (const forbidden of ['apps/storybook', 'apps/web/src/app/storybook', 'apps/web/src/app/(storybook)']) {
    try { await access(resolve(ROOT, forbidden)); errors.push(`${forbidden}: Storybook must not be a production application`); } catch {}
  }
  await validateRuntimeContracts(errors);
  return errors;
}

async function selfTest() {
  const original = await readSources();
  const cases = [
    ['misplaced Storybook app', FILES.rootPackage, (s) => s.replace('"name": "noma"', '"name": "noma", "ui006": "apps/storybook"')],
    ['production route source', FILES.main, (s) => `${s}\n// stories: src/app/storybook\n`],
    ['ranged Storybook pin', FILES.webPackage, (s) => s.replace('"storybook": "10.5.10"', '"storybook": "^10.5.10"')],
    ['vulnerable Next.js Storybook adapter', FILES.webPackage, (s) => s.replace('"@storybook/react-vite": "10.5.10"', '"@storybook/nextjs-vite": "10.5.10"')],
    ['uncontrolled shell pathname', 'apps/web/stories/seller.stories.tsx', (s) => s.replace("noma: { pathname: '/seller' }", "noma: { pathname: undefined }")],
    ['broader Next.js authority mock', FILES.navigationMock, (s) => `${s}\nexport function redirect() {}\n`],
    ['production Storybook mock import', 'apps/web/src/shells/navigation.ts', (s) => `${s}\n// import '../../.storybook/next-navigation.mock'\n`],
    ['Chromatic dependency', FILES.webPackage, (s) => s.replace('"storybook": "10.5.10"', '"chromatic": "1.0.0", "storybook": "10.5.10"')],
    ['hosted visual token', 'apps/web/stories/foundations.stories.tsx', (s) => `${s}\n// CHROMATIC_TOKEN\n`],
    ['CI baseline update', FILES.qualityWorkflow, (s) => `${s}\n# pnpm ui:visual:update\n`],
    ['floating canonical Playwright image', FILES.qualityWorkflow, (s) => s.replace('@sha256:dcc5531e97840b9b5e794f2814476b21571c5124a3fca2267d73041f56e7580e', '')],
    ['missing pinned-container workspace trust', FILES.qualityWorkflow, (s) => s.replace(/      - name: Trust the checked-out workspace in the pinned container\r?\n        run: git config --global --add safe\.directory "\$GITHUB_WORKSPACE"\r?\n/, '')],
    ['generated Storybook output linted as source', FILES.lintPackage, (s) => s.replace(/  'storybook-static',\r?\n/, '')],
    ['random story', 'apps/web/stories/foundations.stories.tsx', (s) => `${s}\n// Math.random()\n`],
    ['wall clock story', 'apps/web/stories/foundations.stories.tsx', (s) => `${s}\n// Date.now()\n`],
    ['database story import', 'apps/web/stories/foundations.stories.tsx', (s) => `${s}\n// @noma/database\n`],
    ['network story', 'apps/web/stories/foundations.stories.tsx', (s) => `${s}\n// fetch('/api')\n`],
    ['missing universal state', FILES.contracts, (s) => s.replace('  OFFLINE:', '  OFFLINE_REMOVED:')],
    ['missing exclusion rationale', FILES.contracts, (s) => s.replace("kind: 'NOT_APPLICABLE', rationale", "kind: 'NOT_APPLICABLE', missing")],
    ['stale visual story id', FILES.contracts, (s) => s.replace("storyId: 'foundations-noma--colour'", "storyId: 'stale-story--missing'")],
    ['numeric Money input', 'apps/web/stories/commerce.stories.tsx', (s) => `${s}\n// <Money amountMinor={1} currency="NGN" />\n`],
    ['protected local storage bypass', 'apps/web/stories/protected-access.stories.tsx', (s) => `${s}\n// localStorage role bypass\n`],
    ['unmerged UI-006 status', FILES.taskIndex, (s) => s.replace('UI-006,EP02,Create Storybook/component documentation and visual regression,P0,P2-PRESENTATION,COMPLETE', 'UI-006,EP02,Create Storybook/component documentation and visual regression,P0,P2-PRESENTATION,IN_REVIEW')],
    ['speculative checkout story', 'apps/web/stories/consumer-shells.stories.tsx', (s) => `${s}\n// /checkout\n`],
  ];
  const lineEndingVariants = [
    ['LF', new Map([...original].map(([path, source]) => [path, source.replace(/\r?\n/g, '\n')]))],
    ['CRLF', new Map([...original].map(([path, source]) => [path, source.replace(/\r?\n/g, '\r\n')]))],
  ];
  for (const [name, path, mutate] of cases) {
    for (const [lineEndings, originalVariant] of lineEndingVariants) {
      const sources = new Map(originalVariant);
      sources.set(path, mutate(sources.get(path)));
      const errors = validateTextSources(sources);
      if (errors.length === 0) throw new Error(`UI-006 validator self-test did not reject ${name} with ${lineEndings}`);
    }
  }
  console.log(`PASS: UI-006 validator rejected ${cases.length} unsafe fixtures across LF and CRLF inputs`);
}

if (process.argv.includes('--self-test')) {
  await selfTest();
} else {
  const errors = await validateRepository();
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exit(1);
  }
  console.log('PASS: Storybook inventory, deterministic stories, accessibility, visual manifest, and production isolation are valid');
}
