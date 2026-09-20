import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const paths = Object.freeze({
  privacy: 'packages/platform/src/privacy/index.ts',
  database: 'packages/database/src/access-disclosure.ts',
  binding: 'apps/api/src/authorization/access-disclosure.ts',
  pep: 'apps/api/src/authorization/authorization.service.ts',
  security: 'packages/security/src/masking.ts',
  apiRegistry: 'apps/api/src/authorization/api-operation-registry.ts',
  web: 'apps/web/src/shells/protected/protected-surface-access.server.ts',
  schema: 'packages/database/prisma/schema.prisma',
  manifest: 'package.json',
  ci: 'scripts/ci-command-catalog.mjs',
  taskIndex: 'delivery/traceability/task-index.csv',
});
const source = Object.fromEntries(await Promise.all(Object.entries(paths).map(async ([name, path]) => [name, await readFile(new URL(path, root), 'utf8')])));

function validate(s) {
  const failures = [];
  const require = (condition, code) => { if (!condition) failures.push(code); };
  require(s.privacy.includes("'OMIT', 'DERIVED', 'MASKED', 'FULL'")
    && s.privacy.includes("'PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED', 'SECRET'")
    && s.privacy.includes("field.classification === 'SECRET' && field.mode !== 'OMIT'")
    && s.privacy.includes("field.mode === 'FULL' && (!field.fullPurpose?.trim()"), 'CLOSED_FIELD_MODES');
  require(s.privacy.includes('Duplicate disclosure projection')
    && s.privacy.includes('entries.get(id) ?? null')
    && s.privacy.includes('registry.contains(projection)')
    && !/admin\.v1|all-fields|ADMIN_ALL_FIELDS|\brole\s*===?\s*['"]ADMIN/.test(s.privacy + s.binding), 'CLOSED_REGISTRY');
  require(s.binding.includes("ACCESS_ASSIGNMENT_SUMMARY_POLICY_ID = 'access.assignment.read.v1'")
    && s.binding.includes("id: 'access.assignment.summary.v1'")
    && s.binding.includes('authorization.executeProtectedRead(database')
    && s.binding.indexOf('readAccessAssignmentSummarySource(transaction') > s.binding.indexOf('authorization.executeProtectedRead(database')
    && s.binding.includes('projectDisclosure(accessDisclosureRegistry, accessAssignmentSummaryProjection')
    && !/(?:request|body|query|params|header|cookie|localStorage)(?:\.[a-zA-Z0-9_]+)*\.(?:projectionId|fields|include|expand|mode|decrypt)\b/i.test(s.binding), 'SERVER_BINDING_AFTER_ALLOW');
  require(s.database.includes('select: ACCESS_ASSIGNMENT_SUMMARY_SELECT')
    && s.database.includes('where: { id: assignmentId, scopeId: authorizedScopeId }')
    && !/include\s*:|select\s*:\s*undefined|\.findUnique\s*\(/.test(s.database)
    && !/grantReason:\s*true|userId:\s*true|roleTemplateId:\s*true/.test(s.database), 'MINIMUM_DATABASE_SELECT');
  require(s.privacy.includes('result[key] = value')
    && s.privacy.includes("typeof value !== 'string'")
    && s.privacy.includes('Object.keys(mapped).length !== expected.length')
    && s.privacy.includes("} catch {\n    // Never let a mapper or exotic source value place raw data in a public error.\n    throw new Error('Disclosure unavailable');")
    && !/return\s+\{\s*\.\.\.(?:source|record|databaseRecord)|return\s+(?:source|record|databaseRecord)\s*;/.test(s.privacy + s.binding), 'EXACT_DTO');
  require(s.pep.includes("decision.decision === 'DENY'")
    && s.pep.includes('operation.execute(transaction, decision)')
    && s.pep.includes("status: 'UNAVAILABLE'")
    && s.pep.includes("return Object.freeze({ 'Cache-Control': 'no-store' as const })")
    && !/reasonCode:\s*error\.decision\.reasonCode/.test(s.pep), 'DENY_AND_NO_STORE');
  require(s.security.includes('export function maskSensitiveValue')
    && !/function maskSensitiveValue|function maskValue|function redactValue/.test(s.privacy + s.binding)
    && !/SensitiveFieldProtector|ManagedKeyProvider|decrypt\(/.test(s.binding), 'SEC003_REUSE_NO_BROAD_DECRYPT');
  require(!/model\s+(DisclosureProjection|AuditEvent)|projection_registry|projection_version/.test(s.schema)
    && !/IAM006_PROTECTED[^\n]*policyId: ['"]/.test(s.apiRegistry)
    && s.web.includes('notFound()'), 'NO_PREMATURE_ACTIVATION');
  require(s.taskIndex.includes('IAM-006,EP03,Implement central authorization policy engine,P0,P0-AUTHORITY,COMPLETE')
    && s.taskIndex.includes('IAM-007,EP03,Implement field-level projections and sensitive-data redaction,P0,P0-PRIVACY,IN_REVIEW')
    && s.taskIndex.includes('IAM-008,EP03,Implement append-only audit service and privileged-action timeline,P0,P0-AUTHORITY,NOT_STARTED'), 'ONE_TASK_LAG');
  require(s.manifest.includes('iam007:verify') && s.ci.includes('iam007-validate')
    && s.ci.includes('iam007-self-test') && s.ci.includes('iam007-unit'), 'FIVE_GATE_REGISTRATION');
  return failures;
}

if (process.argv.includes('--self-test')) {
  const fixtures = [
    ['unknown fallback', { privacy: source.privacy.replace('entries.get(id) ?? null', 'entries.get(id) ?? entries.values().next().value') }],
    ['wildcard', { binding: `${source.binding}\nconst all = 'all-fields';` }],
    ['role disclosure', { binding: `${source.binding}\nconst reveal = role === 'ADMIN';` }],
    ['client fields', { binding: `${source.binding}\nconst selected = request.query.fields;` }],
    ['client mode', { binding: `${source.binding}\nconst selected = request.body.mode;` }],
    ['full record', { binding: `${source.binding}\nreturn { ...databaseRecord };` }],
    ['broad select', { database: source.database.replace('select: ACCESS_ASSIGNMENT_SUMMARY_SELECT', 'select: undefined') }],
    ['forbidden source column', { database: `${source.database}\nconst unsafe = { grantReason: true };` }],
    ['missing PEP', { binding: source.binding.replace('authorization.executeProtectedRead(database', 'executeWithoutAuthorization(database') }],
    ['missing no-store', { pep: source.pep.replaceAll("'Cache-Control': 'no-store'", "'Cache-Control': 'public'") }],
    ['duplicate mask', { binding: `${source.binding}\nfunction maskSensitiveValue() { return ''; }` }],
    ['broad decrypt', { binding: `${source.binding}\nconst raw = decrypt(value);` }],
    ['premature audit', { schema: `${source.schema}\nmodel AuditEvent { id String @id }` }],
    ['activated Web', { web: source.web.replace('notFound()', 'return undefined') }],
    ['advanced IAM008', { taskIndex: source.taskIndex.replace('timeline,P0,P0-AUTHORITY,NOT_STARTED', 'timeline,P0,P0-AUTHORITY,IN_REVIEW') }],
  ];
  for (const [name, patch] of fixtures) {
    if (validate({ ...source, ...patch }).length === 0) throw new Error(`IAM-007 negative fixture accepted: ${name}`);
  }
  console.log(`PASS: ${fixtures.length} IAM-007 privacy regressions rejected`);
} else {
  const failures = validate(source);
  if (failures.length) {
    failures.forEach((failure) => console.error(`FAIL: ${failure}`));
    process.exitCode = 1;
  } else console.log('PASS: IAM-007 closed disclosure, minimum query, PEP, and no-store boundaries');
}
