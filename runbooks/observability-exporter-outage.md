# Observability exporter outage

## Trigger

OTLP export errors, missing trace/metric ingestion, or a growing exporter failure signal while API/Worker business dependencies remain healthy.

## Immediate checks

1. Confirm API and Worker liveness/readiness separately. Do not infer database, queue, money, or custody truth from the telemetry backend.
2. Confirm the affected environment and release SHA using safe runtime metadata.
3. Check endpoint reachability, TLS, authorization-secret rotation state, and backend ingestion status without printing the endpoint credential.
4. Record the outage start, owner, environment, release, affected signals, and whether any safety-critical monitoring is unavailable.

## Response

- Ordinary safe work may continue because exporter calls are bounded and outside authoritative transactions.
- Never log business payloads or secrets as a fallback.
- If missing monitoring makes an activated financial/custody capability unsafe, use that capability's approved pause control and escalate to its owner.
- Do not switch remote environments to `in-memory` mode. Restore the reviewed OTLP configuration or explicitly disable export through change control while preserving structured logs/correlation.

## Recovery evidence

Record a fresh bounded trace and metric export, service/environment/release association, ingestion-gap review, incident owner, and closure time. OBS-001 owns provider-specific replay, dashboards, alerting, retention, and production activation.
