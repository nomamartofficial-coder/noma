# Health and readiness

## Interpretation

- Liveness answers only whether the process can serve its health endpoint.
- Readiness answers whether every configured PostgreSQL and Redis dependency can safely support work.
- `not-configured` is valid only when both dependency URLs are absent in scaffold mode. Exactly one configured URL is a startup error.

## Response

On readiness failure, keep liveness separate, identify the coarse failing dependency, and follow [the dependency readiness procedure](dependency-readiness-failure.md). Do not bypass the readiness gate, disclose connection details, or use telemetry-export health as a substitute for PostgreSQL/Redis state.

## Recovery evidence

Wait for bounded periodic probes to restore readiness. Record runtime, environment, release, dependency class, safe timestamps, correlation/trace identity, owner, and outbox/queue recovery outcome. The DEV-010 real-infrastructure test suspends PostgreSQL and pauses Redis independently, proves liveness remains healthy, and proves readiness recovers.
