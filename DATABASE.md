# Noma database foundation

> **Task:** `DEV-004`
> **Risk:** `P0-RECOVERY`
> **Scope:** Prisma/PostgreSQL client, extension-only baseline migration, forward-only validation, bounded transaction helpers, local real-database startup, and guarded cleanup

## Pinned foundation

| Component | Pin | Purpose |
|---|---|---|
| Prisma ORM / Client / PostgreSQL adapter | `7.9.1` | Schema, generated server client, migrations, transactions |
| `pg` | `8.22.0` | Prisma PostgreSQL driver and bounded connection pool |
| PostgreSQL | `18.4` on Alpine `3.23` | Local and migration-test authoritative store |
| Image digest | `sha256:996d0920e4ff9df1fc19dacb904492f3c1ec0ec1cc338f0ad7123be7731c5f5e` | Reproducible multi-platform image |

The image mounts its named volume at `/var/lib/postgresql`, the PostgreSQL 18 version-aware parent path. Local port publishing is restricted to `127.0.0.1`. Readiness requires PostgreSQL's final PID 1 server, so the image's temporary initialization server cannot be mistaken for a ready database.

## Local start

```bash
pnpm install --frozen-lockfile
pnpm db:up
pnpm db:validate
pnpm db:generate
pnpm db:migrate:dev
```

Defaults are intentionally local and synthetic:

```text
host:     127.0.0.1
port:     55432
database: noma
user:     noma
```

The Compose-only password is a known local development value, not a production secret. Override `NOMA_POSTGRES_PASSWORD` before startup when sharing a development host. Preview, staging, and production must use environment-isolated provider credentials through approved environment controls.

Stop the local service without deleting its named volume:

```bash
pnpm db:down
```

## Prisma commands

| Command | Behaviour |
|---|---|
| `pnpm db:validate` | validates the repository policy, checksums, Prisma schema, image pin, and reset interception |
| `pnpm db:generate` | generates the server-only Prisma client into ignored source output |
| `pnpm db:migrate:dev` | creates/applies reviewed development migrations against the configured database |
| `pnpm db:migrate:deploy` | applies committed forward-only migrations; it does not generate or edit them |
| `pnpm db:migrate:status` | reports committed/applied migration state |
| `pnpm db:migration-test` | uses an isolated real PostgreSQL project for clean, upgrade, checksum, and restore verification |
| `pnpm db:verify` | runs all DEV-004 static, unit, and real-database verification |

`prisma db push` is not a production migration process and has no repository command. Applied migration files are immutable. `packages/database/prisma/migration-checksums.json` fails validation when committed SQL changes without an explicit reviewed migration-history update.

## Baseline and foundation migrations

The first migration is an intentionally no-op pre-Prisma baseline marker. The second migration is additive, introduces no business entity, and enables only:

- `citext`, for explicitly reviewed case-insensitive domain columns; and
- `pg_trgm`, for the locked PostgreSQL search direction.

Owning-module tasks add tables, foreign keys, checks, partial indexes, and PostgreSQL-specific SQL later. Prisma model access never grants cross-module write authority.

An audited database that existed before Prisma migration history must first be verified against its expected pre-Prisma schema. An authorised operator may then mark only `20260801000000_pre_prisma_baseline` as applied with `prisma migrate resolve --applied`; the normal `pnpm db:migrate:deploy` command applies the additive foundation migration. Never resolve the foundation migration without executing it, and never use baselining to conceal schema drift.

## Transaction boundary

`@noma/database` exports:

- a PostgreSQL-only client factory with bounded pool, connection, idle, and statement timeouts;
- one-shot typed transactions; and
- bounded serializable retries only for Prisma `P2034` write-conflict errors.

Retryable operations require an explicit retry identity and at most five attempts. The callback must remain database-only and idempotent; provider calls, email, storage, analytics, or other network work never belongs inside the transaction.

## Reset guard

The repository exposes only `pnpm db:reset:local`. Before Prisma is launched, and again while `prisma.config.ts` is evaluated, the guard requires:

- explicit `NOMA_ENV=development` or `test`;
- matching `NOMA_CREDENTIAL_ENVIRONMENT`;
- an explicit PostgreSQL `DATABASE_URL` whose host is loopback;
- an approved local/test Noma database name; and
- `NOMA_DATABASE_RESET_CONFIRMATION=RESET_LOCAL_NOMA_DATABASE`.

Preview, staging, production, remote hosts, missing confirmation, or ambiguous database names fail before mutation. The guard does not make direct database-administrator access safe; production changes still require reviewed migrations or authorised application commands.

## Migration and restore verification

`pnpm db:migration-test` creates an isolated Compose project and proves:

1. the history migrates an empty real PostgreSQL database;
2. a representative non-empty pre-Prisma schema is explicitly baselined and upgraded without losing its row;
3. `citext`, `pg_trgm`, Prisma history, and the committed checksum match;
4. a logical dump restores into a separate database;
5. migrations remain deployable after restore; and
6. the isolated containers and volume are removed on exit.

The test-only probe is representative preservation evidence, not a Noma domain table or production fixture. The baseline step is explicit because Prisma correctly refuses an untracked non-empty schema.

## Compatibility and recovery

The baseline is additive, so the previous API and Worker builds remain schema-compatible. Ordinary recovery is forward-fix or isolated restore, not destructive migration rollback. This task does not provision production PostgreSQL, configure backups/PITR, prove provider restoration, or satisfy the paid-pilot recovery gate.
