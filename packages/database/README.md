# @noma/database

Server-only Prisma/PostgreSQL persistence boundary.

The public package exports the bounded client factory and transaction helpers. Prisma-generated types, migrations, reset safety, repositories, and future module mappings remain internal; deep imports are prohibited.

DEV-005 adds only the technical `outbox_events`, `job_executions`, and append-only `job_execution_attempts` models. `createOutboxEvent` requires an existing transaction. Dispatcher claiming, recovery, completion evidence, dead-letter ownership, and idempotent execution remain server-only database responsibilities; network publication never occurs inside a transaction.

Canonical guidance and commands are in [`DATABASE.md`](../../DATABASE.md) and [`QUEUE.md`](../../QUEUE.md).
