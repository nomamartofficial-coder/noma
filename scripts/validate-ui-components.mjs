import { readFile, readdir } from 'node:fs/promises';
import { extname, relative, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const UI_SOURCE = resolve(ROOT, 'packages/ui/src');
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']);
const INVENTORY = Object.freeze([
  'Button', 'IconButton', 'Link', 'Field', 'TextField', 'PasswordField', 'TextArea',
  'Select', 'Checkbox', 'Radio', 'RadioGroup', 'Dialog', 'Drawer', 'Tabs', 'Menu',
  'Table', 'TableCaption', 'TableHead', 'TableBody', 'TableRow', 'TableHeaderCell',
  'TableCell', 'Pagination', 'ToastProvider', 'useToast', 'Form', 'FormErrorSummary',
]);
const FORBIDDEN_DEPENDENCIES = Object.freeze([
  'tailwindcss', '@tailwindcss/', 'styled-components', '@emotion/', 'formik',
  'react-hook-form', '@tanstack/react-form', '@radix-ui/', 'storybook', '@storybook/',
]);

function failure(code, message) { return `${code}: ${message}`; }
function clone(value) { return structuredClone(value); }

async function collectSourceFiles() {
  const files = [];
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (['dist', '.next', 'node_modules', '.artifacts'].includes(entry.name)) continue;
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (SOURCE_EXTENSIONS.has(extname(entry.name))) {
        files.push({ path: relative(ROOT, path).replaceAll('\\', '/'), contents: await readFile(path, 'utf8') });
      }
    }
  }
  await walk(resolve(ROOT, 'apps'));
  await walk(resolve(ROOT, 'packages'));
  await walk(resolve(ROOT, 'tests'));
  return files;
}

async function loadFixture() {
  const json = async (path) => JSON.parse(await readFile(resolve(ROOT, path), 'utf8'));
  const text = async (path) => readFile(resolve(ROOT, path), 'utf8');
  return {
    rootPackage: await json('package.json'),
    uiPackage: await json('packages/ui/package.json'),
    uiIndex: await text('packages/ui/src/index.ts'),
    staticSource: await text('packages/ui/src/static-primitives.tsx'),
    interactiveSource: await text('packages/ui/src/interactive-primitives.tsx'),
    errorSummarySource: await text('packages/ui/src/form-error-summary.tsx'),
    componentTokens: await text('packages/ui/src/component-tokens.ts'),
    componentsCss: await text('packages/ui/dist/components.css'),
    webLayout: await text('apps/web/src/app/layout.tsx'),
    webPage: await text('apps/web/src/app/(marketplace)/page.tsx'),
    productionVerifier: await text('scripts/verify-ui-token-build.mjs'),
    componentTest: await text('tests/component/ui-primitives.component.test.tsx'),
    axeHelper: await text('tests/component/axe-helper.ts'),
    lockfile: await text('pnpm-lock.yaml'),
    declarations: (await Promise.all((await readdir(resolve(ROOT, 'packages/ui/dist')))
      .filter((name) => name.endsWith('.d.ts'))
      .map((name) => text(`packages/ui/dist/${name}`)))).join('\n'),
    sourceFiles: await collectSourceFiles(),
  };
}

export function validateUiComponents(fixture) {
  const failures = [];
  const dependencies = fixture.uiPackage.dependencies ?? {};
  const peers = fixture.uiPackage.peerDependencies ?? {};
  if (dependencies['@base-ui/react'] !== '1.7.0') failures.push(failure('BASE_UI_PIN', 'packages/ui must pin @base-ui/react 1.7.0'));
  if (fixture.rootPackage.devDependencies?.['axe-core'] !== '4.13.0') failures.push(failure('AXE_PIN', 'root must pin axe-core 4.13.0'));
  if (peers.react !== '19.2.8' || peers['react-dom'] !== '19.2.8') failures.push(failure('REACT_PEER', 'UI React peers must match the workspace exactly'));

  const allDependencyNames = [
    ...Object.keys(fixture.rootPackage.dependencies ?? {}),
    ...Object.keys(fixture.rootPackage.devDependencies ?? {}),
    ...Object.keys(fixture.uiPackage.dependencies ?? {}),
    ...Object.keys(fixture.uiPackage.devDependencies ?? {}),
  ];
  for (const prefix of FORBIDDEN_DEPENDENCIES) {
    if (allDependencyNames.some((name) => name === prefix || name.startsWith(prefix))) failures.push(failure('UI_DEPENDENCY_SCOPE', prefix));
  }

  if (!fixture.lockfile.includes("'@base-ui/react@1.7.0':") || !fixture.lockfile.includes('axe-core@4.13.0:')) {
    failures.push(failure('LOCKFILE_PIN', 'approved dependency versions are missing'));
  }
  for (const exportName of ['.', './tokens', './tokens.css', './foundations.css', './components.css']) {
    if (!(exportName in (fixture.uiPackage.exports ?? {}))) failures.push(failure('PACKAGE_EXPORT', exportName));
  }
  if (JSON.stringify(fixture.uiPackage.sideEffects) !== JSON.stringify(['./dist/*.css'])) failures.push(failure('SIDE_EFFECTS', 'only generated CSS may be side-effectful'));

  for (const name of INVENTORY) {
    if (!new RegExp(`\\b${name}\\b`).test(fixture.uiIndex)) failures.push(failure('PUBLIC_INVENTORY', name));
  }
  if (/^['"]use client['"];?/m.test(fixture.uiIndex) || /^['"]use client['"];?/m.test(fixture.staticSource)) {
    failures.push(failure('RSC_BOUNDARY', 'root and static primitive modules must remain server-compatible'));
  }
  if (!fixture.interactiveSource.startsWith("'use client';") || !fixture.errorSummarySource.startsWith("'use client';")) {
    failures.push(failure('CLIENT_BOUNDARY', 'interactive modules require explicit narrow client directives'));
  }
  if (fixture.declarations.includes('@base-ui/react') || /\bBase(?:Button|Dialog|Menu|Select|Toast|Tabs|Radio|Checkbox)\b/.test(fixture.declarations)) {
    failures.push(failure('PUBLIC_TYPE_LEAK', 'Base UI details leaked through public declarations'));
  }

  const baseImports = fixture.sourceFiles.filter((source) => /(?:from\s+|import\s*)['"]@base-ui\/react/.test(source.contents));
  for (const source of baseImports) {
    if (!source.path.startsWith('packages/ui/src/')) failures.push(failure('BASE_UI_BOUNDARY', source.path));
  }
  if (!fixture.interactiveSource.includes('@base-ui/react/')) failures.push(failure('BASE_UI_BOUNDARY', 'interactive wrappers are missing'));
  for (const source of fixture.sourceFiles.filter((entry) => entry.path.startsWith('packages/ui/src/'))) {
    if (/dangerouslySetInnerHTML|\beval\s*\(|new\s+Function\s*\(/.test(source.contents)) failures.push(failure('COMPONENT_SECURITY', source.path));
  }
  if (!fixture.staticSource.includes('Link does not accept executable URL schemes') || !fixture.interactiveSource.includes('Menu links do not accept executable URL schemes')) {
    failures.push(failure('UNSAFE_URL', 'obvious executable URL schemes must fail closed'));
  }

  const requiredCss = [
    '--noma-component-control-target:var(--noma-size-target-default)',
    '--noma-component-action-target:var(--noma-size-target-action)',
    '.noma-choice-row', '.noma-dialog-popup', '.noma-tab', '.noma-menu-item',
    '.noma-pagination-link', '.noma-toast-close', ':focus-visible',
    '@media (prefers-reduced-motion:reduce)', '@media (forced-colors:active)',
  ];
  const normalizedCss = fixture.componentsCss.replaceAll(/\s+/g, '');
  for (const fragment of requiredCss) {
    if (!normalizedCss.includes(fragment.replaceAll(/\s+/g, ''))) failures.push(failure('COMPONENT_CSS', fragment));
  }
  if (/#[0-9a-f]{3,8}\b/i.test(fixture.componentsCss)) failures.push(failure('RAW_COMPONENT_COLOR', 'components.css contains raw colour authority'));
  if (!fixture.componentTokens.includes("'component.button.primary.background': 'color.action.primary.background'")) failures.push(failure('COMPONENT_TOKEN_ALIAS', 'component colour aliases must use semantic tokens'));

  if (!fixture.webLayout.includes("import '@noma/ui/components.css';")) failures.push(failure('WEB_COMPONENT_CSS', 'Web root must import generated component CSS once'));
  if (!fixture.webPage.includes("from '@noma/ui'")) failures.push(failure('PRODUCTION_CONSUMER', 'Web must consume a server-compatible primitive from the package root'));
  for (const fragment of ['--noma-component-control-target:', '.noma-dialog-popup']) {
    if (!fixture.productionVerifier.includes(fragment)) failures.push(failure('PRODUCTION_CSS_PROOF', fragment));
  }

  for (const name of INVENTORY.filter((entry) => !['Field', 'Radio', 'TableCaption', 'TableHead', 'TableBody', 'TableRow', 'TableHeaderCell', 'TableCell', 'useToast'].includes(entry))) {
    if (!fixture.componentTest.includes(name)) failures.push(failure('COMPONENT_TEST_COVERAGE', name));
  }
  for (const fragment of ['axe.run', "'color-contrast': { enabled: false }"]) {
    if (!fixture.axeHelper.includes(fragment)) failures.push(failure('AXE_CONTRACT', fragment));
  }
  for (const fragment of ['{ArrowRight}', '{ArrowDown}', '{Escape}', 'toHaveFocus', 'aria-invalid', 'aria-current']) {
    if (!fixture.componentTest.includes(fragment)) failures.push(failure('INTERACTION_TEST', fragment));
  }
  return failures;
}

function expectRejected(name, mutate, code, baseline) {
  const fixture = clone(baseline);
  mutate(fixture);
  const failures = validateUiComponents(fixture);
  if (!failures.some((entry) => entry.startsWith(`${code}:`))) {
    throw new Error(`${name}: expected ${code}; received ${failures.join(' | ') || 'no failure'}`);
  }
}

async function runSelfTests(baseline) {
  const cases = [
    ['floating Base UI', (f) => { f.uiPackage.dependencies['@base-ui/react'] = '^1.7.0'; }, 'BASE_UI_PIN'],
    ['stale axe', (f) => { f.rootPackage.devDependencies['axe-core'] = '4.12.1'; }, 'AXE_PIN'],
    ['React peer drift', (f) => { f.uiPackage.peerDependencies.react = '^19'; }, 'REACT_PEER'],
    ['CSS-in-JS dependency', (f) => { f.uiPackage.dependencies['styled-components'] = '6.0.0'; }, 'UI_DEPENDENCY_SCOPE'],
    ['missing component export', (f) => { delete f.uiPackage.exports['./components.css']; }, 'PACKAGE_EXPORT'],
    ['root client boundary', (f) => { f.uiIndex = `'use client';\n${f.uiIndex}`; }, 'RSC_BOUNDARY'],
    ['missing client boundary', (f) => { f.interactiveSource = f.interactiveSource.replace("'use client';", ''); }, 'CLIENT_BOUNDARY'],
    ['Base UI public leak', (f) => { f.declarations += "\nexport type Leak = import('@base-ui/react').Button;"; }, 'PUBLIC_TYPE_LEAK'],
    ['Base UI application import', (f) => { f.sourceFiles.push({ path: 'apps/web/src/bad.ts', contents: "import '@base-ui/react/button';" }); }, 'BASE_UI_BOUNDARY'],
    ['raw HTML shortcut', (f) => { f.sourceFiles.push({ path: 'packages/ui/src/bad.tsx', contents: 'export const Bad = () => <div dangerouslySetInnerHTML={{__html: "bad"}} />;' }); }, 'COMPONENT_SECURITY'],
    ['unsafe URL guard removed', (f) => { f.staticSource = f.staticSource.replace('Link does not accept executable URL schemes', 'unguarded'); }, 'UNSAFE_URL'],
    ['undersized target', (f) => { f.componentsCss = f.componentsCss.replace('var(--noma-size-target-default)', '32px'); }, 'COMPONENT_CSS'],
    ['raw component colour', (f) => { f.componentsCss += '\n.bad{color:#123456}'; }, 'RAW_COMPONENT_COLOR'],
    ['missing axe limitation', (f) => { f.axeHelper = f.axeHelper.replace("'color-contrast': { enabled: false }", ''); }, 'AXE_CONTRACT'],
    ['missing keyboard test', (f) => { f.componentTest = f.componentTest.replaceAll('{Escape}', 'Escape'); }, 'INTERACTION_TEST'],
  ];
  for (const [name, mutate, code] of cases) expectRejected(name, mutate, code, baseline);
  console.log(`PASS: ${cases.length} UI component policy negative fixtures were rejected`);
}

const fixture = await loadFixture();
const failures = validateUiComponents(fixture);
if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`PASS: ${INVENTORY.length} Noma primitives satisfy UI-002 dependency, boundary, CSS, and accessibility policy`);
if (process.argv.includes('--self-test')) await runSelfTests(fixture);
