import { readFile, readdir } from 'node:fs/promises';
import { extname, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(import.meta.dirname, '..');
const UI_DIST = resolve(ROOT, 'packages/ui/dist');
const tokens = await import(pathToFileURL(resolve(UI_DIST, 'tokens.js')).href);
const { contrastRatio } = await import(pathToFileURL(resolve(UI_DIST, 'contrast.js')).href);

const LOCKED_BREAKPOINTS = Object.freeze({
  'bp.xs': '0px',
  'bp.sm': '480px',
  'bp.md': '768px',
  'bp.lg': '1024px',
  'bp.xl': '1280px',
  'bp.2xl': '1440px',
});

const LOCKED_DENSITY = Object.freeze({
  'density.comfortable.control.paddingY': '12px',
  'density.comfortable.card.padding': '24px',
  'density.comfortable.section.gap': '32px',
  'density.comfortable.row.height': '56px',
  'density.comfortable.metadata.gap': '12px',
  'density.compact.control.paddingY': '8px',
  'density.compact.card.padding': '16px',
  'density.compact.section.gap': '20px',
  'density.compact.row.height': '44px',
  'density.compact.metadata.gap': '8px',
  'density.action.control.paddingY': '16px',
  'density.action.card.padding': '24px',
  'density.action.section.gap': '24px',
  'density.action.row.height': '64px',
  'density.action.metadata.gap': '12px',
});

const TEXT_CONTRAST_PAIRS = Object.freeze([
  ['color.text.primary', 'color.surface.primary'],
  ['color.text.secondary', 'color.surface.primary'],
  ['color.text.muted', 'color.surface.primary'],
  ['color.text.link', 'color.surface.primary'],
]);
const STATUS_PARTS = Object.freeze(['foreground', 'accent', 'background', 'border']);
const SOURCE_EXTENSIONS = new Set(['.css', '.js', '.jsx', '.mjs', '.ts', '.tsx']);
const PROHIBITED_COMPONENTS = Object.freeze([
  'Button', 'Input', 'Select', 'Checkbox', 'Radio', 'Dialog', 'Drawer', 'Tabs', 'Menu',
  'Table', 'Pagination', 'Toast', 'FormField', 'Badge', 'StatusChip', 'Card', 'ProductCard',
  'OfferCard',
]);

function failure(code, message) {
  return `${code}: ${message}`;
}

function resolveValue(name, registry, failures) {
  try {
    return tokens.resolveTokenValue(name, registry);
  } catch (error) {
    failures.push(failure('UNKNOWN_ALIAS', error instanceof Error ? error.message : String(error)));
    return undefined;
  }
}

function parseCssDeclarations(css) {
  const declarations = new Map();
  const names = [];
  for (const match of css.matchAll(/(--[A-Za-z0-9_-]+)\s*:\s*([^;]+);/g)) {
    const name = match[1];
    const value = match[2]?.trim();
    if (!name || value === undefined) continue;
    names.push(name);
    if (!declarations.has(name)) declarations.set(name, value);
  }
  return { declarations, names };
}

function containsDarkModeSurface(text) {
  return /(?:\.dark\b|\[data-theme=["']?dark|prefers-color-scheme\s*:\s*dark|NEXT_PUBLIC_THEME|theme\s*toggle)/i.test(text);
}

function clone(value) {
  return structuredClone(value);
}

async function collectSourceFiles() {
  const files = [];
  const roots = [resolve(ROOT, 'apps'), resolve(ROOT, 'packages/ui/src')];
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (['dist', '.next', 'node_modules', 'tests'].includes(entry.name)) continue;
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(path);
        continue;
      }
      if (!SOURCE_EXTENSIONS.has(extname(entry.name))) continue;
      const displayPath = relative(ROOT, path).replaceAll('\\', '/');
      if (displayPath === 'packages/ui/src/tokens.ts') continue;
      files.push({ path: displayPath, contents: await readFile(path, 'utf8') });
    }
  }
  for (const root of roots) await walk(root);
  return files;
}

async function loadDefaultFixture() {
  return {
    registry: {
      core: clone(tokens.coreTokenValues),
      aliases: clone(tokens.semanticTokenAliases),
    },
    requiredSemanticNames: [...tokens.requiredSemanticTokenNames],
    statusTones: [...tokens.statusTones],
    densityModes: [...tokens.densityModes],
    tokensCss: await readFile(resolve(UI_DIST, 'tokens.css'), 'utf8'),
    foundationsCss: await readFile(resolve(UI_DIST, 'foundations.css'), 'utf8'),
    packageJson: JSON.parse(await readFile(resolve(ROOT, 'package.json'), 'utf8')),
    workspaceConfig: await readFile(resolve(ROOT, 'pnpm-workspace.yaml'), 'utf8'),
    uiPackageJson: JSON.parse(await readFile(resolve(ROOT, 'packages/ui/package.json'), 'utf8')),
    webPackageJson: JSON.parse(await readFile(resolve(ROOT, 'apps/web/package.json'), 'utf8')),
    sourceFiles: await collectSourceFiles(),
  };
}

export function validateUiTokens(fixture) {
  const failures = [];
  const { registry } = fixture;
  const allNames = new Set([...Object.keys(registry.core), ...Object.keys(registry.aliases)]);

  for (const [name, target] of Object.entries(registry.aliases)) {
    if (!allNames.has(target)) failures.push(failure('UNKNOWN_ALIAS', `${name} references ${target}`));
    resolveValue(name, registry, failures);
  }

  for (const name of fixture.requiredSemanticNames) {
    if (!(name in registry.aliases)) failures.push(failure('MISSING_SEMANTIC', name));
  }

  for (const tone of fixture.statusTones) {
    for (const part of STATUS_PARTS) {
      const name = `color.status.${tone}.${part}`;
      if (!(name in registry.aliases)) failures.push(failure('STATUS_FAMILY_INCOMPLETE', name));
    }
  }

  const functionalColors = new Set(
    Object.entries(registry.core)
      .filter(([name, value]) => name.startsWith('color.functional.') && /^#[0-9a-f]{6}$/i.test(value))
      .map(([, value]) => value.toUpperCase()),
  );
  for (const source of fixture.sourceFiles) {
    const upper = source.contents.toUpperCase();
    const directFunctional = [...functionalColors].find((color) => upper.includes(color));
    if (directFunctional) {
      failures.push(failure('RAW_FUNCTIONAL_COLOR', `${source.path} contains ${directFunctional}`));
      if (source.path.startsWith('apps/web/') || source.path.includes('/feature')) {
        failures.push(failure('DIRECT_STATUS_COLOR', `${source.path} bypasses semantic status tokens`));
      }
    }
    if (/#[0-9A-F]{6}/i.test(source.contents) && (source.path.endsWith('.css') || source.path.startsWith('apps/web/'))) {
      failures.push(failure('ARBITRARY_STATUS_COLOR', `${source.path} contains a raw six-digit colour`));
    }
    if (containsDarkModeSurface(source.contents)) failures.push(failure('DARK_MODE', source.path));

    if (source.path.startsWith('packages/ui/src/')) {
      if (/from\s+['"](?:node:|@noma\/(?:database|platform|integrations|security|observability\/server))/.test(source.contents)) {
        failures.push(failure('BROWSER_BOUNDARY', `${source.path} imports a server-only module`));
      }
      const componentName = PROHIBITED_COMPONENTS.find((name) =>
        new RegExp(`(?:export\\s+(?:class|function|const|type|interface)\\s+${name}\\b|/${name.toLowerCase()}\\.)`, 'i')
          .test(`${source.contents}\n/${source.path}`),
      );
      if (componentName) failures.push(failure('COMPONENT_SCOPE', `${source.path} implements ${componentName}`));
    }
  }

  for (const [foreground, background] of TEXT_CONTRAST_PAIRS) {
    const foregroundValue = resolveValue(foreground, registry, failures);
    const backgroundValue = resolveValue(background, registry, failures);
    if (foregroundValue && backgroundValue && contrastRatio(foregroundValue, backgroundValue) < 4.5) {
      failures.push(failure('TEXT_CONTRAST', `${foreground} on ${background}`));
    }
  }

  for (const tone of fixture.statusTones) {
    const foreground = resolveValue(`color.status.${tone}.foreground`, registry, failures);
    const background = resolveValue(`color.status.${tone}.background`, registry, failures);
    if (foreground && background && contrastRatio(foreground, background) < 4.5) {
      failures.push(failure('STATUS_CONTRAST', tone));
    }
  }

  const focus = resolveValue('focus.ring.color', registry, failures);
  for (const surface of ['page', 'primary', 'secondary', 'selected']) {
    const background = resolveValue(`color.surface.${surface}`, registry, failures);
    if (focus && background && contrastRatio(focus, background) < 3) {
      failures.push(failure('FOCUS_CONTRAST', `focus.ring.color on color.surface.${surface}`));
    }
  }

  const defaultTarget = Number.parseFloat(registry.core['size.target.default']);
  const actionTarget = Number.parseFloat(registry.core['size.target.action']);
  if (!Number.isFinite(defaultTarget) || defaultTarget < 44 || !Number.isFinite(actionTarget) || actionTarget < 48) {
    failures.push(failure('TARGET_MINIMUM', 'default must be >=44px and action must be >=48px'));
  }

  const allowedDensityModes = new Set(fixture.densityModes);
  for (const name of Object.keys(registry.core).filter((name) => name.startsWith('density.'))) {
    const mode = name.split('.')[1];
    if (!mode || !allowedDensityModes.has(mode)) failures.push(failure('UNKNOWN_DENSITY', name));
  }
  for (const [name, value] of Object.entries(LOCKED_DENSITY)) {
    if (registry.core[name] !== value) failures.push(failure('DENSITY_CONTRACT', `${name} must equal ${value}`));
  }

  for (const [name, value] of Object.entries(LOCKED_BREAKPOINTS)) {
    if (registry.core[name] !== value) failures.push(failure('BREAKPOINT_CONTRACT', `${name} must equal ${value}`));
  }

  const parsedTokens = parseCssDeclarations(fixture.tokensCss);
  const expectedDeclarations = tokens.createCssTokenDeclarations(registry);
  for (const name of parsedTokens.names) {
    if (!name.startsWith('--noma-')) failures.push(failure('CSS_PREFIX', name));
  }
  for (const [name, value] of Object.entries(expectedDeclarations)) {
    if (parsedTokens.declarations.get(name) !== value) failures.push(failure('CSS_PARITY', `${name} differs or is missing`));
  }
  for (const name of parsedTokens.declarations.keys()) {
    if (!(name in expectedDeclarations)) failures.push(failure('CSS_PARITY', `${name} is unapproved`));
  }

  if (containsDarkModeSurface(fixture.tokensCss) || containsDarkModeSurface(fixture.foundationsCss)) {
    failures.push(failure('DARK_MODE', 'generated stylesheet exposes a dark theme'));
  }
  if (!/@media\s*\(prefers-reduced-motion:\s*reduce\)/.test(fixture.foundationsCss)
      || !fixture.foundationsCss.includes('--noma-motion-duration-page: 0ms;')) {
    failures.push(failure('REDUCED_MOTION', 'foundation override is missing'));
  }
  if (!/@media\s*\(forced-colors:\s*active\)/.test(fixture.foundationsCss)
      || !fixture.foundationsCss.includes('--noma-focus-ring-color: Highlight;')
      || /forced-color-adjust\s*:\s*none/.test(fixture.foundationsCss)) {
    failures.push(failure('FORCED_COLORS', 'narrow system-colour focus support is required'));
  }

  for (const [name, target] of Object.entries(registry.aliases)) {
    if (name.startsWith('color.status.success.') && !target.startsWith('color.functional.success.')) {
      failures.push(failure('BRAND_SUCCESS', `${name} must use functional success identity`));
    }
  }

  const dependencyNames = new Set([
    ...Object.keys(fixture.packageJson.dependencies ?? {}),
    ...Object.keys(fixture.packageJson.devDependencies ?? {}),
    ...Object.keys(fixture.uiPackageJson.dependencies ?? {}),
    ...Object.keys(fixture.uiPackageJson.devDependencies ?? {}),
    ...Object.keys(fixture.webPackageJson.dependencies ?? {}),
    ...Object.keys(fixture.webPackageJson.devDependencies ?? {}),
  ]);
  if ([...dependencyNames].some((name) => name === 'tailwindcss' || name.startsWith('@tailwindcss/'))
      || /(?:^|\n)\s*(?:tailwindcss|@tailwindcss\/)/m.test(fixture.workspaceConfig)) {
    failures.push(failure('TAILWIND_DEPENDENCY', 'UI-001 must remain styling-framework neutral'));
  }

  const requiredExports = ['.', './tokens', './tokens.css', './foundations.css'];
  for (const name of requiredExports) {
    if (!(name in (fixture.uiPackageJson.exports ?? {}))) failures.push(failure('PACKAGE_EXPORT', name));
  }
  if (JSON.stringify(fixture.uiPackageJson.sideEffects) !== JSON.stringify(['./dist/*.css'])) {
    failures.push(failure('PACKAGE_EXPORT', 'only generated CSS may be marked as a side effect'));
  }
  const webLayout = fixture.sourceFiles.find((source) => source.path === 'apps/web/src/app/layout.tsx');
  if (!webLayout?.contents.includes("import '@noma/ui/foundations.css';")) {
    failures.push(failure('FOUNDATION_IMPORT', 'Web root layout must import the package foundation stylesheet'));
  }
  if (!fixture.webPackageJson.scripts?.build?.includes('verify-ui-token-build.mjs')) {
    failures.push(failure('FOUNDATION_IMPORT', 'Web production build must verify emitted token CSS'));
  }

  return failures;
}

function expectRejected(name, mutate, expectedCode, baseline) {
  const fixture = clone(baseline);
  mutate(fixture);
  const failures = validateUiTokens(fixture);
  if (!failures.some((entry) => entry.startsWith(`${expectedCode}:`))) {
    throw new Error(`${name}: expected ${expectedCode}, received ${failures.join(' | ') || 'no failure'}`);
  }
}

async function runSelfTests(baseline) {
  const cases = [
    ['unknown semantic reference', (f) => { f.registry.aliases['color.text.primary'] = 'color.missing.900'; }, 'UNKNOWN_ALIAS'],
    ['missing required semantic alias', (f) => { delete f.registry.aliases['color.text.primary']; }, 'MISSING_SEMANTIC'],
    ['incomplete status family', (f) => { delete f.registry.aliases['color.status.warning.background']; }, 'STATUS_FAMILY_INCOMPLETE'],
    ['functional colour outside core', (f) => { f.sourceFiles.push({ path: 'packages/feature/src/state.ts', contents: "export const failed = '#B91C1C';" }); }, 'RAW_FUNCTIONAL_COLOR'],
    ['direct Web status colour', (f) => { f.sourceFiles.push({ path: 'apps/web/src/app/feature.css', contents: '.failed { color: #B91C1C; }' }); }, 'DIRECT_STATUS_COLOR'],
    ['text contrast regression', (f) => { f.registry.aliases['color.text.primary'] = 'color.neutral.400'; }, 'TEXT_CONTRAST'],
    ['status contrast regression', (f) => { f.registry.aliases['color.status.info.foreground'] = 'color.functional.info.border'; }, 'STATUS_CONTRAST'],
    ['focus contrast regression', (f) => { f.registry.aliases['focus.ring.color'] = 'color.neutral.100'; }, 'FOCUS_CONTRAST'],
    ['undersized target', (f) => { f.registry.core['size.target.default'] = '32px'; }, 'TARGET_MINIMUM'],
    ['unknown density mode', (f) => { f.registry.core['density.nano.row.height'] = '32px'; }, 'UNKNOWN_DENSITY'],
    ['breakpoint drift', (f) => { f.registry.core['bp.md'] = '800px'; }, 'BREAKPOINT_CONTRACT'],
    ['unprefixed CSS variable', (f) => { f.tokensCss = f.tokensCss.replace(':root {', ':root {\n  --danger: red;'); }, 'CSS_PREFIX'],
    ['CSS registry drift', (f) => { f.tokensCss = f.tokensCss.replace('--noma-space-4: 16px;', '--noma-space-4: 18px;'); }, 'CSS_PARITY'],
    ['partial dark mode', (f) => { f.foundationsCss += '\n.dark { color-scheme: dark; }\n'; }, 'DARK_MODE'],
    ['missing reduced motion', (f) => { f.foundationsCss = f.foundationsCss.replace('@media (prefers-reduced-motion: reduce)', '@media (width > 0px)'); }, 'REDUCED_MOTION'],
    ['missing forced colours', (f) => { f.foundationsCss = f.foundationsCss.replace('@media (forced-colors: active)', '@media (width > 0px)'); }, 'FORCED_COLORS'],
    ['brand used as success truth', (f) => { f.registry.aliases['color.status.success.foreground'] = 'color.brand.700'; }, 'BRAND_SUCCESS'],
    ['Tailwind dependency', (f) => { f.packageJson.devDependencies.tailwindcss = '4.0.0'; }, 'TAILWIND_DEPENDENCY'],
    ['component work enters UI-001', (f) => { f.sourceFiles.push({ path: 'packages/ui/src/button.ts', contents: 'export function Button() {}' }); }, 'COMPONENT_SCOPE'],
    ['arbitrary Web colour', (f) => { f.sourceFiles.push({ path: 'apps/web/src/app/feature.css', contents: '.pending { color: #123456; }' }); }, 'ARBITRARY_STATUS_COLOR'],
  ];
  for (const [name, mutate, code] of cases) expectRejected(name, mutate, code, baseline);
  console.log(`PASS: ${cases.length} UI token policy negative fixtures were rejected`);
}

const fixture = await loadDefaultFixture();
const failures = validateUiTokens(fixture);
if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`PASS: ${Object.keys(fixture.registry.core).length} core values and ${Object.keys(fixture.registry.aliases).length} semantic aliases satisfy UI-001 policy`);
if (process.argv.includes('--self-test')) await runSelfTests(fixture);
