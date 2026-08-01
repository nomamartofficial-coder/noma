# ADR-0004: Prisma and PostgreSQL foundation

- **Status:** Accepted for DEV-004 review
- **Date:** 2026-08-01
- **Task:** `DEV-004`
- **Requirement:** `REQ-DEV-004`
- **Decisions:** `DEC-ARCH-001`, `DEC-SCOPE-014`, `DEC-REPO-001`
- **Risk:** `P0-RECOVERY`

## Context

Noma requires PostgreSQL as authoritative transactional truth and stable Prisma ORM for ordinary persistence. Before DEV-004, `@noma/database` was an empty package with no schema, migration history, real database service, or guarded cleanup path.

The foundation must remain useful to later owning modules without pre-creating business entities, importing persistence into Web, allowing destructive production reset, or pulling Redis/outbox and the general test harness forward from DEV-005/DEV-006.

## Decision

1. Pin Prisma ORM, Client, and `@prisma/adapter-pg` at `7.9.1` with `pg` `8.22.0`.
2. Pin the official PostgreSQL `18.4-alpine3.23` multi-platform image by digest for local and migration-integration execution.
3. Use the Prisma 7 `prisma-client` generator with explicit ignored output inside `packages/database/src/generated/prisma`.
4. Keep the initial Prisma schema free of business models.
5. Commit an intentionally no-op pre-Prisma baseline marker followed by one additive migration enabling only reviewed `citext` and `pg_trgm` extensions.
6. Permit an audited pre-existing schema to mark only the no-op baseline as applied before deploying the additive foundation migration; baselining must never conceal schema drift.
7. Treat migrations as forward-only immutable history backed by a committed SHA-256 manifest and static destructive-SQL rejection.
8. Require an environment, credential-environment, loopback target, database-name, and confirmation guard for reset, evaluated both by the wrapper and Prisma configuration.
9. Expose bounded client-pool and database-only transaction helpers from `@noma/database`; bounded retry applies only to Prisma write-conflict error `P2034` and requires a retry identity.
10. Prove clean migration, explicit prior-schema baselining, data preservation, checksum agreement, logical restore, and post-restore deploy against real PostgreSQL.

## Alternatives considered

### Prisma early-access replacement

Rejected. The Build Pack prohibits early-access persistence replacements for the paid pilot without separate review.

### Raw SQL only

Rejected. It loses the locked generated type-safe persistence direction. Reviewed SQL remains available inside migrations and `packages/database` for PostgreSQL-specific behaviour.

### `prisma db push`

Rejected. It does not provide the reviewed, version-controlled production migration history required by the Build Pack.

### Business placeholder table

Rejected. DEV-004 does not own a domain entity, and a technical dummy model would create misleading persistence authority.

### General Testcontainers harness

Deferred to DEV-006. DEV-004 uses a bounded isolated Compose project to prove only its P0 migration/recovery acceptance criteria.

## Consequences

- Later schema tasks start from real reviewed migration history and a generated server-only client.
- Local and CI-equivalent migration checks use the same PostgreSQL major/minor and extensions.
- The PostgreSQL 18 version-aware volume path is explicit, which avoids silent persistence mistakes with legacy mounts.
- No application runtime becomes database-ready until an owning task wires connectivity and health behaviour.
- Production provisioning, roles, backups, recovery objectives, and operational access remain separate controlled tasks.

## Migration, compatibility, and recovery

The no-op baseline marker and additive foundation migration are compatible with both an empty schema and an audited pre-Prisma schema, as well as existing API/Worker builds. Applied SQL is never edited. Corrections use a new forward migration. Recovery uses isolated restore or forward-fix; destructive database rollback and production reset are prohibited.

## Security, privacy, financial, inventory, and custody impact

The change stores no personal, financial, inventory, order, or custody data. Local credentials are synthetic and loopback-scoped. Database URLs remain server-only. No feature, payment, provider, role, or production environment is activated.

## Verification

```text
pnpm install --frozen-lockfile
pnpm db:validate
pnpm db:self-test
pnpm db:generate
pnpm db:test
pnpm db:migration-test
pnpm lint
pnpm typecheck
pnpm build
pnpm smoke:runtimes
python scripts/validate_traceability.py
python scripts/validate_traceability.py --self-test
python scripts/validate_traceability.py --lookup DEV-004
```

Human Engineering/Data, QA, Security, and applicable DevOps review remains required before merge.
