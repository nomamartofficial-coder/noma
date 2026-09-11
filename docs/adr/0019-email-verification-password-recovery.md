# ADR-0019: Email verification and password recovery authority

- Status: Accepted for IAM-003 review
- Date: 2026-09-11
- Task: `IAM-003`
- Issue: `#58`
- Draft PR: `#59`
- Requirement: `REQ-IAM-003`

## Decision

Noma uses separate `EMAIL_VERIFICATION` and `PASSWORD_RECOVERY` one-time proofs backed by the existing `identity_tokens` table. A dedicated issuer creates 32 random bytes, encodes them as unpadded base64url, and persists only a SHA-256 digest. Proofs expire after 30 minutes. Issuance serializes on the email record, atomically replaces only the same purpose, and identifies each Worker attempt deterministically so a crash after persistence cannot cause a blind provider retry.

API request commands are enumeration-safe and rate-limited with HMAC-correlated Redis keys. PostgreSQL remains authority: provider acceptance, delivery, or link opening changes no identity state. Verification consumes one proof, verifies the active primary email, activates a `PENDING_EMAIL` user, invalidates siblings, and may elevate only the currently presented valid session from `AUTHENTICATED` to `CONTACT_VERIFIED`.

Password completion performs a non-consuming proof preflight before password policy and Argon2. The prepared hash is revalidated and committed in a short transaction that records recovery containment, rotates the password, increments `securityVersion`, revokes all sessions, invalidates competing proofs, records bounded recovery evidence, returns the account to `ACTIVE`, and queues a safe security notice. It never creates a session.

## Delivery boundary

The transactional outbox stores only email-record identity, purpose/event code, operation identity, and correlation. The Worker creates the raw proof in memory, commits only its digest/replacement evidence, builds a link from configured `PUBLIC_WEB_ORIGIN`, sends through the provider port, and discards the raw value. Postmark is implemented by direct HTTPS with no SDK. Simulator inspection records safe references only. An uncertain provider result or a recovered in-flight attempt is dead-lettered for Security-owned review; user resend is the recovery path.

## Consequences and rollback

This adds a bounded identity-email Worker and three public landing pages. It does not activate Postmark, add a migration, persist attacker-amplifiable invalid attempts, implement MFA/authorization, or expose protected role surfaces. Before activation, rollback is a reviewed source-only revert. After later activation, issued proofs remain governed by stored expiry, replacement, consumption, and `securityVersion`; no destructive data rollback is permitted.
