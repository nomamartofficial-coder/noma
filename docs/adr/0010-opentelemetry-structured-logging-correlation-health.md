# ADR-0010 — OpenTelemetry, structured logging, correlation, and health

- Status: Accepted for DEV-010 review
- Date: 2026-08-09
- Task: `DEV-010`
- Decisions: `DEC-ARCH-001`, `DEC-SCOPE-014`, `DEC-REPO-001`

## Context

The API, outbox dispatcher, BullMQ Worker, dependency probes, and release identity already existed, but logs were ad-hoc, queue metrics were in-process only, and trace context stopped at process boundaries. Health was truthful but not connected to bounded telemetry or graceful flushing. Provider accounts and production infrastructure are not authorized in this task.

## Decision

Use exact-pinned OpenTelemetry JS APIs and SDKs inside the existing server-only `@noma/observability` package. Instrument Noma-owned boundaries manually. Use stable W3C Trace Context and the existing correlation ID; persist optional request/trace metadata in a backward-compatible outbox JSON wrapper, without an applied migration. Keep structured JSON logging independent from the experimental OpenTelemetry logs SDK.

Support three modes: disabled, deterministic full-capture in-memory, and explicitly configured OTLP/HTTP. OTLP requires a reviewed ratio and uses parent-based trace-ID-ratio sampling so remote 100% or 0% capture is never implicit. Enforce HTTPS and secret separation remotely, bounded batching/export/shutdown, stable low-cardinality metric attributes, recursive redaction, safe errors, honest dependency readiness, and graceful runtime close. Keep browser telemetry, vendor SDKs, collectors, dashboards, alerts, and provider activation outside DEV-010.

## Consequences

- A synthetic path has connected trace IDs across API/outbox/Worker and keeps PostgreSQL completion evidence.
- Invalid trace headers cannot fail a request or contaminate a job contract.
- Telemetry loss does not roll back business state or make Redis authoritative.
- Existing payload rows remain readable and no migration rollback is needed.
- Direct OTLP is possible later, but OBS-001 must provision and review the backend, credentials, routing, retention, alerts, and operational evidence.
- Manual instrumentation is smaller and more privacy-reviewable than broad auto-instrumentation, but future business modules must add spans at their owned use-case/provider boundaries.

## Standards status

W3C Trace Context is the stable cross-process propagation contract. OpenTelemetry resource/service attributes used here are stable. The pinned HTTP and messaging semantic conventions include areas whose upstream status can be Development; Noma therefore keeps those attribute names inside the server adapter, does not expose them as domain contracts, and locks their current behavior with tests and exact dependency pins. A later convention change requires an adapter review, not a business-envelope migration.

## Alternatives rejected

- Console strings without a schema: insufficient correlation and redaction guarantees.
- Browser-wide auto-instrumentation: unnecessary collection and public endpoint exposure.
- Vendor SDKs in application/domain code: violates provider-neutral boundaries.
- Redis-only trace metadata: lost on Redis loss and not recoverable from the authoritative outbox.
- New trace columns in DEV-010: unnecessary while the versioned JSON envelope safely carries optional metadata.
