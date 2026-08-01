# Noma

Noma is a university-native, multi-vendor marketplace designed to combine trusted campus identity, structured commerce, protected payments, Noma-controlled fulfilment, buyer protection, and auditable operations.

The first operating target is a controlled Covenant University pilot—not a nationwide launch and not the final version of every long-term Noma capability.

> **Repository status:** The thirteen numbered Build Pack contracts and the three repository foundation documents are complete. Their presence specifies the product and implementation contract; it does not by itself mean the application, providers, operations, or paid pilot are implemented or ready.

---

## Product objective

The Covenant pilot must prove that Noma can safely coordinate the complete marketplace lifecycle:

```text
public discovery
→ verified campus eligibility
→ approved seller and truthful offer
→ inventory reservation
→ one multi-vendor checkout and buyer payment
→ provider-confirmed orders and balanced allocations
→ seller preparation
→ dispatch, pickup, custody, and delivery handoff
→ cancellations, returns, protection, refunds, reviews, and enforcement
→ seller earnings, withdrawals, and provider-confirmed payouts
→ monitoring, reconciliation, support, recovery, pause, and controlled expansion
```

Read [`docs/00-product-vision.md`](docs/00-product-vision.md) for the product direction and [`docs/01-mvp-scope.md`](docs/01-mvp-scope.md) for the binding pilot boundary.

---

## What the Covenant pilot includes

The locked pilot includes, subject to implementation and readiness gates:

- public Marketplace discovery;
- Covenant account and affiliation verification;
- Buyer, Seller, Rider, Operations, Support, Finance, Trust and Safety, and Admin capabilities;
- approved Campus Stores and Student Vendors;
- canonical Products and seller Offers;
- images, inventory, availability, reservations, search, categories, and filtering;
- cart and one multi-vendor checkout;
- Paystack payment verification;
- Parent Orders, Vendor Orders, Fulfilment Groups, and item-level payment allocations;
- seller preparation and Noma-controlled dispatch;
- CU Express/Noma Fleet carrier abstraction;
- pickup QR and delivery PIN/QR evidence;
- structured messaging and buyer-approved substitutions;
- cancellation, return, protection case, refund, review, enforcement, appeal, and recall foundations;
- seller earnings, holds, withdrawals, and controlled payouts;
- audit, observability, backups, restoration, incidents, and emergency controls; and
- staged, capacity-limited launch and expansion decisions.

Food, selected External Vendors, one-location Fulfilled by Noma Campus, selected low-risk Pre-Owned categories, Priority, and Saver are progressive capabilities. They remain inactive until their separate gates pass.

---

## Explicit non-goals for the founding pilot

Noma is not launching:

- unrestricted nationwide or multi-institution commerce;
- unrestricted seller or external-vendor registration;
- customer wallet, peer-to-peer transfers, cash on delivery, or instant settlement;
- active Service, Rental, Digital, or Event commerce;
- unrestricted used phones or laptops;
- a large or multi-location warehouse network;
- continuous GPS-dependent or predictive fleet optimisation;
- autonomous serious AI decisions;
- separate native apps for every role;
- a required Covenant SSO/directory integration;
- a required CU Express API;
- maps, SMS, or an external search engine as launch dependencies; or
- activation merely because code, routes, tables, or feature flags exist.

See [`docs/01-mvp-scope.md`](docs/01-mvp-scope.md) for the complete classification.

---

## Documentation map

The repository documentation is the source of truth.

| File | Purpose |
|---|---|
| [`docs/00-product-vision.md`](docs/00-product-vision.md) | Why Noma exists, target users, principles, pilot objective, non-goals, and long-term direction |
| [`docs/01-mvp-scope.md`](docs/01-mvp-scope.md) | What is built now, progressive, manual, deferred, or prohibited |
| [`docs/02-user-roles.md`](docs/02-user-roles.md) | Actors, capabilities, scopes, assurance, maker-checker, and data visibility |
| [`docs/03-user-journeys.md`](docs/03-user-journeys.md) | Thirty end-to-end journeys and exception paths |
| [`docs/04-information-architecture.md`](docs/04-information-architecture.md) | Product surfaces, routes, navigation, pages, queues, and content hierarchy |
| [`docs/05-design-system.md`](docs/05-design-system.md) | Tokens, components, commerce patterns, states, responsive behaviour, and accessibility |
| [`docs/06-technical-architecture.md`](docs/06-technical-architecture.md) | System structure, modules, runtimes, infrastructure, data flow, and ADRs |
| [`docs/07-domain-model.md`](docs/07-domain-model.md) | Entities, relationships, ownership, constraints, indexes, and persistence rules |
| [`docs/08-state-machines.md`](docs/08-state-machines.md) | States, transitions, actors, guards, deadlines, side effects, reversals, and concurrency |
| [`docs/09-integrations.md`](docs/09-integrations.md) | Providers, adapters, webhooks, environments, failures, and reconciliation |
| [`docs/10-security-and-compliance.md`](docs/10-security-and-compliance.md) | Threat model, authentication, privacy, NDPA/FCCPC controls, retention, access review, and incidents |
| [`docs/11-testing-strategy.md`](docs/11-testing-strategy.md) | Test pyramid, data, contracts, provider simulation, performance, accessibility, security, UAT, and gates |
| [`docs/12-delivery-backlog.md`](docs/12-delivery-backlog.md) | Epics, 150 bounded tasks, dependencies, acceptance, build order, and execution plan |
| [`docs/13-covenant-pilot-readiness.md`](docs/13-covenant-pilot-readiness.md) | Launch evidence, capacity, UAT approval, GO/HOLD/PAUSE decisions, and expansion criteria |
| [`AGENTS.md`](AGENTS.md) | Binding instructions for Codex, AI agents, automation, and contributors |
| [`README.md`](README.md) | Repository orientation, setup contract, commands, and contribution entry point |

For a conflict, follow the authority hierarchy in [`AGENTS.md`](AGENTS.md). Do not silently reconcile competing rules in code.

---

## Architecture

Noma uses a deployable modular monolith: one repository and domain model with separately runnable Web, API, and Worker processes.

```text
┌────────────────────────────────────────────────────────────┐
│ apps/web — Next.js App Router                              │
│ Marketplace · Buyer · Seller · Rider PWA · Ops · Admin    │
└──────────────────────────────┬─────────────────────────────┘
                               │ typed REST/JSON + OpenAPI
┌──────────────────────────────▼─────────────────────────────┐
│ apps/api — NestJS                                          │
│ auth · authorization · commands · queries · webhooks       │
└──────────────────────────────┬─────────────────────────────┘
                               │ transactions + outbox
┌──────────────────────────────▼─────────────────────────────┐
│ PostgreSQL — authoritative business, financial and audit   │
└──────────────────────────────┬─────────────────────────────┘
                               │ outbox publication
┌──────────────────────────────▼─────────────────────────────┐
│ apps/worker — NestJS + BullMQ                              │
│ events · email · files · search · reconciliation · jobs    │
└──────────────────────────────┬─────────────────────────────┘
                               │ provider adapters
        Paystack · S3 · Postmark · Sentry · PostHog · OTLP
```

Core rules:

- PostgreSQL is authoritative.
- Redis/BullMQ delivers background work but is not business truth.
- the transactional outbox connects committed state to asynchronous effects;
- provider SDKs remain behind adapters;
- no external network call occurs inside an authoritative database transaction;
- search, dashboards, balances, analytics, and telemetry are rebuildable projections;
- financial and custody history is append-only or corrected through explicit reversals; and
- activation requires feature, scope, capacity, operational, and readiness checks.

See [`docs/06-technical-architecture.md`](docs/06-technical-architecture.md).

---

## Target repository structure

```text
noma/
├── apps/
│   ├── web/                 # Next.js storefront and role surfaces
│   ├── api/                 # NestJS versioned API and webhook ingress
│   └── worker/              # BullMQ jobs, events, notifications, reconciliation
├── packages/
│   ├── platform/            # Domain and application modules
│   ├── database/            # Prisma, repositories, migrations, transaction helpers
│   ├── contracts/           # API/event/job schemas and generated types
│   ├── ui/                  # Noma Commerce Pattern Library
│   ├── config/              # Typed environment configuration
│   ├── observability/       # Logging, tracing, metrics conventions
│   ├── testing/             # Fixtures, builders, containers, provider simulators
│   ├── eslint-config/
│   └── tsconfig/
├── docs/                    # Product and implementation contracts
├── delivery/                # Epics, tasks, dependencies, gates, decisions
├── quality/                 # Requirement/test matrix and release gates
├── compliance/              # Approved compliance records and schemas
├── security/                # Security evidence schemas and controlled records
├── runbooks/                # Operational, provider, incident, pause and recovery runbooks
├── evidence/                # Redacted release/readiness evidence
├── scripts/
├── .github/
├── AGENTS.md
├── README.md
├── package.json
├── pnpm-workspace.yaml
└── pnpm-lock.yaml
```

The exact tree may evolve through approved architecture decisions, but runtime, package, authority, evidence, and operational responsibilities must remain clear.

---

## Technology stack

The locked pilot direction is:

| Area | Technology/decision |
|---|---|
| Language | TypeScript |
| Workspace | pnpm workspaces with a committed lockfile |
| Web | Next.js App Router |
| API | NestJS |
| Worker | NestJS standalone context + BullMQ |
| Database | PostgreSQL |
| ORM/migrations | Prisma plus reviewed PostgreSQL SQL where required |
| Queue/cache | Redis-compatible managed service |
| API style | Versioned REST/JSON with OpenAPI |
| Authentication | Opaque, revocable server-managed sessions |
| File storage | Private S3-compatible object storage |
| Search | PostgreSQL full-text search + `pg_trgm` |
| Payments/refunds/payouts | Paystack through server-side adapters |
| Transactional email | Postmark |
| Error monitoring | Sentry |
| Product analytics | PostHog EU with minimised events |
| Metrics/traces/logs | OpenTelemetry to Grafana Cloud EU |
| DNS | Cloudflare DNS/DNSSEC |
| CI | GitHub Actions |
| Production Web | Vercel |
| Production API/Worker/PostgreSQL/queue | Render Frankfurt |

Use the versions pinned in repository configuration. Do not copy version numbers from external tutorials into this README.

---

## Prerequisites

A development machine should have:

- Git;
- the Node.js version declared by the repository (`.nvmrc`, `.node-version`, or `package.json` engines);
- Corepack enabled;
- the pnpm version declared by `packageManager` in `package.json`;
- Docker Engine or Docker Desktop with Compose support for local PostgreSQL and Redis-compatible services;
- a supported browser for Web and Playwright testing; and
- access only to the non-production credentials required for the assigned task.

Do not use production credentials or production personal data for local development.

---

## Local setup contract

The application scaffold must make a clean-machine setup possible without tribal knowledge or production provider access.

Once the implementation repository is initialized, the canonical flow is expected to be:

Clone the approved Noma repository using the actual organisation-controlled repository URL, enter its root directory, and then run:

```bash
corepack enable
pnpm install --frozen-lockfile

pnpm db:up
pnpm db:validate
pnpm db:generate
pnpm db:migrate:dev

pnpm dev
```

The PostgreSQL foundation and local endpoint are documented in [`DATABASE.md`](DATABASE.md). The Redis/BullMQ and transactional-outbox foundation is documented in [`QUEUE.md`](QUEUE.md). Mail capture and full observability exporters remain dependency-ordered work.

If the repository uses a bootstrap script, it must remain transparent and equivalent to the documented steps rather than hiding destructive or production actions.

---

## Environment configuration

Configuration is typed and validated at process startup.

Expected environment classes:

- local development;
- automated test;
- preview;
- staging;
- production.

Rules:

- each class uses separate databases, queues, buckets, provider keys, webhook secrets, analytics projects, and monitoring environments;
- production secrets never appear in `.env.example`;
- `.env` and provider credentials are never committed;
- secret values are supplied through approved local or deployment secret stores;
- configuration errors fail startup before accepting traffic;
- feature activation and emergency pause are not inferred from deployment environment alone; and
- provider sandbox/test mode must be visibly distinguishable from production.

`.env.example` should document variable purpose, required environment classes, safe local defaults, sensitivity, and owning module without containing live values.

---

## Development commands

The implemented workspace must expose stable root commands. Script names may be introduced during the foundation tasks, but the final repository should provide the following contract or an explicitly documented equivalent.

```bash
# Run local Web, API and Worker processes
pnpm dev

# Formatting and static quality
pnpm format
pnpm format:check
pnpm lint
pnpm typecheck

# Tests
pnpm test
pnpm test:unit
pnpm test:component
pnpm test:integration
pnpm test:contract
pnpm test:e2e
pnpm test:accessibility
pnpm test:security
pnpm test:performance

# Production build
pnpm build

# Database
pnpm db:validate
pnpm db:generate
pnpm db:migrate:dev
pnpm db:migrate:deploy
pnpm db:migrate:status
pnpm db:migration-test
pnpm db:verify
pnpm db:up
pnpm db:down

# API/contracts
pnpm contracts:generate
pnpm contracts:check

# Documentation and repository integrity
pnpm docs:check
pnpm repo:check
```

Use only scripts that exist in the inspected repository. Missing required scripts are foundation work, not permission to claim the checks passed.

---

## Recommended first verification

After setup, a contributor should be able to run:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm docs:check
```

Database, provider, browser, security, accessibility, and performance suites may require their documented containers, simulators, or staging environment.

A clean local start does not prove production readiness.

---

## Testing approach

Noma tests by risk and authority, not by a vanity coverage percentage.

The stack specified by the Build Pack includes:

- Vitest;
- Testing Library;
- Testcontainers with real PostgreSQL and Redis-compatible services;
- Playwright;
- fast-check;
- k6;
- axe-core plus manual accessibility evaluation; and
- OWASP ZAP Automation Framework for staging DAST.

High-risk areas require more than happy-path tests:

- authorization matrices and negative cross-scope access;
- inventory and reservation races;
- payment, refund, payout, and provider-event idempotency;
- balanced ledger properties;
- order creation and partial multi-vendor failure;
- one-time pickup/delivery credential races;
- state transition and expected-version conflicts;
- outbox/queue duplicate and recovery behaviour;
- provider timeout, duplicate, out-of-order, reversal, and unknown states;
- private file access and malicious upload handling;
- accessibility across active surfaces;
- performance under configured capacity; and
- backup restoration, reconciliation, pause, and restart drills.

Read [`docs/11-testing-strategy.md`](docs/11-testing-strategy.md) before adding or changing a critical test.

---

## Provider development

Provider integrations use deterministic local simulators and sandbox accounts.

Never require production provider access to run ordinary unit, integration, component, contract, or most end-to-end tests.

Provider rules include:

- stable internal references before outbound calls;
- explicit timeout and uncertainty states;
- raw webhook-body signature verification;
- durable event storage and deduplication;
- safe/idempotent retry only;
- reconciliation against independent provider records;
- no browser or initial HTTP response as final money truth; and
- separate credentials and webhooks per environment.

See [`docs/09-integrations.md`](docs/09-integrations.md).

---

## Security and privacy

Do not commit or expose:

- production secrets or tokens;
- raw payment-card data;
- passwords, OTPs, session tokens, MFA seeds, or recovery codes;
- full bank account numbers;
- Covenant identity evidence;
- matric identifiers where not required;
- buyer phone numbers, private room/location information, or addresses;
- case and enforcement evidence;
- provider payload dumps containing personal data;
- production database snapshots;
- unredacted screenshots; or
- personal data in fixtures, analytics, logs, issues, PRs, or release evidence.

Security controls include privileged MFA, recent authentication, scoped authorization, private files, encryption for designated fields, rate limits, secure webhooks, session revocation, access reviews, retention/deletion, incident response, and paid-launch blockers.

Read [`docs/10-security-and-compliance.md`](docs/10-security-and-compliance.md) before changing identity, access, evidence, money, provider, export, admin, analytics, or personal-data behaviour.

Report a suspected credential or personal-data exposure through the private security process. Do not open a public issue containing the material.

---

## Design and accessibility

Noma's interface direction is:

> **Dense enough for serious commerce, simple enough for students, Nigerian in context, university-native in operation, and recognisably Noma.**

Use the shared Noma Commerce Pattern Library. Do not invent duplicated role-specific components or a generic AI dashboard appearance.

Active product experiences target WCAG 2.2 Level AA and must support:

- keyboard operation and visible focus;
- screen-reader names, roles, states, and relationships;
- sufficient contrast;
- non-colour status meaning;
- zoom and reflow;
- touch target requirements;
- reduced motion;
- responsive Marketplace, Buyer, Seller, Rider, Operations, and Admin layouts;
- honest loading, empty, error, stale, denied, paused, uncertain-provider, and offline states; and
- clear consequences and recovery for destructive or high-impact actions.

Read [`docs/05-design-system.md`](docs/05-design-system.md).

---

## Delivery workflow

The Build Pack defines 150 bounded acceptance tasks across 16 epics.

The normal cycle is:

1. select the next dependency-safe task from `docs/12-delivery-backlog.md`;
2. prepare an issue-style task contract;
3. inspect the repository in Ask Mode without changing production code;
4. resolve blockers or conflicts;
5. create a task branch;
6. implement the smallest complete vertical slice;
7. run required checks and simulations;
8. inspect the diff, migration, generated files, and evidence;
9. correct failures;
10. receive human review and intended-actor acceptance where required;
11. merge through the protected workflow; and
12. move to the next dependency only after the applicable gate passes.

Codex accelerates implementation but does not approve scope, merge, deploy production, perform UAT on behalf of users, configure production providers, or activate the marketplace.

See [`AGENTS.md`](AGENTS.md) and [`docs/12-delivery-backlog.md`](docs/12-delivery-backlog.md).

---

## Branches and pull requests

A branch should include the task ID and a concise slug.

A pull request must identify:

- task and governing requirements;
- implementation and module boundaries;
- authorization/security/privacy impact;
- money, inventory, order, custody, and state impact;
- migrations and compatibility;
- API/event/job/component changes;
- tests and exact command results;
- screenshots or recordings with safe test data;
- observability and operational changes;
- inactive/deferred behaviour;
- residual risks; and
- rollback or forward-fix plan.

One bounded task normally equals one branch and one pull request. Closely coupled small tasks may be bundled only under the rules in Part 12.

---

## Code ownership and review

The repository must maintain review ownership for at least:

- product/scope;
- platform/domain/API;
- Web/design system/accessibility;
- database/migrations/financial integrity;
- security/privacy;
- provider integrations;
- quality and test infrastructure;
- Operations/Support/Dispatch;
- Finance; and
- Trust and Safety.

A small team may assign several responsibilities to one person, but required maker-checker, independent verification, and readiness approvals remain enforced.

---

## Database rules

- money uses integer minor units and explicit currency;
- UUIDv7-compatible application identifiers are preferred where locked;
- canonical Products and seller Offers remain separate;
- Parent Orders, Vendor Orders, Order Items, Fulfilment Groups, packages, Delivery Jobs, allocations, ledger entries, and provider attempts remain relational;
- inventory uses reservations and movements;
- financial, custody, provider, case, enforcement, and audit history is append-only or reversed explicitly;
- read models are rebuildable;
- PostgreSQL constraints and indexes enforce critical invariants;
- migrations are forward-only, reviewed, tested from representative prior data, and compatible with rolling deployment where required; and
- `prisma db push` is not the production migration process.

Read [`docs/07-domain-model.md`](docs/07-domain-model.md) and [`docs/08-state-machines.md`](docs/08-state-machines.md).

---

## Operations and readiness

Deployment and activation are separate decisions.

The founding launch progresses through:

- `C0` simulation;
- `C1` controlled live smoke;
- `C2` closed Covenant pilot; and
- `C3` controlled expansion ceiling.

Real payment activation requires all fourteen readiness gates to pass with dated evidence, accountable owners, independent verification where required, explicit capacity limits, UAT, runbooks, monitoring, restoration, and unanimous approval from the mandatory Readiness Council roles.

A failed critical gate cannot be averaged away through a readiness score.

The system must support:

- `GO_CONTROLLED_LIVE`;
- `GO_CLOSED_PILOT`;
- `HOLD`;
- `PAUSE_SCOPED`;
- `ROLL_BACK`; and
- temporary pilot suspension.

Read [`docs/13-covenant-pilot-readiness.md`](docs/13-covenant-pilot-readiness.md).

---

## Current documentation milestone

The complete repository documentation pack contains sixteen files:

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

Completion of this documentation milestone means the implementation can proceed from a coherent authority set. It is not a claim that the 150 delivery tasks, provider environments, UAT, or readiness gates have been completed.

---

## Starting implementation

The first implementation work should follow `EP00` and `EP01` in [`docs/12-delivery-backlog.md`](docs/12-delivery-backlog.md):

1. inspect the actual repository and publish the baseline orientation report;
2. install and validate the Build Pack paths and document links;
3. establish issue, PR, ADR, scope-change, traceability, evidence, and runbook structures;
4. initialize the pnpm workspace and runtime skeleton;
5. create deterministic local PostgreSQL and Redis-compatible services;
6. create typed configuration and safe example environment files;
7. establish CI and root commands;
8. establish test containers, fixtures, provider simulators, and quality gates; and
9. only then proceed into identity, access, institution, catalogue, commerce, fulfilment, and operations dependencies.

Do not begin by generating the storefront homepage or checkout in isolation.

---

## Contribution standard

Before contributing:

1. read [`AGENTS.md`](AGENTS.md);
2. identify the approved task ID;
3. read the governing documents;
4. inspect before editing;
5. keep the change bounded;
6. implement tests with the behaviour;
7. preserve inactive and deferred scope;
8. report exact evidence; and
9. wait for human review and the applicable gate.

The final standard is simple:

> Build Noma so that every important claim—identity, stock, payment, order, custody, refund, payout, protection, enforcement, and readiness—can be supported by the correct authority and evidence.
