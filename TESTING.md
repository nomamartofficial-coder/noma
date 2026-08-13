# Deterministic testing foundation

> **Task:** `DEV-006`
> **Risk:** `P0-RECOVERY`
> **Authority:** `docs/11-testing-strategy.md`

## Test projects

The root Vitest configuration defines three non-overlapping projects:

| Project | Command | Boundary |
|---|---|---|
| Unit | `pnpm test:unit` | Node, no Docker, network, or wall-clock dependency |
| Component | `pnpm test:component` | jsdom, Testing Library, jest-dom, and user-event |
| Integration | `pnpm test:integration` | Real isolated PostgreSQL and Redis through Testcontainers |

`pnpm test` runs unit and component projects. `pnpm testing:verify` validates the foundation, executes its negative self-test, type-checks test code, and runs all three projects. Tests never retry automatically, focused tests are prohibited, and `NOMA_TEST_SEED` defaults to the reported stable seed `6006`.

The existing `pnpm db:verify` and `pnpm queue:verify` Compose suites remain focused DEV-004/005 recovery evidence. New reusable infrastructure tests use `@noma/testing/containers`.

DEV-010 adds `pnpm observability:integration`, a bounded sequential Testcontainers rehearsal that applies committed migrations, proves connected API/outbox/BullMQ/Worker trace context and PostgreSQL completion evidence, then pauses authenticated Redis and observes readiness fail and recover while liveness remains healthy. It uses `pollUntil`, not arbitrary wall-clock sleeps.

UI-001 adds a Docker-free `@noma/ui` unit suite. It recomputes WCAG relative luminance for required text, status, action, and focus pairs; proves immutable aliases and isolated brand remapping; and verifies deterministic TypeScript/CSS parity, reduced motion, forced colours, and the light-only pilot boundary. `pnpm ui:verify` runs the generated-output check, static policy, 20 negative fixtures, and token tests without network or infrastructure.

UI-002 adds Docker-free primitive component coverage under the shared jsdom project. It exercises native semantics, labels/descriptions/errors, disabled/read-only/pending states, error-summary focus, select/choice/tab/menu keyboards, modal Escape/focus restoration, table/pagination semantics, and toast focus/announcement controls. The axe helper runs only rules supported by JSDOM and deliberately disables colour contrast; layout, paint, target geometry, focus visibility, zoom, forced colours, reduced motion, assistive-technology output, and visual quality remain real-browser/human review obligations. `pnpm ui:components:verify` runs component policy, negative fixtures, and the focused component suite.

UI-003 adds Docker-free commerce truth and exact-money tests. It covers all five presentation phases, opt-in announcements, responsibility/deadline semantics, RFC 3339 Lagos time, large integer precision, 0/2/3-digit currencies, caller-calculated breakdowns, caller-ordered immutable history, safe evidence metadata, least-destructive dialog focus, reason validation, pending duplicate prevention, and synthetic refund/payout/payment/custody truth regressions. `pnpm ui:commerce:verify` runs validation, 12 injected negative-policy fixtures, unit tests, component interaction, and supported axe rules; human review remains authoritative for rendered contrast, reflow, forced colours, reduced motion, target geometry, and screen-reader speech.

## Deterministic utilities

`@noma/testing` exports manual clocks, seeded randomness and identifiers, immutable fixture contexts, schema-neutral synthetic personas, technical outbox/job fixtures, scripted outcomes, barriers, deadline polling, and LIFO cleanup.

- Pass clocks and identifier sources into application code through structural ports; production code must never import this package.
- Use the same explicit seed to reproduce a failure. Property-test seeds and shrink paths remain the responsibility of the owning suite.
- A `block-until-aborted` scripted outcome represents an uncertain provider wait without an arbitrary delay.
- `pollUntil` always has a deadline and supports an injected scheduler for unit tests.
- Privileged personas require explicit opt-in and carry no invented capability grants.

All fixtures are synthetic. Reserved `noma.test` addresses and `test_` tokens are not usable credentials. Production databases, provider payload dumps, personal data, bank information, identity evidence, or real secrets are prohibited.

## Testcontainers harness

The Node-only `@noma/testing/containers` export starts PostgreSQL `18.4-alpine3.23` and Redis `8.8.1-alpine3.23` by the reviewed multi-platform digests already used by local Compose.

The harness:

- refuses preview, staging, production, existing database/Redis URLs, and live provider credentials;
- uses ephemeral ports and deterministic synthetic credentials;
- configures PostgreSQL in UTC with SCRAM password encryption;
- configures authenticated Redis with AOF and `maxmemory-policy=noeviction`;
- exposes connection details and a test-only runtime environment without serializing URLs or passwords;
- accepts an optional database-preparation callback for applying the committed Prisma migrations;
- explicitly removes containers and volumes on `stop()` and leaves the Testcontainers resource reaper enabled; and
- does not expose database reset, truncate, delete-all, or production cleanup functions.

Each integration harness owns a disposable database and Redis instance. Cleanup destroys those isolated resources rather than editing append-only records into an expected state. Container reuse is disabled.

## Adding tests

- Put ordinary package/application tests under their owning `tests/` directory.
- Keep token contrast and policy tests under `packages/ui/tests`; calculate ratios from the canonical registry rather than asserting copied ratio strings.
- Suffix DOM tests with `.component.test.tsx` under `tests/component/` until an owning UI package adds its own component project.
- Suffix real-infrastructure harness tests with `.integration.test.ts`.
- Query UI by accessible role/name and exercise interaction with user-event.
- Use database locks/barriers or explicit polling deadlines for races; never arbitrary sleeps.
- Close clients before stopping containers and treat cleanup failure as a test defect.
- Keep diagnostics, coverage, traces, and screenshots free of secrets and personal data.

Docker Desktop or another [Testcontainers-supported runtime](https://node.testcontainers.org/supported-container-runtimes/) is required only for integration tests. DEV-008 attaches these commands to the Linux GitHub Actions integration gate. Windows remains authoritative for pnpm, path, build, runtime process-launch, health-probe, and process-tree cleanup compatibility without attempting Linux-container integration.

The optional native build scripts from `cpu-features`, `protobufjs`, and `ssh2` are explicitly denied in `pnpm-workspace.yaml`; the testing foundation uses their supported JavaScript paths and does not require native compilation.

## CI reporting

The checked-in CI command catalog runs with the same UTC/seed/zero-retry contract. Unit and component jobs emit human-readable output, JUnit XML, V8 JSON summary, LCOV, and HTML coverage. Coverage remains diagnostic: DEV-008 records the repository baseline and provider-contract source separately and does not introduce an unapproved threshold that the current foundation cannot meet.

Safe command results and evidence manifests are written under ignored `.artifacts/ci/` and retained by GitHub for 90 days. They contain exact commit/run/toolchain metadata, not environment dumps, URLs, credentials, provider payloads, database/Redis volumes, or personal data. See [`CI.md`](CI.md).
