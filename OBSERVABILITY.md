# Noma observability foundation

> **Task:** `DEV-010`  
> **Boundary:** backend telemetry only; no provider account, collector, browser SDK, deployment, or capability activation

## Runtime contract

API and Worker start `@noma/observability/server` only after typed environment validation. Every ordinary log is one JSON object with timestamp, level, service, environment, stable event, outcome, release identity when available, active request/correlation identity, and active trace/span identity. Values are recursively bounded and redacted. Passwords, tokens, authorization and cookie values, credential URLs, bank details, OTPs, evidence, message bodies, stack traces, and unbounded payloads are prohibited.

The public `@noma/observability/client` boundary remains a minimal browser-safe contract. DEV-010 does not install a browser telemetry SDK, expose a collector URL, or add a public telemetry route.

## Correlation and trace propagation

API and Worker health HTTP requests accept bounded `X-Request-Id`, `X-Correlation-Id`, `traceparent`, and `tracestate` values. Invalid opaque IDs are replaced with UUIDs; invalid W3C trace context is ignored safely. Responses expose only `X-Request-Id` and `X-Correlation-Id`.

Authoritative work persists correlation and optional telemetry metadata in the versioned outbox envelope. The existing JSON payload column stores an internal backward-compatible wrapper only when telemetry metadata exists. No applied migration changes. Publication and processing reuse the W3C parent context, while the BullMQ identity remains the outbox UUID. Redis is still delivery infrastructure; PostgreSQL remains recovery and idempotency truth.

Required foundation spans are:

- `METHOD /health/live|/health/ready|/unmatched` for bounded HTTP server work;
- `noma.synthetic.request` in the acceptance rehearsal;
- `noma.outbox.dispatch.batch` and `noma.outbox.publish`;
- `noma.queue.process`; and
- `noma.dependency.probe`.

Span and metric attributes use stable operation, runtime, dependency, queue, job, state, owner, outcome, HTTP method/route, and status-class values. Event, aggregate, request, user, institution, job, and correlation IDs are never metric labels.

## Modes and configuration

| Variable | Rule |
|---|---|
| `NOMA_TELEMETRY_MODE` | `disabled`, `in-memory`, or `otlp`; defaults to `disabled`, except deterministic `test` defaults to `in-memory` |
| `NOMA_TRACE_SAMPLE_RATIO` | required for `otlp`, bounded from 0 through 1; local/test in-memory capture defaults to 1 |
| `NOMA_OTLP_ENDPOINT` | required only for `otlp`; HTTP(S) locally, HTTPS in preview/staging/production; no credentials, query, or fragment |
| `NOMA_OTLP_AUTHORIZATION` | non-enumerable secret; required for staging/production OTLP; never serialized |
| `NOMA_TELEMETRY_EXPORT_INTERVAL_MS` | 5–300 seconds; default 30 seconds |
| `NOMA_TELEMETRY_EXPORT_TIMEOUT_MS` | 0.5–10 seconds; default 3 seconds |
| `NOMA_TELEMETRY_SHUTDOWN_TIMEOUT_MS` | 0.5–15 seconds; default 5 seconds |

`disabled` still provides correlation, safe logs, and no-op OpenTelemetry instruments. `in-memory` is local/test-only and exposes deterministic full-capture snapshots to tests. `otlp` uses a configurable parent-based trace-ID-ratio sampler plus bounded OTLP/HTTP trace and metric exporters; it fails startup if the root ratio is implicit. Sampling and telemetry export failure never become business truth and never change authorization, queue, retry, transaction, or provider behavior. If monitoring loss makes a later money or custody capability unsafe, that capability must be paused by its operating policy.

## Metrics

DEV-005 queue metric sources now feed OpenTelemetry instruments:

- outbox pending count, oldest unpublished age, and dispatch outcomes;
- BullMQ waiting, active, delayed, completed, and failed states;
- retry count, processing duration, and dead letters by owner; and
- HTTP request count/duration plus dependency probe count/duration.

The foundation does not create dashboards or alert thresholds. OBS-001 owns Grafana/Sentry/PostHog provider activation, ingestion-gap monitoring, dashboards, alerts, and production credential handling.

## Health and shutdown

Liveness reports only process availability. Readiness reports whether configured PostgreSQL and Redis dependencies can support safe work. Both URLs absent preserves scaffold `not-configured`; exactly one fails startup. Probes use two-second connection/statement bounds, expose only coarse state, and restore readiness after dependency recovery. Telemetry exporter availability is diagnostic and does not falsify database/queue readiness.

SIGINT/SIGTERM stop accepting work, close the runtime and dependencies, and flush/shut down telemetry within the configured deadline. Startup and shutdown failures use safe diagnostics; a credential or endpoint is never printed.

## Verification

```bash
pnpm observability:validate
pnpm observability:self-test
pnpm observability:test
pnpm observability:integration
pnpm observability:verify
```

The real integration test uses the reviewed disposable PostgreSQL and authenticated Redis images, applies every committed migration, proves API → outbox → BullMQ → Worker trace continuity and PostgreSQL completion evidence, suspends PostgreSQL and pauses Redis in turn, observes readiness fail while liveness remains healthy, then observes recovery from each outage. It uses polling deadlines and destroys isolated infrastructure after the test.

See [ADR-0010](docs/adr/0010-opentelemetry-structured-logging-correlation-health.md), the [observability runbook](runbooks/observability.md), the [health/readiness runbook](runbooks/health-and-readiness.md), and the [trace-correlation runbook](runbooks/trace-correlation.md).
