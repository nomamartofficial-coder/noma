# @noma/database

Server-only Prisma/PostgreSQL persistence boundary.

The public package exports the bounded client factory and transaction helpers. Prisma-generated types, migrations, reset safety, repositories, and future module mappings remain internal; deep imports are prohibited.

DEV-005 adds only the technical `outbox_events`, `job_executions`, and append-only `job_execution_attempts` models. `createOutboxEvent` requires an existing transaction. Dispatcher claiming, recovery, completion evidence, dead-letter ownership, and idempotent execution remain server-only database responsibilities; network publication never occurs inside a transaction.

IAM-001 adds the bounded PostgreSQL implementation of `@noma/platform/identity`: one User identity, conservative active email identity, encoded password-credential metadata, opaque session digests, atomic high-entropy identity-token consumption, and append-only recovery evidence. It exposes no authentication workflow or generic identity CRUD. See [`IDENTITY_PERSISTENCE.md`](../../IDENTITY_PERSISTENCE.md).

Canonical guidance and commands are in [`DATABASE.md`](../../DATABASE.md) and [`QUEUE.md`](../../QUEUE.md).
