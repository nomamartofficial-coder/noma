import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const REQUIRED_FILES = [
  'IDENTITY_PERSISTENCE.md',
  'docs/adr/0017-identity-persistence-foundation.md',
  'packages/platform/src/identity/contracts.ts',
  'packages/platform/src/identity/normalization.ts',
  'packages/database/src/identity.ts',
  'packages/database/prisma/migrations/20260829000100_iam_001_identity_persistence/migration.sql',
  'packages/testing/tests/identity-persistence.integration.test.ts',
];
const REQUIRED_MODELS = ['User', 'UserEmail', 'Credential', 'Session', 'IdentityToken', 'RecoveryAttempt'];
const REQUIRED_PARTIAL_INDEXES = [
  'user_emails_active_normalized_key',
  'user_emails_active_primary_key',
  'credentials_active_password_key',
  'sessions_active_user_expiry_idx',
  'identity_tokens_consumable_idx',
];
const PROHIBITED_SCHEMA_FIELDS = [
  'plaintextPassword',
  'rawPassword',
  'sessionToken',
  'rawSessionToken',
  'recoveryToken',
  'verificationToken',
  'role',
  'isAdmin',
];

const fail = (message) => {
  throw new Error(message);
};
const read = (path) => readFile(resolve(ROOT, path), 'utf8');

function modelBlock(schema, model) {
  const match = schema.match(new RegExp(`model\\s+${model}\\s*\\{([\\s\\S]*?)\\n\\}`));
  if (!match) fail(`Prisma schema missing ${model}`);
  return match[1];
}

export function validateIdentitySources({ schema, migration, platform, database, integration, packageJson, taskIndex }) {
  for (const model of REQUIRED_MODELS) modelBlock(schema, model);
  const user = modelBlock(schema, 'User');
  for (const field of PROHIBITED_SCHEMA_FIELDS) {
    if (new RegExp(`^\\s*${field}\\s+`, 'm').test(schema)) {
      fail(`identity schema contains prohibited authority/raw-secret field ${field}`);
    }
  }
  if (/\b(role|isAdmin|is_admin)\b/i.test(user)) fail('User must not contain global role or admin authority');
  if (/previewFeatures\s*=/.test(schema)) fail('IAM-001 must not enable Prisma preview features');
  for (const value of [
    'PENDING_EMAIL', 'COMPROMISED_LOCKED', 'DEACTIVATION_REQUESTED',
    'STEP_UP_REQUIRED', 'PRIVILEGED_MFA_RECENT',
    'EMAIL_VERIFICATION', 'PASSWORD_RECOVERY',
  ]) {
    if (!schema.includes(value)) fail(`identity schema missing authoritative value ${value}`);
  }

  for (const index of REQUIRED_PARTIAL_INDEXES) {
    if (!migration.includes(`"${index}"`) || !migration.match(new RegExp(`${index}[\\s\\S]{0,260}\\bWHERE\\b`))) {
      fail(`identity migration missing partial index ${index}`);
    }
  }
  for (const constraint of [
    'users_versions_check',
    'sessions_expiry_check',
    'sessions_revocation_check',
    'identity_tokens_expiry_check',
    'identity_tokens_terminal_check',
  ]) {
    if (!migration.includes(`"${constraint}"`)) fail(`identity migration missing ${constraint}`);
  }
  if (/ON DELETE CASCADE/i.test(migration)) fail('identity relationships must not cascade deletion');
  if (!migration.includes('recovery_attempts_append_only')) fail('recovery evidence append-only trigger missing');
  for (const unsafeColumn of [
    'plaintext_password', 'raw_password', 'session_token', 'raw_session_token',
    'recovery_token', 'verification_token',
  ]) {
    if (new RegExp(`"${unsafeColumn}"`, 'i').test(migration)) {
      fail(`identity migration contains prohibited raw-secret column ${unsafeColumn}`);
    }
  }

  if (/from ['"](?:@prisma|\.\.\/.*database)/.test(platform)) {
    fail('platform Identity contracts must remain Prisma-free');
  }
  for (const operation of [
    'createUserIdentity', 'findUserByNormalizedEmail', 'storePasswordCredential',
    'createSession', 'resolveActiveSessionCandidate', 'revokeSession',
    'issueIdentityToken', 'consumeIdentityToken', 'recordRecoveryAttempt',
  ]) {
    if (!platform.includes(operation) || !database.includes(operation)) {
      fail(`Identity persistence seam missing ${operation}`);
    }
  }
  if (!/UPDATE\s+"identity_tokens"[\s\S]+"consumed_at"[\s\S]+RETURNING/mi.test(database)) {
    fail('identity token consumption must be one atomic conditional update');
  }
  if (/process\.env\.npm_execpath/.test(integration)) {
    fail('identity migration tests must not select an executable from the environment');
  }
  if (!integration.includes("createRequire(resolve(DATABASE_DIR, 'package.json'))") ||
      !integration.includes("requireFromDatabase.resolve('prisma/build/index.js')") ||
      !integration.includes("execFileAsync(process.execPath, [prismaCli, 'migrate', 'deploy']")) {
    fail('identity migration tests must invoke the installed Prisma CLI through the trusted Node executable');
  }
  for (const workflow of ['registerUser', 'login', 'signIn', 'resetPassword', 'authenticateRequest']) {
    if (database.includes(workflow) || platform.includes(workflow)) {
      fail(`IAM-001 must not implement authentication workflow ${workflow}`);
    }
  }
  for (const command of ['identity:validate', 'identity:self-test', 'identity:integration-test', 'identity:verify']) {
    if (!packageJson.scripts?.[command]) fail(`root package missing ${command}`);
  }
  for (const expected of [
    'UI-006,EP02,Create Storybook/component documentation and visual regression,P0,P2-PRESENTATION,COMPLETE',
    'IAM-001,EP03,"Implement User, credential, session, and recovery persistence",P0,P0-AUTHORITY,IN_REVIEW',
    'IAM-002,EP03,"Implement password registration, sign-in, sign-out, and session rotation",P0,P0-AUTHORITY,NOT_STARTED',
  ]) {
    if (!taskIndex.includes(expected)) fail(`IAM-001 traceability lifecycle mismatch: ${expected.split(',')[0]}`);
  }
}

async function validate() {
  for (const path of REQUIRED_FILES) await access(resolve(ROOT, path));
  validateIdentitySources({
    schema: await read('packages/database/prisma/schema.prisma'),
    migration: await read('packages/database/prisma/migrations/20260829000100_iam_001_identity_persistence/migration.sql'),
    platform: `${await read('packages/platform/src/identity/contracts.ts')}\n${await read('packages/platform/src/identity/normalization.ts')}`,
    database: await read('packages/database/src/identity.ts'),
    integration: await read('packages/testing/tests/identity-persistence.integration.test.ts'),
    packageJson: JSON.parse(await read('package.json')),
    taskIndex: await read('delivery/traceability/task-index.csv'),
  });
  const protectedAccess = await read('apps/web/src/shells/protected/protected-surface-access.server.ts');
  if (!protectedAccess.includes('notFound()')) fail('protected role surfaces must remain fail closed');
}

function selfTest(sources) {
  const mutations = [
    ['global role', { ...sources, schema: sources.schema.replace('displayName', 'role          String\n  displayName') }],
    ['raw session token', { ...sources, migration: sources.migration.replace('"token_digest"', '"session_token"') }],
    ['cascade delete', { ...sources, migration: sources.migration.replace('ON DELETE RESTRICT', 'ON DELETE CASCADE') }],
    ['non-atomic consumption', { ...sources, database: sources.database.replace('UPDATE "identity_tokens" AS t', 'SELECT * FROM "identity_tokens" AS t') }],
    ['environment-controlled migration executable', { ...sources, integration: sources.integration.replace('await execFileAsync(process.execPath', 'const command = process.env.npm_execpath ?? process.execPath;\n  await execFileAsync(command') }],
    ['premature IAM-002', { ...sources, taskIndex: sources.taskIndex.replace('IAM-002,EP03,"Implement password registration, sign-in, sign-out, and session rotation",P0,P0-AUTHORITY,NOT_STARTED', 'IAM-002,EP03,"Implement password registration, sign-in, sign-out, and session rotation",P0,P0-AUTHORITY,IN_REVIEW') }],
  ];
  for (const [name, candidate] of mutations) {
    try {
      validateIdentitySources(candidate);
      fail(`${name} negative fixture did not fail`);
    } catch (error) {
      if (/negative fixture/.test(error.message)) throw error;
    }
  }
}

try {
  const sources = {
    schema: await read('packages/database/prisma/schema.prisma'),
    migration: await read('packages/database/prisma/migrations/20260829000100_iam_001_identity_persistence/migration.sql'),
    platform: `${await read('packages/platform/src/identity/contracts.ts')}\n${await read('packages/platform/src/identity/normalization.ts')}`,
    database: await read('packages/database/src/identity.ts'),
    integration: await read('packages/testing/tests/identity-persistence.integration.test.ts'),
    packageJson: JSON.parse(await read('package.json')),
    taskIndex: await read('delivery/traceability/task-index.csv'),
  };
  await validate();
  console.log('PASS: IAM-001 identity models, repository boundary, database controls, and fail-closed routes');
  if (process.argv.includes('--self-test')) {
    selfTest(sources);
    console.log('PASS: global role, raw secret, cascade delete, replay-race, executable-injection, and premature IAM-002 mutations were rejected');
  }
} catch (error) {
  console.error(`FAIL: ${error.message}`);
  process.exit(1);
}
