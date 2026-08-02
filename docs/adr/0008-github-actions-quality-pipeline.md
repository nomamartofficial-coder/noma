# ADR-0008: Secure GitHub Actions quality pipeline

- **Status:** Proposed for human review
- **Date:** 2026-08-02
- **Task:** `DEV-008`
- **Decision owners:** Engineering / QA / Security
- **Reviewers:** Engineering, QA, Security, applicable DevOps, Data for recovery evidence

## Context

DEV-001 through DEV-007 established exact toolchain pins, package/runtime/config validation, PostgreSQL migration and restore rehearsals, Redis/BullMQ recovery, deterministic Testcontainers, provider conformance, and Windows-safe runtime smoke checks. These commands were manually verified but were not enforced by GitHub Actions. `REQ-DEV-008`, `DEC-SCOPE-014`, and Parts 10–13 require a deterministic protected-branch evidence pipeline without production credentials or deployment authority.

At decision time the public repository had Actions enabled with read-only default tokens, but no workflow, branch protection, ruleset, merge queue, SHA enforcement, native secret scanning, or push protection. CodeQL was available but unconfigured. The dependency-graph SBOM endpoint was unavailable.

## Decision

Use four bounded workflows for quality, Linux infrastructure integration, security, and Windows compatibility. Each workflow runs for pull requests to `main`, pushes to `main`, merge groups, and manual dispatch, with workflow-specific concurrency. Dynamic work is hidden behind five stable aggregator checks suitable for branch protection.

All external actions are limited to official GitHub or pnpm repositories and pinned to reviewed full commit SHAs. Default permissions are `contents: read`; only CodeQL receives job-scoped `security-events: write`. Checkout never persists credentials. No job selects an environment, reads repository secrets, deploys, publishes, or requests OIDC.

Use one simple local composite action for exact Node/pnpm setup, pnpm-store caching, frozen installation, and lockfile immutability. Use checked-in Node scripts for command cataloguing, policy validation, stable gate evaluation, high-confidence source-secret detection, evidence collection/redaction, and CI-only cleanup. Workflow YAML remains orchestration rather than the sole home of policy logic.

Retain safe PR test artifacts for 90 days. Do not attest ordinary logs/coverage; defer attestations until a deployable artifact and verification consumer exist.

Keep branch-protection and security-feature changes human-controlled. Documentation records exact administrator actions and continues to mark the protection acceptance criterion blocked until verified.

## Consequences

- Independent jobs run in parallel and expose stable, comprehensible gates.
- Linux remains authoritative for container integration while Windows process/path behaviour is required separately.
- Some production builds repeat across isolated jobs; correctness and bounded parallelism are preferred to mutable cross-job build caches.
- A missing dependency graph may keep the Security Gate red until an administrator enables the required repository feature.
- Native secret scanning and push protection remain visible governance gaps even though repository-local checks operate.
- No P0 retry or `continue-on-error` converts a failure into green evidence.
- No application, database, event/job, provider, financial, inventory, custody, or deployment contract changes.

## Rejected alternatives

- One giant workflow: harder to review, slower to diagnose, and unsuitable for independent concurrency.
- Dynamic matrix names as required checks: unstable branch-protection contract.
- `pull_request_target`: would run untrusted repository code in a privileged context.
- Floating action tags: mutable supply-chain input.
- Caching `node_modules`, database/Redis volumes, or runtime state: correctness and isolation risk.
- Third-party opaque secret scanners: unnecessary before a transparent repository-local baseline and native GitHub controls.
- Automatic branch-protection mutation: privileged governance change outside task authority.
- Artifact attestations for logs: no deployable consumer artifact exists in DEV-008.

## Rollback

Revert the DEV-008 commits. No deployment, provider action, migration, data change, environment, or external infrastructure requires rollback. Required-check settings must not be applied until the named checks exist and pass; if later applied, an authorised owner must adjust them as a separate audited governance action.

