import { readFile, readdir } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const SURFACES = Object.freeze(['seller', 'rider', 'operations', 'admin']);
const EXPECTED_ROUTES = Object.freeze([
  '/seller', '/seller/orders', '/seller/listings', '/seller/inventory', '/seller/fulfilment', '/seller/messages', '/seller/cases', '/seller/earnings', '/seller/payouts', '/seller/performance', '/seller/settings',
  '/rider', '/rider/jobs', '/rider/history', '/rider/earnings', '/rider/shift', '/rider/profile',
  '/operations', '/operations/orders', '/operations/fulfilments', '/operations/dispatch', '/operations/support', '/operations/support/cases', '/operations/returns', '/operations/catalogue', '/operations/sellers', '/operations/verification', '/operations/finance', '/operations/trust-safety', '/operations/incidents', '/operations/reports',
  '/admin', '/admin/institutions', '/admin/commerce-types', '/admin/categories', '/admin/sellers', '/admin/access', '/admin/logistics', '/admin/finance', '/admin/notifications', '/admin/audit', '/admin/emergency-controls', '/admin/system',
]);

const read = (path) => readFile(resolve(ROOT, path), 'utf8');
const json = async (path) => JSON.parse(await read(path));
const fail = (code, detail) => `${code}: ${detail}`;

async function sourceFiles(directory) {
  const files = [];
  async function walk(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = resolve(current, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (/\.(?:ts|tsx|css)$/.test(entry.name)) files.push({ path: relative(ROOT, path).replaceAll('\\', '/'), contents: await readFile(path, 'utf8') });
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
  const sourceMap = new Map(sources.map((source) => [source.path, source.contents]));
  const layouts = Object.fromEntries(await Promise.all(SURFACES.map(async (surface) => [surface, await read(`apps/web/src/app/(${surface})/${surface}/layout.tsx`)])));
  const navigation = Object.fromEntries(await Promise.all(SURFACES.map(async (surface) => [surface, await read(`apps/web/src/shells/protected/${surface}/navigation.ts`)])));
  return {
    rootPackage: await json('package.json'),
    webPackage: await json('apps/web/package.json'),
    rootLayout: await read('apps/web/src/app/layout.tsx'),
    notFound: await read('apps/web/src/app/not-found.tsx'),
    access: await read('apps/web/src/shells/protected/protected-surface-access.server.ts'),
    protectedPlaceholder: await read('apps/web/src/shells/protected/protected-placeholder.tsx'),
    consumerNavigation: await read('apps/web/src/shells/navigation.ts'),
    compactNavigation: await read('apps/web/src/shells/protected/compact-shell-navigation.tsx'),
    layouts,
    navigation,
    sellerShell: await read('apps/web/src/shells/protected/seller/seller-shell.tsx'),
    riderShell: await read('apps/web/src/shells/protected/rider/rider-shell.tsx'),
    operationsShell: await read('apps/web/src/shells/protected/operations/operations-shell.tsx'),
    adminShell: await read('apps/web/src/shells/protected/admin/admin-shell.tsx'),
    styles: sources.filter((source) => source.path.includes('/protected/') && source.path.endsWith('.css')),
    sources,
    sourceMap,
    pagePaths: sources.filter((source) => source.path.endsWith('/page.tsx')).map((source) => source.path),
    unitTest: await read('apps/web/tests/role-shells.test.ts'),
    componentTest: await read('tests/component/ui-role-shells.component.test.tsx'),
    shellsDoc: await read('SHELLS.md'),
    adr: await read('docs/adr/0015-protected-role-surface-shells.md'),
    evidence: await read('docs/evidence/ui-005/README.md'),
    ciCatalog: await read('scripts/ci-command-catalog.mjs'),
  };
}

export function validateUiRoleShells(fixture) {
  const failures = [];
  const scripts = fixture.rootPackage.scripts ?? {};
  const protectedRoutes = fixture.pagePaths.map(routeFromPage).filter((route) => /^\/(?:seller|rider|operations|admin)(?:\/|$)/.test(route)).sort();
  const expectedRoutes = [...EXPECTED_ROUTES].sort();
  if (protectedRoutes.join('|') !== expectedRoutes.join('|') || new Set(protectedRoutes).size !== protectedRoutes.length) failures.push(fail('ROUTE_MANIFEST', protectedRoutes.join(', ')));
  if (fixture.pagePaths.some((path) => /\[[^/]+\]/.test(path))) failures.push(fail('DYNAMIC_ROUTE', 'UI-005 does not add business entity routes'));
  if (fixture.pagePaths.some((path) => /ui-005-review|synthetic-review/i.test(path))) failures.push(fail('REVIEW_ROUTE', 'temporary review route remains'));

  if (!fixture.access.includes("import { notFound } from 'next/navigation'") || !fixture.access.includes('Promise<never>') || !fixture.access.includes('notFound();')) failures.push(fail('FAIL_CLOSED', 'stable notFound boundary is incomplete'));
  if (/(?:cookies|headers|searchParams|process\.env|redirect|localStorage|usePathname|localhost|x-user-role|demo)/i.test(fixture.access)) failures.push(fail('AUTH_BYPASS', 'access boundary contains an untrusted allow input'));
  for (const surface of SURFACES) {
    const layout = fixture.layouts[surface];
    const firstStatement = layout.match(/export default async function[^\(]*\([\s\S]*?\)\s*\{\s*(await[^\n]+;)/)?.[1]?.trim();
    if (firstStatement !== `await requireProtectedSurfaceAccess('${surface}');`) failures.push(fail('LAYOUT_GUARD', `${surface}: ${firstStatement ?? 'missing'}`));
    if (!layout.includes("export const dynamic = 'force-dynamic';")) failures.push(fail('DYNAMIC_DENIAL', surface));
    if (!layout.includes(`data-noma-protected-shell`) && !layout.includes(`${surface[0].toUpperCase()}${surface.slice(1)}Shell`)) failures.push(fail('DISTINCT_SHELL', surface));
  }
  if (!fixture.protectedPlaceholder.includes('await requireProtectedSurfaceAccess(surface);') || !fixture.protectedPlaceholder.includes('defineProtectedSurfaceMetadata')) failures.push(fail('PAGE_BOUNDARY', 'page presentation or metadata can render before denial'));
  for (const path of fixture.pagePaths.filter((candidate) => /^apps\/web\/src\/app\/\((?:seller|rider|operations|admin)\)\//.test(candidate))) {
    const surface = path.match(/\((seller|rider|operations|admin)\)/)?.[1];
    const source = fixture.sourceMap.get(path) ?? '';
    if (!surface || !source.includes(`surface="${surface}"`) || !source.includes(`defineProtectedSurfaceMetadata('${surface}'`)) failures.push(fail('PAGE_BOUNDARY', path));
  }
  if (/(?:SellerShell|RiderShell|OperationsShell|AdminShell|requireProtectedSurfaceAccess)/.test(fixture.rootLayout)) failures.push(fail('ROOT_BOUNDARY', 'root layout imports a protected shell'));
  for (const fragment of ['Page unavailable', 'Return to the Marketplace']) if (!fixture.notFound.includes(fragment)) failures.push(fail('SAFE_DENIAL', fragment));
  if (/(?:sign in|permission|role|seller|rider|operations|admin|unauthori[sz]ed|forbidden)/i.test(fixture.notFound)) failures.push(fail('ENUMERATION', 'generic denial reveals protected context'));

  const expectedLabels = {
    seller: ['Overview', 'Orders', 'Listings', 'Inventory', 'Fulfilment', 'Messages', 'Cases', 'Earnings', 'Payouts', 'Performance', 'Store Settings'],
    rider: ['Current', 'Available / Assigned Jobs', 'History', 'Earnings', 'Profile / Shift'],
    operations: ['Overview', 'Orders', 'Fulfilments', 'Dispatch', 'Support', 'Protection Cases', 'Returns', 'Catalogue', 'Sellers', 'Verification', 'Finance', 'Trust & Safety', 'Incidents', 'Reports'],
    admin: ['Overview', 'Institutions', 'Commerce Features', 'Categories & Policies', 'Seller Activation Controls', 'Access & Roles', 'Logistics Configuration', 'Payment/Payout Configuration', 'Notifications & Templates', 'Audit', 'Emergency Controls', 'System Configuration'],
  };
  for (const surface of SURFACES) {
    for (const label of expectedLabels[surface]) if (!fixture.navigation[surface].includes(`label: '${label}'`)) failures.push(fail('NAVIGATION', `${surface}: ${label}`));
    if (!fixture.navigation[surface].includes('Object.freeze')) failures.push(fail('IMMUTABLE_NAVIGATION', surface));
  }
  const productionBlock = fixture.consumerNavigation.match(/productionSurfaceDestinations[\s\S]*?mobileDestinations/)?.[0] ?? '';
  if (/id:\s*'(?:seller|rider|operations|admin)'/.test(productionBlock)) failures.push(fail('PRIVILEGED_SWITCHER', 'production switcher exposes a protected surface'));

  const protectedClientFiles = fixture.sources.filter((source) => source.path.includes('/shells/protected/') && /^['"]use client['"];?/m.test(source.contents));
  if (protectedClientFiles.length !== 1 || protectedClientFiles[0]?.path !== 'apps/web/src/shells/protected/compact-shell-navigation.tsx') failures.push(fail('CLIENT_BOUNDARY', protectedClientFiles.map((source) => source.path).join(', ')));
  for (const source of fixture.sources) {
    if (/(?:@noma\/(?:database|platform|integrations)|@prisma|\.prisma\/|apps\/(?:api|worker))/.test(source.contents)) failures.push(fail('FORBIDDEN_IMPORT', source.path));
    if (source.contents.includes('@base-ui/react')) failures.push(fail('BASE_UI_IMPORT', source.path));
    if (/localStorage[\s\S]{0,120}(?:role|membership)|\b(?:isAdmin|isSeller|isAuthorized)\b|searchParams[\s\S]{0,120}role|process\.env[\s\S]{0,120}(?:role|bypass)|x-user-role|demo_role/i.test(source.contents)) failures.push(fail('CLIENT_AUTHORITY', source.path));
    if (/const\s+(?:orders|jobs|users|sellers|refunds|payouts)\s*=\s*\[/.test(source.contents)) failures.push(fail('FAKE_DATA', source.path));
    if (/universal(?:Role)?Dashboard/i.test(source.contents)) failures.push(fail('UNIVERSAL_DASHBOARD', source.path));
  }

  for (const dependency of ['ag-grid-react', '@tanstack/react-table', '@storybook/react', 'playwright', 'next-auth']) {
    if (fixture.rootPackage.dependencies?.[dependency] || fixture.rootPackage.devDependencies?.[dependency] || fixture.webPackage.dependencies?.[dependency] || fixture.webPackage.devDependencies?.[dependency]) failures.push(fail('DEPENDENCY_SCOPE', dependency));
  }
  for (const [dependency, approvedVersion] of [['@playwright/test', '1.62.1'], ['storybook', '10.5.10']]) {
    if (fixture.webPackage.dependencies?.[dependency]
      || fixture.rootPackage.dependencies?.[dependency]
      || fixture.rootPackage.devDependencies?.[dependency]
      || fixture.webPackage.devDependencies?.[dependency] !== approvedVersion) failures.push(fail('DEPENDENCY_SCOPE', dependency));
  }
  if (!fixture.operationsShell.includes('destinations: readonly OperationsWorkspaceDestination[]') || !fixture.adminShell.includes('destinations: readonly AdminDestination[]')) failures.push(fail('SUPPLIED_ONLY', 'Operations/Admin navigation must be explicit input'));
  if (!fixture.operationsShell.includes('density="compact"') || !fixture.operationsShell.includes('TableCaption') || !fixture.operationsShell.includes('scope="col"')) failures.push(fail('OPERATIONS_TABLE', 'compact semantic table contract missing'));
  if (/(?:onClick|onSubmit|<button|Pause checkout)/i.test(fixture.adminShell)) failures.push(fail('ADMIN_MUTATION', 'Admin shell contains a mutation shortcut'));
  for (const state of ['SERVER_CONFIRMED', 'CACHED', 'LOCAL_DRAFT', 'PENDING_SYNC', 'SYNC_FAILED', 'CONFLICT', 'CONNECTION_REQUIRED']) if (!fixture.riderShell.includes(state)) failures.push(fail('CONNECTIVITY_STATE', state));
  for (const truth of ['not proof of pickup, delivery', 'not yet confirmed by Noma', 'Assignment changed', 'Completion cannot proceed']) if (!fixture.riderShell.includes(truth)) failures.push(fail('CONNECTIVITY_TRUTH', truth));
  if (/PENDING_SYNC[^}]+(?:Delivered|Pickup complete)|LOCAL_DRAFT[^}]+(?:Delivered|Pickup complete)/s.test(fixture.riderShell)) failures.push(fail('FALSE_FINALITY', 'unconfirmed rider state claims custody completion'));

  for (const source of fixture.styles) if (/#[0-9a-f]{3,8}\b|\brgb\s*\(/i.test(source.contents)) failures.push(fail('RAW_COLOR', source.path));
  const css = fixture.styles.map((source) => source.contents).join('\n');
  for (const token of ['@media (min-width: 768px)', '@media (min-width: 1024px)', '@media (forced-colors: active)', 'safe-area-inset-bottom', '--noma-size-target-action', '--noma-size-target-default']) if (!css.includes(token)) failures.push(fail('RESPONSIVE_POLICY', token));

  for (const name of ['ui:role-shells:validate', 'ui:role-shells:self-test', 'ui:role-shells:test', 'ui:role-shells:verify']) if (!scripts[name]) failures.push(fail('COMMAND_CONTRACT', name));
  const commandGraph = {
    'ui:validate': 'validate-ui-role-shells',
    'ui:self-test': 'validate-ui-role-shells',
    'ui:test': 'role-shells.test',
    'ui:verify': 'test-protected-role-routes',
  };
  for (const [name, token] of Object.entries(commandGraph)) if (!String(scripts[name]).includes(token)) failures.push(fail('COMMAND_GRAPH', name));
  if ((fixture.ciCatalog.match(/scripts\/test-protected-role-routes\.mjs/g) ?? []).length !== 2 || !fixture.ciCatalog.includes("'UI-005'")) failures.push(fail('CI_GRAPH', 'Quality/Windows smoke or traceability lookup missing'));

  const normalizedShellsDoc = fixture.shellsDoc.toLowerCase().replaceAll('-', ' ');
  const normalizedAdr = fixture.adr.toLowerCase().replaceAll('-', ' ');
  const normalizedEvidence = fixture.evidence.toLowerCase().replaceAll('-', ' ');
  for (const fragment of ['fail closed', 'Seller Centre', 'Rider', 'Operations', 'Restricted Administration', 'navigation is not authorization', 'UI-006']) if (!normalizedShellsDoc.includes(fragment.toLowerCase().replaceAll('-', ' '))) failures.push(fail('DOCUMENTATION', fragment));
  for (const fragment of ['ADR-0015', 'notFound()', 'synthetic', 'connectivity', 'Issue: `#42`']) if (!normalizedAdr.includes(fragment.toLowerCase().replaceAll('-', ' '))) failures.push(fail('ADR', fragment));
  for (const fragment of ['Synthetic', '320', '768', '1024', '1440', 'forced colours', 'screen reader']) if (!normalizedEvidence.includes(fragment.toLowerCase())) failures.push(fail('EVIDENCE', fragment));
  for (const fragment of ['sellerDestinations', 'riderDestinations', 'operationsDestinations', 'adminDestinations', 'productionSurfaceDestinations']) if (!fixture.unitTest.includes(fragment)) failures.push(fail('UNIT_TEST', fragment));
  for (const fragment of ['expectNoAxeViolations', 'RiderConnectivityBanner', 'OperationsQueueTable', 'AdminReviewFrame', 'CompactShellNavigation']) if (!fixture.componentTest.includes(fragment)) failures.push(fail('COMPONENT_TEST', fragment));
  return [...new Set(failures)];
}

function clone(value) { return structuredClone(value); }
function expectRejected(name, mutate, code, baseline) {
  const fixture = clone(baseline);
  mutate(fixture);
  const failures = validateUiRoleShells(fixture);
  if (!failures.some((entry) => entry.startsWith(`${code}:`))) throw new Error(`${name}: expected ${code}; received ${failures.join(' | ') || 'no failure'}`);
}

async function runSelfTests(baseline) {
  const injected = (fixture, contents) => fixture.sources.push({ path: 'apps/web/src/shells/protected/bad.tsx', contents });
  const cases = [
    ['client redirect guard', (f) => injected(f, "'use client'; redirect('/seller');"), 'CLIENT_BOUNDARY'],
    ['local storage role', (f) => injected(f, "localStorage.setItem('role', 'admin');"), 'CLIENT_AUTHORITY'],
    ['query role', (f) => injected(f, 'const role = searchParams.role;'), 'CLIENT_AUTHORITY'],
    ['environment bypass', (f) => injected(f, 'const allow = process.env.NOMA_ROLE_BYPASS;'), 'CLIENT_AUTHORITY'],
    ['demo cookie', (f) => injected(f, "const demo_role = 'seller';"), 'CLIENT_AUTHORITY'],
    ['demo header', (f) => injected(f, "const header = 'x-user-role';"), 'CLIENT_AUTHORITY'],
    ['pathname authority', (f) => injected(f, 'const isAuthorized = pathname.startsWith("/admin");'), 'CLIENT_AUTHORITY'],
    ['production privileged switcher', (f) => { f.consumerNavigation = f.consumerNavigation.replace("id: 'account'", "id: 'admin'"); }, 'PRIVILEGED_SWITCHER'],
    ['universal dashboard', (f) => injected(f, 'export function UniversalRoleDashboard() {}'), 'UNIVERSAL_DASHBOARD'],
    ['false rider finality', (f) => { f.riderShell = f.riderShell.replace('The action is pending and is not yet confirmed by Noma.', 'Delivered'); }, 'CONNECTIVITY_TRUTH'],
    ['fake operations rows', (f) => injected(f, 'const orders = [{ id: 1 }];'), 'FAKE_DATA'],
    ['admin mutation', (f) => { f.adminShell += '<button onClick={() => null}>Pause checkout</button>'; }, 'ADMIN_MUTATION'],
    ['database import', (f) => injected(f, "import '@noma/database';"), 'FORBIDDEN_IMPORT'],
    ['grid dependency', (f) => { f.webPackage.dependencies = { ...f.webPackage.dependencies, 'ag-grid-react': '1.0.0' }; }, 'DEPENDENCY_SCOPE'],
    ['Storybook dependency', (f) => { f.rootPackage.devDependencies = { ...f.rootPackage.devDependencies, storybook: '1.0.0' }; }, 'DEPENDENCY_SCOPE'],
    ['dynamic business route', (f) => { f.pagePaths.push('apps/web/src/app/(seller)/seller/orders/[orderId]/page.tsx'); }, 'DYNAMIC_ROUTE'],
    ['temporary review route', (f) => { f.pagePaths.push('apps/web/src/app/ui-005-review/page.tsx'); }, 'REVIEW_ROUTE'],
    ['unguarded protected page metadata', (f) => {
      const path = 'apps/web/src/app/(seller)/seller/page.tsx';
      f.sourceMap.set(path, f.sourceMap.get(path).replace("defineProtectedSurfaceMetadata('seller'", 'definePublicMetadata('));
    }, 'PAGE_BOUNDARY'],
  ];
  for (const [name, mutate, code] of cases) expectRejected(name, mutate, code, baseline);
  console.log(`PASS: ${cases.length} UI-005 role-shell policy negative fixtures were rejected`);
}

const fixture = await loadFixture();
const failures = validateUiRoleShells(fixture);
if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`PASS: ${EXPECTED_ROUTES.length} UI-005 routes, four distinct shells, fail-closed access, accessibility, and policy`);
if (process.argv.includes('--self-test')) await runSelfTests(fixture);
