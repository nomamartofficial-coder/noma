import { readFile, readdir } from 'node:fs/promises';
import { resolve, relative } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const forbiddenDependencies = ['currency.js', 'dinero.js', 'decimal.js', 'big.js', 'accounting.js', 'date-fns', 'luxon', 'moment', 'dayjs', 'tailwindcss', '@radix-ui/react-dialog', '@headlessui/react'];
const commerceModules = [
  'commerce-status.tsx', 'commerce-money.tsx', 'commerce-timeline.tsx', 'commerce-evidence.tsx', 'high-risk-confirmation.tsx',
];

const read = (path) => readFile(resolve(ROOT, path), 'utf8');
const json = async (path) => JSON.parse(await read(path));
const failure = (code, detail) => `${code}: ${detail}`;

async function sourceFiles(directory) {
  const files = [];
  async function walk(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = resolve(current, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (/\.(?:ts|tsx|js|mjs)$/.test(entry.name)) files.push({ path: relative(ROOT, path).replaceAll('\\', '/'), contents: await readFile(path, 'utf8') });
    }
  }
  await walk(resolve(ROOT, directory));
  return files;
}

async function loadFixture() {
  return {
    rootPackage: await json('package.json'),
    uiPackage: await json('packages/ui/package.json'),
    uiIndex: await read('packages/ui/src/index.ts'),
    commerceTokens: await read('packages/ui/src/commerce-tokens.ts'),
    statusSource: await read('packages/ui/src/commerce-status.tsx'),
    moneySource: await read('packages/ui/src/commerce-money.tsx'),
    timelineSource: await read('packages/ui/src/commerce-timeline.tsx'),
    evidenceSource: await read('packages/ui/src/commerce-evidence.tsx'),
    highRiskSource: await read('packages/ui/src/high-risk-confirmation.tsx'),
    declarations: await read('packages/ui/dist/index.d.ts'),
    commerceCss: await read('packages/ui/dist/commerce.css'),
    generator: await read('scripts/generate-ui-token-css.mjs'),
    webLayout: await read('apps/web/src/app/layout.tsx'),
    webPage: await read('apps/web/src/app/(marketplace)/page.tsx'),
    unitTest: await read('packages/ui/tests/commerce.test.ts'),
    componentTest: await read('tests/component/ui-commerce.component.test.tsx'),
    truthFixtures: await read('packages/ui/tests/commerce-truth-fixtures.ts'),
    sourceFiles: await sourceFiles('packages/ui/src'),
  };
}

function validateUiCommerce(fixture) {
  const failures = [];
  for (const name of forbiddenDependencies) {
    if (fixture.uiPackage.dependencies?.[name] || fixture.rootPackage.dependencies?.[name] || fixture.rootPackage.devDependencies?.[name]) failures.push(failure('DEPENDENCY_SCOPE', name));
  }
  if (fixture.uiPackage.exports?.['./commerce.css'] !== './dist/commerce.css') failures.push(failure('PACKAGE_EXPORT', '@noma/ui/commerce.css'));
  if (!fixture.generator.includes("'commerce.css'")) failures.push(failure('CSS_GENERATOR', 'commerce.css missing'));
  if ((fixture.webLayout.match(/@noma\/ui\/commerce\.css/g) ?? []).length !== 1) failures.push(failure('WEB_CSS_IMPORT', 'commerce.css must be imported exactly once'));
  if (!fixture.webPage.includes('StatusChip') || !fixture.webPage.includes("from '@noma/ui'")) failures.push(failure('SERVER_CONSUMER', 'Web Server Component must consume a static commerce pattern'));
  if (/^['"]use client['"];?/m.test(fixture.uiIndex)) failures.push(failure('RSC_BOUNDARY', 'package root is client-only'));

  const prohibitedImports = /(?:from\s+)?['"](?:@noma\/(?:database|contracts|platform|integrations)|\.\.\/\.\.\/(?:apps\/api|apps\/worker))/;
  for (const source of fixture.sourceFiles.filter((entry) => commerceModules.some((name) => entry.path.endsWith(name)))) {
    if (prohibitedImports.test(source.contents)) failures.push(failure('DOMAIN_IMPORT', source.path));
    if (source.path.endsWith('high-risk-confirmation.tsx')) {
      if (!source.contents.startsWith("'use client';")) failures.push(failure('CLIENT_BOUNDARY', source.path));
    } else if (/^['"]use client['"];?/m.test(source.contents)) failures.push(failure('SERVER_BOUNDARY', source.path));
    if (source.contents.includes('@base-ui/react')) failures.push(failure('BASE_UI_BOUNDARY', source.path));
  }

  for (const fragment of [
    "requested: 'info'", "processing: 'processing'", "final: 'success'", "failed: 'danger'", "uncertain: 'warning'",
    "announce = 'off'", "type DeadlineState = 'upcoming' | 'due-soon' | 'overdue' | 'expired'",
  ]) if (!fixture.statusSource.includes(fragment)) failures.push(failure('STATUS_CONTRACT', fragment));
  if (/switch\s*\([^)]*\.status\b|(?:Payment|Refund|Payout|Delivery|Seller)Status/.test(fixture.statusSource)) failures.push(failure('STATE_MAPPING', 'domain status mapping in commerce UI'));
  if (/providerRequestSucceeded[\s\S]{0,120}(?:Paid|Refunded|Delivered)/.test(fixture.statusSource)) failures.push(failure('PROVIDER_FINALITY', 'provider request acceptance presented as final'));

  for (const pattern of [/\bNumber\s*\(/, /\bparseFloat\s*\(/, /amountMinor\s*\/\s*100/, /amountMinor\s*:\s*number/]) {
    if (pattern.test(fixture.moneySource)) failures.push(failure('MONEY_FLOAT', String(pattern)));
  }
  for (const fragment of ['bigint | string', 'CANONICAL_MINOR_UNITS', 'resolvedOptions()', "notation: 'standard'", 'outer currency']) {
    if (!fixture.moneySource.includes(fragment)) failures.push(failure('MONEY_CONTRACT', fragment));
  }
  if (/onDeleteEvent|onEditEvent|onReorder|\.sort\s*\(/.test(fixture.timelineSource)) failures.push(failure('TIMELINE_MUTATION', 'timeline must be immutable and caller-ordered'));
  if (/fileUrl|storageUrl|signedUrl|s3Url/i.test(fixture.evidenceSource)) failures.push(failure('PRIVATE_EVIDENCE_URL', 'raw evidence URL API'));
  if (/reauthenticated|mfaPassed|authori[sz]ed\s*[:=]/i.test(fixture.highRiskSource)) failures.push(failure('AUTHORITY_CLAIM', 'confirmation cannot grant authority'));
  for (const fragment of ['GENERIC_CONFIRM_LABEL', 'initialFocusRef={cancelRef}', 'reason.trim().length', 'props.isPending']) {
    if (!fixture.highRiskSource.includes(fragment)) failures.push(failure('HIGH_RISK_CONTRACT', fragment));
  }

  const declarationText = fixture.declarations;
  for (const fragment of ['@base-ui/react', '@noma/database', '@noma/contracts', 'Prisma', 'PaymentStatus', 'RefundStatus', 'PayoutStatus', 'DeliveryStatus']) {
    if (declarationText.includes(fragment)) failures.push(failure('PUBLIC_TYPE_LEAK', fragment));
  }
  for (const name of ['StatusChip', 'CommerceStatus', 'ResponsibilityBanner', 'DeadlineBanner', 'Money', 'MoneyBreakdown', 'Timeline', 'TimelineItem', 'EvidenceCard', 'HighRiskConfirmation']) {
    if (!fixture.uiIndex.includes(name)) failures.push(failure('PUBLIC_EXPORT', name));
  }

  const normalizedCss = fixture.commerceCss.replaceAll(/\s+/g, '');
  for (const fragment of ['--noma-commerce-status-info-background:', '.noma-commerce-status', '.noma-money-breakdown', '.noma-timeline', '.noma-evidence-card', '.noma-high-risk-summary', '@media(forced-colors:active)', '@media(prefers-reduced-motion:reduce)']) {
    if (!normalizedCss.includes(fragment.replaceAll(/\s+/g, ''))) failures.push(failure('COMMERCE_CSS', fragment));
  }
  if (/#[0-9a-f]{3,8}\b/i.test(fixture.commerceCss)) failures.push(failure('RAW_COMMERCE_COLOR', 'commerce.css contains raw colour'));
  if (!fixture.commerceTokens.includes("'commerce.status.info.background': 'color.status.info.background'")) failures.push(failure('TOKEN_ALIAS', 'commerce colour must use semantic status token'));

  for (const fragment of ['900719925474099312345', "'JPY'", "'NGN'", "'KWD'", 'outer currency']) {
    if (!fixture.unitTest.includes(fragment)) failures.push(failure('MONEY_TEST', fragment));
  }
  for (const fragment of ['toHaveFocus', 'Enter a reason before requesting this action', 'expectNoAxeViolations', 'Refund outcome under reconciliation', 'Caller-ordered']) {
    if (!fixture.componentTest.toLowerCase().includes(fragment.toLowerCase())) failures.push(failure('COMPONENT_TEST', fragment));
  }
  for (const fragment of ['refund-approved', 'refund-processing', 'refund-uncertain', 'withdrawal-approved', 'payment-verifying', 'ready-for-pickup', 'rider-arrived', 'delivery-attempted', 'seller-approved', 'temporary-restriction']) {
    if (!fixture.truthFixtures.includes(fragment)) failures.push(failure('TRUTH_FIXTURE', fragment));
  }
  return failures;
}

function clone(value) { return structuredClone(value); }
function expectRejected(name, mutate, code, baseline) {
  const fixture = clone(baseline);
  mutate(fixture);
  const failures = validateUiCommerce(fixture);
  if (!failures.some((entry) => entry.startsWith(`${code}:`))) throw new Error(`${name}: expected ${code}; received ${failures.join(' | ') || 'no failure'}`);
}

async function runSelfTests(baseline) {
  const cases = [
    ['domain import', (f) => { f.statusSource += "\nimport '@noma/database';"; f.sourceFiles.push({ path: 'packages/ui/src/commerce-status.tsx', contents: f.statusSource }); }, 'DOMAIN_IMPORT'],
    ['raw state mapper', (f) => { f.statusSource += '\nswitch (refund.status) {}'; }, 'STATE_MAPPING'],
    ['provider finality', (f) => { f.statusSource += '\nconst Paid = providerRequestSucceeded ? "Paid" : "Pending";'; }, 'PROVIDER_FINALITY'],
    ['money float', (f) => { f.moneySource += '\nconst broken = Number(amountMinor) / 100;'; }, 'MONEY_FLOAT'],
    ['number money API', (f) => { f.moneySource += '\ninterface BadMoney { amountMinor: number }'; }, 'MONEY_FLOAT'],
    ['missing mixed currency guard', (f) => { f.moneySource = f.moneySource.replaceAll('outer currency', 'single value'); }, 'MONEY_CONTRACT'],
    ['private evidence URL', (f) => { f.evidenceSource += '\ninterface BadEvidence { signedUrl: string }'; }, 'PRIVATE_EVIDENCE_URL'],
    ['timeline mutation', (f) => { f.timelineSource += '\ninterface BadTimeline { onDeleteEvent(): void }'; }, 'TIMELINE_MUTATION'],
    ['generic confirmation guard', (f) => { f.highRiskSource = f.highRiskSource.replaceAll('GENERIC_CONFIRM_LABEL', 'WEAK_LABEL'); }, 'HIGH_RISK_CONTRACT'],
    ['authority claim', (f) => { f.highRiskSource += '\ninterface BadAuth { mfaPassed: boolean }'; }, 'AUTHORITY_CLAIM'],
    ['raw commerce colour', (f) => { f.commerceCss += '\n.bad{color:#123456}'; }, 'RAW_COMMERCE_COLOR'],
    ['broad client root', (f) => { f.uiIndex = `'use client';\n${f.uiIndex}`; }, 'RSC_BOUNDARY'],
  ];
  for (const [name, mutate, code] of cases) expectRejected(name, mutate, code, baseline);
  console.log(`PASS: ${cases.length} UI-003 commerce policy negative fixtures were rejected`);
}

const fixture = await loadFixture();
const failures = validateUiCommerce(fixture);
if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('PASS: UI-003 commerce truth, money, evidence, interaction, CSS, and boundary policy');
if (process.argv.includes('--self-test')) await runSelfTests(fixture);
