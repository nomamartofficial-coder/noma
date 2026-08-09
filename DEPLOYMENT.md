# Noma preview and staging deployment

> **Task:** `DEV-009`
>
> **Status:** repository skeleton implemented; external provisioning pending authenticated organization accounts and cost authorization
> **Decision:** [ADR-0009](docs/adr/0009-preview-staging-deployment-skeleton.md)

DEV-009 defines two non-production deployment surfaces. Vercel builds `@noma/web` as a protected Preview deployment. Render runs the staging API, Background Worker, PostgreSQL, and Redis-compatible Key Value in Frankfurt. Production is not provisioned, deployed, promoted, or activated by this task.

## Topology and boundaries

| Surface | Provider/environment | Public ingress | Authority |
|---|---|---:|---|
| Web | Vercel Preview | protected HTTPS preview | presentation only |
| API | Render `noma-api-staging`, Frankfurt | HTTPS, `/health/ready` gate | authoritative commands when dependencies are ready |
| Worker | Render `noma-worker-staging`, Frankfurt | none | outbox and queue processing |
| PostgreSQL | Render `noma-postgres-staging`, Frankfurt | disabled | authoritative technical state |
| Key Value | Render `noma-key-value-staging`, Frankfurt | disabled | non-authoritative BullMQ delivery |

The Render project is `noma`, the environment is `staging`, private-network isolation and environment protection are enabled, and provider-created preview resources are disabled. API and Worker deploy only after the linked branch checks pass. The API alone owns `pnpm deploy:migrate`, which invokes the committed `pnpm db:migrate:deploy` command. Worker never migrates; its bounded pre-deploy gate runs the read-only `pnpm db:migrate:status` command and cannot release a new Worker build until the API-owned migration history is complete.

## Provider configuration

Vercel imports the repository root and uses [vercel.json](vercel.json). The project must set Preview-only values `NEXT_PUBLIC_NOMA_ENV=preview` and `NEXT_PUBLIC_API_BASE_URL=https://noma-api-staging.onrender.com`. No other `NEXT_PUBLIC_*` value is approved. Vercel Authentication is the minimum preview protection; use the strongest organization-approved protection the plan supports. `main` is explicitly disabled in Git deployment configuration so this skeleton cannot create a Vercel Production deployment.

Render imports [render.yaml](render.yaml) only after cost approval. Its explicit minimum staging plans are `starter` for API, Worker, and persistent Key Value, plus `basic-256mb` for PostgreSQL. These choices are review inputs, not spend authorization; obtain a current provider quote before import. Render Free cannot run a Background Worker and does not persist Key Value; it is therefore not a truthful substitute for this queue foundation.

Render documents its private PostgreSQL URL as the correct same-region path, while its current connection guidance describes TLS as required for external URLs and not required for the private URL. Noma's staging contract is stricter and requires encrypted application transport. The wrapper therefore adds `sslmode=require` when no TLS setting is supplied; allows only `require`, `verify-ca`, or `verify-full`; and rejects disabled, permissive, conflicting, duplicated, or ambiguous TLS settings before either migration or startup can connect. Blueprint import remains blocked until an authenticated provider test proves that combination or Security approves a different architecture that preserves both private routing and encrypted transport; substituting the public database URL is not approved.

The environment owner for staging is Engineering/Release. Security owns secret-store and access review. Data owns migration and database classification review. QA owns smoke evidence. DevOps owns provider configuration and rollback execution. Product/Operations own feature activation separately; all business providers remain disabled.

## Environment inventory

| Variable | Runtime/environment | Exposure | Requirement and source | Secret/rotation owner | Validation and purpose |
|---|---|---|---|---|---|
| `NEXT_PUBLIC_NOMA_ENV` | Web/Preview | public | required; Vercel Preview value `preview` | Engineering | exact environment marker |
| `NEXT_PUBLIC_API_BASE_URL` | Web/Preview | public | required; approved staging API HTTPS origin | Engineering | no credentials, no production host |
| `NOMA_ENV` | API+Worker/Staging | server-only | required; Blueprint value `staging` | Engineering | must match credential environment |
| `NOMA_CREDENTIAL_ENVIRONMENT` | API+Worker/Staging | server-only | required; Blueprint value `staging` | Security | rejects cross-environment credentials |
| `NOMA_RELEASE_SHA` | API+Worker/Staging | safe internal evidence | required; derived from Render `RENDER_GIT_COMMIT` by the start wrapper | Engineering | full immutable commit SHA |
| `PUBLIC_WEB_ORIGIN` | API+Worker/Staging | server-only, non-secret | required; exact protected Vercel preview origin supplied in Render | Engineering/Security | HTTPS origin; no wildcard or generic `*.vercel.app` trust |
| `API_PUBLIC_URL` | API+Worker/Staging | server-only, non-secret | required; `https://noma-api-staging.onrender.com` | Engineering | exact HTTPS staging endpoint |
| `SESSION_SECRET` | API/Staging | secret | required; `sync: false` Render secret | Security | 32+ non-placeholder characters; rotate after suspected exposure |
| `DATABASE_URL` | API+Worker/Staging | secret | required; Render Postgres connection reference | Data/DevOps | PostgreSQL; wrapper enforces encrypted transport; never log |
| `REDIS_URL` | API+Worker/Staging | secret | required; each service references the Key Value private `connectionString` | DevOps/Security | Redis-compatible URL; never log |
| `NOMA_PROVIDER_MODE` | API+Worker/Staging | server-only | required; Blueprint value `disabled` | Engineering/Security | `real` and `simulator` are prohibited by this deployment |
| `NODE_VERSION` | API+Worker/Staging | build/runtime control | required; `24.18.0` | Engineering | immutable supported runtime |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | operator smoke process only | secret | optional; Vercel protected-preview automation secret | QA/Security | supplied at runtime, sent only to the approved Web host, never recorded |

After Blueprint creation, Render must enable internal authentication on the staging Key Value instance and resync the Blueprint so both `REDIS_URL` references receive the authenticated private `connectionString`. No external Key Value access is enabled. PostgreSQL and Key Value contain only synthetic staging data and are physically distinct from any future production resource.

## Release and migration sequence

```text
five stable GitHub gates pass
→ Render build with frozen pnpm install
→ API pre-deploy forward-only migration
→ Worker pre-deploy read-only migration-status gate
→ API and Worker start from built output
→ API database and Key Value probes pass
→ /health/ready returns the exact staging environment and release SHA
→ traffic reaches API
→ protected Web preview smoke runs
```

`scripts/run-deployed-command.mjs` accepts staging only, derives `NOMA_RELEASE_SHA` from Render's immutable commit variable, enforces encrypted PostgreSQL transport before invoking Prisma, requires both data dependencies, and keeps provider mode disabled. The Worker gate polls Prisma's read-only migration status with exponential delay for at most 15 minutes; every attempt is bounded by the remaining deadline and aborts its active subprocess when that deadline expires. If the API migration fails or does not finish, the new Worker deployment fails and Render keeps the previous successful deployment. Worker startup performs a final status check and never applies migrations. No start command runs `prisma db push`, reset, seed, watch mode, or a mutable runtime.

## Health, CORS, and smoke evidence

API CORS permits exactly `PUBLIC_WEB_ORIGIN` with credential support; it never trusts every Vercel hostname. Random commit previews remain presentation-only unless their exact origin is explicitly approved. Liveness proves only the process. Readiness returns HTTP 503 if the staging database or Key Value becomes unavailable. Public health contains runtime, check, safe environment, release SHA, timestamp, and coarse dependency states—never a URL, hostname, credential, provider value, or raw error.

Remote verification requires:

```bash
WEB_PREVIEW_URL=https://<approved-preview>.vercel.app \
API_STAGING_URL=https://noma-api-staging.onrender.com \
EXPECTED_RELEASE_SHA=<40-character-reviewed-commit> \
VERCEL_AUTOMATION_BYPASS_SECRET=<optional-protected-preview-secret> \
pnpm deploy:smoke

pnpm deploy:evidence
```

The smoke tool rejects HTTP, credential-bearing URLs, local/private targets, production-looking hosts, missing or mismatched release identity, wrong environments, non-ready responses, redirects, oversized responses, unsafe bypass-secret formatting, and sensitive response fields. API probes send the validated protected Web preview as the browser `Origin` and require exact credentialed CORS response headers, proving the deployed API configuration permits that Web surface. The optional protection header is sent only to the validated Vercel Web host and is never printed or recorded. The tool polls to a bounded deadline and writes ignored redacted evidence under `.artifacts/deployment/`.

## Canonical local verification

```bash
pnpm deploy:validate
pnpm deploy:self-test
pnpm deploy:verify
pnpm ci:validate
pnpm ci:self-test
pnpm env:verify
pnpm providers:verify
pnpm db:verify
pnpm queue:verify
pnpm testing:verify
pnpm lint
pnpm typecheck
pnpm build
pnpm smoke:runtimes
pnpm test:coverage
```

## Provisioning and rollback

Do not import the Blueprint or Vercel project until the organization account, current plan, named owners, and cost authorization are recorded. External provisioning is currently pending because no authenticated Vercel/Render session or token is available, the required Render Worker plus persistent Key Value incur paid resource cost, and the private-PostgreSQL/TLS compatibility proof above has not been completed.

For application rollback, select the prior reviewed provider deployment whose code is compatible with the already-expanded schema, then rerun health and smoke checks. Never edit, delete, reverse, or reset an applied migration. Database recovery uses a forward fix or an approved isolated restore. If this skeleton itself is rejected before provisioning, revert its focused commit. If non-production resources are later created, follow [staging rollback](runbooks/staging-rollback.md) to disable deployment, preserve redacted evidence, destroy only the exact staging resources, and confirm production was never touched.

Deployment remains separate from business activation. No provider integration, payment, email, user data, pilot traffic, custom production domain, or production account is activated here.
