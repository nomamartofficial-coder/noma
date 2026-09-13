# @noma/security

Security policy, redaction, and authorization support contracts.

Only public exports may be imported. Deep imports are prohibited.

IAM-002 owns the offline NFC whole-password policy, exact-pinned common-password source, Argon2id policy/version, calibration helper, and opaque session-token generation. It performs no remote password lookup, scoring, authorization, or raw-secret telemetry. See [`AUTHENTICATION.md`](../../AUTHENTICATION.md).

SEC-003 adds strict versioned AES-256-GCM envelopes, canonical context-bound AAD, narrow sensitive-field capabilities, safe crypto errors, explicit Unicode-safe masking, and bounded migration orchestration. It never supplies a business encrypted field or a production key fallback. See [`ENCRYPTION.md`](../../ENCRYPTION.md).

IAM-004 adds the exact-pinned TOTP profile, strongest matching adjacent timestep, cryptographically random recovery codes, and digest-only code lookup. It does not own encryption keys or authorization. See [`MFA.md`](../../MFA.md).
