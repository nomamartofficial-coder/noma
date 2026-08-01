# ADR-0007: Provider-neutral ports and deterministic local simulators

- **Status:** Accepted for DEV-007 review
- **Date:** 2026-08-01
- **Task:** `DEV-007`
- **Requirement:** `REQ-DEV-007`
- **Risk:** `P0-FINANCIAL`
- **Decisions:** `DEC-ARCH-001`, `DEC-SCOPE-014`, `DEC-REPO-001`, `IDR-001`–`IDR-018`, `SDR-006`, `SDR-008`–`SDR-012`, `SDR-016`, `TDR-001`, `TDR-008`–`TDR-013`, `TDR-018`

## Context

Later payment, refund, payout, file, notification, monitoring, analytics, and infrastructure tasks need stable boundaries before business persistence or real adapters exist. Direct SDK-shaped contracts would couple application logic to selected providers and make ambiguity, replay, reversal, privacy, and replacement unsafe. Ordinary mocks would not prove that future adapters obey the same contract.

## Decision

1. Define provider-neutral values and ports in `@noma/platform/providers`.
2. Keep all external effects after authoritative transaction/outbox commit; no port owns domain persistence.
3. Represent accepted, final success, final failure, uncertain, and rejected outcomes explicitly.
4. Treat money as integer minor units plus currency/environment and require stable operation/idempotency identity.
5. Implement one deterministic simulator kernel in `@noma/integrations`, exported only through a test entry point.
6. Compose it through `@noma/testing/providers` with DEV-006 clock, identifiers, scripted outcomes, and scheduler.
7. Replay duplicate operation IDs; model timeout-after-possible-acceptance as uncertain; preserve unknown/out-of-order/reversal observations.
8. Expose only immutable redacted test inspection. Production and Web imports fail validation.
9. Default provider mode to disabled, prohibit production simulation, and fail closed for deferred real adapters without requiring credentials.
10. Add no SDK, migration, business entity, real endpoint, provider account, deployment, or activation.

## Consequences

Owning tasks can implement real adapters against a reviewed contract and reuse conformance cases. The broad interface set is intentionally technical and does not pre-create aggregates. Runtime validators and static negative tests add maintenance cost, but make unsafe data and package-direction errors visible early.

## Alternatives rejected

- **Vendor SDK types as ports:** leaks status/failure semantics and reverses dependency direction.
- **One success/failure boolean:** erases acceptance, ambiguity, reversal, and reconciliation.
- **Ad hoc mocks in feature tests:** cannot establish reusable deterministic conformance.
- **Simulators inside platform/domain:** makes application code own infrastructure and risks production selection.
- **Real adapters in DEV-007:** expands scope into PAY/REF/PYO/FIL/NTF/DEV-009/DEV-010 and introduces credentials/external state.
- **Database-backed simulator registry:** unnecessary persistence and migration for isolated test state.

## Verification and rollback

Validation checks all port families, deterministic primitives, environment fail-closed rules, SDK/live-host absence, and negative import/data violations. Unit/conformance tests cover all families and failure semantics. DEV-001–DEV-006 regression commands remain required.

Rollback is a source-only revert. No database, provider, customer, money, object, message, DNS, hosting, monitoring, analytics, or telemetry recovery action exists.
