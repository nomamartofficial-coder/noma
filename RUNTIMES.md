# Noma runtime scaffold

DEV-002 introduces three independently runnable processes and no business features.

| Runtime | Framework | Default port | Liveness | Readiness |
|---|---|---:|---|---|
| Web | Next.js App Router | 3000 | `/health/live` | `/health/ready` |
| API | NestJS HTTP | 3001 | `/health/live` | `/health/ready` |
| Worker | NestJS application context + internal health server | 3002 | `/health/live` | `/health/ready` |

Run all processes with `pnpm dev`, or one process with `pnpm dev:web`, `pnpm dev:api`, or `pnpm dev:worker`. Production-mode smoke verification is `pnpm smoke:runtimes` after a clean frozen install.

Liveness means the process is running. Readiness means the runtime can safely accept its configured workload. API and Worker report database and queue as `not-configured` when both URLs are absent locally. When both are present each starts only after live PostgreSQL and Redis probes, and readiness becomes unavailable if either dependency is lost. A single configured dependency fails startup. Staging requires both.

DEV-009 deploys Web only to Vercel Preview, API as the public Render Web Service, and Worker as a private Render Background Worker. Health responses include only safe environment and release identity plus coarse dependency state. API CORS permits exactly the configured protected preview origin. See [`DEPLOYMENT.md`](DEPLOYMENT.md).

No provider, database, or Redis secrets belong in Web configuration or bundles. DEV-003 enforces the typed environment boundary; DEV-004/DEV-005 keep Prisma, PostgreSQL, and Redis access server-only.
