# GitHub Actions quality pipeline

> **Tasks:** `DEV-008`, `SEC-005` security amendment
> **Risk:** `P0-RECOVERY`
> **Status:** implemented for review; branch-protection acceptance remains administrator-controlled

## Scope and safety boundary

The pipeline converts Noma's existing deterministic local commands into four GitHub Actions workflows. It does not deploy, publish packages, request production secrets, create an environment, provision infrastructure, call a provider, or activate a marketplace capability.

All workflows run on pull requests targeting `main`, pushes to `main`, merge-group checks, and manual dispatch. They deliberately omit path filters so required checks do not disappear for documentation, migration, workflow, or traceability changes. Pull-request workflows never use `pull_request_target`.

## Workflow and job graph

| Workflow | Mandatory jobs | Stable gate |
|---|---|---|
| `ci-quality.yml` | policy; lint/typecheck/build; unit/component/coverage; runtime smoke; Storybook Chromium accessibility and reviewed Linux visual comparison | `Noma / CI Policy`; `Noma / Quality Gate` |
| `ci-integration.yml` | environment startup; PostgreSQL migration/restore; Redis/BullMQ/outbox recovery; Testcontainers isolation; real observability/readiness recovery; provider conformance | `Noma / Integration Gate` |
| `ci-security.yml` | offline dependency-floor checks; repository secret/redaction controls; Moderate-or-higher dependency review; CodeQL JavaScript/TypeScript | `Noma / Security Gate` |
| `ci-windows.yml` | exact toolchain; paths; frozen install; validation; lint/typecheck/build; Storybook static/browser smoke; runtime launch/probes/process cleanup | `Noma / Windows Compatibility` |

Each stable gate uses `if: always()` and the checked-in `scripts/evaluate-ci-gate.mjs`. A mandatory upstream result other than `success`, including unexpected `skipped` or `cancelled`, fails the gate. Dynamic job names are never required directly.

Workflow concurrency is isolated by workflow plus pull request, merge-group head, or ref. A newer pull-request commit cancels only the superseded run of the same workflow. Pushes to `main`, merge-group checks, and manual evidence runs are not automatically cancelled.

## Permissions and checkout

Default permissions are:

```yaml
permissions:
  contents: read
```

Only the CodeQL job receives the additional job-scoped `security-events: write` permission. No job receives write access to contents, packages, deployments, actions, administration, checks, pull requests, or OIDC. Checkout always uses `persist-credentials: false`.

No workflow reads `secrets.*`, selects a GitHub environment, or receives production/provider credentials. Synthetic local PostgreSQL and Redis values remain inside the existing isolated test harnesses.

## Immutable actions

Every external action was resolved from its official, non-fork repository to the release's underlying commit on 2 August 2026.

| Action | Release | Full commit SHA |
|---|---|---|
| `actions/checkout` | `v7.0.1` | `3d3c42e5aac5ba805825da76410c181273ba90b1` |
| `actions/setup-node` | `v7.0.0` | `820762786026740c76f36085b0efc47a31fe5020` |
| `actions/cache` | `v6.1.0` | `55cc8345863c7cc4c66a329aec7e433d2d1c52a9` |
| `actions/upload-artifact` | `v7.0.1` | `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a` |
| `actions/dependency-review-action` | `v5.0.0` | `a1d282b36b6f3519aa1f3fc636f609c47dddb294` |
| `github/codeql-action` | `codeql-bundle-v2.26.2` | `18420e3271f74589575af831a523c833acda327f` |
| `pnpm/action-setup` | `v6.0.9` | `0ebf47130e4866e96fce0953f49152a61190b271` |

The repository validator rejects an unknown action, tag, branch, shortened SHA, or missing human-readable release comment. Repository settings currently allow all actions and do not require SHA pinning; Security should enable repository or organisation SHA enforcement after reviewing compatibility.

## Toolchain and cache

The local composite setup action installs exactly Node `24.18.0` and pnpm `11.17.0`, records Node/pnpm/Git and applicable Docker versions, restores only the pnpm content-addressable store, and then performs `pnpm install --frozen-lockfile`.

The cache key includes runner OS, architecture, Node version, pnpm version, and `pnpm-lock.yaml` hash. A cache miss changes performance only. `node_modules`, environment files, database/Redis volumes, simulator state, process state, credentials, and logs are never cached. Frozen installation remains authoritative and dependency metadata mutation fails immediately.

## Local commands

```bash
pnpm ci:validate
pnpm ci:self-test
pnpm ci:quality
pnpm ci:integration
pnpm ci:security
pnpm ci:windows       # Windows compatibility segment
pnpm ci:evidence -- --suite <suite> --segment <segment> --job-result success
pnpm ci:verify        # Linux-capable canonical aggregate; excludes the Windows-only segment
pnpm security:dependencies:verify
pnpm observability:verify
pnpm ui:verify
pnpm ui:shells:verify
pnpm ui:commerce:verify
pnpm ui:storybook:verify
pnpm ui:visual:test
```

`ci:quality`, `ci:integration`, `ci:security`, and `ci:windows` execute the same checked-in command catalog used by Actions. The Security repository segment runs the deterministic dependency-floor validator and its negative self-test before secret and redaction controls. Live `pnpm audit --audit-level moderate` remains review evidence rather than a registry-dependent stable gate. The Quality policy segment runs DEV-010 observability validation and UI-001 token validation with their negative tests; unit coverage includes the token/contrast suite. The Integration harness segment runs its real PostgreSQL/Redis trace and readiness-recovery rehearsal. Windows validates the same static observability and token policy plus normal runtime startup/shutdown. These remain within the five stable gate names. Results are written under ignored `.artifacts/ci/`.

The Quality policy and Windows segments include UI-003 commerce truth, exact-money, evidence/privacy, client-boundary, generated-CSS, and negative-policy validation through the existing `ui:*` aggregate. Unit/component coverage includes commerce precision, truth, axe, and keyboard/focus tests. No sixth stable gate is introduced.

UI-004 route, navigation, fake-authority/data, client-boundary, link-integrity, responsive-token, and negative-policy checks run through the same `ui:validate` and `ui:self-test` aggregate in Quality policy and Windows compatibility. Shell unit/component coverage remains in the existing Quality gate; no gate name is added or changed.

UI-006 adds a mandatory Quality segment that validates the Storybook inventory, runs negative policy fixtures, exercises eligible stories with real Chromium and error-level axe enforcement, builds the private static catalogue, and compares the 31 reviewed Ubuntu baselines at zero-pixel tolerance. Windows installs the same pinned Chromium and runs validation, negative tests, browser accessibility, static build, and all-entry smoke without pixel comparison. `ui:visual:update` is prohibited in CI.

CI validates deployment configuration but has no provider credentials, deploy permissions, production environment, or deployment hook. Remote staging smoke remains a separately authorized post-deploy action and its redacted evidence is created under `.artifacts/deployment/`.

## Test and infrastructure policy

- Vitest retains seed `6006`, UTC, zero retries, no focused tests, and no unauthorised skips.
- Linux `ubuntu-24.04` is authoritative for PostgreSQL, Redis, Docker Compose, and Testcontainers.
- Windows `windows-2025` validates pnpm invocation, paths, builds, runtime process spawning, probes, and tree cleanup without attempting Linux-container integration.
- Database, queue, and Testcontainers jobs first build their workspace dependencies on each clean runner, then use synthetic credentials, ephemeral/disposable resources, and the existing real migration/recovery suites.
- `ci:cleanup` is guarded by both `CI=true` and `GITHUB_ACTIONS=true`; it removes only DEV-004/005 or Testcontainers-labelled resources on the disposable runner and fails on an unexpected container.
- Cleanup steps use `if: always()` and cleanup failure is a job failure.

## Evidence and artifacts

Every execution segment writes a result record and a schema-versioned manifest. The manifest includes repository, exact SHA/ref, event, workflow/run/attempt, runner OS/image, Node/pnpm/Git/Docker versions, lockfile SHA-256, seed, command outcomes/durations, coverage summary where available, migration count/checksum, reviewed container digests, traceability status, artifact name, timestamps, and limitations.

The collector rejects credential URLs, keys, tokens, private keys, credential-bearing fields, and unsafe declarations before upload. It never serializes the process environment.

Artifacts use names such as `noma-quality-tests-<run>-<attempt>` and retain:

- safe JSON results and evidence manifest;
- JUnit XML;
- V8 JSON summary, LCOV, and HTML coverage; and
- bounded task-specific result summaries.

Retention is 90 days, matching the Build Pack recommendation for PR unit/integration evidence. Upload uses `if: always()`, `if-no-files-found: error`, and never includes `.env`, `node_modules`, repository copies, database dumps/volumes, Redis volumes, provider payloads, or environment dumps. Artifact attestations remain deferred until a later task creates a deployable artifact with a consumer verification contract.

## Security availability and dependency policy

Read-only inspection on 9 August 2026 found:

| Control | State |
|---|---|
| Actions | enabled; default workflow token is read-only |
| Action SHA enforcement | disabled |
| CodeQL | supported; default setup not configured; DEV-008 uses pinned advanced setup |
| Dependency review / dependency graph | enabled; the pinned action blocks newly introduced `moderate` or higher vulnerabilities |
| Secret scanning | disabled |
| Push protection | disabled |
| Dependabot alerts | enabled; SEC-005 remediated the original alerts, SEC-006 raised the nanoid floor to 3.3.18, and SEC-007 remediates GHSA-ggr8-5vv4-36mx in Prisma's configuration graph |
| Branch protection / repository rulesets | active for `main` with the five stable required checks; administrator-controlled |
| Merge queue | not configured |

Repository-local dependency-floor validation, high-confidence secret scanning, and governed-evidence redaction remain mandatory, but they are not presented as replacements for live advisory data, native secret scanning, or push protection. Infrastructure activation remains blocked until a later human merge is followed by a clean default-branch Moderate-or-higher advisory check.

## Manual deliberate-failure proof

Only `ci-quality.yml` exposes deliberate-failure controls. The manual-dispatch Boolean `force_ci_failure` defaults to `false`. Before this new workflow exists on the default branch, the equivalent pre-merge proof is an explicit `ci-force-failure` label event; synchronization, reopen, and ordinary label states cannot activate it. Either authorized control makes the tests segment exit with the reserved deliberate-failure code after normal tests, evidence collection/upload still runs, and `Noma / Quality Gate` must fail. Removing the label triggers a normal recovery run.

Before merge, apply the dedicated label to the draft PR, inspect the failing run, then remove it to trigger the normal recovery run:

```bash
gh pr edit <PR_NUMBER> --add-label ci-force-failure
gh pr edit <PR_NUMBER> --remove-label ci-force-failure
```

After the workflow exists on the default branch, the equivalent manual dispatch is:

```bash
gh workflow run ci-quality.yml --ref main -f force_ci_failure=true
```

Record both run IDs in the draft PR. Never prove this control with an intentionally broken commit.

## Failure triage and reruns

Inspect the first failing command, its exact seed, job log, result manifest, and upstream gate result. Correct deterministic code, test, runner-image, or repository-setting causes before rerunning. A retry that turns a P0 failure green without an explained change is not acceptable evidence. No required suite uses automatic retry or `continue-on-error`.

Superseded pull-request runs may be cancelled by concurrency. Main, merge-group, and manual evidence runs are preserved. A gate treats an upstream cancellation as failure; a fully cancelled workflow is not green evidence.

## Branch protection

The workflow implementation can be reviewed and executed without modifying governance settings. DEV-008's acceptance statement that a protected branch cannot merge on failed checks remains **blocked** until an authorised owner applies and verifies the rules in [`runbooks/github-required-checks.md`](runbooks/github-required-checks.md).

## Rollback and exclusions

Rollback is a source revert of the workflows, scripts, documentation, and traceability changes. There is no migration or external state to undo.

Production observability providers, collectors, credentials, dashboards, alerts, deployment, DNS, releases, business routes/entities, and paid-pilot activation remain excluded.
