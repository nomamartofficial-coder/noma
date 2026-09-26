import { access, readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const paths = Object.freeze({
  registry: 'packages/platform/src/audit/index.ts',
  schema: 'packages/database/prisma/schema.prisma',
  migration: 'packages/database/prisma/migrations/20260925000100_iam_008_append_only_audit/migration.sql',
  database: 'packages/database/src/audit.ts',
  identity: 'packages/database/src/identity.ts',
  mfa: 'packages/database/src/mfa.ts',
  access: 'packages/database/src/access.ts',
  outbox: 'packages/database/src/outbox.ts',
  policy: 'packages/platform/src/access/policy/registry.ts',
  binding: 'apps/api/src/authorization/audit-disclosure.ts',
  viewer: 'apps/web/src/audit/audit-viewer.tsx',
  viewerStory: 'apps/web/stories/audit.stories.tsx',
  storyContracts: 'apps/web/stories/contracts.ts',
  protectedBoundary: 'apps/web/src/shells/protected/protected-surface-access.server.ts',
  manifest: 'package.json',
  ci: 'scripts/ci-command-catalog.mjs',
  taskIndex: 'delivery/traceability/task-index.csv',
  adr: 'docs/adr/0025-append-only-audit-service-and-privileged-action-timeline.md',
  evidence: 'docs/evidence/iam-008/README.md',
  readme: 'README.md',
  testing: 'TESTING.md',
  ciDoc: 'CI.md',
  databaseDoc: 'DATABASE.md',
  accessDoc: 'ACCESS.md',
  authorizationDoc: 'AUTHORIZATION.md',
});

const APPROVED_ACTIONS = Object.freeze([
  'identity.password.recovery.complete', 'identity.mfa.factor.activate', 'identity.mfa.factor.replace',
  'identity.mfa.factor.remove', 'identity.mfa.recovery-codes.regenerate', 'identity.assurance.step-up.complete',
  'access.scope.create', 'access.role-template.create', 'access.role-template.activate', 'access.role-template.retire',
  'access.capability.retire', 'access.service-principal.create', 'access.service-principal.rotate',
  'access.service-principal.revoke', 'access.assignment.grant', 'access.assignment.revoke',
  'access.temporary-access.grant', 'access.temporary-access.revoke', 'access.approval.request',
  'access.approval.decide', 'audit.event.read',
]);
const REQUIRED_GATE_NAMES = Object.freeze([
  'Noma / CI Policy', 'Noma / Quality Gate', 'Noma / Integration Gate', 'Noma / Security Gate', 'Noma / Windows Compatibility',
]);

async function load() {
  for (const path of Object.values(paths)) await access(new URL(path, root));
  return Object.fromEntries(await Promise.all(Object.entries(paths).map(async ([name, path]) => [name, await readFile(new URL(path, root), 'utf8')])));
}

function validate(source) {
  const failures = [];
  const require = (condition, code) => { if (!condition) failures.push(code); };
  let manifest = {};
  try { manifest = JSON.parse(source.manifest); } catch { failures.push('MANIFEST_JSON'); }
  const actionSection = source.registry.match(/export const AUDIT_ACTION_CODES = \[([\s\S]*?)\] as const;/)?.[1] ?? '';
  const actionCodes = [...actionSection.matchAll(/'([^']+)'/g)].map((match) => match[1]);
  const iamCommands = Object.keys(manifest.scripts ?? {}).filter((name) => name.startsWith('iam008:')).sort();

  require(JSON.stringify(actionCodes) === JSON.stringify(APPROVED_ACTIONS)
    && !actionCodes.includes('access.assignment.read') && !actionCodes.some((code) => code.includes('*')), 'EXACT_CLOSED_CATALOGUE');
  require(source.registry.includes('Duplicate audit action')
    && source.registry.includes('Unknown or invalid audit action')
    && source.registry.includes("validateSummary(input.beforeSummary, definition.beforeFields, 'before summary')")
    && source.registry.includes("validateSummary(input.afterSummary, definition.afterFields, 'after summary')")
    && source.registry.includes('preparedEvents')
    && !source.registry.includes('Record<string, unknown>'), 'TYPED_REGISTRY_AND_SUMMARIES');
  require(source.schema.includes('model AuditEvent {') && source.schema.includes('model AuditEventLink {')
    && source.schema.includes('@@unique([sourceModule, actionCode, operationId]')
    && !/enum\s+AuditSeverity|audit_severity|\bseverity\b/i.test(source.schema), 'ADDITIVE_SCHEMA_NO_INVENTED_SEVERITY');
  require(source.migration.includes('BEFORE UPDATE OR DELETE ON "audit_events"')
    && source.migration.includes('BEFORE UPDATE OR DELETE ON "audit_event_links"')
    && source.migration.includes("ERRCODE = '55000'")
    && !/ON DELETE CASCADE|\bDROP\s+(?:TABLE|COLUMN|TYPE)\b|\bTRUNCATE\b/i.test(source.migration)
    && !/audit_severity|\bseverity\b/i.test(source.migration), 'DATABASE_APPEND_ONLY');
  require(source.migration.includes("'audit.event.read'")
    && !/INSERT INTO "role_template_capabilities"[\s\S]*audit\.event\.read/i.test(source.migration), 'CAPABILITY_WITHOUT_ASSIGNMENT');
  require(source.database.includes('isPreparedAuditEvent(event)')
    && source.database.includes('AUDIT_TIMELINE_ROW_SELECT')
    && source.database.includes('take: input.pageSize')
    && source.database.includes("orderBy: [{ recordedSequence: 'desc' }, { id: 'desc' }]")
    && !/auditEvent\.(?:update|updateMany|delete|deleteMany|upsert)\s*\(/.test(source.database), 'INSERT_ONLY_BOUNDED_DATABASE_API');
  require(source.identity.includes("actionCode: 'identity.password.recovery.complete'")
    && source.mfa.includes("actionCode: old ? 'identity.mfa.factor.replace' : 'identity.mfa.factor.activate'")
    && ['identity.mfa.factor.remove', 'identity.mfa.recovery-codes.regenerate', 'identity.assurance.step-up.complete'].every((code) => source.mfa.includes(`actionCode: '${code}'`))
    && source.identity.lastIndexOf('appendAuditEvent(transaction') < source.identity.lastIndexOf('enqueueSecurityNotice(transaction')
    && source.mfa.includes('appendAuditEvent(transaction')
    && !source.access.includes('appendAuditEvent')
    && !source.outbox.includes('appendAuditEvent'), 'AUTHORITATIVE_CURRENT_MUTATIONS_ONLY');
  const auditPolicy = source.policy.match(/id: 'audit\.event\.read\.v1'[\s\S]*?\n\s*}\),/)?.[0] ?? '';
  require(auditPolicy.includes("permittedActorTypes: ['HUMAN']")
    && auditPolicy.includes("requiredCapability: 'audit.event.read'")
    && auditPolicy.includes("relationship: 'EXACT_SCOPE'")
    && !auditPolicy.includes("'PLATFORM'"), 'HUMAN_EXACT_SCOPE_AUDIT_POLICY');
  require(source.binding.includes("AUDIT_TIMELINE_POLICY_ID = 'audit.event.read.v1'")
    && source.binding.includes("AUDIT_TIMELINE_PROJECTION_ID = 'audit.timeline.row.v1'")
    && source.binding.includes('authorization.executeProtectedRead(database')
    && source.binding.indexOf('readAuditTimelineSources(transaction') > source.binding.indexOf('authorization.executeProtectedRead(database')
    && (source.binding.match(/appendAuditEvent\(transaction/g) ?? []).length === 1
    && !/(?:request|body|query|params|header|cookie|localStorage)(?:\.[A-Za-z0-9_]+)*\.(?:policyId|projectionId|fields|include|expand)/.test(source.binding), 'PEP_MINIMUM_PROJECTION_SINGLE_READ_AUDIT');
  require(source.protectedBoundary.includes('notFound()')
    && source.viewerStory.includes("productionRouteState: 'FAIL_CLOSED'")
    && source.viewer.includes("kind: 'DENIED'")
    && source.viewer.includes("kind: 'MALFORMED_QUERY'")
    && source.storyContracts.includes("composition('audit'")
    && !source.storyContracts.includes("storyId: 'protected-audit"), 'VIEWER_IMPLEMENTED_ROUTE_CLOSED_NO_BASELINE_ACCEPTANCE');
  require(JSON.stringify(iamCommands) === JSON.stringify(['iam008:integration-test', 'iam008:self-test', 'iam008:test', 'iam008:validate', 'iam008:verify'])
    && !source.manifest.includes('iam008:security-test'), 'EXACT_FIVE_COMMANDS');
  require(['quality', 'integration', 'security', 'windows'].every((suite) => source.ci.includes(`${suite}: Object.freeze({`))
    && source.ci.includes("command('iam008-validate'")
    && source.ci.includes("command('iam008-self-test'")
    && source.ci.includes("command('iam008-unit'")
    && source.ci.includes("command('iam008-integration'")
    && REQUIRED_GATE_NAMES.length === 5, 'FIVE_GATE_REGISTRATION');
  require(source.taskIndex.includes('IAM-007,EP03,Implement field-level projections and sensitive-data redaction,P0,P0-PRIVACY,COMPLETE')
    && source.taskIndex.includes('IAM-008,EP03,Implement append-only audit service and privileged-action timeline,P0,P0-AUTHORITY,IN_REVIEW')
    && source.taskIndex.includes('IAM-009,EP03,Implement Access Admin workflows and access-review export,P0,P0-AUTHORITY,NOT_STARTED'), 'ONE_TASK_LAG');
  require(source.adr.includes('append-only') && source.adr.includes('no cryptographic chain')
    && source.evidence.includes('20260925000100_iam_008_append_only_audit')
    && [source.readme, source.testing, source.ciDoc, source.databaseDoc, source.accessDoc, source.authorizationDoc].every((value) => value.includes('IAM-008')), 'DOCUMENTATION_AND_EVIDENCE');
  return failures;
}

const current = await load();
if (process.argv.includes('--self-test')) {
  const fixtures = [
    ['wildcard action', { registry: current.registry.replace("'audit.event.read',", "'audit.event.read',\n  'access.*',") }],
    ['assignment read durable event', { registry: current.registry.replace("'audit.event.read',", "'access.assignment.read',\n  'audit.event.read',") }],
    ['generic summary payload', { registry: `${current.registry}\nexport type Unsafe = Record<string, unknown>;` }],
    ['missing event trigger', { migration: current.migration.replace('BEFORE UPDATE OR DELETE ON "audit_events"', 'AFTER INSERT ON "audit_events"') }],
    ['wrong SQLSTATE', { migration: current.migration.replace("ERRCODE = '55000'", "ERRCODE = 'P0001'") }],
    ['destructive cascade', { migration: `${current.migration}\n-- ON DELETE CASCADE` }],
    ['invented severity', { schema: `${current.schema}\nenum AuditSeverity { HIGH }` }],
    ['audit update API', { database: `${current.database}\ntransaction.auditEvent.update({});` }],
    ['service principal viewer', { policy: current.policy.replace("permittedActorTypes: ['HUMAN'], requiredCapability: 'audit.event.read'", "permittedActorTypes: ['HUMAN', 'SERVICE_PRINCIPAL'], requiredCapability: 'audit.event.read'") }],
    ['platform viewer scope', { policy: current.policy.replace("permittedScopeTypes: ['SELLER', 'INSTITUTION'", "permittedScopeTypes: ['PLATFORM', 'SELLER', 'INSTITUTION'") }],
    ['recursive read audit', { binding: `${current.binding}\nappendAuditEvent(transaction, event);` }],
    ['activated admin boundary', { protectedBoundary: current.protectedBoundary.replace('notFound()', 'return undefined') }],
    ['sixth task command', { manifest: current.manifest.replace('"iam008:verify":', '"iam008:security-test": "echo unsafe",\n    "iam008:verify":') }],
    ['regressed IAM007', { taskIndex: current.taskIndex.replace('P0,P0-PRIVACY,COMPLETE', 'P0,P0-PRIVACY,IN_REVIEW') }],
    ['advanced IAM009', { taskIndex: current.taskIndex.replace('export,P0,P0-AUTHORITY,NOT_STARTED', 'export,P0,P0-AUTHORITY,IN_REVIEW') }],
  ];
  for (const [name, patch] of fixtures) {
    if (validate({ ...current, ...patch }).length === 0) throw new Error(`IAM-008 negative fixture accepted: ${name}`);
  }
  const withLf = current.registry.replaceAll('\r\n', '\n');
  if (validate({ ...current, registry: withLf }).length || validate({ ...current, registry: withLf.replaceAll('\n', '\r\n') }).length) {
    throw new Error('IAM-008 validator differs between LF and CRLF');
  }
  console.log(`PASS: ${fixtures.length} IAM-008 audit regressions rejected`);
} else {
  const failures = validate(current);
  if (failures.length) {
    failures.forEach((failure) => console.error(`FAIL: ${failure}`));
    process.exitCode = 1;
  } else {
    console.log('PASS: IAM-008 closed registry, append-only database, transaction, authority, privacy, viewer, and non-activation boundaries');
  }
}
