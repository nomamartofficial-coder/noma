# @noma/config

Typed environment boundary for Noma.

- `@noma/config/public` validates the small browser-safe `NEXT_PUBLIC_*` allowlist.
- `@noma/config/server` validates API/Worker startup, remote isolation, production-critical values, and redacted diagnostics.
- IAM-002 adds a non-enumerable authentication-correlation secret plus bounded idle, absolute, and conditional-touch durations. Configuring API PostgreSQL/Redis requires both auth secrets; the dependency-free local scaffold remains unchanged.
- `@noma/config/testing` creates immutable environment overrides for deterministic tests.

See `ENVIRONMENT.md` and ADR-0003. Never import the server entry point into browser code and never log raw environment sources or secret containers.
