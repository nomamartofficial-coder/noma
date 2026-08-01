# ADR-0005: Redis, BullMQ, and transactional-outbox foundation

- **Status:** Accepted for DEV-005 review
- **Date:** 2026-08-01
- **Task:** `DEV-005`
- **Requirement:** `REQ-DEV-005`
- **Decisions:** `DEC-ARCH-001`, `DEC-ARCH-005`, `DEC-SCOPE-014`, `DEC-REPO-001`
- **Risks:** `P0-RECOVERY`, `P0-WEBHOOK`

## Context

Committed marketplace obligations must survive process and delivery-infrastructure failures. Publishing directly after a PostgreSQL commit leaves a loss window; making Redis authoritative would violate Noma's recovery model. Duplicate publication and processing are also unavoidable under crash recovery and therefore must be safe by construction.

## Decision

1. Keep PostgreSQL authoritative and write each asynchronous obligation into `outbox_events` in the same existing transaction as its source state.
2. Pin BullMQ `5.81.2`, ioredis `5.11.1`, and the official Redis `8.8.1-alpine3.23` multi-platform image digest.
3. Put the concrete Redis/BullMQ adapter in `@noma/integrations`; packages in the platform layer remain provider-independent.
4. Use the outbox UUID as the BullMQ job ID and prohibit the reserved colon separator.
5. Claim with `FOR UPDATE SKIP LOCKED`, a 250 ms non-overlapping poll, batches of 50, and 30-second claim/recovery leases. Publication occurs outside the database transaction.
6. Re-drive dispatched but unprocessed rows after 30 seconds. Redis persistence improves recovery time but PostgreSQL recreates work after total Redis loss.
7. Require registered, versioned contracts with runtime payload validation, credential-safe bounded JSON, privacy class, authorised service principals, retry/dead-letter rules, idempotency policy, deadline, observability attributes, and success evidence.
8. Record one PostgreSQL `job_executions` identity per queue/job and append every `job_execution_attempts` outcome. A duplicate completed delivery is a no-op.
9. Commit the database effect, completed job evidence, completed attempt, and processed outbox row atomically. Deadline cancellation rejects and rolls back this transaction.
10. Retain completed and failed BullMQ jobs. Permanent or exhausted jobs also open a PostgreSQL attention record with Operations, Finance, or Security ownership, deadline, and recovery action.
11. Keep Worker scaffold mode compatible when both dependencies are absent; reject partial configuration and make readiness reflect live PostgreSQL and Redis probes when configured.
12. Expose typed metric sources now; attach OpenTelemetry exporters in DEV-010.

## Alternatives considered

### Direct API publication

Rejected because a crash between database commit and queue publication loses the obligation. The API writes only authoritative state plus its outbox row.

### Redis as recovery truth

Rejected because Redis loss must not erase business obligations, provider events, notifications, or reconciliation work.

### Exactly-once delivery claims

Rejected. The design uses at-least-once delivery with deterministic publication and PostgreSQL-backed idempotent effects, which is testable under real crash windows.

### In-memory Redis test substitute

Rejected because it cannot establish BullMQ scripting, persistence, job-ID, retry, or connection-loss behaviour. DEV-005 uses a bounded Compose harness; reusable Testcontainers remains DEV-006.

### Automatic finalized-job removal

Rejected until retention and recovery policy is separately reviewed. Redis retention cannot replace PostgreSQL execution evidence.

## Consequences

- Business tasks gain a transaction-bound event API and a repeatable queue contract.
- Redis outages may delay asynchronous effects but do not erase committed obligations.
- PostgreSQL retains additional technical history and open attention records that need future retention and Operations UI policy.
- The Worker depends on both PostgreSQL and Redis only when explicitly configured.
- No business job, provider call, public route, UI, production service, or deployment is activated.

## Migration, compatibility, and recovery

The migration is additive and forward-only. It creates only technical outbox and job-execution tables, checks, foreign keys, unique identities, append-only attempt history, and partial claim/recovery/attention indexes. DEV-004 data-preservation and restore rehearsal now applies all three migrations. Applied SQL is immutable; correction uses a new migration.

Recovery first restores PostgreSQL, then allows the dispatcher to re-drive eligible records into an empty Redis service. Duplicate IDs and completed PostgreSQL execution identities prevent repeated logical effects.

## Security, privacy, financial, inventory, and custody impact

Queue URLs stay in non-enumerable server configuration and never enter Web. Local ports bind to loopback and use synthetic authentication. Event payloads reject credential-like fields and carry only required references/data with a privacy classification and authorised service principal. Safe failures redact credential URLs and secret-like values.

The foundation performs no payment, refund, payout, inventory, order, custody, provider, email, or SMS action. Future jobs performing those actions require owning-module authorization, idempotency, evidence, and review.

## Verification

```text
pnpm install --frozen-lockfile
pnpm queue:verify
pnpm db:verify
pnpm env:verify
pnpm lint
pnpm typecheck
pnpm build
pnpm smoke:runtimes
python scripts/validate_traceability.py
python scripts/validate_traceability.py --self-test
python scripts/validate_traceability.py --lookup DEV-005
```

Engineering, QA, Security, Data, and applicable DevOps review remains required before merge.
