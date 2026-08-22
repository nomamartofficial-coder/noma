import { readFile, readdir } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const EXPECTED_ROUTES = Object.freeze([
  '/', '/account', '/account/cases', '/account/messages', '/account/notifications',
  '/account/orders', '/account/profile', '/account/refunds', '/account/reviews',
  '/account/verification/covenant', '/cart', '/categories', '/search',
]);
const ALLOWED_CLIENT_FILES = new Set([
  'apps/web/src/app/(buyer)/account/error.tsx',
  'apps/web/src/shells/active-navigation.tsx',
  'apps/web/src/shells/compact-account-navigation.tsx',
  'apps/web/src/shells/protected/compact-shell-navigation.tsx',
  'apps/web/src/shells/surface-switcher.tsx',
]);

const read = (path) => readFile(resolve(ROOT, path), 'utf8');
const json = async (path) => JSON.parse(await read(path));
const failure = (code, detail) => `${code}: ${detail}`;

async function sourceFiles(directory) {
  const files = [];
  async function walk(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = resolve(current, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (/\.(?:ts|tsx|css)$/.test(entry.name)) {
        files.push({ path: relative(ROOT, path).replaceAll('\\', '/'), contents: await readFile(path, 'utf8') });
      }
    }
  }
  await walk(resolve(ROOT, directory));
  return files;
}

function routeFromPage(path) {
  const relativePath = path.replace('apps/web/src/app/', '').replace(/\/page\.tsx$/, '');
  const segments = relativePath.split('/').filter((segment) => !/^\(.+\)$/.test(segment));
  return segments.length === 0 ? '/' : `/${segments.join('/')}`;
}

async function loadFixture() {
  const sources = await sourceFiles('apps/web/src');
  return {
    rootPackage: await json('package.json'),
    webPackage: await json('apps/web/package.json'),
    rootLayout: await read('apps/web/src/app/layout.tsx'),
    marketplaceLayout: await read('apps/web/src/app/(marketplace)/layout.tsx'),
    accountLayout: await read('apps/web/src/app/(buyer)/account/layout.tsx'),
    navigation: await read('apps/web/src/shells/navigation.ts'),
    search: await read('apps/web/src/shells/marketplace-search.tsx'),
    errorSource: await read('apps/web/src/app/(buyer)/account/error.tsx'),
    loadingSource: await read('apps/web/src/app/(buyer)/account/loading.tsx'),
    styles: await read('apps/web/src/shells/shells.module.css'),
    unitTest: await read('apps/web/tests/shells.test.ts'),
    componentTest: await read('tests/component/ui-shells.component.test.tsx'),
    shellsDoc: await read('SHELLS.md'),
    adr: await read('docs/adr/0014-marketplace-buyer-shells.md'),
    ciCatalog: await read('scripts/ci-command-catalog.mjs'),
    sources,
    pagePaths: sources.filter((entry) => entry.path.endsWith('/page.tsx')).map((entry) => entry.path),
    apiRoutes: sources.filter((entry) => /apps\/web\/src\/app\/api\/.*\/route\.ts$/.test(entry.path)).map((entry) => entry.path),
  };
}

export function validateUiShells(fixture) {
  const failures = [];
  const scripts = fixture.rootPackage.scripts ?? {};
  const routes = fixture.pagePaths.map(routeFromPage).sort();
  const consumerRoutes = routes.filter((route) => !/^\/(?:seller|rider|operations|admin)(?:\/|$)/.test(route));
  const routeSet = new Set(routes);

  for (const dependency of ['tailwindcss', '@radix-ui/react-navigation-menu', 'playwright', '@playwright/test', 'storybook', 'lucide-react']) {
    if (fixture.webPackage.dependencies?.[dependency] || fixture.webPackage.devDependencies?.[dependency] || fixture.rootPackage.dependencies?.[dependency] || fixture.rootPackage.devDependencies?.[dependency]) {
      failures.push(failure('DEPENDENCY_SCOPE', dependency));
    }
  }

  if (fixture.rootLayout.includes('ConsumerHeader') || fixture.rootLayout.includes('<main')) failures.push(failure('ROOT_LAYOUT', 'root layout owns a consumer shell'));
  for (const [name, source] of [['marketplace', fixture.marketplaceLayout], ['buyer', fixture.accountLayout]]) {
    if (!source.includes('<main') || !source.includes('id="main-content"') || !source.includes('Skip to main content')) failures.push(failure('LAYOUT_MAIN', name));
  }
  if (!fixture.marketplaceLayout.includes('PublicFooter') || !fixture.marketplaceLayout.includes('Primary mobile')) failures.push(failure('MARKETPLACE_SHELL', 'required composition missing'));
  if (!fixture.accountLayout.includes('Account sections') || !fixture.accountLayout.includes('CompactAccountNavigation')) failures.push(failure('ACCOUNT_SHELL', 'required composition missing'));

  if (consumerRoutes.join('|') !== [...EXPECTED_ROUTES].sort().join('|') || new Set(routes).size !== routes.length) failures.push(failure('ROUTE_MANIFEST', routes.join(', ')));
  if (fixture.pagePaths.some((path) => /\/health\//.test(path))) failures.push(failure('HEALTH_LAYOUT', 'health route became a page'));
  if (fixture.apiRoutes.length > 0) failures.push(failure('BUSINESS_API', fixture.apiRoutes.join(', ')));

  const mobileBlock = fixture.navigation.match(/export const mobileDestinations[\s\S]*?export const accountDestinations/)?.[0] ?? '';
  const accountBlock = fixture.navigation.match(/export const accountDestinations[\s\S]*?export function isDestinationCurrent/)?.[0] ?? '';
  const requiredMobile = [
    ["label: 'Home'", "href: '/'"], ["label: 'Categories'", "href: '/categories'"],
    ["label: 'Search'", "href: '/search'"], ["label: 'Orders'", "href: '/account/orders'"],
    ["label: 'Cart'", "href: '/cart'"],
  ];
  if ((mobileBlock.match(/\{ id:/g) ?? []).length !== 5) failures.push(failure('MOBILE_NAV', 'requires exactly five destinations'));
  for (const pair of requiredMobile) if (!pair.every((fragment) => mobileBlock.includes(fragment))) failures.push(failure('MOBILE_NAV', pair.join(' + ')));
  for (const label of ['Overview', 'Orders', 'Messages', 'Returns & Cases', 'Refunds', 'Reviews', 'Verification', 'Notifications', 'Profile & Security']) {
    if (!accountBlock.includes(`label: '${label}'`)) failures.push(failure('ACCOUNT_NAV', label));
  }
  for (const fragment of ["'/account/returns'", "'/account/security'", "'/account/verification'"]) if (!accountBlock.includes(fragment)) failures.push(failure('ACTIVE_PATH', fragment));

  const stringTargets = [];
  for (const source of fixture.sources) {
    for (const match of source.contents.matchAll(/(?:href=|action=)"([^"#]+)"|href:\s*'([^']+)'/g)) stringTargets.push({ path: source.path, href: match[1] ?? match[2] });
  }
  for (const { path, href } of stringTargets) {
    if (href.includes('(')) failures.push(failure('ROUTE_GROUP_LEAK', `${path}: ${href}`));
    if (href.startsWith('/') && !routeSet.has(href) && !href.startsWith('/health/')) failures.push(failure('BROKEN_LINK', `${path}: ${href}`));
  }

  for (const fragment of ['action="/search"', 'method="get"', 'name="q"', 'type="search"', '>Search</button>']) {
    if (!fixture.search.includes(fragment)) failures.push(failure('SEARCH_CONTRACT', fragment));
  }
  for (const fragment of ["'shop' | 'account' | 'seller' | 'rider' | 'operations' | 'admin'", "id: 'shop'", "id: 'account'"]) {
    if (!fixture.navigation.includes(fragment)) failures.push(failure('SURFACE_CONTRACT', fragment));
  }
  const productionBlock = fixture.navigation.match(/productionSurfaceDestinations[\s\S]*?mobileDestinations/)?.[0] ?? '';
  if (/id:\s*'(?:seller|rider|operations|admin)'/.test(productionBlock)) failures.push(failure('SURFACE_DEFAULT', 'privileged or unproven membership in production'));

  const clientFiles = fixture.sources.filter((source) => /^['"]use client['"];?/m.test(source.contents));
  for (const source of clientFiles) if (!ALLOWED_CLIENT_FILES.has(source.path)) failures.push(failure('CLIENT_BOUNDARY', source.path));
  for (const allowed of ALLOWED_CLIENT_FILES) if (!clientFiles.some((source) => source.path === allowed)) failures.push(failure('CLIENT_BOUNDARY', `missing narrow leaf ${allowed}`));

  for (const source of fixture.sources) {
    if (/(?:@noma\/(?:database|platform|integrations)|@prisma|\.prisma\/|apps\/(?:api|worker))/.test(source.contents)) failures.push(failure('FORBIDDEN_IMPORT', source.path));
    if (source.contents.includes('@base-ui/react')) failures.push(failure('BASE_UI_IMPORT', source.path));
    if (/localStorage[\s\S]{0,100}(?:role|membership)|\b(?:isAdmin|isSeller|isAuthorized)\b/.test(source.contents)) failures.push(failure('CLIENT_AUTHORITY', source.path));
    if (/Cart\s+[1-9]|Notifications\s+[1-9]|Orders\s+[1-9]|const\s+user\s*=|const\s+(?:products|orders|refunds)\s*=\s*\[/.test(source.contents)) failures.push(failure('FAKE_DATA', source.path));
  }

  const cssSources = fixture.sources.filter((source) => source.path.endsWith('.css'));
  for (const source of cssSources) if (/#[0-9a-f]{3,8}\b|\brgb\s*\(/i.test(source.contents)) failures.push(failure('RAW_COLOR', source.path));
  for (const fragment of ['@media (min-width: 768px)', '@media (min-width: 1024px)', 'safe-area-inset-bottom', '@media (forced-colors: active)', '@media (prefers-reduced-motion: reduce)', 'min-width: 320px']) {
    if (!(fixture.styles + fixture.sources.find((source) => source.path.endsWith('globals.css'))?.contents).includes(fragment)) failures.push(failure('RESPONSIVE_POLICY', fragment));
  }

  if (/\.message|\.stack|error\.digest/.test(fixture.errorSource)) failures.push(failure('ERROR_DISCLOSURE', 'raw error detail'));
  for (const fragment of ['reset', 'Try again', 'Back to account overview']) if (!fixture.errorSource.includes(fragment)) failures.push(failure('ERROR_RECOVERY', fragment));
  for (const fragment of ['Loading your account…', 'aria-hidden="true"', 'aria-live="polite"']) if (!fixture.loadingSource.includes(fragment)) failures.push(failure('LOADING_STATE', fragment));

  for (const name of ['ui:shells:validate', 'ui:shells:self-test', 'ui:shells:test', 'ui:shells:verify']) if (!scripts[name]) failures.push(failure('COMMAND_CONTRACT', name));
  for (const script of ['ui:validate', 'ui:self-test', 'ui:test']) if (!String(scripts[script]).includes('ui-shells')) failures.push(failure('COMMAND_GRAPH', script));
  if (!fixture.ciCatalog.includes("['ui:validate']") || !fixture.ciCatalog.includes("['ui:self-test']")) failures.push(failure('CI_GRAPH', 'quality/windows UI aggregate'));

  for (const fragment of ['GET search', 'Home, Categories, Search, Orders, and Cart', 'navigation presence is not authorization', 'Server Components', 'UI-005']) {
    if (!fixture.shellsDoc.toLowerCase().includes(fragment.toLowerCase())) failures.push(failure('DOCUMENTATION', fragment));
  }
  for (const fragment of ['ADR-0014', 'route groups', 'apps/web', 'presentation', 'Issue: `#38`']) if (!fixture.adr.toLowerCase().includes(fragment.toLowerCase())) failures.push(failure('ADR', fragment));
  for (const fragment of ['expectNoAxeViolations', 'Loading your account…', 'Available surfaces', 'Profile & Security', 'Try again']) if (!fixture.componentTest.includes(fragment)) failures.push(failure('COMPONENT_TEST', fragment));
  for (const fragment of ['collision-free', '/account/returns/NM-RETURN', 'productionSurfaceDestinations']) if (!fixture.unitTest.includes(fragment)) failures.push(failure('UNIT_TEST', fragment));

  return failures;
}

function clone(value) { return structuredClone(value); }
function expectRejected(name, mutate, code, baseline) {
  const fixture = clone(baseline);
  mutate(fixture);
  const failures = validateUiShells(fixture);
  if (!failures.some((entry) => entry.startsWith(`${code}:`))) throw new Error(`${name}: expected ${code}; received ${failures.join(' | ') || 'no failure'}`);
}

async function runSelfTests(baseline) {
  const cases = [
    ['Prisma import', (f) => { f.sources.push({ path: 'apps/web/src/shells/bad.ts', contents: "import '@prisma/client';" }); }, 'FORBIDDEN_IMPORT'],
    ['broad client page', (f) => { f.sources.push({ path: 'apps/web/src/app/(marketplace)/bad.tsx', contents: "'use client';" }); }, 'CLIENT_BOUNDARY'],
    ['route group href', (f) => { f.sources.push({ path: 'apps/web/src/shells/bad.tsx', contents: '<a href="/(marketplace)">Bad</a>' }); }, 'ROUTE_GROUP_LEAK'],
    ['local storage role', (f) => { f.sources.push({ path: 'apps/web/src/shells/bad.ts', contents: "localStorage.setItem('role', 'buyer');" }); }, 'CLIENT_AUTHORITY'],
    ['consumer route collision', (f) => { f.pagePaths.push('apps/web/src/app/(marketplace)/account/page.tsx'); }, 'ROUTE_MANIFEST'],
    ['fake cart count', (f) => { f.sources.push({ path: 'apps/web/src/shells/bad.tsx', contents: '<span>Cart 3</span>' }); }, 'FAKE_DATA'],
    ['fake user', (f) => { f.sources.push({ path: 'apps/web/src/shells/bad.ts', contents: "const user = { name: 'Synthetic' };" }); }, 'FAKE_DATA'],
    ['fake products', (f) => { f.sources.push({ path: 'apps/web/src/shells/bad.ts', contents: 'const products = [{ id: 1 }];' }); }, 'FAKE_DATA'],
    ['raw colour', (f) => { f.styles += '\n.bad { color: #123456; }'; f.sources.push({ path: 'apps/web/src/shells/bad.css', contents: f.styles }); }, 'RAW_COLOR'],
    ['extra mobile item', (f) => { f.navigation = f.navigation.replace(/\] as const satisfies readonly ShellDestination\[\]\);\r?\n\r?\nexport const accountDestinations/, "  { id: 'account', label: 'Account', href: '/account' },\n] as const satisfies readonly ShellDestination[]);\n\nexport const accountDestinations"); }, 'MOBILE_NAV'],
    ['missing mobile orders', (f) => { f.navigation = f.navigation.replace("label: 'Orders'", "label: 'Purchases'"); }, 'MOBILE_NAV'],
    ['broken internal link', (f) => { f.sources.push({ path: 'apps/web/src/shells/bad.tsx', contents: '<a href="/missing">Missing</a>' }); }, 'BROKEN_LINK'],
    ['root consumer shell', (f) => { f.rootLayout += '\n<ConsumerHeader />'; }, 'ROOT_LAYOUT'],
    ['raw error stack', (f) => { f.errorSource += '\nconsole.log(error.stack);'; }, 'ERROR_DISCLOSURE'],
    ['business route handler', (f) => { f.apiRoutes.push('apps/web/src/app/api/orders/route.ts'); }, 'BUSINESS_API'],
  ];
  for (const [name, mutate, code] of cases) expectRejected(name, mutate, code, baseline);
  console.log(`PASS: ${cases.length} UI-004 shell policy negative fixtures were rejected`);
}

const fixture = await loadFixture();
const failures = validateUiShells(fixture);
if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('PASS: UI-004 routes, shell boundaries, navigation, accessibility, and policy');
if (process.argv.includes('--self-test')) await runSelfTests(fixture);
