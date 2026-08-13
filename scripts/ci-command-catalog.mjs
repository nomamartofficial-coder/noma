export const CI_SUITE_SEGMENTS = Object.freeze({
  quality: Object.freeze({
    policy: Object.freeze([
      command('ci-validate', 'Validate GitHub Actions policy', 'pnpm', ['ci:validate']),
      command('ci-self-test', 'Run GitHub Actions policy negative tests', 'pnpm', ['ci:self-test']),
      command('workspace-validate', 'Validate workspace boundaries', 'pnpm', ['workspace:validate']),
      command('workspace-self-test', 'Run workspace boundary negative tests', 'pnpm', ['workspace:self-test']),
      command('runtimes-validate', 'Validate runtime scaffolds', 'pnpm', ['runtimes:validate']),
      command('runtimes-self-test', 'Run runtime scaffold negative tests', 'pnpm', ['runtimes:self-test']),
      command('environment-validate', 'Validate typed environment contracts', 'pnpm', ['env:validate']),
      command('environment-self-test', 'Run environment negative tests', 'pnpm', ['env:self-test']),
      command('providers-validate', 'Validate provider boundaries', 'pnpm', ['providers:validate']),
      command('providers-self-test', 'Run provider boundary negative tests', 'pnpm', ['providers:self-test']),
      command('observability-validate', 'Validate observability, propagation, redaction, and health policy', 'pnpm', ['observability:validate']),
      command('observability-self-test', 'Run observability policy negative tests', 'pnpm', ['observability:self-test']),
      command('ui-validate', 'Validate design-token, primitive, commerce truth, accessibility, and generated CSS policy', 'pnpm', ['ui:validate']),
      command('ui-self-test', 'Run UI token, primitive, and commerce policy negative tests', 'pnpm', ['ui:self-test']),
      command('deployment-validate', 'Validate preview and staging deployment policy', 'pnpm', ['deploy:validate']),
      command('deployment-self-test', 'Run deployment policy negative tests', 'pnpm', ['deploy:self-test']),
      command('traceability-validate', 'Validate traceability registers', 'python', ['scripts/validate_traceability.py']),
      command('traceability-self-test', 'Run traceability negative test', 'python', ['scripts/validate_traceability.py', '--self-test']),
      command('traceability-dev008', 'Resolve DEV-008 traceability', 'python', ['scripts/validate_traceability.py', '--lookup', 'DEV-008']),
      command('traceability-dev009', 'Resolve DEV-009 traceability', 'python', ['scripts/validate_traceability.py', '--lookup', 'DEV-009']),
      command('traceability-sec005', 'Resolve SEC-005 traceability', 'python', ['scripts/validate_traceability.py', '--lookup', 'SEC-005']),
      command('traceability-dev010', 'Resolve DEV-010 traceability', 'python', ['scripts/validate_traceability.py', '--lookup', 'DEV-010']),
      command('traceability-ui001', 'Resolve UI-001 traceability', 'python', ['scripts/validate_traceability.py', '--lookup', 'UI-001']),
      command('traceability-ui002', 'Resolve UI-002 traceability', 'python', ['scripts/validate_traceability.py', '--lookup', 'UI-002']),
      command('traceability-ui003', 'Resolve UI-003 traceability', 'python', ['scripts/validate_traceability.py', '--lookup', 'UI-003']),
      command('traceability-ui004', 'Resolve UI-004 traceability', 'python', ['scripts/validate_traceability.py', '--lookup', 'UI-004']),
    ]),
    static: Object.freeze([
      command('lint', 'Lint all workspace packages', 'pnpm', ['lint']),
      command('typecheck', 'Type-check all workspace packages', 'pnpm', ['typecheck']),
      command('build', 'Build all workspace packages', 'pnpm', ['build']),
      command('tracked-diff', 'Reject tracked build mutations', 'git', ['diff', '--exit-code', '--', '.']),
    ]),
    tests: Object.freeze([
      command('build-for-tests', 'Build test dependencies', 'pnpm', ['build']),
      command('unit-component-coverage', 'Run unit and component tests with V8 coverage and JUnit', 'pnpm', ['test:ci']),
      command('tracked-diff', 'Reject tracked test mutations', 'git', ['diff', '--exit-code', '--', '.']),
    ]),
    runtime: Object.freeze([
      command('runtime-smoke', 'Run Web, API, and Worker smoke checks', 'pnpm', ['smoke:runtimes']),
      command('tracked-diff', 'Reject tracked runtime mutations', 'git', ['diff', '--exit-code', '--', '.']),
    ]),
  }),
  integration: Object.freeze({
    environment: Object.freeze([
      command('environment-verify', 'Run typed environment verification', 'pnpm', ['env:verify']),
    ]),
    database: Object.freeze([
      command('build-for-database', 'Build database workspace dependencies on the clean runner', 'pnpm', ['build']),
      command('database-verify', 'Run PostgreSQL migration and restore verification', 'pnpm', ['db:verify']),
    ]),
    queue: Object.freeze([
      command('build-for-queue', 'Build queue workspace dependencies on the clean runner', 'pnpm', ['build']),
      command('queue-verify', 'Run Redis, BullMQ, and outbox recovery verification', 'pnpm', ['queue:verify']),
    ]),
    harness: Object.freeze([
      command('build-for-harness', 'Build harness workspace dependencies on the clean runner', 'pnpm', ['build']),
      command('testing-verify', 'Run deterministic testing and Testcontainers verification', 'pnpm', ['testing:verify']),
      command('observability-integration', 'Run real PostgreSQL, Redis, outbox, trace, and readiness verification', 'pnpm', ['observability:integration']),
    ]),
    providers: Object.freeze([
      command('providers-verify', 'Run provider contract and simulator verification', 'pnpm', ['providers:verify']),
    ]),
  }),
  security: Object.freeze({
    repository: Object.freeze([
      command('dependency-security-validate', 'Validate reviewed dependency security floors', 'pnpm', ['security:dependencies:validate']),
      command('dependency-security-self-test', 'Prove weakened dependency policies are rejected', 'pnpm', ['security:dependencies:self-test']),
      command('repository-secret-scan', 'Scan tracked repository content for high-confidence secrets', 'node', ['scripts/scan-repository-secrets.mjs']),
      command('repository-secret-self-test', 'Prove secret samples are rejected', 'node', ['scripts/scan-repository-secrets.mjs', '--self-test']),
      command('governance-redaction', 'Validate governed evidence and redaction controls', 'python', ['scripts/validate_governance_foundation.py', '--self-test']),
    ]),
  }),
  windows: Object.freeze({
    compatibility: Object.freeze([
      command('workspace-validate', 'Validate workspace boundaries', 'pnpm', ['workspace:validate']),
      command('runtimes-validate', 'Validate runtime scaffolds', 'pnpm', ['runtimes:validate']),
      command('environment-validate', 'Validate typed environment contracts', 'pnpm', ['env:validate']),
      command('providers-validate', 'Validate provider boundaries', 'pnpm', ['providers:validate']),
      command('observability-validate', 'Validate observability boundaries and runtime wiring', 'pnpm', ['observability:validate']),
      command('observability-self-test', 'Run observability policy negative tests', 'pnpm', ['observability:self-test']),
      command('ui-validate', 'Validate design-token, primitive, commerce truth, accessibility, and generated CSS policy', 'pnpm', ['ui:validate']),
      command('ui-self-test', 'Run UI token, primitive, and commerce policy negative tests', 'pnpm', ['ui:self-test']),
      command('lint', 'Lint all workspace packages', 'pnpm', ['lint']),
      command('typecheck', 'Type-check all workspace packages', 'pnpm', ['typecheck']),
      command('build', 'Build all workspace packages', 'pnpm', ['build']),
      command('runtime-smoke', 'Verify Windows runtime launch, probes, and cleanup', 'node', ['scripts/smoke-runtimes.mjs']),
      command('tracked-diff', 'Reject tracked Windows mutations', 'git', ['diff', '--exit-code', '--', '.']),
    ]),
  }),
});

function command(id, label, program, args) {
  return Object.freeze({ id, label, program, args: Object.freeze(args) });
}

export function segmentsForSuite(suite) {
  const segments = CI_SUITE_SEGMENTS[suite];
  if (!segments) throw new Error(`unknown CI suite: ${suite}`);
  return Object.keys(segments);
}

export function commandsForSuite(suite, segment) {
  const segments = CI_SUITE_SEGMENTS[suite];
  if (!segments) throw new Error(`unknown CI suite: ${suite}`);
  if (segment) {
    if (!segments[segment]) throw new Error(`unknown ${suite} segment: ${segment}`);
    return [...segments[segment]];
  }
  return Object.values(segments).flatMap((commands) => [...commands]);
}
