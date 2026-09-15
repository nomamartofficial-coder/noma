import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const files = {
  contracts: 'packages/platform/src/identity/contracts.ts',
  service: 'packages/platform/src/identity/verification-recovery-service.ts',
  queue: 'packages/platform/src/identity/verification-recovery.ts',
  database: 'packages/database/src/identity.ts',
  token: 'packages/security/src/identity-token.ts',
  limiter: 'packages/integrations/src/identity-auth-rate-limiter.ts',
  server: 'packages/config/src/server.ts',
  postmark: 'packages/integrations/src/postmark-email.ts',
  worker: 'apps/worker/src/identity-email-handler.ts',
  dispatcher: 'apps/worker/src/outbox-dispatcher.ts',
  workerRuntime: 'apps/worker/src/queue-runtime.service.ts',
  api: 'apps/api/src/auth/auth.controller.ts',
  web: 'apps/web/src/identity/identity-public-flow.tsx',
  publicEnvironment: 'apps/web/src/config/public-environment.ts',
  taskIndex: 'delivery/traceability/task-index.csv',
};

async function sources() {
  return Object.fromEntries(await Promise.all(Object.entries(files).map(async ([key, path]) => [key, await readFile(new URL(path, root), 'utf8')])));
}

function validate(source) {
  const failures = [];
  const require = (condition, code) => { if (!condition) failures.push(code); };
  const postmarkLines = new Set(source.postmark.split(/\r?\n/u).map((line) => line.trim()));
  require(source.token.includes('randomBytes(32)') && source.token.includes("createHash('sha256')") && source.token.includes("toString('base64url')"), 'TOKEN_ISSUER');
  require(source.contracts.includes('confirmEmailVerification') && source.contracts.includes('completePasswordRecovery') && source.contracts.includes('issueReplacementIdentityToken'), 'PERSISTENCE_AUTHORITY');
  require(source.database.includes("status: 'RECOVERY_LOCKED'") && source.database.includes("securityVersion: { increment: 1 }") && source.database.includes("revocationCode: 'PASSWORD_RECOVERED'"), 'RECOVERY_ATOMICITY');
  require(source.database.includes("purpose: 'EMAIL_VERIFICATION'") && source.database.includes('presentedSessionTokenDigest') && source.database.includes("assurance: 'CONTACT_VERIFIED'"), 'VERIFICATION_AUTHORITY');
  require(source.queue.includes("queueName: 'email'") && source.queue.includes("privacyClassification: 'account-private'") && !source.queue.includes('rawToken'), 'SAFE_DURABLE_PAYLOAD');
  require(source.worker.includes('proofTokens.issue()') && source.worker.includes('EMAIL_PROVIDER_ACCEPTANCE_UNKNOWN') && source.worker.includes('already-issued') && source.worker.includes('superseded') && source.worker.includes('job.event.occurredAt') && source.worker.includes('context.attemptsMade + 1') && source.worker.includes('deriveIdentityDeliveryAttemptId(job.jobId, context.attemptsMade)'), 'DELIVERY_AMBIGUITY');
  require(source.dispatcher.includes('deferredJobNames') && source.dispatcher.includes('JOB_CONTRACT_DEFERRED') && source.workerRuntime.includes('IDENTITY_EMAIL_DELIVERY_CONTRACT.jobName') && source.workerRuntime.includes("providerAdapterMode === 'real'"), 'INACTIVE_PROVIDER_PRESERVES_OUTBOX');
  require(postmarkLines.has("const POSTMARK_ENDPOINT = 'https://api.postmarkapp.com/email/withTemplate';") && source.postmark.includes("redirect: 'error'") && !source.postmark.includes('console.'), 'POSTMARK_BOUNDARY');
  for (const action of ['EMAIL_VERIFICATION_REQUEST', 'EMAIL_VERIFICATION_CONFIRM', 'PASSWORD_RECOVERY_REQUEST', 'PASSWORD_RECOVERY_COMPLETE']) {
    require(source.limiter.includes(action), `RATE_LIMIT_${action}`);
    require(source.server.includes(`NOMA_${action}`), `RATE_LIMIT_CONFIG_${action}`);
  }
  for (const route of ['email-verification/request', 'email-verification/confirm', 'password-recovery/request', 'password-recovery/complete']) require(source.api.includes(route), `API_${route}`);
  require(source.web.includes('window.history.replaceState') && source.web.includes("method: 'POST'") && source.web.includes('publicEnvironment.apiBaseUrl') && !source.web.includes('process.env.') && !source.web.includes('console.') && source.publicEnvironment.includes('loadPublicEnvironment'), 'TOKEN_PAGE_BOUNDARY');
  require(source.service.includes('preflightPasswordRecovery') && source.service.indexOf('preflightPasswordRecovery') < source.service.indexOf('passwordHasher.hash'), 'ARGON_PREFLIGHT');
  require(source.taskIndex.includes('IAM-002,EP03,"Implement password registration, sign-in, sign-out, and session rotation",P0,P0-AUTHORITY,COMPLETE'), 'IAM002_LIFECYCLE');
  require(source.taskIndex.includes('IAM-003,EP03,Implement email verification and password recovery,P0,P0-AUTHORITY,COMPLETE'), 'IAM003_LIFECYCLE');
  require(source.taskIndex.includes('IAM-004,EP03,Implement privileged MFA and recent-authentication assurance,P0,P0-AUTHORITY,COMPLETE'), 'IAM004_LIFECYCLE');
  return failures;
}

const current = await sources();
if (process.argv.includes('--self-test')) {
  const fixtures = [
    ['raw token in queue', { ...current, queue: `${current.queue}\nconst rawToken = 'forbidden';` }],
    ['weak issuer', { ...current, token: current.token.replace('randomBytes(32)', 'randomBytes(16)') }],
    ['blind uncertainty retry', { ...current, worker: current.worker.replace('EMAIL_PROVIDER_ACCEPTANCE_UNKNOWN', 'EMAIL_PROVIDER_RETRY') }],
    ['database lease drives new proof', { ...current, worker: current.worker.replace('context.attemptsMade + 1', 'acquisition.attemptNumber') }],
    ['provider-disabled dead letter', { ...current, dispatcher: current.dispatcher.replace('JOB_CONTRACT_DEFERRED', 'UNREGISTERED_JOB_CONTRACT') }],
    ['alternate provider endpoint', { ...current, postmark: current.postmark.replace('https://api.postmarkapp.com/email/withTemplate', 'https://api.postmarkapp.com/email/withTemplate.attacker.invalid') }],
    ['unvalidated public environment', { ...current, web: current.web.replace('publicEnvironment.apiBaseUrl', 'process.env.NEXT_PUBLIC_API_BASE_URL') }],
    ['missing preflight', { ...current, service: current.service.replace('preflightPasswordRecovery', 'removedPreflight') }],
    ['regressed IAM-004', { ...current, taskIndex: current.taskIndex.replace('IAM-004,EP03,Implement privileged MFA and recent-authentication assurance,P0,P0-AUTHORITY,COMPLETE', 'IAM-004,EP03,Implement privileged MFA and recent-authentication assurance,P0,P0-AUTHORITY,NOT_STARTED') }],
  ];
  for (const [name, fixture] of fixtures) {
    if (validate(fixture).length === 0) throw new Error(`IAM-003 negative fixture was accepted: ${name}`);
  }
  console.log('PASS: IAM-003 token, authority, ambiguity, privacy, preflight, and lifecycle negative fixtures were rejected');
} else {
  const failures = validate(current);
  if (failures.length) throw new Error(`IAM-003 validation failed: ${failures.join(', ')}`);
  console.log('PASS: IAM-003 email verification, recovery, Postmark, rate-limit, Web, and authority policies');
}
