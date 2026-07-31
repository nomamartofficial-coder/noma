# Noma workspace guide

> **Task:** `DEV-001`  
> **Scope:** pnpm workspace and Turborepo orchestration only

## Toolchain

- Node.js `24.18.0` through `.nvmrc` and `.node-version`
- pnpm `11.17.0` through the root `packageManager` field
- Turborepo `2.9.14`
- TypeScript `6.0.3`

All versions are exact. Dependency upgrades require a reviewed lockfile change.

## Workspace graph

```text
apps/web
  -> @noma/config/public
  -> @noma/contracts
  -> @noma/observability/client
  -> @noma/ui

apps/api and apps/worker
  -> @noma/config/server
  -> @noma/contracts
  -> @noma/database
  -> @noma/integrations
  -> @noma/observability/server
  -> @noma/platform
  -> @noma/security

@noma/platform -> @noma/contracts
@noma/database -> @noma/contracts, @noma/platform
@noma/integrations -> @noma/contracts, @noma/platform
@noma/security -> @noma/contracts
@noma/testing -> @noma/contracts
```

The dependency declaration permits `apps/web` to depend on the config and observability packages, but source-level validation permits only their browser-safe subpath exports. Web must never import database, platform, integrations, security, server configuration, or server observability internals.

## Canonical commands

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm workspace:validate
pnpm workspace:self-test
pnpm lint
pnpm typecheck
pnpm build
```

`pnpm check` runs workspace validation, lint, typecheck, and build together.

## DEV-001 boundary

The application workspaces intentionally contain compileable placeholders. DEV-001 does not install or scaffold Next.js, NestJS, BullMQ, Prisma, providers, environment schemas, business modules, health endpoints, or deployable application features. Those begin with DEV-002 and later dependency-ordered tasks.

Running `pnpm dev` before DEV-002 fails intentionally with a clear message rather than pretending a runtime exists.

## Validation and review

The workspace validator checks the expected apps/packages, exact toolchain versions, workspace protocol links, permitted dependency edges, workspace globs, lockfile entries, and a negative browser-to-database boundary case.

A reviewer must perform the canonical commands from a clean Node 24 environment before approving DEV-001. A structurally valid committed lockfile is not a substitute for a real frozen installation.
