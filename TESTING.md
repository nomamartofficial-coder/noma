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
- Suffix DOM tests with `.component.test.tsx` under `tests/component/` until an owning UI package adds its own component project.
- Suffix real-infrastructure harness tests with `.integration.test.ts`.
- Query UI by accessible role/name and exercise interaction with user-event.
- Use database locks/barriers or explicit polling deadlines for races; never arbitrary sleeps.
- Close clients before stopping containers and treat cleanup failure as a test defect.
- Keep diagnostics, coverage, traces, and screenshots free of secrets and personal data.

Docker Desktop or another [Testcontainers-supported runtime](https://node.testcontainers.org/supported-container-runtimes/) is required only for integration tests. DEV-008 will attach these commands to the protected-branch CI and evidence pipeline.

The optional native build scripts from `cpu-features`, `protobufjs`, and `ssh2` are explicitly denied in `pnpm-workspace.yaml`; the testing foundation uses their supported JavaScript paths and does not require native compilation.
