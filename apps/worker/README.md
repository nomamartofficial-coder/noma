# @noma/worker

NestJS standalone Worker with an internal health server and the DEV-005 outbox/queue runtime module.

With neither `DATABASE_URL` nor `REDIS_URL`, readiness preserves scaffold mode and reports both dependencies as `not-configured`. Supplying only one fails startup. With both configured, the Worker probes PostgreSQL and Redis, dispatches the authoritative outbox, and reports dependency loss through readiness. No business processor, scheduler, provider job, or public ingress is registered by this foundation.

On Render it remains a Background Worker with no public ingress. Deployment verification uses safe startup evidence plus database/Key Value readiness and restart/shutdown observations; the internal health server is not exposed as a Web Service.
