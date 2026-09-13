import { readFile, readdir } from 'node:fs/promises';
import { resolve, relative } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const FILES = Object.freeze({
  platform: 'packages/platform/src/encryption.ts',
  security: 'packages/security/src/encryption.ts',
  masking: 'packages/security/src/masking.ts',
  migration: 'packages/security/src/encryption-migration.ts',
  aws: 'packages/integrations/src/aws-kms-managed-key-provider.ts',
  simulator: 'packages/integrations/src/test-managed-key-provider.ts',
  integrationIndex: 'packages/integrations/src/index.ts',
  config: 'packages/config/src/encryption.ts',
  schema: 'packages/database/prisma/schema.prisma',
  sql: 'packages/database/prisma/migrations/20260912000100_sec_003_encryption_migration_runs/migration.sql',
  repository: 'packages/database/src/encryption-migration.ts',
  root: 'package.json',
  ci: 'scripts/ci-command-catalog.mjs',
});

async function readSources() {
  return Object.fromEntries(await Promise.all(Object.entries(FILES).map(async ([key, path]) => [key, await readFile(resolve(ROOT, path), 'utf8')])));
}

function validate(sources, productionFiles) {
  const errors = [];
  const has = (key, token, message) => { if (!sources[key].includes(token)) errors.push(message); };
  for (const token of ['ManagedKeyProvider', 'generateDataKey', 'unwrapDataKey', 'rewrapDataKey']) has('platform', token, `platform managed-key port missing ${token}`);
  for (const token of ["createCipheriv('aes-256-gcm'", "createDecipheriv('aes-256-gcm'", 'randomBytes(12)', 'parseEncryptedEnvelope', 'encodeSensitiveFieldAad', 'plaintextKey?.fill(0)', 'CAPABILITY_DENIED']) has('security', token, `sensitive-field protection missing ${token}`);
  for (const token of ['Object.keys(record).some', 'record.version !== 1', "record.providerId !== 'aws-kms'", 'record.keyReference', 'base64url']) has('security', token, `strict envelope validation missing ${token}`);
  for (const token of ['noma:aad:v1', 'lengthPrefixed', ".normalize('NFC')", '.sort(']) has('security', token, `canonical AAD missing ${token}`);
  for (const token of ['GenerateDataKeyCommand', 'DecryptCommand', 'ReEncryptCommand', "region: 'eu-central-1'", 'AWS_WEB_IDENTITY_TOKEN_FILE', 'AWS_ACCESS_KEY_ID', 'SourceEncryptionContext', 'DestinationEncryptionContext']) has('aws', token, `AWS KMS adapter missing ${token}`);
  for (const token of ["!['development', 'test'].includes(environment)", "['preview', 'staging', 'production'].includes(process.env.NOMA_ENV"]) has('simulator', token, `test-only provider remote guard missing ${token}`);
  if (sources.integrationIndex.includes('TestOnlyManagedKeyProvider') || sources.integrationIndex.includes('provider-simulators')) errors.push('production integrations entry must not export the test-only provider');
  for (const token of ["mode === 'test-only' && (remote", "['worker', 'web'].includes(runtime)", 'AWS_ACCESS_KEY_ID', 'AWS_ROLE_ARN', 'AWS_WEB_IDENTITY_TOKEN_FILE']) has('config', token, `encryption configuration missing ${token}`);
  for (const token of ['EncryptionMigrationRun', 'leaseExpiresAt', 'remainingCount']) has('schema', token, `technical migration schema missing ${token}`);
  if (/model\s+(?:EncryptedValue|BankAccount)/.test(sources.schema)) errors.push('SEC-003 must not add generic business encrypted-value models');
  for (const token of ['CREATE TABLE "encryption_migration_runs"', 'encryption_migration_runs_active_consumer_key', 'CHECK (']) has('sql', token, `encryption migration SQL missing ${token}`);
  if (/CREATE TABLE\s+"?(?:encrypted_values|mfa_factors|bank_accounts)/i.test(sources.sql)) errors.push('SEC-003 migration must not create business or IAM-004 tables');
  for (const token of ['applyRecordCas(transaction)', 'updateMany({', 'expectedVersion', 'expectedCursor', 'countOutdated()', 'targetWritePolicyActive()']) has('repository', token, `migration CAS or reconciliation missing ${token}`);
  for (const token of ['security:encryption:validate', 'security:encryption:self-test', 'security:encryption:test', 'security:encryption:integration-test']) has('root', token, `root encryption command missing ${token}`);
  for (const token of ["['security:encryption:validate']", "['security:encryption:self-test']", "['security:encryption:integration-test']"]) has('ci', token, `existing CI catalog missing ${token}`);
  for (const [path, content] of productionFiles) {
    if (path !== FILES.aws && content.includes("from '@aws-sdk/client-kms'")) errors.push(`${path}: AWS SDK must remain in its adapter`);
    if (path !== FILES.simulator && path !== 'packages/integrations/src/provider-simulators.ts' && /(?:TestOnlyManagedKeyProvider|@noma\/integrations\/testing|test-managed-key-provider)/.test(content)) errors.push(`${path}: test-only provider imported into production`);
    if (path.startsWith('apps/web/src/') && /(?:@noma\/security|@noma\/database|@noma\/integrations|@aws-sdk\/client-kms)/.test(content)) errors.push(`${path}: browser/Web must not import server key-management dependencies`);
    if (path.startsWith('apps/worker/src/') && /(?:@aws-sdk\/client-kms|SensitiveFieldProtector|createAwsKmsManagedKeyProvider)/.test(content)) errors.push(`${path}: Worker must not acquire general decrypt authority`);
  }
  return [...new Set(errors)];
}

async function productionSourceFiles() {
  const roots = ['apps/web/src', 'apps/api/src', 'apps/worker/src', 'packages/platform/src', 'packages/security/src', 'packages/integrations/src', 'packages/config/src', 'packages/database/src'];
  const files = [];
  async function walk(directory) {
    for (const entry of await readdir(resolve(ROOT, directory), { withFileTypes: true })) {
      const path = `${directory}/${entry.name}`;
      if (entry.isDirectory()) {
        if (entry.name !== 'generated') await walk(path);
      } else if (/\.(?:ts|tsx|mjs)$/.test(entry.name)) files.push([path, await readFile(resolve(ROOT, path), 'utf8')]);
    }
  }
  for (const directory of roots) await walk(directory);
  return files;
}

function selfTest(sources, productionFiles) {
  const fixtures = [
    ['missing GCM', { security: sources.security.replace("createCipheriv('aes-256-gcm'", "createCipheriv('aes-256-cbc'") }, 'sensitive-field protection missing'],
    ['missing canonical AAD', { security: sources.security.replace('noma:aad:v1', 'unversioned') }, 'canonical AAD missing'],
    ['removed zeroisation', { security: sources.security.replaceAll('plaintextKey?.fill(0)', 'void plaintextKey') }, 'sensitive-field protection missing'],
    ['missing KMS rewrap', { aws: sources.aws.replaceAll('ReEncryptCommand', 'RemovedCommand') }, 'AWS KMS adapter missing'],
    ['missing OIDC requirement', { aws: sources.aws.replaceAll('AWS_WEB_IDENTITY_TOKEN_FILE', 'REMOVED_WEB_IDENTITY') }, 'AWS KMS adapter missing'],
    ['remote test provider', { config: sources.config.replace("mode === 'test-only' && (remote", "mode === 'test-only' && (false") }, 'encryption configuration missing'],
    ['production test export', { integrationIndex: `${sources.integrationIndex}\nexport { TestOnlyManagedKeyProvider } from './test-managed-key-provider.js';` }, 'production integrations entry'],
    ['MFA in SEC-003 migration', { sql: `${sources.sql}\nCREATE TABLE mfa_factors (id UUID);` }, 'must not create business or IAM-004'],
    ['generic encrypted table', { sql: `${sources.sql}\nCREATE TABLE encrypted_values (id UUID);` }, 'must not create business or IAM-004'],
    ['missing CAS', { repository: sources.repository.replace('applyRecordCas(transaction)', 'applyRecordCas(null)') }, 'migration CAS or reconciliation missing'],
    ['missing CI integration', { ci: sources.ci.replace("['security:encryption:integration-test']", "['removed:integration-test']") }, 'existing CI catalog missing'],
  ];
  for (const [name, changes, expected] of fixtures) {
    const errors = validate({ ...sources, ...changes }, productionFiles);
    if (!errors.some((error) => error.includes(expected))) throw new Error(`encryption policy self-test did not reject ${name}`);
  }
  const injected = [...productionFiles, ['apps/web/src/synthetic-security-bypass.ts', "import '@aws-sdk/client-kms';"]];
  if (!validate(sources, injected).some((error) => error.includes('browser/Web'))) throw new Error('encryption policy self-test did not reject browser KMS import');
}

const sources = await readSources();
const files = await productionSourceFiles();
const errors = validate(sources, files);
if (errors.length) {
  for (const error of errors) console.error(`FAIL: ${error}`);
  process.exit(1);
}
console.log('PASS: SEC-003 encryption provider, capability, migration, configuration, and source-boundary policy');
if (process.argv.includes('--self-test')) {
  selfTest(sources, files);
  console.log('PASS: SEC-003 negative security-policy fixtures');
}
