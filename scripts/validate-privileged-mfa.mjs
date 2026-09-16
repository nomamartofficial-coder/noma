import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const paths = Object.freeze({
  schema: 'packages/database/prisma/schema.prisma',
  migration: 'packages/database/prisma/migrations/20260913000100_iam_004_privileged_mfa/migration.sql',
  repository: 'packages/database/src/mfa.ts',
  service: 'packages/platform/src/identity/mfa-service.ts',
  assurance: 'packages/platform/src/identity/assurance.ts',
  totp: 'packages/security/src/mfa.ts',
  securityManifest: 'packages/security/package.json',
  lockfile: 'pnpm-lock.yaml',
  config: 'packages/config/src/server.ts',
  api: 'apps/api/src/auth/auth.controller.ts',
  apiRuntime: 'apps/api/src/auth/auth-runtime.service.ts',
  worker: 'apps/worker/src/identity-email-handler.ts',
  notice: 'packages/platform/src/identity/verification-recovery.ts',
  existingRecovery: 'packages/database/src/identity.ts',
  roleAccess: 'apps/web/src/shells/protected/protected-surface-access.server.ts',
  taskIndex: 'delivery/traceability/task-index.csv',
  rootManifest: 'package.json',
  ci: 'scripts/ci-command-catalog.mjs',
});

async function sources() {
  return Object.fromEntries(await Promise.all(Object.entries(paths).map(async ([key, path]) => [key, await readFile(new URL(path, root), 'utf8')])));
}

function validate(source) {
  const errors = [];
  const require = (condition, code) => { if (!condition) errors.push(code); };
  require(source.securityManifest.includes('"otpauth": "9.5.2"') && source.lockfile.includes('otpauth@9.5.2:'), 'EXACT_OTP_DEPENDENCY');
  require(['MfaFactor', 'MfaRecoveryCodeBatch', 'MfaRecoveryCode', 'SessionStepUpChallenge'].every((model) => source.schema.includes(`model ${model} {`)), 'MFA_MODELS');
  require(['passwordAuthenticatedAt', 'mfaVerifiedAt', 'mfaMethod', 'mfaFactorId', 'lastAcceptedTimeStep'].every((field) => source.schema.includes(field)), 'MFA_EVIDENCE');
  require(source.migration.includes('mfa_factors_one_active_totp_per_user') && source.migration.includes('mfa_factors_one_pending_totp_per_user') && source.migration.includes('mfa_recovery_batches_one_active_per_user') && source.migration.includes('session_step_up_challenges_one_live_per_session'), 'PARTIAL_UNIQUENESS');
  require(source.migration.includes('ADD COLUMN "password_authenticated_at" TIMESTAMPTZ(6)') && !/UPDATE\s+"?sessions"?\s+SET\s+"?password_authenticated_at"?/i.test(source.migration), 'LEGACY_EVIDENCE_NULL');
  require(source.totp.includes("from 'otpauth'") && source.totp.includes('randomBytes(TOTP_PROFILE.seedBytes)') && source.totp.includes("algorithm: 'SHA1'") && source.totp.includes('digits: 6') && source.totp.includes('periodSeconds: 30') && source.totp.includes('skewSteps: 1'), 'TOTP_PROFILE');
  require(source.totp.includes('timingSafeEqual') && source.totp.includes('matched = BigInt(candidateStep)') && source.totp.includes('return matched'), 'TOTP_MATCHING');
  require(source.totp.includes('randomBytes(16)') && source.totp.includes('RECOVERY_CODE_COUNT = 10') && source.totp.includes("createHash('sha256')"), 'RECOVERY_ENTROPY');
  require(source.service.includes("purpose: 'noma:mfa-seed'") && source.service.includes("factorType: 'TOTP'") && source.apiRuntime.includes('new SensitiveFieldProtector') && source.apiRuntime.includes('createAwsKmsManagedKeyProvider'), 'SEC003_REUSE');
  require(!source.apiRuntime.includes('@noma/integrations/testing') && !source.apiRuntime.includes('TestOnlyManagedKeyProvider'), 'NO_PRODUCTION_TEST_KEY');
  require(source.repository.includes('FOR UPDATE OF u, s') && source.repository.includes('lastAcceptedTimeStep: { lt: input.matchedTimeStep }') && source.repository.includes('result.count !== 1'), 'POSTGRES_REPLAY');
  require(source.repository.includes('consumedAt: null') && source.repository.includes('consumed.count !== 1') && source.repository.includes("status: 'ACTIVE'"), 'RECOVERY_ONE_USE');
  require(source.repository.includes('securityVersion: { increment: 1 }') && source.repository.includes('await revokeSessions(transaction') && source.repository.includes('absoluteExpiresAt: session.absoluteExpiresAt'), 'SESSION_ROTATION');
  require(source.assurance.includes('age >= 0 && age < maximumAge') && source.assurance.includes('session.mfaFactorId === record.activeMfaFactorId') && !source.assurance.includes('session.assurance ==='), 'DERIVED_ASSURANCE');
  require(source.service.includes('requireSessionStepUp') && source.repository.includes('strength[existing.requirement] >= strength[input.requirement]') && source.api.includes("requirement: 'MFA_AND_RECENT'"), 'SERVER_CHOSEN_STEP_UP');
  require(!/requireString\(body, ['"]requirement['"]/.test(source.api) && !/input\.requirement\s*=\s*body\./.test(source.api), 'NO_CLIENT_REQUIREMENT');
  require(source.service.includes('MFA_RECOVERY_REVIEW_REQUIRED') && source.repository.includes("code: 'MFA_FACTOR_REMOVED'") && source.repository.includes("code: 'MFA_RECOVERY_CODES_REGENERATED'"), 'OWNED_RECOVERY_AND_NOTICES');
  require(source.worker.includes("eventCode.startsWith('MFA_')") && source.worker.includes('MFA_NOTICE_RECIPIENT_UNAVAILABLE') && source.worker.includes('deadLetterJobExecution'), 'MFA_NOTICE_NO_SILENT_DROP');
  require(source.service.includes("normalizedEmail: `${context.user.id}|${factorId ?? 'none'}`") && !source.service.includes('context.session.id}|${factorId'), 'CROSS_SESSION_RATE_LIMIT');
  require(source.existingRecovery.includes("revocationCode: 'PASSWORD_RECOVERED'") && !/mfaFactor\.(?:update|delete)/.test(source.existingRecovery), 'IAM003_PRESERVATION');
  require(source.roleAccess.includes('notFound()') && !source.roleAccess.includes('MFA_VERIFIED'), 'PROTECTED_SURFACES_FAIL_CLOSED');
  require(!/console\.(?:log|error|warn)/.test(source.service + source.repository + source.totp) && !/payload:.*(?:seed|token|recoveryCodes)/.test(source.repository), 'NO_SECRET_TELEMETRY');
  require(source.config.includes('NOMA_MFA_PASSWORD_FRESH_MS') && source.config.includes('NOMA_MFA_FRESH_MS') && source.config.includes('NOMA_MFA_CHALLENGE_MS'), 'BOUNDED_FRESHNESS_CONFIG');
  require(source.rootManifest.includes('iam004:verify') && source.ci.includes('iam004:integration-test') && source.ci.includes('iam004:self-test'), 'EXISTING_CI_GATES');
  require(source.taskIndex.includes('IAM-003,EP03,Implement email verification and password recovery,P0,P0-AUTHORITY,COMPLETE'), 'IAM003_COMPLETE');
  require(source.taskIndex.includes('IAM-004,EP03,Implement privileged MFA and recent-authentication assurance,P0,P0-AUTHORITY,COMPLETE'), 'IAM004_COMPLETE');
  require(source.taskIndex.includes('IAM-005,EP03,"Implement membership, role grant, capability, and scope model",P0,P0-AUTHORITY,COMPLETE'), 'IAM005_COMPLETE');
  return errors;
}

const current = await sources();
if (process.argv.includes('--self-test')) {
  const fixtures = [
    ['ranged OTP pin', { securityManifest: current.securityManifest.replace('"otpauth": "9.5.2"', '"otpauth": "^9.5.2"') }],
    ['missing factor', { schema: current.schema.replace('model MfaFactor {', 'model MissingFactor {') }],
    ['backfilled legacy proof', { migration: `${current.migration}\nUPDATE sessions SET password_authenticated_at = NOW();` }],
    ['missing active uniqueness', { migration: current.migration.replace('mfa_factors_one_active_totp_per_user', 'removed_active_constraint') }],
    ['missing pending uniqueness', { migration: current.migration.replace('mfa_factors_one_pending_totp_per_user', 'removed_pending_constraint') }],
    ['weakened TOTP skew', { totp: current.totp.replace('skewSteps: 1', 'skewSteps: 3') }],
    ['short recovery code', { totp: current.totp.replace('randomBytes(16)', 'randomBytes(8)') }],
    ['missing AAD factor binding', { service: current.service.replace("factorType: 'TOTP'", 'factorType: undefined') }],
    ['production test provider', { apiRuntime: `${current.apiRuntime}\nimport { TestOnlyManagedKeyProvider } from '@noma/integrations/testing';` }],
    ['no database row lock', { repository: current.repository.replace('FOR UPDATE OF u, s', 'FOR SHARE OF u, s') }],
    ['no replay predicate', { repository: current.repository.replaceAll('lastAcceptedTimeStep: { lt: input.matchedTimeStep }', 'lastAcceptedTimeStep: { gte: input.matchedTimeStep }') }],
    ['stale enum authority', { assurance: `${current.assurance}\nconst unsafe = session.assurance === 'PRIVILEGED_MFA_RECENT';` }],
    ['client-selected requirement', { api: `${current.api}\nconst requirement = requireString(body, 'requirement', 32);` }],
    ['protected role bypass', { roleAccess: current.roleAccess.replace('notFound()', 'return true') }],
    ['raw secret logging', { service: `${current.service}\nconsole.log(seed);` }],
    ['session-scoped MFA limiter', { service: current.service.replace("normalizedEmail: `${context.user.id}|${factorId ?? 'none'}`", "normalizedEmail: `${context.user.id}|${context.session.id}|${factorId ?? 'none'}`") }],
    ['MFA notice silently dropped', { worker: current.worker.replace("eventCode.startsWith('MFA_')", "eventCode.startsWith('NEVER_')") }],
    ['unbounded challenge', { config: current.config.replace('NOMA_MFA_CHALLENGE_MS', 'REMOVED_CHALLENGE_BOUND') }],
    ['missing security CI', { ci: current.ci.replaceAll('iam004:self-test', 'removed-iam004-self-test') }],
    ['regressed IAM-004', { taskIndex: current.taskIndex.replace('IAM-004,EP03,Implement privileged MFA and recent-authentication assurance,P0,P0-AUTHORITY,COMPLETE', 'IAM-004,EP03,Implement privileged MFA and recent-authentication assurance,P0,P0-AUTHORITY,IN_REVIEW') }],
  ];
  for (const [name, changes] of fixtures) {
    if (validate({ ...current, ...changes }).length === 0) throw new Error(`IAM-004 negative fixture accepted: ${name}`);
  }
  console.log(`PASS: ${fixtures.length} IAM-004 negative authority fixtures rejected`);
} else {
  const errors = validate(current);
  if (errors.length) {
    for (const error of errors) console.error(`FAIL: ${error}`);
    process.exit(1);
  }
  console.log('PASS: IAM-004 encrypted seed, PostgreSQL replay, one-use recovery, assurance, step-up, and boundary policy');
}
