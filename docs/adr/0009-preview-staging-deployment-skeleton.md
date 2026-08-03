# ADR-0009: Vercel Preview and Render Frankfurt staging skeleton

- **Status:** Proposed
- **Date:** 2026-08-03
- **Task:** `DEV-009`
- **Issue:** [#26](https://github.com/nomamartofficial-coder/noma/issues/26)
- **Draft PR:** [#27](https://github.com/nomamartofficial-coder/noma/pull/27)
- **Traceability:** `REQ-DEV-009`, `DEC-ARCH-001`, `DEC-SCOPE-014`, `DEC-REPO-001`, `P1-OPERATIONS`

## Context

DEV-008 established five stable protected CI gates. Noma now needs a production-shaped but strictly non-production deployment path that preserves environment isolation, PostgreSQL authority, forward-only migrations, BullMQ recovery, safe health reporting, and the separation between deployment and commerce activation.

Vercel provides native Next.js Preview deployments. Render provides Web Services, Background Workers, PostgreSQL, and Redis-compatible Key Value in Frankfurt. Render free resources cannot truthfully satisfy the continuously running Worker plus persistent queue requirement, so resource creation requires explicit cost authorization.

## Decision

Use Vercel only for `@noma/web` Preview deployments. Disable Git deployment from `main`, expose only the two approved public variables, and protect preview access with the strongest approved plan control.

Use a Render project named `noma` with one protected, network-isolated `staging` environment in Frankfurt. Define `noma-api-staging` as the only public backend service, `noma-worker-staging` as a Background Worker, `noma-postgres-staging` as PostgreSQL 18, and `noma-key-value-staging` as persistent `noeviction` queue delivery infrastructure. Disable external datastore access. Keep real providers disabled.

The API owns one pre-deploy wrapper which invokes `pnpm db:migrate:deploy`. Worker never migrates. Render's commit SHA is converted into required `NOMA_RELEASE_SHA` before migrations or runtime startup. API readiness continuously probes PostgreSQL and Key Value and becomes unavailable on dependency loss. API CORS permits one exact approved protected preview origin.

The checked-in deployment validator rejects production configuration, public secrets, wildcard Vercel CORS, cross-region resources, public Worker ingress, duplicate/destructive migration ownership, non-frozen or watch commands, mutable versions, provider hooks, unsafe build filters, and missing rollback/environment/release ownership. Remote smoke and evidence are separate commands because provider access and cost authority are external state. Render's documented private PostgreSQL path does not promise TLS, so the staging wrapper requires it fail-closed and external import is blocked until provider testing proves compatibility or Security approves an architecture satisfying both controls.

## Consequences

- Reviewers can validate provider configuration without provider accounts or resource creation.
- The minimum truthful Render topology is billable and must not be imported without approval.
- Private PostgreSQL routing plus Noma's encrypted-transport requirement needs an authenticated provider compatibility proof before import; a public database URL is not an acceptable workaround.
- Random Vercel preview URLs do not automatically receive credentialed API access; only the approved stable preview origin does.
- Application rollback remains compatible with forward-only schema history; it is never described as database rollback.
- No production resource, custom production domain, provider adapter, business job, customer data, or pilot feature is added.

## Alternatives rejected

- Hosting API/Worker on Vercel: violates runtime and queue ownership boundaries.
- Making Worker a Render Web Service: creates unnecessary public ingress.
- Using free in-memory Key Value: loses persistence expected by the queue foundation.
- Allowing all `*.vercel.app` origins: weakens exact-origin credentialed CORS.
- Running migrations in both API and Worker or at every process start: introduces concurrent ownership and unsafe restart behaviour.
- Provisioning now: no authenticated organization provider accounts or cost authorization are available.

## Rollback

Revert the DEV-009 commit if no external resources exist. If staging resources are later created, disable automatic deployment, select a prior compatible application deployment when needed, retain redacted evidence, and remove only the four named staging resources after authorization. Applied migrations remain immutable; use a forward fix or approved isolated restore.
