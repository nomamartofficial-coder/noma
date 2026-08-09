# @noma/api

NestJS HTTP API scaffold. DEV-002 exposes only `/health/live` and `/health/ready`; authentication, OpenAPI, persistence, providers, and business endpoints remain dependency-ordered later work.

DEV-009 adds exact-origin credentialed CORS and continuous PostgreSQL/Redis dependency probes. Local execution with neither dependency remains ready with `not-configured` states. Staging requires both dependencies and returns HTTP 503 from `/health/ready` on loss. The API never publishes directly to Redis.
