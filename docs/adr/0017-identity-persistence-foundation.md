# ADR-0017: PostgreSQL identity persistence without authentication authority

- Status: Accepted for IAM-001 review
- Date: 2026-08-29
- Task: `IAM-001`
- Issue: `#50`
- Pull request: pending
- Authority: `docs/06-technical-architecture.md`, `docs/07-domain-model.md`, `docs/08-state-machines.md`, `docs/10-security-and-compliance.md`, `docs/11-testing-strategy.md`, `REQ-IAM-001`

## Context

Future registration, login, recovery, and session validation require one authoritative identity record and security controls that survive process and Redis loss. Persistence must not prematurely become authentication or authorization, and it must not attach a global role to the person. Raw password and token secrets must remain outside PostgreSQL.

## Decision

Create an additive Prisma/PostgreSQL model for `User`, `UserEmail`, `Credential`, `Session`, `IdentityToken`, and `RecoveryAttempt`. Use the exact M01 and M02 state vocabularies and the documented assurance vocabulary. Keep optimistic `version` separate from `security_version`, which is the future invalidation epoch for sessions and identity links.

Store display and conservatively normalized email separately. Enforce unique active normalized email and one active primary email with PostgreSQL partial indexes. Do not infer provider aliases.

Store encoded password-hash metadata only, with one active password credential per user. Store opaque-session and high-entropy identity-link digests only. Resolve session candidates against persisted state, both expiries, revocation, and the current user security version. Consume identity links with one conditional database update so replay and concurrent use cannot both succeed.

Keep recovery evidence append-only and privacy-safe, including nullable user association for anti-enumerating unknown-account attempts. Use restrictive foreign keys and entity-specific future retention.

Place immutable persistence contracts and normalization in `@noma/platform/identity`, with no Prisma import. Place the implementation in `@noma/database`; expose bounded operations rather than generic CRUD.

## Consequences

- PostgreSQL can later support registration, login, recovery, session invalidation, and device-visible session lists without implementing those workflows now.
- Security invariants remain effective across application bugs and concurrent callers.
- Partial indexes and CHECK constraints are maintained in reviewed migration SQL without a Prisma preview feature.
- Real PostgreSQL tests are required for uniqueness, replay, concurrency, retention, and migration behavior.
- Protected Seller, Rider, Operations, and Admin routes remain unconditionally unavailable until trustworthy IAM authority exists.

## Rejected alternatives

- A role column on `User`: rejected because identity, membership, and authority are independent.
- JWT-only self-authoritative sessions: rejected because revocation, expiry, and security-version checks are server authority.
- Raw token persistence: rejected because database disclosure would become immediate session/recovery compromise.
- Provider-specific email alias rewriting: rejected because it guesses identity equivalence.
- Prisma preview features for partial indexes: rejected because reviewed PostgreSQL SQL already expresses the constraints.
- Argon2 or login endpoints in IAM-001: rejected as IAM-002 scope.

## Rollback and recovery

Before application, revert the source through review. Once applied to a shared database, retain the migration and use a forward corrective migration; never edit applied history or reset production. No data backfill, deployment, provider, or infrastructure rollback is part of IAM-001.
