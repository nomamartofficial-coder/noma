# ADR-0021: Privileged MFA and persisted recent-authentication evidence

- Status: Proposed for IAM-004 independent review
- Date: 2026-09-13
- Task: IAM-004
- Issue: #62
- Draft PR: #63
- Requirement: REQ-IAM-004

## Decision

Use the merged SEC-003 purpose-scoped envelope protector for each TOTP seed. Persist a factor-bound encrypted envelope, never a plaintext or hash-reconstructable seed. Use TOTP as a bounded pilot factor, PostgreSQL one-winner time-step replay protection, and digest-only one-time recovery codes. The old factor remains active until replacement is proven and atomically committed. Registration/password recovery cannot silently remove MFA.

Persist password/MFA proof timestamps and factor/method identity on Session records; derive assurance at request time against current account, factor, security version, and expiry. Challenges are server-selected and short-lived. Completing a challenge rotates the session token and preserves its absolute deadline. Factor configuration changes advance `securityVersion` and revoke stale sessions. Security notices are minimal transactional-outbox intents, not authorization evidence.

## Consequences

Prior sessions do not acquire fresh proof. Lost-factor recovery fails closed for IAM-009 review. No protected role surface opens because IAM-005/006 have not established authorization. TOTP is not phishing-resistant; WebAuthn and stronger factors are separate architecture work. Production use cannot begin until SEC-003's operational KMS/OIDC, privacy, monitoring, recovery, and ownership gates are satisfied. Source rollback is reviewed and database recovery remains forward-only.
