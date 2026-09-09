# @noma/api

NestJS HTTP API runtime. Health remains at `/health/live` and `/health/ready`. IAM-002 adds the bounded `/api/v1/auth/register`, `/sign-in`, `/sign-out`, and `/session` contracts described in [`AUTHENTICATION.md`](../../AUTHENTICATION.md); these authenticate a basic account session but grant no authorization.

DEV-009 adds exact-origin credentialed CORS and continuous PostgreSQL/Redis dependency probes. Local execution with neither dependency remains ready with `not-configured` states. Staging requires both dependencies and returns HTTP 503 from `/health/ready` on loss. The API never publishes directly to Redis.
