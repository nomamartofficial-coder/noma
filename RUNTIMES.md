# Noma runtime scaffold

DEV-002 introduces three independently runnable processes and no business features.

| Runtime | Framework | Default port | Liveness | Readiness |
|---|---|---:|---|---|
| Web | Next.js App Router | 3000 | `/health/live` | `/health/ready` |
| API | NestJS HTTP | 3001 | `/health/live` | `/health/ready` |
| Worker | NestJS application context + internal health server | 3002 | `/health/live` | `/health/ready` |

Run all processes with `pnpm dev`, or one process with `pnpm dev:web`, `pnpm dev:api`, or `pnpm dev:worker`. Production-mode smoke verification is `pnpm smoke:runtimes` after a clean frozen install.

Liveness means the process is running. Readiness means the scaffold is able to accept its current no-business workload. DEV-004 provides the database package, migrations, and real local/test PostgreSQL but deliberately does not open runtime connections, so database readiness remains `not-configured`. Queue readiness remains `not-configured` until DEV-005.

No provider or database secrets belong in Web configuration or bundles. DEV-003 enforces the typed environment boundary; DEV-004 keeps Prisma and PostgreSQL access server-only.
