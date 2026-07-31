
# ADR-0001: pnpm and Turborepo workspace foundation

- **Status:** Accepted
- **Task:** DEV-001
- **Decision date:** 2026-07-31

## Context

Noma requires three independently deployable application workspaces and strict package boundaries in one TypeScript modular-monolith repository.

## Decision

Use pnpm workspaces with a committed shared lockfile and Turborepo for deterministic lint, typecheck, build, clean, and later development task orchestration. Runtime frameworks are intentionally deferred to DEV-002.

The browser workspace is restricted to browser-safe packages. Platform code depends only on public contracts and declared ports. Concrete provider and persistence concerns remain outside platform.

## Consequences

- one root install and task graph;
- explicit workspace dependencies through `workspace:*`;
- package public APIs rather than deep imports;
- no application feature, provider, database, or production activation in this task;
- dependency upgrades require an intentional lockfile change and review.
