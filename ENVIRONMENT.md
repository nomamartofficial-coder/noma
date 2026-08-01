# Noma environment and secret contract

> **Task:** `DEV-003`  
> **Scope:** typed environment configuration, startup validation, public/server separation, environment isolation, redaction, and deterministic test overrides

## Environment model

`NOMA_ENV` is the authoritative server environment and accepts:

```text
development | test | preview | staging | production
```

`NEXT_PUBLIC_NOMA_ENV` is the browser-safe equivalent. Vercel's `VERCEL_ENV` may supply `preview` or `production` when the explicit public value is absent.

Server deployments in `preview`, `staging`, or `production` must also declare `NOMA_CREDENTIAL_ENVIRONMENT` with the same value. A mismatch fails startup. This marker is an isolation control, not a secret and not a substitute for separate provider accounts.

## Approved browser variables

Only these values may use the `NEXT_PUBLIC_` prefix:

| Variable | Purpose | Remote requirement |
|---|---|---|
| `NEXT_PUBLIC_NOMA_ENV` | browser-visible deployment classification | required explicitly or derived from Vercel |
| `NEXT_PUBLIC_API_BASE_URL` | browser API origin | required and HTTPS for preview/staging/production |

Unknown `NEXT_PUBLIC_*` values fail validation. Secret-like public names are prohibited. Next.js inlines `NEXT_PUBLIC_*` values into browser bundles at build time, so they are public by definition.

## Server variables

| Variable | Classification | Rule |
|---|---|---|
| `NOMA_ENV` | internal | defaults to `development` locally; must be explicit in remote deployment |
| `NOMA_CREDENTIAL_ENVIRONMENT` | internal control | required in preview/staging/production and must equal `NOMA_ENV` |
| `HOST` | internal | defaults to `0.0.0.0` |
| `PORT`, `API_PORT`, `WORKER_PORT` | internal | explicit invalid values fail; safe local defaults remain available |
| `PUBLIC_WEB_ORIGIN` | internal URL | required and HTTPS in preview/staging/production |
| `API_PUBLIC_URL` | internal URL | required and HTTPS in preview/staging/production |
| `NOMA_RELEASE_SHA` | internal evidence | required in production; 7–40 hexadecimal characters |
| `SESSION_SECRET` | secret | required in production; at least 32 non-placeholder characters |
| `DATABASE_URL` | secret | required in production; PostgreSQL URL |
| `REDIS_URL` | secret | required in production; `rediss://` encrypted transport |

Provider-specific secrets remain optional until their adapter tasks. Live Paystack keys are rejected outside production, and test Paystack keys are rejected in production.

## Loading and access

- Web code imports only `@noma/config/public`.
- API and Worker load an optional app-local `.env` only for local/test execution, then import `@noma/config/server` and validate before creating NestJS applications or opening listeners. A `.env` file that declares preview, staging, or production is rejected; remote services must use platform-managed values.
- Tests import `@noma/config/testing` to create immutable overrides without mutating `process.env`.
- `.env.example` files contain safe non-secret values and comments only. Real values come from approved environment controls.
- Secret values are held in a non-enumerable server-only container. `JSON.stringify(config)` returns a safe summary rather than raw credentials.

## Failure and diagnostics

Invalid mandatory configuration fails startup before the runtime accepts traffic. Safe errors expose variable names, issue codes, and remediation-oriented messages, but never the supplied values. Generic startup failures expose only the error class.

Structured logs and evidence must use the safe summary and redaction helpers. Never log `process.env`, a full configuration object from an unreviewed source, provider payloads, authorization headers, or credential URLs.

## Database command environment

DEV-004 adds a server-only Prisma command boundary. Local schema validation and client generation use the documented loopback-only Compose default when `DATABASE_URL` is absent. Preview, staging, and production database commands require an explicit provider-managed `DATABASE_URL`; production also requires encrypted PostgreSQL transport.

Reset is a separate fail-closed boundary. `pnpm db:reset:local` requires explicit local/test environment markers, an explicit loopback PostgreSQL target, an approved Noma local/test database name, and the non-secret confirmation marker documented in [`DATABASE.md`](DATABASE.md). The same check runs inside `prisma.config.ts`, so invoking Prisma directly does not bypass it.

API and Worker receive the runtime database URL only from their validated server configuration. DEV-004 does not connect those runtimes or change readiness; later owning-module work must create and close the client through `@noma/database` without exposing the URL or Prisma client to Web.

## Canonical verification

```bash
pnpm env:validate
pnpm env:self-test
pnpm env:test
pnpm env:startup-test
pnpm db:validate
pnpm db:self-test
pnpm lint
pnpm typecheck
pnpm build
pnpm smoke:runtimes
```

The startup test deliberately supplies invalid production configuration and proves that API and Worker fail closed without printing the secret marker or credential URL passwords.
