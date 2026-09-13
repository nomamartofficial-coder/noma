# Password authentication, email verification, and recovery

## IAM-003 email verification and password recovery

Email verification and password recovery use separate 30-minute, one-time, purpose-bound proofs. The raw 256-bit base64url value exists only in Worker, trusted-link, browser-exchange, and the API exchange request's short-lived memory; PostgreSQL stores SHA-256 digests and lifecycle evidence only. Redis, the outbox, and BullMQ never receive it.

Provider-disabled Worker deployments preserve eligible IAM-003 outbox intents as deferred PostgreSQL work. They do not publish them, mark them delivered, or turn the intentionally unavailable handler into a false dead letter. Provider activation requires the reviewed Postmark credentials and templates.

Public request endpoints return the same accepted response after bounded HMAC-correlated rate limiting. Delivery is never identity truth. Verification activates only a valid `PENDING_EMAIL` identity and may elevate only the same presented session. Recovery performs proof preflight before Argon2, then atomically rotates the password, advances `securityVersion`, revokes every session, invalidates competing proofs, and requires a normal sign-in.

Use `pnpm iam003:verify` for the focused policy, unit, provider, PostgreSQL, Redis, and race suite.

> **Task:** `IAM-002`
> **Tracking issue:** `#54`
> **Draft PR:** `#55`
> **Risk:** `P0-AUTHORITY`
> **Status:** implemented for independent review

IAM-002 adds password registration, sign-in, sign-out, and authenticated-session resolution to the API. Authentication does not grant a role, capability, seller scope, rider scope, staff scope, or protected-surface access.

## Registration and password policy

`POST /api/v1/auth/register` returns the same truthful `202 REQUEST_ACCEPTED` result for a new or existing normalized email. A new registration commits `User`, primary `UserEmail`, active `PASSWORD` `Credential`, and one safe verification-delivery intent in one PostgreSQL transaction. It starts at `PENDING_EMAIL`, does not authenticate the browser, and the API never creates or handles the raw email-verification token.

Passwords are NFC-normalized without trimming or case folding. The supported range is 15–128 Unicode code points, spaces are allowed, control characters and unpaired surrogates are rejected, and no composition rule is imposed. The exact-pinned `@zxcvbn-ts/language-common@4.1.3` dictionaries plus three Noma/Covenant-specific expected values form an offline whole-password blocklist. Corpus size is not a security invariant; substring matching, scoring, remote transmission, and raw-password telemetry are prohibited.

`argon2@0.45.1` provides Argon2id with policy version `1`, 65,536 KiB memory, three iterations, parallelism one, and a 32-byte hash. Hashing happens before the short registration transaction. `pnpm auth:calibrate` reports three representative samples and fails the reviewed API DoS budget above a 1,000 ms median or 1,500 ms individual sample. Parameters never weaken dynamically.

## Sign-in and sessions

`POST /api/v1/auth/sign-in` checks the Redis limiter, reads the active password credential, and always performs Argon2 verification. Unknown identities use a startup-generated dummy Argon2id hash. Unknown identity and wrong password return the same `401 AUTHENTICATION_FAILED`; unusable account states return only `403 ACCOUNT_UNAVAILABLE`.

Only `PENDING_EMAIL` and `ACTIVE` accounts may receive the general account session. Every successful sign-in generates a fresh 32-byte base64url secret; the browser receives it only in a host-only HttpOnly `SameSite=Lax` cookie, while PostgreSQL stores only its SHA-256 digest. Remote environments use `__Host-noma_session` with `Secure`; local/test uses `noma_session`. A presented active session is revoked and the new session is created in one transaction.

Idle expiry is seven days and absolute expiry is 30 days. Session continuation reuses the same canonical account rule as sign-in: only the current authoritative `PENDING_EMAIL` or `ACTIVE` User may authenticate. `RECOVERY_LOCKED`, `COMPROMISED_LOCKED`, `SUSPENDED`, `DEACTIVATION_REQUESTED`, and `DEACTIVATED` Users are rejected even when an old session remains otherwise valid. Activity touches occur only after 15 minutes, never extend the absolute deadline, and atomically condition on active/unrevoked state, version, current User eligibility, and matching security version. Digest-based revocation does not rely on a stale version, so a committed sign-out wins over any concurrent touch. `GET /api/v1/auth/session` returns only user/session identity, account state, assurance, and safe timestamps. `POST /api/v1/auth/sign-out` is idempotent and always clears the cookie.

## Abuse, origin, telemetry, and Worker boundary

Registration and sign-in require an exact `Origin` match to `PUBLIC_WEB_ORIGIN`. The minimum IAM limiter uses authenticated Redis and HMAC-SHA-256 correlation keys derived from `AUTH_CORRELATION_SECRET`; raw email and network signals are not Redis keys. It combines action, identity, network, and pair limits, uses a high shared-network ceiling, and creates no permanent lock. Redis failure returns `503 AUTHENTICATION_UNAVAILABLE` for new authentication while PostgreSQL session resolution remains independent.

Activation also requires the hosting/CDN access-log policy to omit or redact `token` query values before links reach the Web runtime. The Web removes the query immediately and sends `Referrer-Policy: no-referrer`, but upstream request logs and automated link scanners remain deployment concerns. Network rate-limit signals use the socket peer address until an explicitly reviewed trusted-proxy topology is configured; forwarding headers are not accepted as authority by this task.

Failed passwords, unknown accounts, rate limits, and successful material transitions use structured, redacted security logs. Attacker-amplifiable invalid requests still create no durable job. IAM-003 uses the outbox only for eligible verification/recovery delivery and post-commit security notices; IAM-008 still owns the final append-only Audit service.

## Commands

```text
pnpm auth:validate
pnpm auth:self-test
pnpm auth:test
pnpm auth:calibrate
pnpm auth:integration-test
pnpm auth:verify
```

Real integration tests use isolated PostgreSQL and authenticated Redis containers. They prove atomic rollback/contention, rotation, touch-versus-revoke, HMAC-only Redis keys, fail-closed limiter behavior, the real Nest API contract, origin enforcement, response minimisation, and raw-secret absence.

## IAM-004 MFA and deferred scope

IAM-004 now provides a source-only TOTP, recovery-code, and recent-authentication foundation. See [`MFA.md`](MFA.md) and [ADR-0021](docs/adr/0021-privileged-mfa-recent-authentication.md). IAM-003 password recovery preserves active MFA and unused codes while revoking sessions. Protected role surfaces remain unavailable; MFA is not authorization.

## Deferred and rollback

IAM-005/006, SEC-001/002, authorization, and protected-surface activation remain deferred. Before merge, rollback is a reviewed source revert. IAM-003 adds no schema migration, data backfill, deployment, provider activation, or infrastructure provisioning; IAM-004 adds a separate forward-only migration but no remote activation.
