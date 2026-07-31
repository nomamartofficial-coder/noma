# FND-001 — Noma Repository Baseline Orientation Report

> **Task ID:** FND-001  
> **Status:** COMPLETE — awaiting human review and merge  
> **Inspection mode:** Read-only GitHub inspection  
> **Inspected repository:** `nomamartofficial-coder/noma`  
> **Default branch:** `main`  
> **Pinned baseline commit:** `ffd154ad0e714fb944a52f8e0cf6667db3e0c11a`  
> **Inspection date:** 31 July 2026  
> **Production code changed during inspection:** No

---

## 1. Executive conclusion

The connected GitHub repository is accessible and is no longer empty. It currently contains the complete Noma Build Pack and repository foundation documentation, but it does not yet contain the application scaffold or production implementation.

The verified repository state is:

```text
Repository: nomamartofficial-coder/noma
Visibility: public
Default branch: main
Permissions available to connected account: admin/read/write
Pinned HEAD: ffd154ad0e714fb944a52f8e0cf6667db3e0c11a
Application source code: not present
Build Pack documentation: present
Root package manifest: not present
Workspace configuration: not present
CI status checks at pinned HEAD: none
```

The repository is therefore a clean documentation-first starting point. There is no GitHub-hosted legacy application to preserve or migrate.

The next safe backlog task is **FND-006 — create issue, pull-request, ADR, and scope-change templates**. After FND-006, complete FND-007 and FND-008 before starting DEV-001.

---

## 2. Repository identity

| Field | Verified value |
|---|---|
| Repository | `nomamartofficial-coder/noma` |
| Repository ID | `1317712381` |
| Owner | `nomamartofficial-coder` |
| Visibility | Public |
| Archived | No |
| Default branch | `main` |
| Clone URL | `https://github.com/nomamartofficial-coder/noma.git` |
| Connected permissions | Admin, maintain, push, pull, triage |
| Latest inspected commit | `ffd154ad0e714fb944a52f8e0cf6667db3e0c11a` |
| Latest commit message | `chore: move Build Pack files from nested noma folder to repository root` |

---

## 3. Verified commit history

The repository contains the following relevant history:

1. initial repository creation;
2. Build Pack installation through pull request #1;
3. root `AGENTS.md` correction through pull request #2;
4. root `README.md` correction; and
5. movement of `docs/00–13` to the repository-root `docs/` directory.

Pull request #1 installed sixteen documentation files and was merged into `main`.

---

## 4. Verified documentation inventory

The following authority files are present:

```text
AGENTS.md
README.md
docs/00-product-vision.md
docs/01-mvp-scope.md
docs/02-user-roles.md
docs/03-user-journeys.md
docs/04-information-architecture.md
docs/05-design-system.md
docs/06-technical-architecture.md
docs/07-domain-model.md
docs/08-state-machines.md
docs/09-integrations.md
docs/10-security-and-compliance.md
docs/11-testing-strategy.md
docs/12-delivery-backlog.md
docs/13-covenant-pilot-readiness.md
```

The latest commit explicitly lists all fourteen files under `docs/`, and root `README.md` and `AGENTS.md` are readable on `main`.

---

## 5. Application and workspace status

The following expected implementation paths are not present at the pinned baseline:

```text
package.json
pnpm-workspace.yaml
turbo.json
apps/web
apps/api
apps/worker
packages/
prisma/schema.prisma
.github/workflows/
```

Consequences:

- there is no package manager or lockfile to execute;
- there are no application runtimes to build or test;
- there is no database schema or migration history;
- there are no automated tests;
- there is no CI pipeline;
- there are no provider integrations;
- there are no production environment definitions; and
- there is no GitHub-hosted implementation code to preserve.

This is expected for a documentation-first repository and is not itself a defect. These capabilities belong to later approved backlog tasks.

---

## 6. Framework and dependency status

No current framework or dependency version can be verified from the repository because no `package.json` or lockfile exists.

The Build Pack target remains:

- TypeScript;
- pnpm workspaces;
- Turborepo;
- Next.js App Router Web;
- NestJS API;
- NestJS/BullMQ Worker;
- PostgreSQL/Prisma;
- Redis-compatible queue infrastructure; and
- provider-neutral integration adapters.

Version selection and pinning belong to DEV-001 and later foundation tasks. Historical local Noma experiments must not be treated as current repository dependencies.

---

## 7. Branch, review, and CI posture

### Verified

- feature branches and pull requests have already been used;
- two Build Pack-related pull requests were merged;
- the connected account has repository administration permissions.

### Not yet implemented or not evidenced

- required pull-request reviews;
- required status checks;
- protected `main` branch or repository ruleset;
- CODEOWNERS;
- issue templates;
- pull-request template;
- ADR template;
- scope-change template;
- GitHub Actions workflows;
- dependency and secret scanning configuration.

GitHub supports branch protection and repository rulesets that can require pull-request reviews and passing status checks before changes merge. Noma should configure these controls after the relevant templates and CI checks exist, rather than inventing required check names before workflows are created.

---

## 8. Current test posture

No application tests exist because no application scaffold exists.

The absence of tests is not permission to begin business features. DEV-001 through DEV-008 establish the workspace, runtimes, configuration, database, queue/outbox, test harness, provider simulators, and CI foundation before product modules.

No test, lint, typecheck, install, migration, or build command was claimed as passing during FND-001.

---

## 9. Current database and migration posture

No Prisma schema, migration directory, seed data, or database configuration is present at the pinned baseline.

DEV-004 must introduce the database foundation after DEV-001 establishes the workspace. It must not use a historical local Neon database as implicit production truth.

---

## 10. Current provider and environment posture

No active provider integration is present in the GitHub repository.

The repository currently contains only documentation references to the intended providers. Provider credentials, environment files, and live service configuration must not be added during FND-001.

The historical database credential exposure identified outside this GitHub repository remains a separate containment item. It should be rotated or revoked before any historical database is reused. No exposed credential is reproduced in this report.

---

## 11. Reusable patterns

The current repository provides reusable governance patterns rather than application code:

- complete authority hierarchy;
- locked scope and non-goals;
- role, journey, route, domain, state, integration, security, testing, delivery, and readiness contracts;
- documented branch/task naming expectations;
- bounded Codex task structure;
- explicit progressive-feature controls; and
- a target modular-monolith repository layout.

No production implementation pattern has yet been established.

---

## 12. Current blockers

### B-001 — Repository governance templates are missing

Blocks reliable issue/PR/ADR/scope-change execution.

**Resolution:** FND-006.

### B-002 — Traceability registers are missing

Blocks machine-readable task-to-requirement validation.

**Resolution:** FND-007 after FND-006.

### B-003 — Evidence and change-control skeletons are missing

Blocks release-evidence and compliance artefact structure.

**Resolution:** FND-008 after FND-006.

### B-004 — Application workspace does not exist

Blocks install, build, test, runtime, database, and CI work.

**Resolution:** DEV-001 after FND-005 and the remaining EP00 governance tasks.

### B-005 — No required status checks exist

`main` cannot yet require named CI checks because workflows have not been created.

**Resolution:** DEV-008, followed by branch/ruleset enforcement using the actual stable job names.

---

## 13. Completed backlog assessment

| Task | Assessment |
|---|---|
| FND-001 | This report completes repository inspection, pending review/merge |
| FND-002 | Complete — Build Pack installed at correct paths |
| FND-003 | Complete — `docs/00-product-vision.md` present |
| FND-004 | Complete — root `AGENTS.md` present |
| FND-005 | Complete — root `README.md` present |
| FND-006 | Not started |
| FND-007 | Not started |
| FND-008 | Not started |
| DEV-001 | Not started and should wait for remaining EP00 controls |

---

## 14. Safest next task

The next task is:

```text
FND-006 — Create issue, pull-request, ADR, and scope-change templates
```

Required output:

- GitHub issue templates carrying task ID, requirements, journeys, machines, risk, dependencies, acceptance, tests, evidence, exclusions, and rollback;
- a root pull-request template;
- an ADR template;
- a scope-change template; and
- validation/sample evidence showing the templates cannot silently omit critical fields.

Recommended branch:

```text
fnd-006/governance-templates
```

Do not start DEV-001 in the same pull request.

---

## 15. FND-001 acceptance result

| Acceptance requirement | Result |
|---|---|
| Current tree identified | PASS — documentation-only repository |
| Package manager identified | NOT PRESENT, correctly reported |
| Frameworks identified | NOT PRESENT, target documented only |
| Existing tests identified | NONE PRESENT |
| Migrations identified | NONE PRESENT |
| Provider code identified | NONE PRESENT |
| Secret risks identified | Historical external credential risk recorded without disclosure |
| Reusable patterns identified | PASS — governance contracts |
| Conflicts identified | No implementation conflict because no implementation exists |
| Blockers identified | PASS |
| Proposed first branch identified | PASS — FND-006 |
| Production code changed | NO |

---

## 16. Final decision

```text
FND-001: COMPLETE, pending human review and merge
Repository access: PASS
Build Pack installation: PASS
Application implementation: NOT STARTED
Safe next task: FND-006
Paid commerce: NOT ELIGIBLE
```

Noma now has a verified documentation-first repository baseline. The project should finish the remaining EP00 governance controls before initializing the pnpm/Turborepo application workspace.