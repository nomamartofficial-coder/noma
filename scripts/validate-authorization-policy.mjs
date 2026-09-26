import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const paths = Object.freeze({
  contracts: 'packages/platform/src/access/policy/contracts.ts',
  engine: 'packages/platform/src/access/policy/engine.ts',
  registry: 'packages/platform/src/access/policy/registry.ts',
  requirements: 'packages/platform/src/access/policy/requirements.ts',
  accessRepository: 'packages/database/src/access.ts',
  identityRepository: 'packages/database/src/identity.ts',
  pep: 'apps/api/src/authorization/authorization.service.ts',
  apiRegistry: 'apps/api/src/authorization/api-operation-registry.ts',
  webBoundary: 'apps/web/src/shells/protected/protected-surface-access.server.ts',
  manifest: 'package.json',
  ci: 'scripts/ci-command-catalog.mjs',
  taskIndex: 'delivery/traceability/task-index.csv',
});

async function loadSources() {
  return Object.fromEntries(await Promise.all(Object.entries(paths).map(async ([key, path]) => [key, await readFile(new URL(path, root), 'utf8')])));
}

function validate(source) {
  const failures = [];
  const require = (condition, code) => { if (!condition) failures.push(code); };
  const policy = source.contracts + source.engine + source.registry + source.requirements;
  require(source.contracts.includes("AUTHORIZATION_DECISIONS = ['ALLOW', 'DENY']") && !/ALLOW_WITH_WARNING|UNKNOWN_ALLOW|\bMAYBE\b/.test(policy), 'BINARY_DECISION');
  require(!/(?:default|fallback|unsafeDefault).{0,40}(?:ALLOW|'ALLOW'|"ALLOW")/is.test(source.engine + source.registry), 'NO_DEFAULT_ALLOW');
  require(source.registry.includes('Duplicate authorization policy') && source.registry.includes('authorizationPolicyRegistry') && source.registry.includes('byId.get(requirePolicyKey(policyId)) ?? null'), 'CLOSED_REGISTRY');
  require(source.registry.includes('requiredCapability') && source.registry.includes('actionId') && !/id:\s*['"]\*['"]/.test(source.registry), 'POLICY_CAPABILITY_SEPARATION');
  require(source.engine.includes('subjectMatches(fact, context)') && source.engine.includes('scopeMatches(fact, policy, context)') && !/allCapabilities|allScopes/.test(source.engine), 'ASSIGNMENT_ATOMIC');
  require(source.requirements.includes('Math.min(left, right)') && source.requirements.includes('requireContactVerified: baseline.requireContactVerified || action.requireContactVerified'), 'MONOTONIC_ASSURANCE');
  require(source.engine.includes("fact.state === 'UNKNOWN'") && source.engine.includes("return 'FACT_UNAVAILABLE'") && source.contracts.includes("applicability: 'NOT_APPLICABLE'"), 'TRISTATE_FACTS');
  require(source.engine.includes("principal.environment !== context.environment") && source.registry.includes("permittedActorTypes: ['SERVICE_PRINCIPAL']") && source.engine.includes("context.actor.actorType === 'HUMAN'"), 'SERVICE_PRINCIPAL_BOUNDARY');
  require(source.accessRepository.includes('loadActiveAuthorityFactForUse') && source.accessRepository.includes('FOR UPDATE OF ra') && source.identityRepository.includes('lockAuthenticatedSessionForAuthorization') && source.identityRepository.includes('FOR UPDATE'), 'MUTATION_LINEARIZATION');
  require(source.pep.includes('executeProtectedMutation') && source.pep.includes('runInDatabaseTransaction') && source.pep.includes("decision.decision === 'DENY'") && source.pep.includes('operation.execute(transaction, decision)'), 'APPLICATION_PEP');
  require(!/(fetch\(|axios|ioredis|PrismaClient|@noma\/database|Date\.now\(|new Date\(\))/.test(source.engine), 'PURE_PDP');
  require(source.pep.includes("status: 'UNAVAILABLE'") && !source.pep.includes('reasonCode: error.decision.reasonCode'), 'SAFE_PUBLIC_DENIAL');
  require(source.apiRegistry.includes("'IAM006_PROTECTED'") && source.apiRegistry.includes("classification === 'IAM006_PROTECTED'") === false && !/policyId:\s*['"][^'"]+['"]/.test(source.apiRegistry), 'NO_ACTIVATED_PROTECTED_API');
  require(source.apiRegistry.includes("'/health/live', 'PUBLIC'") && source.apiRegistry.includes("'/api/v1/auth/session'") && source.apiRegistry.includes("'AUTHENTICATED_SELF'"), 'API_CLASSIFICATION');
  require(!/(?:request|body|query|cookie|header|localStorage).{0,80}(?:policyId|capability|authorityScope|relationshipFacts)/is.test(source.apiRegistry + source.pep), 'NO_CLIENT_AUTHORITY');
  require(!/(?:opa|cedar|casbin)/i.test(source.manifest), 'NO_DYNAMIC_POLICY_ENGINE');
  require(!/(?:super.?admin).{0,80}(?:bypass|allow)/is.test(policy), 'NO_SUPER_ADMIN_TRUTH_BYPASS');
  require(source.webBoundary.includes('notFound()') && !/(?:evaluateAuthorization|authorityFacts|policyId)/.test(source.webBoundary), 'PROTECTED_WEB_CLOSED');
  require(source.manifest.includes('iam006:verify') && source.ci.includes('iam006:integration-test') && source.ci.includes('iam006:self-test'), 'CI_GRAPH');
  require(source.taskIndex.includes('IAM-005,EP03,"Implement membership, role grant, capability, and scope model",P0,P0-AUTHORITY,COMPLETE'), 'IAM005_COMPLETE');
  require(source.taskIndex.includes('IAM-006,EP03,Implement central authorization policy engine,P0,P0-AUTHORITY,COMPLETE'), 'IAM006_COMPLETE');
  require(source.taskIndex.includes('IAM-007,EP03,Implement field-level projections and sensitive-data redaction,P0,P0-PRIVACY,COMPLETE'), 'IAM007_COMPLETE');
  require(source.taskIndex.includes('IAM-008,EP03,Implement append-only audit service and privileged-action timeline,P0,P0-AUTHORITY,IN_REVIEW'), 'IAM008_IN_REVIEW');
  require(source.taskIndex.includes('IAM-009,EP03,Implement Access Admin workflows and access-review export,P0,P0-AUTHORITY,NOT_STARTED'), 'IAM009_DEFERRED');
  return failures;
}

const current = await loadSources();
if (process.argv.includes('--self-test')) {
  const fixtures = [
    ['default allow', { engine: `${current.engine}\nconst unsafeDefault = 'ALLOW';` }],
    ['unknown policy allow', { registry: current.registry.replace('return byId.get(requirePolicyKey(policyId)) ?? null', "return byId.get(requirePolicyKey(policyId)) ?? policies[0]") }],
    ['wildcard policy', { registry: `${current.registry}\nconst unsafePolicy = { id: '*' };` }],
    ['flattened capabilities', { engine: `${current.engine}\nconst allCapabilities = authorityFacts.flatMap(x => x.capabilities);` }],
    ['PDP database import', { engine: `import '@noma/database';\n${current.engine}` }],
    ['PDP host clock', { engine: `${current.engine}\nconst hostTime = Date.now();` }],
    ['PDP network call', { engine: `${current.engine}\nfetch('https://example.invalid');` }],
    ['missing mutation PEP', { pep: current.pep.replaceAll('executeProtectedMutation', 'removedProtectedMutation') }],
    ['controller-only protection', { pep: current.pep.replaceAll('runInDatabaseTransaction', 'controllerGuardOnly') }],
    ['public denial detail leak', { pep: current.pep.replace("status: 'UNAVAILABLE' as const", "status: 'UNAVAILABLE' as const, reasonCode: error.decision.reasonCode") }],
    ['browser policy', { apiRegistry: `${current.apiRegistry}\nconst policyId = request.body.policyId;` }],
    ['browser capability', { pep: `${current.pep}\nconst capability = request.query.capability;` }],
    ['forged relationship fact', { pep: `${current.pep}\nconst relationshipFacts = request.body.relationshipFacts;` }],
    ['dynamic policy engine', { manifest: current.manifest.replace('"typescript":', '"casbin": "1.0.0",\n    "typescript":') }],
    ['super admin bypass', { engine: `${current.engine}\nconst superAdminBypass = 'ALLOW';` }],
    ['activated protected API', { apiRegistry: `${current.apiRegistry}\nconst unsafe = { policyId: 'access.assignment.grant.v1' };` }],
    ['protected Web opened', { webBoundary: current.webBoundary.replace('notFound()', 'return undefined') }],
    ['missing IAM-006 integration', { ci: current.ci.replaceAll('iam006:integration-test', 'iam006:removed') }],
    ['regressed IAM-007', { taskIndex: current.taskIndex.replace('IAM-007,EP03,Implement field-level projections and sensitive-data redaction,P0,P0-PRIVACY,COMPLETE', 'IAM-007,EP03,Implement field-level projections and sensitive-data redaction,P0,P0-PRIVACY,IN_REVIEW') }],
    ['missing IAM-008 review state', { taskIndex: current.taskIndex.replace('IAM-008,EP03,Implement append-only audit service and privileged-action timeline,P0,P0-AUTHORITY,IN_REVIEW', 'IAM-008,EP03,Implement append-only audit service and privileged-action timeline,P0,P0-AUTHORITY,NOT_STARTED') }],
    ['premature IAM-009', { taskIndex: current.taskIndex.replace('IAM-009,EP03,Implement Access Admin workflows and access-review export,P0,P0-AUTHORITY,NOT_STARTED', 'IAM-009,EP03,Implement Access Admin workflows and access-review export,P0,P0-AUTHORITY,IN_REVIEW') }],
  ];
  for (const [name, changes] of fixtures) {
    if (validate({ ...current, ...changes }).length === 0) throw new Error(`IAM-006 negative fixture accepted: ${name}`);
  }
  console.log(`PASS: ${fixtures.length} IAM-006 authorization regressions rejected`);
} else {
  const failures = validate(current);
  if (failures.length > 0) {
    failures.forEach((failure) => console.error(`FAIL: ${failure}`));
    process.exit(1);
  }
  console.log('PASS: IAM-006 closed policy registry, pure PDP, transaction PEP, and fail-closed boundaries');
}
