# Identity persistence foundation

> **Task:** `IAM-001`  
> **Risk:** `P0-AUTHORITY`  
> **Status:** implemented for independent review

IAM-001 establishes PostgreSQL authority for one Noma user identity, conservative email identity, password-credential metadata, opaque revocable sessions, high-entropy verification/recovery links, and privacy-safe recovery evidence. It does not authenticate a request or grant access.

## Records and boundaries

- `users` contains the M01 account state, optimistic version, independent security-version invalidation epoch, public reference, presentation fields, and transition metadata. It contains no role, membership, seller, rider, staff, or administrator authority.
- `user_emails` retains a display representation and a conservative normalized lookup representation. Normalization trims, applies Unicode NFC, and case-folds; it never removes dots, strips `+` aliases, or applies provider-specific equivalence.
- `credentials` stores one active `PASSWORD` credential's encoded hash and policy metadata. IAM-001 never receives a plaintext password and performs no hashing or verification.
- `sessions` stores only a digest of an opaque raw token, M02 state, assurance, the issued security version, persisted idle/absolute expiry, revocation evidence, and a safe device label/client family. It stores no fingerprint, raw headers, IP history, or location.
- `identity_tokens` stores a unique digest for a high-entropy `EMAIL_VERIFICATION` or `PASSWORD_RECOVERY` link, bound to the exact email identity, purpose, security version, expiry, and terminal state. Numeric OTP design is deferred.
- `recovery_attempts` is append-only privacy-safe evidence for known or unknown subjects. A subject digest and safe codes support correlation without retaining the entered address, secret, or unrestricted device evidence.

All identity/security relationships use restrictive deletion. Later privacy work must apply entity-specific retention and anonymisation rather than cascading deletion.

## PostgreSQL controls

The additive `20260829000100_iam_001_identity_persistence` migration enforces non-negative versions, unique active email identity, one active primary email, one active password credential, unique session/token digests, session expiry and revocation consistency, token expiry/terminal consistency, and append-only recovery evidence. Critical partial indexes remain reviewed raw SQL; no Prisma preview feature is enabled.

Token consumption is one conditional `UPDATE ... RETURNING` joined to the current user security version. Correct purpose, unexpired state, current security version, and absence of consumption/invalidation are evaluated atomically. Concurrent consumers therefore cannot both succeed.

## Persistence seam

`@noma/platform/identity` owns Prisma-free immutable contracts and conservative normalization. `@noma/database` implements those contracts with bounded operations; it does not expose generic identity CRUD. The seam supports later IAM commands without implementing them.

```text
pnpm identity:validate
pnpm identity:self-test
pnpm identity:test
pnpm identity:integration-test
pnpm identity:verify
```

The integration suite uses the reviewed PostgreSQL Testcontainers image and committed migrations. It covers constraints, races, session candidate filtering, atomic token consumption, restrictive deletion, append-only recovery evidence, and raw-secret absence. The existing migration suite separately proves clean apply, prior-schema upgrade, checksum integrity, and restore rehearsal.

## Explicit exclusions

IAM-002 and later work owns registration, password policy and Argon2id execution, sign-in, cookie/session rotation, password recovery, email delivery, MFA, authorization, and HTTP endpoints. IAM-001 adds no provider, dependency, route, protected-surface allow path, deployment, or infrastructure activation.

## Recovery and rollback

The migration is forward-only and additive. Before merge, rollback is a reviewed source revert. After application to a shared environment, use a reviewed forward fix; do not edit applied migration history or reset the database. No business-data backfill exists because identity records are not live.
