# Noma environment and secret contract

> **Task:** `DEV-003`  
> **Scope:** typed environment configuration, startup validation, public/server separation, environment isolation, redaction, deterministic test overrides, and DEV-009 preview/staging deployment ownership

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
| `NOMA_RELEASE_SHA` | internal evidence | required in staging and production; deployed staging supplies the full Render commit |
| `SESSION_SECRET` | secret | required by staging API and production; at least 32 non-placeholder characters; not supplied to staging Worker |
| `DATABASE_URL` | secret | required in staging and production; PostgreSQL URL with encrypted transport |
| `REDIS_URL` | secret | required in staging and production; staging uses authenticated internal Render Key Value; production requires `rediss://` |
| `NOMA_PROVIDER_MODE` | internal control | `disabled` by default; explicit `simulator` is prohibited in production; `real` fails closed until owning adapter tasks |

API and Worker dependency mode requires `DATABASE_URL` and `REDIS_URL` together in every environment. Both absent preserves local scaffold compatibility with `not-configured` readiness; exactly one is a startup error. Staging requires both. When configured, each runtime probes both dependencies, becomes unready on dependency loss, and never serializes either URL into logs or health responses.

Provider-specific secrets remain optional until their adapter tasks. Live Paystack keys are rejected outside production, and test Paystack keys are rejected in production.

DEV-007 adds no provider credential. Simulator selection is explicit and server-only. Local/test/preview/staging may request `simulator`; production rejects it. `real` currently fails with a safe `NOMA_PROVIDER_MODE` issue because no production adapter exists. Public Web configuration remains unchanged.

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

API and Worker receive runtime dependency URLs only from validated server configuration. DEV-005 connects the Worker through `@noma/database` and `@noma/integrations`, closes both on shutdown, and reports only safe dependency state. DEV-009 gives the API health-only PostgreSQL and Redis probes; the API still does not publish directly to Redis.

## Preview and staging deployment

DEV-009 keeps Vercel Web in `preview` and Render backend services in `staging`. Vercel stores only the two approved public values. Render stores server values and secrets. `PUBLIC_WEB_ORIGIN` is one exact protected preview origin; generic `*.vercel.app` credentialed CORS is prohibited. `scripts/run-deployed-command.mjs` derives `NOMA_RELEASE_SHA` from Render's immutable `RENDER_GIT_COMMIT` and permits staging only. Production is not provisioned or activated. See [`DEPLOYMENT.md`](DEPLOYMENT.md) and the [environment-isolation runbook](runbooks/environment-isolation.md).

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
