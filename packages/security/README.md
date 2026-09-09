# @noma/security

Security policy, redaction, and authorization support contracts.

Only public exports may be imported. Deep imports are prohibited.

IAM-002 owns the offline NFC whole-password policy, exact-pinned common-password source, Argon2id policy/version, calibration helper, and opaque session-token generation. It performs no remote password lookup, scoring, authorization, or raw-secret telemetry. See [`AUTHENTICATION.md`](../../AUTHENTICATION.md).
