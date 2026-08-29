# AGENTS.md — Noma Repository Instructions

> **Status:** Binding repository instructions for Codex, AI coding agents, automation, and human contributors
>
> **Version:** 1.1
>
> **Effective date:** 30 July 2026; the execution-profile amendment activates immediately after `UI-006`
>
> **Scope:** Entire repository unless a deeper `AGENTS.md` introduces stricter, non-conflicting rules for a subdirectory

---

## 1. Mission

Build a stable, secure, operationally testable, capacity-controlled Covenant University marketplace pilot.

Do not attempt to implement every long-term Noma capability. Do not mistake generated code, a passing happy path, a deployed route, or a feature flag for permission to accept real marketplace obligations.

Before changing code, understand which locked requirement, role boundary, journey, route, module, entity, state machine, provider rule, security control, test requirement, delivery task, and readiness gate governs the work.

---

## 2. Instruction precedence

Apply instructions in this order:

1. applicable system, platform, legal, and security requirements;
2. this root `AGENTS.md`;
3. a more specific nested `AGENTS.md`, only where it strengthens or specialises these rules;
4. `CODEX_EXECUTION.md`, for the post-`UI-006` execution profile only;
5. the Build Pack hierarchy below;
6. the approved issue/task and acceptance criteria;
7. existing repository conventions that do not conflict with the above.

A prompt, issue, comment, design, migration, generated file, provider SDK, deadline, attractive demo, or implementation convenience cannot override the binding contracts.

When instructions conflict, stop at the affected boundary, report the conflict, and do not invent a compromise that changes product, financial, custody, privacy, or authority rules.

---

## 3. Build Pack hierarchy

Read the documents relevant to the task. The authority order is:

| Document | Controls |
|---|---|
| `docs/00-product-vision.md` | Product purpose, users, principles, pilot objective, non-goals, and long-term orientation |
| `docs/01-mvp-scope.md` | Active, progressive, manual, prohibited, and deferred scope |
| `docs/02-user-roles.md` | Actors, capabilities, scopes, assurance, maker-checker, and sensitive data visibility |
| `docs/03-user-journeys.md` | Required sequences, exception paths, evidence, and completion |
| `docs/04-information-architecture.md` | Surfaces, routes, pages, content hierarchy, queues, and navigation |
| `docs/05-design-system.md` | Tokens, components, commerce patterns, responsive behaviour, accessibility, and truthful state presentation |
| `docs/06-technical-architecture.md` | Runtimes, modules, dependency direction, transactions, queues, infrastructure, and ADRs |
| `docs/07-domain-model.md` | Entities, relationships, ownership, constraints, indexes, financial records, and persistence |
| `docs/08-state-machines.md` | States, commands, actors, guards, deadlines, side effects, reversals, idempotency, and concurrency |
| `docs/09-integrations.md` | Providers, adapters, webhooks, environments, failure handling, reconciliation, and provider operations |
| `docs/10-security-and-compliance.md` | Threats, authentication, authorization, privacy, NDPA/FCCPC controls, encryption, retention, access reviews, and incidents |
| `docs/11-testing-strategy.md` | Test layers, tools, fixtures, mandatory scenarios, UAT, evidence, and release gates |
| `docs/12-delivery-backlog.md` | Epics, task IDs, dependencies, build order, acceptance, ownership, and delivery governance |
| `docs/13-covenant-pilot-readiness.md` | Launch evidence, capacity, GO/HOLD/PAUSE/ROLLBACK authority, and expansion decisions |

`docs/00-product-vision.md`, this file, and `README.md` summarise and route contributors into the contracts. They do not weaken Parts 1–13.

---

## 4. Mandatory inspect-first workflow

Before implementing a task, inspect the repository in Ask Mode or equivalent read-only analysis.

The inspection report must identify:

- the requested task ID and objective;
- governing Build Pack sections;
- current repository tree and relevant files;
- package manager, runtimes, frameworks, and versions from repository configuration;
- existing modules, public interfaces, tests, migrations, components, adapters, and utilities to reuse;
- current states, entities, routes, contracts, and error codes affected;
- required authorization, security, privacy, financial, custody, and audit controls;
- required test layers and commands;
- dependencies and blockers;
- intentionally inactive or deferred adjacent capabilities;
- assumptions that cannot be proven from the repository or contracts; and
- the smallest safe branch/PR plan.

Do not modify production code during the inspection step.

Do not ask the human to repeat information already present in the repository or governing documents.

---

## 4A. Post-UI-006 Codex execution profile

For every Codex task first started after `UI-006`, follow [`CODEX_EXECUTION.md`](CODEX_EXECUTION.md). Select model tier and reasoning effort from task shape and material risk, begin with the lowest profile that can safely satisfy the unchanged task contract, and escalate only the smallest unresolved slice with evidence.

`UI-006` is grandfathered. Its existing model/effort, implementation prompt, Storybook architecture, pinned dependencies, deterministic fixtures, browser accessibility tests, visual-baseline workflow, scope exclusions, and human-review requirements remain unchanged, including review corrections.

Model or effort selection never changes Noma's scope, architecture, traceability, acceptance criteria, test matrix, CI gates, evidence, or review authority. Do not use Sol xhigh, max, ultra, or a multi-agent quality-first mode as a routine default. Do not weaken work to fit an allowance.

Include the starting execution profile and any bounded escalation in the task prompt and final report. Account balances, referral credits, volatile prices, and private usage data do not belong in the repository.

---

## 5. Work only from an approved bounded task

One implementation branch normally corresponds to one task ID from `docs/12-delivery-backlog.md`.

A task must have:

- objective;
- governing contracts;
- in-scope work;
- explicitly out-of-scope work;
- dependencies;
- risk class;
- acceptance criteria;
- required tests and evidence;
- rollback or recovery considerations; and
- human reviewer.

If the requested work is larger than one bounded task, split it before implementation. Do not create a giant “build the marketplace” branch.

A task estimated above five focused engineering days must be decomposed unless an approved record explains why the boundary cannot be safely split.

---

## 6. Scope discipline

Always classify the capability using `docs/01-mvp-scope.md`:

- **BUILD NOW** — required for the pilot;
- **ACTIVATE PROGRESSIVELY** — implementation may exist, but customer exposure requires a separate gate;
- **OPERATE MANUALLY** — Noma must still record, control, authorise, audit, and expose the workflow;
- **ARCHITECT NOW** — preserve a clean boundary without building the full lifecycle;
- **DEFER** — do not implement the complete capability;
- **PROHIBITED** — prevent the behaviour even if technically possible.

A route, enum, schema, component, endpoint, provider account, or feature flag does not activate a capability.

Do not build the following as founding-pilot dependencies:

- customer wallet or peer-to-peer transfer;
- cash on delivery or rider cash collection;
- instant seller settlement;
- active Service, Rental, Digital, or Event commerce;
- unrestricted external-vendor registration;
- unrestricted used electronics;
- nationwide or multi-institution operations;
- maps, SMS, external search, Covenant SSO, or CU Express API;
- autonomous serious AI decisions;
- predictive fleet optimisation;
- multi-location warehouse automation; or
- separate native buyer, seller, rider, and admin applications.

When a new requirement is necessary for safety, legal compliance, privacy, security, financial integrity, or a locked flow, use the scope-change process rather than silently expanding the task.

---

## 7. Repository architecture

The target is a TypeScript workspace modular monolith with separately runnable processes:

```text
noma/
├── apps/
│   ├── web/
│   ├── api/
│   └── worker/
├── packages/
│   ├── platform/
│   ├── database/
│   ├── contracts/
│   ├── ui/
│   ├── config/
│   ├── observability/
│   ├── testing/
│   ├── eslint-config/
│   └── tsconfig/
├── docs/
├── delivery/
├── quality/
├── compliance/
├── security/
├── runbooks/
├── evidence/
├── scripts/
├── .github/
├── AGENTS.md
├── README.md
├── package.json
├── pnpm-workspace.yaml
└── lockfile
```

Adapt exact paths to the repository only through reviewed architecture decisions. Do not collapse responsibilities because fewer folders appear convenient.

---

## 8. Runtime responsibilities

### 8.1 `apps/web`

The Web runtime owns:

- Next.js App Router pages and layouts;
- Marketplace, Buyer Account, Seller Centre, Rider PWA, Operations, and Admin presentation;
- server/client rendering boundaries;
- accessible interaction and responsive behaviour;
- typed API consumption; and
- browser-safe telemetry.

It must not:

- import the database client;
- bypass API authorization;
- contain provider secret keys;
- decide final payment/refund/payout truth;
- mutate protected state directly; or
- expose internal persistence objects as page models.

### 8.2 `apps/api`

The API runtime owns:

- versioned HTTP APIs;
- session validation and authentication assurance;
- centralized authorization policy checks;
- synchronous application commands and queries;
- transaction boundaries;
- webhook ingress and raw-body verification;
- short-lived object-storage operations;
- OpenAPI contracts; and
- health/readiness endpoints.

It must not perform long-running network work while a database transaction is open.

### 8.3 `apps/worker`

The Worker runtime owns:

- transactional outbox dispatch;
- BullMQ processors and schedulers;
- email, notification, search, file, reconciliation, and scheduled jobs;
- asynchronous provider-event processing;
- safe retries and dead-letter routing; and
- queue health and metrics.

Workers must use the same application services, authorization/service-principal rules, idempotency, and audit boundaries as the API.

### 8.4 Data stores

- PostgreSQL is the authoritative transactional store.
- Redis-compatible queue/cache storage is delivery infrastructure, never business truth.
- S3-compatible storage holds file bytes; PostgreSQL owns file metadata, state, access, and relationships.
- search, dashboards, balances, metrics, and analytics are projections and may be rebuilt.

---

## 9. Package boundaries and import direction

Required direction:

```text
apps/web        → contracts, ui, config, browser observability
apps/api        → platform, database, contracts, config, observability
apps/worker     → platform, database, contracts, config, observability
platform        → contracts and declared ports
infrastructure  → platform ports
```

Rules:

- `packages/platform` must not import Next.js, browser code, Prisma client implementation details, Paystack SDKs, email SDKs, or S3 SDKs.
- `packages/database` owns Prisma, repositories, transaction helpers, migrations, and database mappings; it must not hide business policy in generic helpers.
- `packages/contracts` contains API schemas, event envelopes, error codes, and generated types; persistence entities are not public DTOs.
- `packages/ui` contains tokens, primitives, composites, and commerce patterns; it must not own authorization or provider truth.
- `packages/config` contains typed schemas and non-secret constants; it must not contain secret values.
- `packages/observability` contains logging, metrics, and tracing conventions; it must not mutate business state.
- `packages/testing` contains fixtures, builders, test containers, provider simulators, and matrices; it must not provide production shortcuts.
- another module may import only a module's declared public API, not internal folders.
- avoid cyclic domain dependencies; use explicit application ports, events, or orchestration.

---

## 10. Module implementation standard

A material business module should use the behavioural separation:

```text
modules/<module>/
├── domain/
├── application/
├── infrastructure/
├── contracts/
└── index.ts
```

Simple modules may use fewer folders; do not create empty ceremony.

A mutating application command must define:

- actor or service principal;
- institution, seller, order, case, delivery, or platform scope;
- authentication assurance;
- validated input contract;
- idempotency identity where required;
- current-state and feature/capacity guards;
- transaction boundary;
- owned writes;
- cross-module calls through public interfaces;
- audit and outbox effects;
- result contract;
- conflict/error codes; and
- operational metrics.

A query must apply resource and field scope, paginate unbounded collections, avoid N+1 patterns, return explicit stale/processing/provider metadata where relevant, and never return persistence objects directly.

---

## 11. Authorization rules

Never implement authorization as a single role check.

Every protected action evaluates, as applicable:

```text
identity
+ session status
+ authentication assurance
+ capability
+ institution scope
+ seller/resource scope
+ current business state
+ feature assignment
+ capacity and emergency controls
+ separation-of-duty approval
+ sensitive-field policy
```

Rules:

- deny by default;
- enforce on the server;
- navigation visibility is not authorization;
- a staff role is not a platform-wide bypass;
- no catch-all `ADMIN` override;
- buyers see only their permitted order and case data;
- seller representatives see only the seller and resources within their membership scope;
- riders see only assigned or explicitly available work and the minimum handoff data needed;
- Support, Operations, Finance, Trust and Safety, and Admin receive different fields and actions;
- service principals receive only named system capabilities;
- privileged actions require the specified MFA/recent-authentication level;
- maker-checker rules cannot be bypassed because the team is small; and
- revocation must take effect on active sessions and future commands.

Add positive and negative authorization tests for every protected route and command.

---

## 12. State-machine rules

Do not implement a generic `setStatus()` method, unrestricted status field patch, or admin status editor.

The client requests a command such as `acceptVendorOrder`, `recordPickup`, `approveRefund`, or `pauseFeature`. The application service evaluates the current state, actor, guards, expected version, idempotency identity, and required effects.

A protected transition must preserve:

- allowed source state;
- authorized actor and scope;
- current-state and feature guards;
- expected aggregate version or equivalent conflict check;
- required database writes;
- audit event;
- outbox event;
- deadline and next-action changes;
- reversal or compensation semantics; and
- deterministic conflict/error behaviour.

Corrections use reversals, compensating records, successor transitions, appeals, or reconciliation. Do not erase financial, provider, custody, case, enforcement, or audit history.

Parent Order status, seller balance, dashboard counts, and search state are derived projections. Do not edit them as authoritative truth.

---

## 13. Transaction and concurrency rules

PostgreSQL transactions must be short and own all authoritative writes required for one command.

Rules:

- no external network call inside an authoritative transaction;
- use unique constraints, check constraints, foreign keys, version checks, row locks, advisory locks, or serializable isolation where the governing contract requires them;
- acquire locks in the documented stable order;
- inventory reservations must prevent oversell;
- payment/order creation must resist duplicate callbacks and concurrent verification;
- ledger postings must balance by currency and transaction group;
- one-time handoff credentials must be consumed atomically once;
- payout/refund attempts must not be duplicated by blind retry;
- transition and idempotency conflicts must return stable typed errors;
- write outbox records in the same transaction as the business change; and
- test the actual race, not only sequential calls.

---

## 14. Financial integrity rules

Money is stored in integer minor units with explicit currency.

Never:

- use floating-point arithmetic for money;
- store one mutable wallet balance as truth;
- trust a client amount;
- trust a browser payment redirect;
- mark a payment from an initial provider response alone;
- mark a refund completed before provider-final success;
- mark a payout paid before provider-final success;
- retry an uncertain money movement blindly;
- edit a ledger entry to correct history;
- merge buyer payment, seller earnings, withdrawal, and payout into one status; or
- perform production financial correction directly in the database.

Required patterns:

- server-side amount, currency, reference, and provider verification;
- raw provider-event preservation and signature verification;
- event and command idempotency;
- item-level allocation;
- balanced double-entry ledger postings;
- separate seller earning, hold, withdrawal, payout, and provider-attempt records;
- explicit pending, processing, final-success, final-failure, reversed, and uncertain states;
- reconciliation against independent provider records; and
- maker-checker controls for applicable refunds, payout changes, withdrawals, transfers, and corrections.

---

## 15. Inventory and custody rules

Inventory must distinguish physical quantity, reserved quantity, available quantity, movements, adjustments, units where serialized, and quarantine where applicable.

Do not decrement or restore stock with unguarded arithmetic.

Fulfilment and delivery must preserve:

- Seller/Vendor Order responsibility;
- Fulfilment Group and package identity;
- carrier and assignment;
- pickup readiness;
- one-time pickup credential;
- pickup evidence and custody event;
- delivery eligibility and one-time handoff credential;
- delivery evidence and custody event;
- failed-attempt custody and next action; and
- return, quarantine, recall, or recovery custody.

A message, GPS coordinate, screenshot, or manually edited status is not sufficient by itself to prove custody.

---

## 16. Integration rules

Use provider-neutral application ports and concrete infrastructure adapters.

Pilot providers are locked in `docs/09-integrations.md`, including Paystack, Vercel, Render, AWS S3, Postmark, Sentry, PostHog EU, Grafana Cloud EU, Cloudflare DNS, PostgreSQL search, and GitHub Actions.

Rules:

- do not import provider SDKs into domain/application code;
- preserve stable internal references before outbound calls;
- record outbound attempts and provider results;
- configure explicit timeouts;
- retry only safe/idempotent operations;
- treat timeout or transport failure as uncertain where the provider may have acted;
- verify webhook signatures against the raw request body;
- durably record accepted events before asynchronous processing;
- deduplicate by provider and event identity;
- acknowledge webhooks promptly after durable acceptance;
- map unknown provider states to reconciliation, not guessed success or failure;
- isolate local, test, preview, staging, and production credentials and data;
- never expose secret keys to the browser; and
- do not assume Covenant SSO, a Covenant directory, a CU Express API, maps, SMS, or external search exists.

---

## 17. Security and privacy rules

Security is part of every task involving identity, authority, money, inventory, custody, communication, evidence, personal data, configuration, or operations.

Required baseline:

- validate all untrusted input with explicit schemas;
- use opaque revocable server sessions;
- use Argon2id for passwords through the approved authentication module;
- require privileged MFA and recent authentication where specified;
- protect against CSRF, XSS, injection, SSRF, mass assignment, IDOR, replay, and abuse;
- use strict security headers and controlled CORS;
- rate-limit by action risk while accounting for shared campus networks;
- keep secrets in approved secret stores, not source, logs, tests, screenshots, issues, or evidence;
- redact credentials, tokens, identity evidence, full bank details, personal addresses, private room/location data, and unnecessary provider payloads;
- store private files in private buckets with scan/quarantine states and short-lived access;
- use application-level encryption for fields designated by the security contract;
- collect only data required for a documented purpose and lawful basis;
- do not add GPA, academic results, disciplinary, biometric, health, or unrelated government-ID data to ordinary flows;
- preserve data-subject rights, retention, deletion, legal hold, and breach requirements; and
- default the closed pilot to adults aged 18 and above until the approved minor workflow exists.

Do not include production personal data in fixtures, logs, analytics, snapshots, screenshots, or repository evidence.

---

## 18. Design and accessibility rules

Reuse the Noma Commerce Pattern Library from `packages/ui` and `docs/05-design-system.md`.

Do not introduce one-off visual variants when an approved component or semantic token exists.

Every user-visible state must:

- describe truthful status;
- identify the relevant object and obligation;
- show who acts next;
- show money, deadline, promise, or custody context where applicable;
- expose authorised actions only;
- provide recovery for loading, empty, error, stale, unavailable, uncertain, denied, paused, and offline states; and
- remain accessible without colour alone.

Meet WCAG 2.2 Level AA for active surfaces. Include keyboard, focus, screen-reader, zoom/reflow, target-size, contrast, reduced-motion, touch, and responsive tests as applicable.

Do not create generic AI-looking pages with giant gradients, oversized cards, meaningless metrics, excessive empty space, or animation that weakens commerce and operations.

---

## 19. Testing obligations

Tests ship with the feature. There is no accepted “add tests later” P0 task.

Select layers according to risk:

- unit tests for pure rules, value objects, calculations, policy functions, and mappers;
- component tests for interaction, status, accessibility, and responsive behaviour;
- integration tests against real PostgreSQL and Redis-compatible containers;
- API tests for validation, authorization, errors, idempotency, and transaction effects;
- contract tests for OpenAPI, events, jobs, and provider ports;
- state-machine tests for every permitted and rejected transition;
- property and concurrency tests for money, stock, orders, custody, idempotency, and one-time credentials;
- provider simulations for success, duplicate, delayed, out-of-order, unknown, malformed, timeout, failure, and reversal outcomes;
- end-to-end tests for the journeys affected;
- accessibility tests combining automation and human evaluation;
- security tests including negative authorization, abuse, upload, webhook, recovery, and privileged paths;
- performance tests for critical APIs, pages, queues, and capacity limits; and
- UAT and operational rehearsal by the intended actor where required.

Do not satisfy a test by weakening the assertion, bypassing production code, adding arbitrary sleeps, retrying a deterministic failure, or editing the database into the expected state.

P0 flaky tests block merge and release.

---

## 20. Root command contract

Use the repository's committed package manager and scripts. The workspace is expected to expose stable root commands equivalent to:

```bash
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm test:accessibility
pnpm test:security
pnpm build
pnpm db:validate
```

Additional task-specific commands may include migration validation, contract generation/checking, provider simulation, performance, dependency, secret, container, or documentation checks.

Never invent a successful command result. If a script is absent because the repository foundation is incomplete, report that as a blocker or implement the approved foundation task that creates it.

Record the exact commands run, exit results, relevant test counts, skipped suites, and environment limitations in the final report.

---

## 21. Database and migration rules

Before changing persistence:

- read `docs/07-domain-model.md` and affected state machines;
- inspect current Prisma schema, migrations, constraints, indexes, repositories, and fixtures;
- identify authoritative records and projections;
- preserve existing production-compatible data paths;
- create forward-only, reviewed migrations;
- use explicit SQL for PostgreSQL constraints/indexes Prisma cannot express safely;
- inspect generated migration SQL before commit;
- provide rollout, compatibility, backfill, verification, and rollback/forward-fix notes;
- do not combine destructive cleanup with an unrelated feature migration;
- do not make a nullable transitional field permanently optional without a follow-up plan encoded in the task; and
- test migration from representative previous schema/data, not only a blank database.

Never use `prisma db push` as the production migration process.

---

## 22. API and contract rules

- APIs are versioned and use explicit request/response schemas.
- Public DTOs must not expose database entities directly.
- Error codes are stable, typed, safe, and actionable.
- Pagination is required for unbounded collections.
- mutating endpoints accept an idempotency identity where the contract requires it;
- state-changing requests may require expected version/current state;
- OpenAPI must be generated and checked for approved endpoints;
- event and queue payloads are versioned;
- additive compatibility is preferred during rolling deployments;
- breaking contracts require an approved migration and consumer plan; and
- provider payloads remain behind adapters.

Do not return sensitive fields because they already exist on an entity.

---

## 23. Observability and operations rules

Every material command and asynchronous workflow must expose enough telemetry for an operator to understand failure without leaking private data.

Use:

- correlation/request IDs;
- actor/service-principal identity in audit, not unrestricted logs;
- aggregate and provider references where safe;
- state transition and result metrics;
- queue age, attempts, failures, and dead-letter metrics;
- reconciliation exception metrics;
- business stop-line alerts;
- health and readiness endpoints; and
- release/version attribution.

Logs, traces, metrics, and analytics are not authoritative business records.

Do not replace Operations queues with log searches. A workflow that needs human attention requires an owned queue, state, deadline, action, and audit trail.

---

## 24. Feature flags, capacity, and emergency controls

Feature activation evaluates more than a Boolean.

Protected commands may depend on:

- institution;
- seller or seller class;
- category;
- buyer cohort;
- location or zone;
- operating window;
- order/value/delivery capacity;
- required staff availability;
- progressive-feature evidence;
- provider readiness; and
- emergency pause state.

A feature must default to the safe inactive state where its activation evidence is incomplete.

Emergency pause must block new obligations while preserving existing orders, money, inventory, custody, cases, consumer rights, and audit history.

Restart requires the documented authority and evidence; do not silently re-enable a paused capability during deployment.

---

## 25. Git and branch rules

- begin from the approved protected base branch;
- use a branch named with the task ID and concise slug;
- keep commits focused and understandable;
- do not mix unrelated refactors, formatting churn, dependency upgrades, and feature work;
- do not rewrite shared branch history without approval;
- do not commit generated secrets, environment files, production data, provider payload dumps, personal data, binary evidence, or local tool caches;
- inspect generated code, migrations, snapshots, lockfile changes, and SDKs before commit;
- keep the lockfile committed and deterministic;
- update documentation and traceability in the same task; and
- do not merge your own work without required human review.

Codex or another agent must never self-approve, merge, deploy production, change production provider settings, activate paid checkout, or open a progressive feature.

---

## 26. Pull-request requirements

A pull request must contain:

- task ID and title;
- objective and user/operator outcome;
- governing Build Pack sections;
- dependency status;
- implementation summary by module/runtime;
- migrations and compatibility notes;
- security, privacy, financial, custody, and authorization impact;
- API/event/job/component changes;
- tests added or changed;
- exact commands and results;
- screenshots or recordings for user-visible changes, with private data removed;
- observability and operational changes;
- intentionally inactive/deferred branches;
- known limitations and residual risks;
- rollback or forward-fix plan; and
- documentation/traceability updates.

Do not describe a task as complete when required suites were skipped, provider finality is simulated without contract coverage, or the intended UAT actor has not accepted the workflow.

---

## 27. Required final report from an agent

At the end of a task, report:

1. task ID and status;
2. files changed;
3. behaviour implemented;
4. governing requirements satisfied;
5. architecture and domain patterns reused;
6. migrations and data impact;
7. authorization/security/privacy controls;
8. financial/inventory/custody effects;
9. tests and exact command results;
10. provider simulation or integration evidence;
11. UI/accessibility evidence;
12. operational/observability effects;
13. intentionally inactive and out-of-scope work;
14. unresolved blockers, risks, or assumptions; and
15. recommended next dependency-safe task.

For post-`UI-006` tasks, also report the starting model and reasoning effort, any bounded escalation and its evidence, and whether capacity left an incomplete checkpoint. Execution-profile reporting does not replace any item above.

Never claim a test, review, deployment, UAT, provider action, or readiness gate occurred when it did not.

---

## 28. Documentation rules

- preserve the terminology and authority of the Build Pack;
- update the governing document only through approved change control;
- link requirement IDs, journey IDs, machine IDs, task IDs, and evidence IDs where available;
- keep public documentation free of secrets and personal data;
- do not duplicate a binding rule into competing sources unless one is clearly a summary and links to the authority;
- keep model and reasoning-effort routing in `CODEX_EXECUTION.md`; other files may summarise and link to it but must not create a competing routing table;
- update README setup/commands when the repository contract changes;
- update ADRs for material architecture decisions;
- update OpenAPI and event/job schemas with code; and
- ensure Markdown links and code examples remain valid.

Do not use unresolved `TODO`, `TBD`, `FIXME`, or placeholder text to hide a P0 requirement. An unresolved decision must have an owned issue or decision record and must block the affected activation where necessary.

---

## 29. Dependency changes

Before adding or upgrading a dependency:

- prove an existing workspace dependency or platform capability is insufficient;
- prefer maintained, well-documented packages with compatible licences;
- review security advisories and transitive impact;
- keep provider SDKs inside adapters;
- avoid packages that duplicate framework capability for minor convenience;
- update the lockfile deterministically;
- run affected tests and builds;
- document migration or bundle impact; and
- avoid broad upgrades inside unrelated feature tasks.

A dependency must not silently send telemetry or personal data to a new provider.

---

## 30. Generated code and AI output

Generated code is untrusted until inspected.

An agent must:

- understand generated migrations, clients, schemas, and snapshots;
- remove dead or speculative abstractions;
- preserve repository naming and public interfaces;
- avoid copying provider examples that bypass Noma's contracts;
- avoid fabricating tests that only assert mocks called mocks;
- avoid hallucinating APIs, environment variables, roles, states, entities, or routes;
- report uncertainty rather than invent business policy; and
- produce a diff small enough for human review.

Never use comments such as “production would validate this” as a substitute for implementing the required validation.

---

## 31. High-risk change stop conditions

Stop and report before proceeding when:

- the request conflicts with `docs/01-mvp-scope.md`;
- required actor or data authority is unclear;
- a financial correction would require rewriting history;
- a state transition is absent or contradictory;
- the proposed flow could duplicate payment, refund, payout, stock, order, or custody effects;
- a provider outcome is uncertain and no reconciliation path exists;
- a migration may lose or misattribute material data;
- private evidence may become public or permanently accessible;
- cross-seller or cross-institution isolation cannot be proven;
- a privileged path lacks required MFA/recent authentication/maker-checker;
- a Covenant or CU Express integration is assumed without a real contract;
- a progressive capability would become active without its gate;
- required tests cannot run and no approved simulator exists;
- production credentials or personal data appear in the repository; or
- a launch/readiness decision is being requested through code rather than Part 13 authority.

Partial safe progress is preferred to bypassing the boundary.

---

## 32. Prohibited shortcuts

Do not:

1. invent scope or policy;
2. create a universal `role` or `isVerified` flag;
3. create a catch-all admin bypass;
4. authorize only in the UI;
5. deep-import another module's internals;
6. access the database from the Web runtime;
7. place provider SDK logic in domain/application code;
8. call a provider while holding a business transaction;
9. trust browser redirects or client-submitted financial truth;
10. treat provider HTTP success as final business success;
11. retry uncertain money movement blindly;
12. use floating-point money;
13. use a mutable seller-wallet balance as truth;
14. edit ledger, custody, case, enforcement, provider, or audit history;
15. expose a generic status patch;
16. edit derived Parent Order or dashboard status directly;
17. decrement inventory without reservation/concurrency protection;
18. claim pickup or delivery without one-time evidence and custody recording;
19. expose buyer or seller private data outside the required scope;
20. store production secrets or personal data in code, logs, fixtures, analytics, screenshots, or evidence;
21. make private files public for convenience;
22. skip malware/quarantine handling for protected uploads;
23. use WhatsApp or private notes as transaction, delivery, or dispute truth;
24. treat manual operation as off-system operation;
25. build an invented Covenant or CU Express API;
26. add maps, SMS, external search, wallet, COD, native apps, or future commerce as launch dependencies;
27. activate progressive features because code exists;
28. bypass capacity or emergency-pause guards;
29. add tests after the feature as a separate P0 promise;
30. accept flaky P0 tests through retries;
31. weaken assertions to make CI green;
32. use direct database edits to pass tests or UAT;
33. claim UAT from an engineer instead of the intended actor;
34. skip accessibility because automated checks pass;
35. skip Operations queues because logs exist;
36. merge generated migrations without inspection;
37. self-approve or self-merge agent work;
38. deploy or change production provider configuration without authority;
39. activate live payment or expand a cohort without Part 13 approval; or
40. let deadline, founder preference, investor pressure, provider behaviour, or a demo override a blocker.

---

## 33. Definition of done for repository work

A task is done only when, as applicable:

- the task was ready and dependency-safe;
- governing requirements are identified;
- the implementation respects scope and module boundaries;
- permissions and state guards are server-enforced;
- migrations and data constraints are reviewed;
- money, inventory, order, and custody invariants hold;
- provider uncertainty and idempotency are handled;
- audit and outbox effects are complete;
- loading, empty, error, stale, offline, denied, paused, and recovery states exist;
- accessibility and responsive behaviour pass;
- required tests and simulations pass;
- observability and operational queues exist;
- documentation and traceability are updated;
- inactive/deferred behaviour remains inactive;
- exact evidence is recorded;
- human review is complete; and
- no readiness or activation claim exceeds the evidence.

---

## 34. Final agent instruction

Build Noma as a controlled marketplace system, not as a collection of attractive pages.

Preserve truth across identity, permissions, products, stock, orders, money, fulfilment, custody, cases, provider events, and audit history. Reuse the established architecture. Test the failure and race paths. Keep progressive features inactive until approved. Report what you did and what you deliberately did not do.

When uncertain, stop at the affected boundary and surface the conflict instead of inventing a shortcut.
