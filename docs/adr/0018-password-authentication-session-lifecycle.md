# ADR-0018: Password authentication and opaque PostgreSQL sessions

- Status: Accepted for IAM-002 review
- Date: 2026-08-31
- Task: `IAM-002`
- Tracking issue: `#54`
- Requirement: `REQ-IAM-002`
- Authority: `docs/03-user-journeys.md` J01/J30, `docs/06-technical-architecture.md`, `docs/08-state-machines.md` M01/M02, `docs/10-security-and-compliance.md`, `docs/11-testing-strategy.md`

## Decision

Noma uses exact-pinned Argon2id for password hashing, an exact-pinned offline common-password corpus with NFC whole-password comparison, server-generated 256-bit opaque session secrets, digest-only PostgreSQL session authority, and HMAC-correlated Redis rate limits. User, primary email, and password credential register atomically. Existing IAM-001 persistence methods remain compatible, while IAM-002 adds only bounded behavioral operations for registration, authentication candidates, safe rehash, rotation, resolution, conditional touch, and digest revocation.

The API returns enumeration-safe outcomes, performs a dummy hash for unknown accounts, accepts ordinary sign-in only for `PENDING_EMAIL` and `ACTIVE`, and issues assurance `AUTHENTICATED` only. Cookie mutations require exact configured Origin. Rotation revokes the old session and creates a fresh one in one transaction; revocation uses a conditional authoritative write that cannot be reversed by a stale touch.

IAM-002 emits only structured, redacted security telemetry. It creates no outbox contract or Worker processor because registration/session persistence has no material asynchronous effect in this task, while failed/unknown attempts are attacker-amplifiable. Durable verification delivery and final audit persistence belong to IAM-003 and IAM-008.

## Alternatives rejected

- Separate identity and credential commits: rejected because a process/database failure could leave a partial password account.
- JWT or browser storage: rejected because session authority must be opaque, revocable, and server-side.
- Remote breached-password lookup or heuristic scoring: rejected because the synchronous path is offline, deterministic, private, and composition-neutral.
- Redis session authority: rejected because PostgreSQL owns revocation and security-version truth.
- IP-only permanent lockout: rejected because Covenant users share networks.
- One outbox job per authentication attempt: rejected as an attacker-amplifiable persistence/queue denial-of-service path.

## Consequences

Argon2 is a reviewed native build dependency and is calibrated on representative runtimes. API auth requires PostgreSQL, Redis, and a distinct `AUTH_CORRELATION_SECRET`; opaque session tokens are stored only as SHA-256 digests and require no signing secret. The existing remote policy still requires `SESSION_SECRET` for staging API and production compatibility. With neither database nor Redis configured, the existing scaffold remains healthy and auth endpoints report unavailable. No database migration is required because IAM-001 already contains the required credential and session fields/constraints.

Rollback before merge is a reviewed source revert. After any later activation, session-cookie or credential-policy changes require a reviewed forward-compatible change; IAM-002 itself performs no deployment or activation.
