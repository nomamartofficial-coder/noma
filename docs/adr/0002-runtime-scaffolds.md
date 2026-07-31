# ADR-0002: Runtime scaffold boundaries

- **Status:** Proposed in DEV-002
- **Date:** 2026-07-31
- **Decision owners:** Engineering and Architecture

## Context

Noma requires independently runnable Web, API, and Worker processes while retaining one modular-monolith product model. DEV-002 must establish framework bootstraps and honest health semantics without introducing business modules, provider access, persistence, or queue authority.

## Decision

- Use Next.js App Router for `apps/web`.
- Use a NestJS HTTP application for `apps/api`.
- Use a NestJS standalone application context for `apps/worker`.
- Give the Worker a minimal internal Node HTTP health server; it has no business ingress.
- Expose distinct `/health/live` and `/health/ready` checks for every runtime.
- Report unconfigured database and queue dependencies as `not-configured`, never as healthy integrations.
- Keep environment-schema validation, observability, database, Redis/BullMQ, providers, OpenAPI, and business modules in their dependency-ordered later tasks.

## Consequences

The three processes can be built and started independently. Readiness remains honest and can be strengthened by DEV-003 through DEV-010 without changing route meaning. This ADR does not authorize deployment, commerce, provider access, or pilot activation.
