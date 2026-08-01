# @noma/database

Server-only Prisma/PostgreSQL persistence boundary.

The public package exports the bounded client factory and transaction helpers. Prisma-generated types, migrations, reset safety, repositories, and future module mappings remain internal; deep imports are prohibited.

DEV-004 intentionally contains no business model or seed data. Later owning-module tasks add schema and repositories with reviewed constraints, indexes, authorization scope, audit/outbox effects, and real PostgreSQL tests.

Canonical guidance and commands are in [`DATABASE.md`](../../DATABASE.md).
