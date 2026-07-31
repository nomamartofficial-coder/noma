# ADR-0003: Typed environment configuration and secret validation

- **Status:** Proposed in DEV-003
- **Date:** 2026-07-31
- **Decision owners:** Engineering and Security
- **Governing contracts:** `docs/06-technical-architecture.md` §§51–52, `docs/09-integrations.md` §§5–7, `docs/10-security-and-compliance.md` §§59–65 and 70, `docs/12-delivery-backlog.md` DEV-003

## Context

Noma has three independently started runtimes and must keep browser-safe values separate from server credentials. Missing or invalid production configuration must fail before traffic is accepted. Preview, staging, and production credentials must remain isolated, and diagnostics must not leak supplied values.

## Decision

Use the existing `@noma/config` workspace as the only environment parsing boundary.

- `@noma/config/public` accepts an explicit allowlist of browser variables and rejects unknown or secret-like `NEXT_PUBLIC_*` names.
- `@noma/config/server` validates API/Worker startup, production-critical values, environment/credential alignment, encrypted remote URLs, and known Paystack live/test key mismatches.
- `@noma/config/testing` creates immutable test-specific environment overlays.
- Validation issues contain variable names and safe messages only.
- Secret values are kept in non-enumerable server-only containers; configuration serialisation produces a safe summary.
- No validation dependency is added. The declarative parser is small, reviewable, and covered by Node built-in unit and startup tests.

## Alternatives considered

1. **Read `process.env` directly in each runtime.** Rejected because rules, defaults, redaction, and isolation would drift.
2. **Add a third-party schema library.** Valid, but rejected for this bounded foundation because the required scalar/URL/environment rules are small and a new supply-chain dependency is unnecessary.
3. **Expose all configuration through `NEXT_PUBLIC_*`.** Rejected because Next.js bundles those values into browser code.
4. **Allow remote defaults.** Rejected for origins, credential environment, and production-critical secrets because silent defaults can connect the wrong environment.

## Consequences

- Local development retains safe host, port, and localhost-origin defaults.
- Remote deployments require explicit environment metadata and HTTPS public origins.
- Production cannot start until session, database, Redis, and release identity values are supplied.
- Future provider tasks extend the server schema rather than reading new secrets ad hoc.
- Deployment owners must set `NOMA_ENV` and `NOMA_CREDENTIAL_ENVIRONMENT` correctly in every remote service.

## Activation boundary

This ADR creates configuration controls only. It does not provision environments, credentials, databases, Redis, providers, deployments, or feature activation.
