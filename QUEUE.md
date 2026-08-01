# Redis, BullMQ, and transactional outbox

> **Task:** `DEV-005`
> **Authority:** PostgreSQL records the obligation and processing result; Redis only delivers work.

## Local service

The local Redis service uses the reviewed official `redis:8.8.1-alpine3.23` multi-platform digest. It binds only to `127.0.0.1:56379`, requires a synthetic password, persists AOF data every second, uses a named volume, reports authenticated health, and sets `maxmemory-policy=noeviction` as required for reliable BullMQ operation.

Start PostgreSQL and Redis together:

```bash
pnpm queue:up
```

For the checked-in defaults, configure the Worker with both URLs:

```text
DATABASE_URL=postgresql://noma:noma-local-dev-only@127.0.0.1:55432/noma?schema=public
REDIS_URL=redis://default:noma-local-redis-only@127.0.0.1:56379
```

`NOMA_POSTGRES_PASSWORD`, `NOMA_REDIS_PASSWORD`, and the published ports may be overridden before Compose starts. These local defaults are not production credentials. Redis has no browser-facing interface.

Stop services while retaining data with `pnpm queue:down`. Removing volumes is reserved for isolated tests or an explicitly authorised local reset.

## Transactional publication contract

Business code calls `createOutboxEvent` only with the existing Prisma transaction that commits the authoritative state change. It never publishes directly to Redis. The event contains a versioned, minimal JSON envelope, aggregate version, optional institution/resource scope, privacy class, authorised service principal, correlation, and availability time.

The Worker claims at most 50 eligible rows with `FOR UPDATE SKIP LOCKED`, using a 30-second lease. It publishes outside the transaction, then marks the row dispatched. Polls run every 250 milliseconds and never overlap.

Every BullMQ job ID is the outbox UUID. A colon is prohibited because BullMQ reserves that separator. If the Worker stops after `Queue.add` but before updating PostgreSQL, replaying the same UUID produces one logical job. Dispatched rows that are still unprocessed after 30 seconds become eligible for publication again, so PostgreSQL can reconstruct delivery after complete Redis loss.

Transient publication failures return to `PENDING` with full-jitter exponential delay capped at 60 seconds. Unknown, invalid, unauthorised, or unsupported contracts enter an owned PostgreSQL dead-letter state rather than looping.

## Processing contract

Each registered job declares:

- queue and versioned job identity;
- authorised service principals and privacy classification;
- runtime payload parser and a 32 KiB credential-safe payload ceiling;
- PostgreSQL outbox-event idempotency and completed-delivery no-op behaviour;
- bounded exponential retry with jitter and an abortable deadline;
- PostgreSQL completion evidence; and
- Operations, Finance, or Security dead-letter ownership, deadline, and recovery action.

`beginJobExecution` leases the unique queue/job identity and appends an attempt. A completed identity is a safe no-op on duplicate delivery. `completeJobExecution` commits the job's database effect, completion evidence, attempt outcome, and outbox processing timestamp in one transaction. A deadline abort rolls that transaction back. Retryable failures release the execution for a later BullMQ attempt; permanent or exhausted work stays failed in BullMQ and opens the matching PostgreSQL attention record.

Finalized BullMQ jobs are deliberately retained. Retention may change only with an approved recovery policy and can never weaken PostgreSQL idempotency.

## Runtime and readiness

For scaffold compatibility, the Worker is ready with both dependencies absent and reports `database` and `queue` as `not-configured`. Supplying exactly one URL fails startup. With both set, startup fails closed unless both dependencies are live, and readiness changes to unavailable when either periodic probe fails. Liveness continues to report whether the process itself is running.

No business processor is registered by DEV-005. Owning modules add contracts and transaction-bound handlers later; no API route or direct API publication was added.

## Metrics sources

The foundation records sources for:

- pending outbox count and oldest unpublished age;
- publication success, retry, and permanent outcomes;
- BullMQ waiting, active, delayed, completed, and failed states;
- retry count and processing duration; and
- open dead letters by Operations, Finance, or Security owner.

DEV-010 will attach OpenTelemetry exporters. Until then these are typed in-process records and PostgreSQL/BullMQ snapshots.

## Verification

```bash
pnpm queue:verify
pnpm db:verify
pnpm env:verify
pnpm lint
pnpm typecheck
pnpm build
pnpm smoke:runtimes
```

`queue:verify` uses an isolated real PostgreSQL/Redis Compose project. It exercises rollback, abrupt producer exit, concurrent claiming, duplicate delivery, worker restart, acknowledgement failure, Redis outage and data loss, aggregate ordering, poison/exhausted jobs, owned attention, and metric visibility. It uses polling deadlines and database barriers, not in-memory Redis substitutes. The reusable Testcontainers harness remains DEV-006.

## Production boundary

DEV-005 does not provision, deploy, or activate production Redis. A managed production service must use encrypted transport, environment-isolated credentials, access controls, persistence and backup policy, alerting, tested recovery, and capacity settings reviewed by Engineering, Security, QA, Data, and DevOps.
