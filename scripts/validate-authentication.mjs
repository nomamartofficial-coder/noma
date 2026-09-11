import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const REQUIRED_FILES = [
  'AUTHENTICATION.md',
  'docs/adr/0018-password-authentication-session-lifecycle.md',
  'packages/security/src/authentication.ts',
  'packages/platform/src/identity/authentication.ts',
  'packages/database/src/identity.ts',
  'packages/integrations/src/identity-auth-rate-limiter.ts',
  'apps/api/src/auth/auth.controller.ts',
  'apps/api/src/auth/auth-cookie.ts',
  'apps/api/src/auth/auth-runtime.service.ts',
  'packages/observability/src/server.ts',
  'packages/security/tests/authentication.test.ts',
  'packages/platform/tests/authentication.test.ts',
  'packages/testing/tests/authentication.integration.test.ts',
];
const read = (path) => readFile(resolve(ROOT, path), 'utf8');
const fail = (message) => { throw new Error(message); };

export function validateAuthenticationSources(sources) {
  const { security, platform, database, limiter, controller, cookie, runtime, telemetry, config, worker, packageJson, taskIndex, protectedAccess } = sources;
  for (const value of ['memoryCost: 65_536', 'timeCost: 3', 'parallelism: 1', 'hashLength: 32', 'PASSWORD_HASH_POLICY_VERSION = 1']) {
    if (!security.includes(value)) fail(`Argon2id policy missing ${value}`);
  }
  if (!security.includes("dictionary['passwords-common']") || !security.includes("dictionary['diceware-common']")) {
    fail('password policy must use the exact-pinned offline common-password source');
  }
  if (!security.includes("password.normalize('NFC')") || !security.includes('BLOCKED_PASSWORDS.has(normalized)')) {
    fail('password blocklist must compare the NFC-normalized whole password');
  }
  if (/BLOCKED_PASSWORDS\.(?:some|find)|blocked.*includes\(/i.test(security)) fail('substring password rejection is prohibited');
  if (/fetch\(|https?:\/\//.test(security)) fail('password validation must not transmit passwords or depend on a network');
  for (const operation of [
    'registerPasswordIdentity', 'readPasswordAuthenticationCandidate', 'replacePasswordCredentialHash',
    'rotatePasswordSession', 'resolveAuthenticatedSession', 'touchSession', 'revokeSessionByTokenDigest',
  ]) {
    if (!platform.includes(operation) || !database.includes(operation)) fail(`IAM-002 persistence seam missing ${operation}`);
  }
  if (!/registerPasswordIdentity[\s\S]+runInDatabaseTransaction[\s\S]+transaction\.user\.create[\s\S]+transaction\.userEmail\.create[\s\S]+transaction\.credential\.create/.test(database)) {
    fail('password registration must commit User, UserEmail, and Credential in one transaction');
  }
  if (!/rotatePasswordSession[\s\S]+runInDatabaseTransaction[\s\S]+transaction\.session\.updateMany[\s\S]+transaction\.session\.create/.test(database)) {
    fail('session rotation must revoke and create in one transaction');
  }
  if (!/touchSession[\s\S]+"revoked_at" IS NULL[\s\S]+"absolute_expires_at" >=/.test(database)) {
    fail('conditional session touch must not revive revocation or extend absolute expiry');
  }
  if (!platform.includes("PASSWORD_AUTHENTICATION_ACCOUNT_STATUSES = ['PENDING_EMAIL', 'ACTIVE'] as const")
    || !platform.includes('if (!accountAllowsPasswordAuthentication(candidate.user.status))')) {
    fail('ordinary password sign-in must use the canonical account eligibility rule');
  }
  if ((platform.match(/requirePasswordAuthenticationSession\(/g) ?? []).length !== 3
    || !platform.includes('!record || !accountAllowsPasswordAuthentication(record.user.status)')) {
    fail('session continuation must reject ineligible accounts before and after touch contention');
  }
  if (!database.includes('user: { status: { in: [...PASSWORD_AUTHENTICATION_ACCOUNT_STATUSES] } }')) {
    fail('authenticated session resolution must filter current authoritative account status');
  }
  if (!/touchSession[\s\S]+u\."status" = ANY\([\s\S]+Prisma\.join\(PASSWORD_AUTHENTICATION_ACCOUNT_STATUSES\)[\s\S]+u\."security_version" = "sessions"\."issued_security_version"/.test(database)) {
    fail('session touch must atomically recheck account eligibility and security version');
  }
  if (!limiter.includes("createHmac('sha256'")
    || limiter.includes('const identity = input.normalizedEmail')
    || limiter.includes('const network = input.networkSignal')) {
    fail('Redis correlation must use privacy-safe HMAC keys');
  }
  if (!limiter.includes('maxRetriesPerRequest: 1') || !platform.includes('AUTH_DEPENDENCY_UNAVAILABLE')) {
    fail('new authentication must fail closed when the limiter is unavailable');
  }
  for (const route of ["@Post('register')", "@Post('sign-in')", "@Post('sign-out')", "@Get('session')"]) {
    if (!controller.includes(route)) fail(`authentication controller missing ${route}`);
  }
  for (const cookieControl of ['HttpOnly', 'SameSite=Lax', '__Host-noma_session']) {
    if (!cookie.includes(cookieControl)) fail(`authentication cookie missing ${cookieControl}`);
  }
  if (!cookie.includes('rawToken === undefined ? 0 : policy.maximumAgeSeconds')) {
    fail('cleared authentication cookie must use Max-Age zero');
  }
  if (!cookie.includes("${policy.name}=${rawToken ?? ''}; Path=/; HttpOnly; SameSite=Lax; Max-Age=")) {
    fail('issued session cookie must remain HttpOnly and SameSite=Lax');
  }
  if (!controller.includes('createAuthenticationCookiePolicy') || !controller.includes('readAuthenticationCookie')) {
    fail('authentication controller must use the bounded cookie policy');
  }
  if (!controller.includes("header(request, 'origin') !== this.config.publicWebOrigin")) fail('state-changing auth routes need exact Origin enforcement');
  if (!runtime.includes('OfflinePasswordPolicy') || !runtime.includes('Argon2idPasswordHasher') || !runtime.includes('RedisIdentityAuthRateLimiter')) {
    fail('API runtime must compose the reviewed password and limiter implementations');
  }
  for (const metric of ['noma.identity.authentication.total', 'noma.identity.auth_rate_limit.total']) {
    if (!telemetry.includes(metric) || !runtime.includes(metric)) fail(`bounded authentication metric missing ${metric}`);
  }
  if (!config.includes('AUTH_CORRELATION_SECRET') || !config.includes('NOMA_AUTH_TOUCH_AFTER_MS')) {
    fail('typed authentication secret and session policy configuration are missing');
  }
  if (/identity\.(?:registration|sign_in|session|auth_rate_limit)/.test(worker)) {
    fail('IAM-002 must not introduce attacker-amplifiable Worker jobs');
  }
  for (const command of ['auth:validate', 'auth:self-test', 'auth:test', 'auth:integration-test', 'auth:calibrate', 'auth:verify']) {
    if (!packageJson.scripts?.[command]) fail(`root package missing ${command}`);
  }
  for (const expected of [
    'IAM-001,EP03,"Implement User, credential, session, and recovery persistence",P0,P0-AUTHORITY,COMPLETE',
    'IAM-002,EP03,"Implement password registration, sign-in, sign-out, and session rotation",P0,P0-AUTHORITY,COMPLETE',
    'IAM-003,EP03,Implement email verification and password recovery,P0,P0-AUTHORITY,IN_REVIEW',
  ]) {
    if (!taskIndex.includes(expected)) fail(`IAM traceability lifecycle mismatch: ${expected.split(',')[0]}`);
  }
  if (!protectedAccess.includes('notFound()')) fail('protected role surfaces must remain fail closed');
}

async function sources() {
  const { readdir } = await import('node:fs/promises');
  const workerEntries = (await readdir(resolve(ROOT, 'apps/worker/src'), { recursive: true }))
    .map(String)
    .filter((entry) => entry.endsWith('.ts'));
  return {
    security: await read('packages/security/src/authentication.ts'),
    platform: `${await read('packages/platform/src/identity/contracts.ts')}\n${await read('packages/platform/src/identity/authentication.ts')}`,
    database: await read('packages/database/src/identity.ts'),
    limiter: await read('packages/integrations/src/identity-auth-rate-limiter.ts'),
    controller: await read('apps/api/src/auth/auth.controller.ts'),
    cookie: await read('apps/api/src/auth/auth-cookie.ts'),
    runtime: await read('apps/api/src/auth/auth-runtime.service.ts'),
    telemetry: await read('packages/observability/src/server.ts'),
    config: await read('packages/config/src/server.ts'),
    worker: (await Promise.all(workerEntries.map((entry) => read(`apps/worker/src/${entry.replaceAll('\\', '/')}`)))).join('\n'),
    packageJson: JSON.parse(await read('package.json')),
    taskIndex: await read('delivery/traceability/task-index.csv'),
    protectedAccess: await read('apps/web/src/shells/protected/protected-surface-access.server.ts'),
  };
}

function selfTest(original) {
  const fixtures = [
    ['weakened Argon2 memory', 'security', 'memoryCost: 65_536', 'memoryCost: 32_768'],
    ['removed whole-password comparison', 'security', 'BLOCKED_PASSWORDS.has(normalized)', 'BLOCKED_PASSWORDS.has(normalized.slice(0, 8))'],
    ['network password lookup', 'security', "const BLOCKED_PASSWORDS", "fetch('https://passwords.invalid');\nconst BLOCKED_PASSWORDS"],
    ['split registration transaction', 'database', 'transaction.credential.create', 'client.credential.create'],
    ['non-atomic rotation', 'database', 'transaction.session.create', 'client.session.create'],
    ['broadened password account eligibility', 'platform', "PASSWORD_AUTHENTICATION_ACCOUNT_STATUSES = ['PENDING_EMAIL', 'ACTIVE'] as const", "PASSWORD_AUTHENTICATION_ACCOUNT_STATUSES = ['PENDING_EMAIL', 'ACTIVE', 'SUSPENDED'] as const"],
    ['removed session account guard', 'platform', '!record || !accountAllowsPasswordAuthentication(record.user.status)', '!record'],
    ['removed database session status filter', 'database', 'user: { status: { in: [...PASSWORD_AUTHENTICATION_ACCOUNT_STATUSES] } }', 'user: {}'],
    ['removed account guard from session touch', 'database', 'u."status" = ANY(', 'u."status" IS NOT NULL AND ('],
    ['raw Redis identity', 'limiter', "this.#correlate(`identity|${input.normalizedEmail}`)", 'input.normalizedEmail'],
    ['removed origin check', 'controller', "header(request, 'origin') !== this.config.publicWebOrigin", 'false'],
    ['insecure cookie', 'cookie', 'Path=/; HttpOnly; SameSite=Lax', 'Path=/; BrowserReadable; SameSite=Lax'],
    ['worker auth job', 'worker', '', 'identity.sign_in.failed'],
    ['regressed IAM-003', 'taskIndex', 'IAM-003,EP03,Implement email verification and password recovery,P0,P0-AUTHORITY,IN_REVIEW', 'IAM-003,EP03,Implement email verification and password recovery,P0,P0-AUTHORITY,NOT_STARTED'],
  ];
  for (const [name, key, before, after] of fixtures) {
    if (before && !original[key].includes(before)) fail(`authentication self-test fixture is stale: ${name}`);
    const candidate = { ...original, [key]: before ? original[key].replace(before, after) : `${original[key]}\n${after}` };
    try {
      validateAuthenticationSources(candidate);
      fail(`${name} negative fixture did not fail`);
    } catch (error) {
      if (/negative fixture/.test(error.message)) throw error;
    }
  }
}

try {
  for (const path of REQUIRED_FILES) await access(resolve(ROOT, path));
  const original = await sources();
  validateAuthenticationSources(original);
  console.log('PASS: IAM-002 password, atomic registration, session, rate-limit, API, and deferred-scope policies');
  if (process.argv.includes('--self-test')) {
    selfTest(original);
    console.log('PASS: IAM-002 weakened security, atomicity, privacy, origin, cookie, Worker, and lifecycle fixtures were rejected');
  }
} catch (error) {
  console.error(`FAIL: ${error.message}`);
  process.exit(1);
}
