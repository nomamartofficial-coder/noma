# @noma/config

Typed environment boundary for Noma.

- `@noma/config/public` validates the small browser-safe `NEXT_PUBLIC_*` allowlist.
- `@noma/config/server` validates API/Worker startup, remote isolation, production-critical values, and redacted diagnostics.
- IAM-002 adds a non-enumerable authentication-correlation secret plus bounded idle, absolute, and conditional-touch durations. Configuring API PostgreSQL/Redis requires both auth secrets; the dependency-free local scaffold remains unchanged.
- `@noma/config/testing` creates immutable environment overrides for deterministic tests.
- `@noma/config/encryption` is an opt-in, disabled-by-default managed-key contract. It restricts AWS KMS to approved staging/production API or migration identities and denies remote test keys and Worker/Web decrypt authority. No runtime is activated by this export. See `ENCRYPTION.md`.

See `ENVIRONMENT.md` and ADR-0003. Never import the server entry point into browser code and never log raw environment sources or secret containers.
