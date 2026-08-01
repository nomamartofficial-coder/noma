# @noma/testing

Deterministic fixtures, clocks, identifiers, scripted outcomes, concurrency helpers, and test-harness public contracts.

Only public exports may be imported. Deep imports are prohibited.

- `@noma/testing` is pure test support and does not start infrastructure.
- `@noma/testing/containers` is Node-only and starts isolated PostgreSQL/Redis Testcontainers.

Production source and dependencies must never import this package. Read [`TESTING.md`](../../TESTING.md) for commands, safety rules, cleanup, and fixture governance.
