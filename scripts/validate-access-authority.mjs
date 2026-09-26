import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const paths = Object.freeze({
  schema: 'packages/database/prisma/schema.prisma',
  migration: 'packages/database/prisma/migrations/20260915000100_iam_005_access_authority/migration.sql',
  repository: 'packages/database/src/access.ts',
  identity: 'packages/database/src/identity.ts',
  contracts: 'packages/platform/src/access/contracts.ts',
  platformManifest: 'packages/platform/package.json',
  protectedAccess: 'apps/web/src/shells/protected/protected-surface-access.server.ts',
  rootManifest: 'package.json',
  ci: 'scripts/ci-command-catalog.mjs',
  taskIndex: 'delivery/traceability/task-index.csv',
});

async function loadSources() {
  return Object.fromEntries(await Promise.all(
    Object.entries(paths).map(async ([key, path]) => [key, await readFile(new URL(path, root), 'utf8')]),
  ));
}

const expectedCapabilities = Object.freeze([
  'access.assignment.read',
  'access.assignment.request',
  'access.assignment.grant',
  'access.assignment.revoke',
  'access.approval.read',
  'access.approval.decide',
  'access.temporary.request',
  'access.temporary.grant',
  'access.temporary.revoke',
  'access.service-principal.read',
  'access.service-principal.create',
  'access.service-principal.rotate',
  'access.service-principal.revoke',
]);

function validate(source) {
  const failures = [];
  const require = (condition, code) => { if (!condition) failures.push(code); };
  const accessSchema = source.schema.slice(source.schema.indexOf('model AccessScope'), source.schema.indexOf('model AuditEvent'));
  const servicePrincipalSchema = source.schema.slice(source.schema.indexOf('model ServicePrincipal'), source.schema.indexOf('model AuditEvent'));

  require(['AccessScope', 'Capability', 'RoleTemplate', 'RoleTemplateAllowedScope', 'RoleTemplateAllowedSubject', 'RoleTemplateCapability', 'RoleAssignment', 'ApprovalRequest', 'ApprovalDecision', 'TemporaryAccessGrant', 'ServicePrincipal']
    .every((model) => source.schema.includes(`model ${model} {`)), 'ACCESS_MODELS');
  require(!/model (?:InstitutionMembership|SellerMembership|RiderMembership|StaffMembership)\s*\{/.test(source.schema), 'NO_BUSINESS_MEMBERSHIPS');
  require(!/\n\s+role\s+(?:String|[A-Za-z]+Role)\b/.test(source.schema), 'NO_GLOBAL_ROLE_FIELD');
  require(!/\bJson\b/.test(accessSchema), 'NO_JSON_AUTHORITY');
  require(source.schema.includes('CHECK (("subject_type" = \'HUMAN\'') || source.migration.includes('role_assignments_subject_xor_check'), 'SUBJECT_XOR');
  require(source.migration.includes('CREATE EXTENSION IF NOT EXISTS btree_gist')
    && source.migration.includes('role_assignments_user_no_overlap')
    && source.migration.includes('role_assignments_service_no_overlap')
    && source.migration.includes("tstzrange(\"valid_from\", \"valid_until\", '[)')"), 'TEMPORAL_EXCLUSION');
  require(source.migration.includes('role_assignments_allowed_scope_fkey')
    && source.migration.includes('role_assignments_allowed_subject_fkey')
    && source.migration.includes('role_assignments_scope_shape_fkey'), 'RELATIONAL_COMPATIBILITY');
  require(source.migration.includes('access_scopes_shape_check')
    && source.migration.includes('access_scopes_platform_singleton_key')
    && source.migration.includes('access_scopes_immutable'), 'EXACT_SCOPE_MODEL');
  require(source.migration.includes('activated role template mappings are immutable')
    && source.migration.includes('role_templates_lifecycle_guard'), 'IMMUTABLE_TEMPLATES');
  require(source.migration.includes('approval_decisions_append_only')
    && source.migration.includes('approval_requests_immutable_facts')
    && source.migration.includes('requestor cannot approve their own request')
    && source.migration.includes('target user cannot approve their own privileged grant'), 'MAKER_CHECKER');
  require(source.migration.includes('temporary PLATFORM access is prohibited')
    && source.migration.includes('temporary access requires finite expiry')
    && source.migration.includes('temporary_access_grants_immutable'), 'TEMPORARY_ACCESS_BOUND');
  require(source.migration.includes('service_principals_environment_code_key')
    && source.migration.includes('service_principals_immutable')
    && /environment\s+String\s+@db\.VarChar\(20\)/.test(servicePrincipalSchema)
    && !/(?:password|mfaFactor|session)\s+/i.test(servicePrincipalSchema), 'SERVICE_PRINCIPAL_ISOLATION');
  require(expectedCapabilities.every((code) => source.contracts.includes(`'${code}'`) && source.migration.includes(`'${code}'`)), 'CAPABILITY_CATALOGUE');
  require(!/['"](?:admin\.\*|seller\.\*|finance\.\*)['"]/.test(source.migration + source.contracts)
    && source.contracts.includes("value.includes('*')"), 'NO_WILDCARDS');
  require(!/(?:parentRole|inherits|roleHierarchy)/i.test(source.contracts + source.schema), 'NO_ROLE_INHERITANCE');
  require(source.contracts.includes("'SELF'") && source.contracts.includes("'PLATFORM'")
    && source.contracts.includes('isRoleAssignmentActive') && source.contracts.includes('at < assignment.validUntil'), 'HALF_OPEN_VALIDITY');
  require(source.contracts.includes('evaluateAuthenticationAssurance')
    && source.contracts.includes('evaluateAuthorityFactAssurance'), 'IAM004_ASSURANCE_REUSE');
  require(source.repository.includes('containIdentitySessionsForAuthorityChange')
    && source.identity.includes('PRIVILEGED_ACCESS_GRANTED')
    && source.identity.includes('PRIVILEGED_ACCESS_REVOKED'), 'ATOMIC_SESSION_CONTAINMENT');
  require(!/transaction\.(?:user|session)\.(?:create|update|updateMany|delete|deleteMany)/.test(source.repository), 'NO_DIRECT_IDENTITY_WRITES');
  require(source.repository.includes('FOR UPDATE OF ra')
    && source.repository.includes('lockActiveAuthorityFactForUse')
    && source.repository.includes('sp."environment" = ${expectedEnvironment}'), 'REVOKE_USE_LOCK');
  require(source.repository.includes('resolveActiveAuthorityFacts')
    && !/\b(?:allow|deny|authorize)\s*\(/i.test(source.repository), 'FACTS_NOT_FINAL_POLICY');
  require(source.platformManifest.includes('"./access"') && source.platformManifest.includes('./dist/access/index.js'), 'PLATFORM_ACCESS_EXPORT');
  require(source.protectedAccess.includes('notFound()')
    && !/(?:RoleAssignment|resolveActiveAuthorityFacts|capability)/.test(source.protectedAccess), 'PROTECTED_SURFACES_FAIL_CLOSED');
  require(source.rootManifest.includes('iam005:verify')
    && source.ci.includes('iam005:integration-test')
    && source.ci.includes('iam005:self-test'), 'CI_GRAPH');
  require(source.taskIndex.includes('IAM-004,EP03,Implement privileged MFA and recent-authentication assurance,P0,P0-AUTHORITY,COMPLETE'), 'IAM004_COMPLETE');
  require(source.taskIndex.includes('IAM-005,EP03,"Implement membership, role grant, capability, and scope model",P0,P0-AUTHORITY,COMPLETE'), 'IAM005_COMPLETE');
  require(source.taskIndex.includes('IAM-006,EP03,Implement central authorization policy engine,P0,P0-AUTHORITY,COMPLETE'), 'IAM006_COMPLETE');
  return failures;
}

const current = await loadSources();
if (process.argv.includes('--self-test')) {
  const fixtures = [
    ['global role field', { schema: `${current.schema}\nmodel UnsafeUserRole {\n  id String @id\n  role String\n}` }],
    ['business membership', { schema: `${current.schema}\nmodel SellerMembership { id String @id }` }],
    ['JSON authority', { schema: current.schema.replace('model AccessScope {', 'model AccessScope {\n  unsafeAuthority Json?') }],
    ['wildcard capability', { contracts: `${current.contracts}\nconst unsafe = 'seller.*';` }],
    ['missing subject XOR', { migration: current.migration.replaceAll('role_assignments_subject_xor_check', 'removed_subject_xor') }],
    ['missing user overlap', { migration: current.migration.replaceAll('role_assignments_user_no_overlap', 'removed_user_overlap') }],
    ['missing service overlap', { migration: current.migration.replaceAll('role_assignments_service_no_overlap', 'removed_service_overlap') }],
    ['mutable templates', { migration: current.migration.replaceAll('role_templates_lifecycle_guard', 'removed_template_guard') }],
    ['unrestricted platform template', { migration: current.migration.replaceAll('role_assignments_allowed_scope_fkey', 'removed_allowed_scope') }],
    ['temporary platform access', { migration: current.migration.replace('temporary PLATFORM access is prohibited', 'temporary platform access accepted') }],
    ['missing maker checker', { migration: current.migration.replace('requestor cannot approve their own request', 'requestor may approve') }],
    ['mutable decision', { migration: current.migration.replaceAll('approval_decisions_append_only', 'removed_append_only') }],
    ['direct Identity write', { repository: `${current.repository}\nasync function unsafe(transaction) { await transaction.session.updateMany({ data: {} }); }` }],
    ['missing revoke-use lock', { repository: current.repository.replace('FOR UPDATE OF ra', 'FOR SHARE OF ra') }],
    ['role inheritance', { contracts: `${current.contracts}\nconst roleHierarchy = new Map();` }],
    ['protected surface opened', { protectedAccess: current.protectedAccess.replace('notFound()', 'return undefined') }],
    ['missing security CI', { ci: current.ci.replaceAll('iam005:self-test', 'removed-iam005-self-test') }],
    ['regressed IAM-005 completion', { taskIndex: current.taskIndex.replace('IAM-005,EP03,"Implement membership, role grant, capability, and scope model",P0,P0-AUTHORITY,COMPLETE', 'IAM-005,EP03,"Implement membership, role grant, capability, and scope model",P0,P0-AUTHORITY,IN_REVIEW') }],
    ['missing IAM-006 handoff', { taskIndex: current.taskIndex.replace('IAM-006,EP03,Implement central authorization policy engine,P0,P0-AUTHORITY,COMPLETE', 'IAM-006,EP03,Implement central authorization policy engine,P0,P0-AUTHORITY,NOT_STARTED') }],
  ];
  for (const [name, changes] of fixtures) {
    if (validate({ ...current, ...changes }).length === 0) throw new Error(`IAM-005 negative fixture accepted: ${name}`);
  }
  console.log(`PASS: ${fixtures.length} IAM-005 authority regressions rejected`);
} else {
  const failures = validate(current);
  if (failures.length > 0) {
    failures.forEach((failure) => console.error(`FAIL: ${failure}`));
    process.exit(1);
  }
  console.log('PASS: IAM-005 exact scope, versioned template, assignment, maker-checker, and service-principal policy');
}
