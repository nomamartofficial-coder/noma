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
| `SESSION_SECRET` | secret | required by the staging API and by production under the existing remote-environment policy; at least 32 non-placeholder characters |
| `AUTH_CORRELATION_SECRET` | secret | distinct HMAC key required when API authentication is configured; at least 32 non-placeholder characters; never a Redis key or log field |
| `DATABASE_URL` | secret | required in staging and production; PostgreSQL URL with encrypted transport |
| `REDIS_URL` | secret | required in staging and production; staging uses authenticated internal Render Key Value; production requires `rediss://` |
| `NOMA_PROVIDER_MODE` | internal control | `disabled` by default; explicit `simulator` is prohibited in production; `real` enables only implemented, separately configured adapters |
| `POSTMARK_SERVER_TOKEN` | secret | Required only by a Worker with `NOMA_PROVIDER_MODE=real`; non-enumerable and redacted |
| `POSTMARK_FROM_ADDRESS` | server configuration | Required only for real IAM-003 transactional email |
| `POSTMARK_MESSAGE_STREAM` | server configuration | Optional safe stream; defaults to `outbound` |
| `NOMA_TELEMETRY_MODE` | internal control | `disabled`, `in-memory`, or `otlp`; remote environments prohibit `in-memory` |
| `NOMA_TRACE_SAMPLE_RATIO` | internal control | required in `otlp` mode; bounded from 0 through 1; parent-based sampling is never implicit remotely |
| `NOMA_OTLP_ENDPOINT` | internal URL | permitted only in `otlp` mode; HTTPS remotely; credentials/query/fragment prohibited |
| `NOMA_OTLP_AUTHORIZATION` | secret | non-enumerable OTLP authorization; required for staging/production OTLP |
| `NOMA_TELEMETRY_EXPORT_INTERVAL_MS` | internal bound | 5000–300000; default 30000 |
| `NOMA_TELEMETRY_EXPORT_TIMEOUT_MS` | internal bound | 500–10000; default 3000 |
| `NOMA_TELEMETRY_SHUTDOWN_TIMEOUT_MS` | internal bound | 500–15000; default 5000 |
| `NOMA_AUTH_IDLE_MS` | internal bound | 60000–2592000000; default 604800000 (7 days) |
| `NOMA_AUTH_ABSOLUTE_MS` | internal bound | 60000–7776000000; default 2592000000 (30 days); must be at least the idle duration |
| `NOMA_AUTH_TOUCH_AFTER_MS` | internal bound | 60000–86400000; default 900000 (15 minutes) |
| `NOMA_EMAIL_VERIFICATION_REQUEST_{WINDOW_MS,IDENTITY_LIMIT,PAIR_LIMIT,NETWORK_LIMIT}` | internal bounds | Verification-request policy, defaulting to 60 minutes and 5/8/100 identity/pair/network attempts. |
| `NOMA_EMAIL_VERIFICATION_CONFIRM_{WINDOW_MS,IDENTITY_LIMIT,PAIR_LIMIT,NETWORK_LIMIT}` | internal bounds | Verification-confirmation policy, defaulting to 15 minutes and 10/20/200 attempts. |
| `NOMA_PASSWORD_RECOVERY_REQUEST_{WINDOW_MS,IDENTITY_LIMIT,PAIR_LIMIT,NETWORK_LIMIT}` | internal bounds | Recovery-request policy, defaulting to 60 minutes and 5/8/100 attempts. |
| `NOMA_PASSWORD_RECOVERY_COMPLETE_{WINDOW_MS,IDENTITY_LIMIT,PAIR_LIMIT,NETWORK_LIMIT}` | internal bounds | Recovery-completion policy, defaulting to 15 minutes and 8/12/100 attempts. |

API and Worker dependency mode requires `DATABASE_URL` and `REDIS_URL` together in every environment. Both absent preserves local scaffold compatibility with `not-configured` readiness; exactly one is a startup error. Staging requires both. When configured, each runtime probes both dependencies, becomes unready on dependency loss, and never serializes either URL into logs or health responses.

For API authentication, the dependency pair additionally requires the distinct `AUTH_CORRELATION_SECRET`. Opaque session tokens are stored only as SHA-256 digests and do not use a signing secret. The existing remote-environment policy still requires `SESSION_SECRET` for staging API and production compatibility. Worker configuration does not receive the authentication-correlation secret because IAM-002 adds no Worker processor.

Provider-specific secrets remain optional until their adapter tasks. Live Paystack keys are rejected outside production, and test Paystack keys are rejected in production.

Simulator selection is explicit and server-only, and production rejects it. IAM-003 adds redacted Postmark configuration and a real transactional-email adapter without provisioning credentials or activating delivery. Public Web configuration remains unchanged.

DEV-010 adds optional server telemetry. The default remains disabled; `test` may use deterministic full in-memory capture. OTLP is explicit, requires a reviewed parent-based trace sample ratio, is bounded and HTTPS-only remotely, and keeps authorization in the non-enumerable secret container. Endpoint credentials, query strings, browser-visible variables, implicit remote sampling, and remote in-memory mode fail closed. See [`OBSERVABILITY.md`](OBSERVABILITY.md).

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
pnpm observability:verify
pnpm db:validate
pnpm db:self-test
pnpm lint
pnpm typecheck
pnpm build
pnpm smoke:runtimes
```

The startup test deliberately supplies invalid production configuration and proves that API and Worker fail closed without printing the secret marker or credential URL passwords.
