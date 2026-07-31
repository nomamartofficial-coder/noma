# Noma runtime scaffold

DEV-002 introduces three independently runnable processes and no business features.

| Runtime | Framework | Default port | Liveness | Readiness |
|---|---|---:|---|---|
| Web | Next.js App Router | 3000 | `/health/live` | `/health/ready` |
| API | NestJS HTTP | 3001 | `/health/live` | `/health/ready` |
| Worker | NestJS application context + internal health server | 3002 | `/health/live` | `/health/ready` |

Run all processes with `pnpm dev`, or one process with `pnpm dev:web`, `pnpm dev:api`, or `pnpm dev:worker`. Production-mode smoke verification is `pnpm smoke:runtimes` after a clean frozen install.

Liveness means the process is running. Readiness means the scaffold is able to accept its current no-business workload. Database and queue checks are deliberately reported as `not-configured` until DEV-004 and DEV-005.

No provider secrets belong in Web configuration or bundles. DEV-003 will add typed environment validation and stronger separation; this scaffold uses only safe host/port defaults.
