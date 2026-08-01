# ADR-0006: Deterministic testing and Testcontainers foundation

- **Status:** Accepted for DEV-006 review
- **Date:** 2026-08-01
- **Task:** `DEV-006`
- **Requirement:** `REQ-DEV-006`
- **Decisions:** `DEC-ARCH-001`, `DEC-SCOPE-014`, `DEC-REPO-001`
- **Risk:** `P0-RECOVERY`

## Context

Noma had focused Node test scripts and bounded Compose recovery harnesses, but no shared primary runner, deterministic fixture API, component-test environment, or reusable real-infrastructure harness. Downstream provider, UI, CI, and quality tasks require one controlled foundation without importing test shortcuts into production code or treating in-memory substitutes as PostgreSQL/Redis evidence.

## Decision

1. Use pinned Vitest projects as the primary TypeScript test runner, with V8 coverage, Testing Library/jsdom for components, and zero automatic retries.
2. Keep unit/component projects independent of Docker and external networks.
3. Put pure clocks, seeded identifiers, fixtures, personas, scripted outcomes, barriers, polling, and cleanup in `@noma/testing`.
4. Put Node-only PostgreSQL/Redis lifecycle APIs behind `@noma/testing/containers`.
5. Use the reviewed DEV-004/005 image digests, synthetic credentials, ephemeral ports, authenticated health, and explicit non-reused resource disposal.
6. Apply real Prisma migrations through a caller-supplied preparation callback rather than coupling the testing package to Prisma CLI internals.
7. Clean committed integration state by destroying its isolated container/volume, never by exposing a generic destructive row-reset helper.
8. Reject production application imports of `@noma/testing`, production environments, external dependency URLs, and live credentials.
9. Preserve the focused DEV-004/005 Compose suites as regression evidence; new reusable integration suites use Testcontainers.
10. Validate API/Worker environment configuration before importing heavyweight framework modules so the existing five-second fail-closed startup contract remains deterministic on a cold module graph.
11. Leave CI enforcement/evidence upload to DEV-008 and provider-specific simulators to DEV-007.

## Consequences

- Tests gain reproducible time, IDs, fixtures, outcomes, and infrastructure while retaining real PostgreSQL/Redis semantics.
- Container integration requires a supported local/CI Docker-compatible runtime and takes longer than unit tests.
- Random host ports are intentionally opaque; tests assert behaviour, not port values.
- Test data and credentials remain synthetic and environment-isolated.
- No production API, database schema, provider, deployment, or feature activation changes; runtime startup order is tightened only to preserve pre-bootstrap configuration validation.

## Alternatives considered

### In-memory PostgreSQL or Redis substitutes

Rejected because they cannot prove Prisma migrations, PostgreSQL constraints/locks, Redis authentication, persistence policy, BullMQ scripts, or outage behaviour.

### General database truncate/reset helper

Rejected because it creates a production shortcut and can erase append-only evidence. Disposable test infrastructure is the cleanup boundary.

### Replacing the focused Compose suites immediately

Rejected because DEV-004/005 already contain task-specific recovery and process-restart orchestration. They remain valid regression evidence while future reusable suites adopt Testcontainers.

### Container reuse

Rejected because state leakage and cleanup ambiguity are unacceptable for P0 deterministic evidence.

## Verification and rollback

DEV-006 verifies deterministic utilities, DOM setup, static safety boundaries, real authenticated containers, committed migrations, concurrent isolation, and cleanup failure handling. Rollback reverts test-only configuration and package changes; no migration, production cleanup, provider reversal, or deployment rollback is required.
