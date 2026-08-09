# Dependency readiness failure

## Trigger

API or Worker `/health/ready` returns `503` with coarse `database` or `queue` state `unavailable`, while `/health/live` may remain healthy.

## Triage

1. Identify runtime, environment, release SHA, failing dependency, start time, and correlation/trace IDs from redacted structured logs.
2. Verify PostgreSQL and Redis service health through approved provider controls. Never paste connection URLs, credentials, topology, or stack traces into tickets/evidence.
3. Check recent migration/deployment state and outbox/dead-letter age. PostgreSQL remains authoritative; Redis recovery must re-drive from the outbox.
4. Do not bypass readiness, increase timeouts without review, or report the runtime ready from liveness alone.

## Recovery

Restore the dependency or roll back the compatible application release. Wait for the periodic bounded probes to report readiness `ok`; confirm liveness stayed truthful and check outbox/job recovery evidence. Escalate old unpublished events or failed jobs to the recorded Operations, Finance, or Security owner.

## Closure evidence

Record safe timestamps, release, dependency class, readiness transition, outbox/queue recovery snapshot, owner, corrective action, and follow-up. Do not include database/Redis URLs or payloads.
