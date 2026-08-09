# Trace and correlation

## Locate a request safely

1. Start with a bounded request ID, correlation ID, trace ID, environment, release, and approximate time.
2. Find the API structured event without searching for a payload, customer identifier, institution identifier, URL query, or error message.
3. Follow the same trace through the outbox publish and queue process spans. Use the outbox UUID only in PostgreSQL/BullMQ recovery tooling, never as a metric label.
4. Confirm PostgreSQL job-execution evidence for completed work. Redis alone is not authoritative evidence.

## Missing or broken propagation

Invalid incoming W3C context is ignored and replaced safely; it must not fail the request. If a trace stops at an outbox boundary, verify the versioned envelope metadata, deterministic BullMQ job identity, service/environment/release resource attributes, and sampling policy. Never add arbitrary baggage or raw payload fields to repair a trace.

## Evidence boundary

Record only safe IDs and bounded classifications. Do not include authorization, cookies, request/response bodies, query strings, database statements or parameters, bank details, OTPs, stack traces, connection URLs, or secret-bearing exporter configuration.
