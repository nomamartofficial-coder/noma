# Observability operations

## Detect and classify

Use coarse service, environment, release, event, outcome, and bounded correlation/trace identities to identify the affected runtime and interval. Separate application dependency failure from telemetry export failure: PostgreSQL and Redis determine readiness; an OTLP backend never does.

## Contain

- Never enable browser telemetry, expose an OTLP endpoint, or print a credential as an outage workaround.
- Never switch a remote environment to in-memory capture.
- If monitoring loss makes an activated financial or custody capability unsafe, use that capability's approved pause control and notify its accountable owner.
- Follow [the exporter outage procedure](observability-exporter-outage.md) for OTLP loss and [the readiness procedure](health-and-readiness.md) for application dependency loss.

## Recover and evidence

Restore only reviewed typed configuration. Confirm a fresh bounded log, trace, and metric with the correct service/environment/release identity; record safe timestamps, owner, impact, action, and ingestion-gap assessment. Do not attach payloads, stack traces, connection URLs, authorization, cookies, or provider secrets.

The last automated rehearsal is the DEV-010 integration suite. Provider-specific dashboards, alerts, retention, and ingestion-gap monitoring remain owned by OBS-001.
