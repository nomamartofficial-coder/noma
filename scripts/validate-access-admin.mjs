import { readFile, readdir } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const paths = Object.freeze({
  taskIndex: 'delivery/traceability/task-index.csv',
  contracts: 'packages/platform/src/access/contracts.ts',
  outcomes: 'packages/platform/src/access/review.ts',
  actions: 'packages/platform/src/audit/index.ts',
  policies: 'packages/platform/src/access/policy/registry.ts',
  registry: 'apps/api/src/authorization/api-operation-registry.ts',
  controller: 'apps/api/src/authorization/access-admin.controller.ts',
  assignment: 'apps/api/src/authorization/access-assignment-workflow.ts',
  review: 'apps/api/src/authorization/access-review-attestation.ts',
  exportWorkflow: 'apps/api/src/authorization/access-review-export-workflow.ts',
  exportProjection: 'apps/api/src/authorization/access-review-export.ts',
  reviewDisclosure: 'apps/api/src/authorization/access-review-disclosure.ts',
  assignmentDisclosure: 'apps/api/src/authorization/access-assignment-disclosure.ts',
  approvalDisclosure: 'apps/api/src/authorization/access-approval-disclosure.ts',
  exportApprovalDisclosure: 'apps/api/src/authorization/access-review-export-approval-disclosure.ts',
  migration: 'packages/database/prisma/migrations/20261002000100_iam_009_access_review_workflows/migration.sql',
  forwarder: 'apps/web/src/admin/access-forwarder.server.ts',
  webRoute: 'apps/web/src/app/api/admin-access/[operation]/route.ts',
  scopeRoute: 'apps/web/src/app/api/admin-access/select-scope/route.ts',
  accessPage: 'apps/web/src/app/(admin-access)/admin/access/page.tsx',
  closedAdmin: 'apps/web/src/app/(admin)/admin/layout.tsx',
  protectedBoundary: 'apps/web/src/shells/protected/protected-surface-access.server.ts',
  securityDoc: 'docs/10-security-and-compliance.md',
  deploymentDoc: 'DEPLOYMENT.md',
  webReadme: 'apps/web/README.md',
  webExample: 'apps/web/.env.example',
  manifest: 'package.json',
  catalog: 'scripts/ci-command-catalog.mjs',
  qualityWorkflow: '.github/workflows/ci-quality.yml',
  integrationWorkflow: '.github/workflows/ci-integration.yml',
  securityWorkflow: '.github/workflows/ci-security.yml',
  windowsWorkflow: '.github/workflows/ci-windows.yml',
});

const exactCapabilities = Object.freeze([
  'access.assignment.read', 'access.assignment.request', 'access.assignment.grant', 'access.assignment.revoke',
  'access.approval.read', 'access.approval.decide', 'access.temporary.request', 'access.temporary.grant',
  'access.temporary.revoke', 'access.service-principal.read', 'access.service-principal.create',
  'access.service-principal.rotate', 'access.service-principal.revoke', 'access.review.read',
  'access.review.attest', 'access.review.export', 'audit.event.read',
]);
const exactNewActions = Object.freeze(['access.review.attest', 'access.review.export']);
const exactOutcomes = Object.freeze(['RETAIN_CONFIRMED', 'REVOKE_REQUESTED', 'NEEDS_FOLLOW_UP']);
const exactCommands = Object.freeze([
  'iam009:integration-test', 'iam009:self-test', 'iam009:test', 'iam009:validate', 'iam009:verify',
]);
const requiredGates = Object.freeze([
  'Noma / CI Policy', 'Noma / Quality Gate', 'Noma / Integration Gate',
  'Noma / Security Gate', 'Noma / Windows Compatibility',
]);

async function load() {
  const source = Object.fromEntries(await Promise.all(Object.entries(paths).map(async ([key, path]) => [
    key, await readFile(new URL(path, root), 'utf8'),
  ])));
  source.unrelatedAdminPages = (await readdir(new URL('apps/web/src/app/(admin)/admin/', root), { withFileTypes: true }))
    .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort().join('|');
  source.oldAccessPagePresent = await readFile(new URL('apps/web/src/app/(admin)/admin/access/page.tsx', root), 'utf8')
    .then(() => true, () => false);
  return source;
}

function literalList(source, exportName) {
  const block = source.match(new RegExp(`export const ${exportName} = (?:Object\\.freeze\\()?\\[([\\s\\S]*?)\\]`))?.[1] ?? '';
  return [...block.matchAll(/'([^']+)'/g)].map((match) => match[1]);
}

function validate(source) {
  const failures = [];
  const require = (condition, code) => { if (!condition) failures.push(code); };
  let manifest = {};
  try { manifest = JSON.parse(source.manifest); } catch { failures.push('MANIFEST_JSON'); }
  const workflow = [source.qualityWorkflow, source.integrationWorkflow, source.securityWorkflow, source.windowsWorkflow].join('\n');
  const gateNames = [...workflow.matchAll(/name:\s*(Noma \/ (?:CI Policy|Quality Gate|Integration Gate|Security Gate|Windows Compatibility))/g)]
    .map((match) => match[1]).sort();
  require(source.taskIndex.includes('IAM-008,EP03,Implement append-only audit service and privileged-action timeline,P0,P0-AUTHORITY,COMPLETE')
    && source.taskIndex.includes('IAM-009,EP03,Implement Access Admin workflows and access-review export,P0,P0-AUTHORITY,IN_REVIEW')
    && source.taskIndex.includes('IAM-010,EP03,Implement') && /IAM-010,[^\r\n]*,NOT_STARTED/.test(source.taskIndex), 'TRACEABILITY_ONE_TASK_LAG');
  require(JSON.stringify(literalList(source.contracts, 'ACCESS_CAPABILITY_CODES')) === JSON.stringify(exactCapabilities)
    && source.contracts.includes("value.includes('*')")
    && !/['"]access\.\*['"]/.test(source.contracts + source.policies), 'EXACT_CAPABILITIES');
  require(JSON.stringify(literalList(source.outcomes, 'ACCESS_REVIEW_OUTCOMES')) === JSON.stringify(exactOutcomes)
    && source.outcomes.includes('Unknown Access review outcome')
    && source.outcomes.includes("outcome === 'RETAIN_CONFIRMED' || outcome === 'REVOKE_REQUESTED'"), 'CLOSED_REVIEW_OUTCOMES');
  const auditCodes = literalList(source.actions, 'AUDIT_ACTION_CODES');
  require(exactNewActions.every((code) => auditCodes.filter((candidate) => candidate === code).length === 1)
    && !auditCodes.some((code) => code.includes('*')), 'EXACT_REVIEW_AUDIT_ACTIONS');
  for (const [policy, capability] of [
    ['access.assignment.read.v1', 'access.assignment.read'],
    ['access.review.read.v1', 'access.review.read'],
    ['access.review.attest.v1', 'access.review.attest'],
    ['access.review.export.v1', 'access.review.export'],
    ['access.review.export.request.v1', 'access.review.export'],
    ['access.review.export.decide.v1', 'access.approval.decide'],
  ]) {
    // Match the exact policy header and its closed record, never a nearby policy.
    const exactBlock = source.policies.split(`id: '${policy}'`)[1]?.split('\n  }),')[0] ?? '';
    require(Boolean(exactBlock) && exactBlock.includes(`requiredCapability: '${capability}'`)
      && exactBlock.includes("permittedActorTypes: ['HUMAN']")
      && exactBlock.includes("relationship: 'EXACT_SCOPE'")
      && !exactBlock.includes("'SERVICE_PRINCIPAL'"), `POLICY_${policy}`);
  }
  require(source.registry.includes('IAM006_PROTECTED')
    && (source.registry.match(/operation\('[^']+', 'POST', '\/api\/v1\/admin\/access\//g) ?? []).length === 17
    && (source.controller.match(/@Post\('/g) ?? []).length === 17
    && source.controller.includes("@Controller('api/v1/admin/access')")
    && source.controller.includes("'x-csrf-token') !== 'noma-admin-v1'")
    && source.controller.includes('readAuthenticationCookie(')
    && !/role\s*===?\s*['"]ADMIN['"]|isAdmin\s*\(/.test(source.controller + source.assignment), 'EXACT_PROTECTED_API');
  require(source.assignment.includes("input.operation === 'TEMPORARY_ACCESS_GRANT' && input.scopeType === 'PLATFORM'")
    && source.assignment.includes('Unknown mappings fail closed')
    && source.assignment.includes('Multiple simultaneous scoped roles have no approved cross-template conflict map')
    && source.assignment.includes('request.requestedByUserId')
    && source.assignment.includes('approvalRequestId')
    && source.migration.includes('CONSTRAINT "access_approval_effects_request_key" UNIQUE')
    && source.migration.includes('CONSTRAINT "access_review_attestations_item_version_key" UNIQUE')
    && source.migration.includes('CONSTRAINT "access_review_export_effects_request_key" UNIQUE'), 'CONFLICTS_AND_SINGLE_USE');
  require(source.migration.includes("'access.review.read'") && source.migration.includes("'access.review.attest'")
    && source.migration.includes("'access.review.export'")
    && ['access_approval_revocation_targets', 'access_approval_effects', 'access_review_cycles',
      'access_review_items', 'access_review_attestations', 'access_review_export_requests',
      'access_review_export_decisions', 'access_review_export_effects']
      .every((table) => source.migration.includes(`CREATE TRIGGER "${table}_reject_truncate" BEFORE TRUNCATE ON "${table}"`))
    && !/INSERT INTO "role_template_capabilities"[\s\S]*access\.review\.export/i.test(source.migration)
    && !/Super Admin|production privileged user/i.test(source.migration)
    && !/ON DELETE CASCADE|\bDROP\s+(?:TABLE|COLUMN|TYPE)\b/i.test(source.migration), 'ADDITIVE_NO_PRIVILEGED_SEED');
  require(source.review.includes('REVOKE_REQUESTED') && source.review.includes('NEEDS_FOLLOW_UP')
    && source.review.includes('revocationRequestId')
    && source.review.includes('appendAuditEvent(transaction'), 'DURABLE_REVIEW_AND_SEPARATE_REVOKE');
  require(source.exportWorkflow.includes("policyId: 'access.review.export.v1'")
    && source.exportWorkflow.includes('approved.approverUserId === currentActor.userId')
    && source.exportWorkflow.includes("request.state !== 'APPROVED'")
    && source.exportWorkflow.includes('!currentFactor')
    && source.exportWorkflow.includes('request.rowCeiling + 1')
    && source.exportWorkflow.includes('accessReviewExportEffect.create')
    && source.exportWorkflow.includes('appendAuditEvent(transaction'), 'EXPORT_MFA_APPROVAL_SINGLE_USE');
  require(source.exportProjection.includes("id: ACCESS_REVIEW_EXPORT_PROJECTION_ID")
    && source.exportProjection.includes("ACCESS_REVIEW_EXPORT_ROW_CEILING = 500")
    && source.exportProjection.includes('projectDisclosure(')
    && source.exportProjection.includes("'Content-Disposition': 'attachment;")
    && source.exportProjection.includes("'Cache-Control': 'no-store'")
    && source.exportProjection.includes("replaceAll('\"', '\"\"')")
    && source.exportProjection.includes("[=+\\-@]")
    && !source.exportWorkflow.includes("'access.assignment.read.v1'"), 'MINIMUM_SAFE_CSV_EXPORT');
  require(['access.review.queue.row.v1', 'access.assignment.summary.v1', 'access.approval.queue.row.v1', 'access.review.export.approval.row.v1']
    .every((projection) => [source.reviewDisclosure, source.assignmentDisclosure, source.approvalDisclosure, source.exportApprovalDisclosure]
      .some((value) => value.includes(projection)))
    && [source.reviewDisclosure, source.assignmentDisclosure, source.approvalDisclosure, source.exportApprovalDisclosure]
      .every((value) => value.includes('projectDisclosure(') && value.includes('executeProtectedRead(')), 'PURPOSE_SPECIFIC_PROJECTIONS');
  require(source.forwarder.includes('Object.hasOwn(ACCESS_PATHS, value)')
    && source.forwarder.includes('safeSetCookie(')
    && source.forwarder.includes('publicEnvironment !== serverEnvironment')
    && source.forwarder.includes("request.headers.get('origin') !== configured.web")
    && source.forwarder.includes("request.headers.get('x-csrf-token') !== 'noma-admin-v1'")
    && source.webRoute.includes('isAccessForwardOperation')
    && source.scopeRoute.includes('mismatchedEnvironment')
    && source.scopeRoute.includes('HttpOnly; SameSite=Lax')
    && source.accessPage.includes('publicEnvironment !== serverEnvironment')
    && !/SameSite=None|localStorage|sessionStorage|Bearer\s|Authorization:\s*['"]Bearer/i.test(source.forwarder + source.webRoute + source.scopeRoute + source.accessPage), 'EXACT_SAME_ORIGIN_TRANSPORT');
  require(source.deploymentDoc.includes('Preview-only, non-secret `NOMA_ENV=preview`')
    && source.deploymentDoc.includes('`PUBLIC_WEB_ORIGIN=https://<exact-approved-protected-preview-host>`')
    && source.deploymentDoc.includes('`API_PUBLIC_URL=https://noma-api-staging.onrender.com`')
    && source.deploymentDoc.includes('must exactly match the protected Preview origin approved in Render')
    && source.webReadme.includes('Preview server-only, non-secret `NOMA_ENV=preview`')
    && ['NOMA_ENV=development', 'PUBLIC_WEB_ORIGIN=http://127.0.0.1:3000', 'API_PUBLIC_URL=http://127.0.0.1:3001']
      .every((value) => source.webExample.includes(value)), 'REMOTE_WEB_TRANSPORT_CONFIGURATION');
  require(source.accessPage.includes('if (!assignments.ok && !approvals.ok && !reviews.ok && !exportApprovals.ok) notFound()')
    && source.accessPage.includes('AccessWorkspace')
    && source.closedAdmin.includes("requireProtectedSurfaceAccess('admin')")
    && source.protectedBoundary.includes('notFound()')
    && source.unrelatedAdminPages.includes('audit')
    && !source.oldAccessPagePresent, 'BOUNDED_ADMIN_ACTIVATION');
  require(/monthly high-privilege access review during the pilot, quarterly broader-authority review, and immediate event-driven review/i.test(source.securityDoc)
    && /\*\*Event-driven:\*\* role change, seller ownership change, staff exit, provider change, incident, account compromise, prolonged inactivity, failed review, or university instruction/.test(source.securityDoc), 'REVIEW_CADENCE');
  require(JSON.stringify(Object.keys(manifest.scripts ?? {}).filter((name) => name.startsWith('iam009:')).sort()) === JSON.stringify(exactCommands)
    && manifest.scripts?.check?.includes('pnpm iam009:validate'), 'EXACT_FIVE_COMMANDS');
  require(JSON.stringify(gateNames) === JSON.stringify([...requiredGates].sort())
    && ['quality', 'integration', 'security', 'windows'].every((suite) => source.catalog.includes(`${suite}: Object.freeze({`))
    && ['iam009-validate', 'iam009-self-test', 'iam009-unit', 'iam009-integration', 'iam009-security-coverage']
      .every((id) => source.catalog.includes(`command('${id}'`)), 'FIVE_UNCHANGED_CI_GATES');
  return failures;
}

const current = await load();
if (process.argv.includes('--self-test')) {
  const fixtures = [
    ['IAM-008 not complete', { taskIndex: current.taskIndex.replace('IAM-008,EP03,Implement append-only audit service and privileged-action timeline,P0,P0-AUTHORITY,COMPLETE', 'IAM-008,EP03,Implement append-only audit service and privileged-action timeline,P0,P0-AUTHORITY,IN_REVIEW') }],
    ['IAM-009 complete early', { taskIndex: current.taskIndex.replace('export,P0,P0-AUTHORITY,IN_REVIEW', 'export,P0,P0-AUTHORITY,COMPLETE') }],
    ['IAM-010 advanced', { taskIndex: current.taskIndex.replace(/(IAM-010,[^\r\n]*),NOT_STARTED/, '$1,IN_REVIEW') }],
    ['missing export capability', { contracts: current.contracts.replace("  'access.review.export',", '') }],
    ['assignment-read export', { policies: current.policies.replace("id: 'access.review.export.v1', actionId: 'access.review.export'", "id: 'access.review.export.v1', actionId: 'access.assignment.read'").replace("requiredCapability: 'access.review.export',\n    permittedScopeTypes", "requiredCapability: 'access.assignment.read',\n    permittedScopeTypes") }],
    ['missing single-consumption key', { migration: current.migration.replace('CONSTRAINT "access_review_export_effects_request_key" UNIQUE', 'CONSTRAINT "access_review_export_effects_request_key"') }],
    ['truncate protection removed', { migration: current.migration.replace('CREATE TRIGGER "access_review_attestations_reject_truncate" BEFORE TRUNCATE', 'CREATE TRIGGER "access_review_attestations_reject_truncate" AFTER TRUNCATE') }],
    ['generic Admin bypass', { controller: `${current.controller}\nconst allowed = role === 'ADMIN';` }],
    ['wildcard capability', { contracts: current.contracts.replace("'access.review.export',", "'access.*',") }],
    ['SameSite None', { forwarder: `${current.forwarder}\nconst cookie = 'SameSite=None';` }],
    ['browser bearer storage', { webRoute: `${current.webRoute}\nlocalStorage.setItem('Bearer token', value);` }],
    ['missing Preview server mode', { deploymentDoc: current.deploymentDoc.replace('Preview-only, non-secret `NOMA_ENV=preview`', 'Preview-only, non-secret server mode') }],
    ['missing Preview runtime guard', { forwarder: current.forwarder.replace('publicEnvironment !== serverEnvironment', 'false') }],
    ['unrelated Admin open', { protectedBoundary: current.protectedBoundary.replace('notFound()', 'return undefined') }],
    ['audit route open', { unrelatedAdminPages: current.unrelatedAdminPages.replace('audit', '') }],
    ['export MFA removed', { exportWorkflow: current.exportWorkflow.replace('|| !currentFactor)', ')') }],
    ['CSV formula escape removed', { exportProjection: current.exportProjection.replace('[=+\\-@]', '[=]') }],
    ['conflict fail-open', { assignment: current.assignment.replace('Unknown mappings fail closed', 'Unknown mappings allowed') }],
    ['sixth command', { manifest: current.manifest.replace('"iam009:verify":', '"iam009:security-test": "echo unsafe",\n    "iam009:verify":') }],
    ['renamed gate', { qualityWorkflow: current.qualityWorkflow.replace('Noma / Quality Gate', 'Noma / New Quality Gate') }],
  ];
  const baseline = validate(current);
  if (baseline.length) throw new Error(`IAM-009 current architecture invalid: ${baseline.join(', ')}`);
  for (const [name, patch] of fixtures) {
    if (validate({ ...current, ...patch }).length === 0) throw new Error(`IAM-009 negative fixture accepted: ${name}`);
  }
  console.log(`PASS: ${fixtures.length} IAM-009 boundary regressions rejected`);
} else {
  const failures = validate(current);
  if (failures.length) {
    failures.forEach((failure) => console.error(`FAIL: ${failure}`));
    process.exitCode = 1;
  } else console.log('PASS: IAM-009 exact authority, approval, review, CSV, transport, scope, and CI boundaries');
}
