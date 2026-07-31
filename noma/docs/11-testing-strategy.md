# Noma Testing Strategy

> **Repository path:** `docs/11-testing-strategy.md`  
> **Status:** Binding Covenant pilot quality, verification, and release-gate contract  
> **Version:** 1.0  
> **Effective date:** 30 July 2026  
> **Applies to:** Noma's two-month Covenant University pilot build  
> **Primary audience:** Founders, Product, Design, Engineering, Codex, Quality Assurance, DevOps, Security, Privacy, Operations, Finance, Support, Trust and Safety, Data, and future contributors

---

## 1. Purpose

This document defines how Noma proves that the controlled Covenant University marketplace pilot is correct, safe, accessible, resilient, operable, and ready to accept real customer obligations.

It converts the first ten Build Pack contracts into one executable verification strategy covering:

- the test pyramid and ownership of each test layer;
- synthetic test data, fixtures, builders, clocks, and environment isolation;
- API, event, job, provider-adapter, and OpenAPI contract tests;
- domain, state-machine, property-based, database, and concurrency tests;
- deterministic provider simulation, sandbox verification, failure injection, and controlled live drills;
- frontend component, responsive, browser, PWA, offline, and visual-regression tests;
- performance budgets, capacity tests, stress, spike, soak, and degraded-mode tests;
- accessibility automation and human evaluation against WCAG 2.2 Level AA;
- security verification against the Noma threat model and OWASP ASVS baseline;
- migration, backup, restore, rollback, reconciliation, and disaster-recovery tests;
- founding-team, founding-seller, operational, and closed-pilot user acceptance testing;
- CI pipelines, flaky-test policy, evidence retention, and release gates; and
- the conditions under which a change, release, provider, progressive feature, or pilot stage must be blocked.

The objective is to prevent Engineering, Codex, reviewers, and future contributors from treating any of the following as proof that a feature is complete:

- the page renders;
- a happy-path unit test passes;
- a provider SDK returned `200`;
- a browser redirect looked successful;
- a screenshot looked correct;
- a mocked repository accepted a transition;
- a dashboard displayed a balance;
- one manual demonstration worked once;
- code coverage reached an arbitrary percentage; or
- a flaky test passed after retries.

The target is:

> **Repeatable evidence that Noma preserves product rules, permissions, state, money, inventory, custody, evidence, privacy, accessibility, and recoverability under normal operation, failure, duplication, delay, concurrency, abuse, and human intervention.**

---

## 2. Authority and document hierarchy

1. `docs/01-mvp-scope.md` controls what is active, progressive, manual, prohibited, or deferred.
2. `docs/02-user-roles.md` controls actors, capabilities, resource scope, assurance, maker-checker rules, exports, and sensitive-field visibility.
3. `docs/03-user-journeys.md` controls required end-to-end outcomes, exception paths, evidence, notifications, and honest completion.
4. `docs/04-information-architecture.md` controls surfaces, routes, page ownership, content hierarchy, and navigation visibility.
5. `docs/05-design-system.md` controls component behaviour, states, responsive presentation, and accessibility requirements.
6. `docs/06-technical-architecture.md` controls runtimes, modules, transactions, queues, outbox, APIs, infrastructure, degraded modes, and deployment boundaries.
7. `docs/07-domain-model.md` controls entities, relationships, constraints, indexes, append-only records, and authoritative persistence.
8. `docs/08-state-machines.md` controls states, transitions, guards, deadlines, side effects, reversals, idempotency, and concurrency conflicts.
9. `docs/09-integrations.md` controls providers, adapters, webhooks, environments, uncertainty, reconciliation, outage behaviour, and live drills.
10. `docs/10-security-and-compliance.md` controls threats, authentication, encryption, data protection, retention, access review, incident response, consumer protection, and security launch blockers.
11. **This document controls test layers, tools, fixtures, coverage expectations, required scenarios, environments, evidence, quality ownership, and release gates.**
12. `docs/12-delivery-backlog.md` may sequence implementation and tests but must not remove required verification.
13. `docs/13-covenant-pilot-readiness.md` will consume the evidence defined here and decide whether each pilot gate passes.

A pull-request description, provider dashboard, generated test, local demonstration, test retry, code-coverage report, or founder deadline does not override this strategy.

Where a requirement is ambiguous or conflicts with an earlier contract, the affected implementation and test must stop until the governing document is corrected. Tests must not silently choose business policy.

---

## 3. Source-derived requirements

The supplied Noma documents and completed Build Pack contracts require all of the following:

1. Weeks 7 and 8 prioritise integration, security, testing, hardening, UAT, deployment, monitoring, backups, and pilot readiness.
2. A feature is not done until happy, failure, permission, state, concurrency, audit, operational, responsive, accessibility, and degraded states are covered where applicable.
3. Every P0 journey must be demonstrated end to end without WhatsApp, spreadsheets as the sole system, private database edits, or developer intervention.
4. Money, inventory, orders, custody, one-time credentials, permissions, and provider events require idempotency and concurrency evidence.
5. Parent Orders, Vendor Orders, Fulfilment Groups, allocations, refunds, seller earnings, and unaffected-order continuity require relational and end-to-end tests.
6. Provider completion must be verified from authenticated provider evidence rather than browser callbacks or optimistic local state.
7. Every material state machine requires permitted, forbidden, deadline, side-effect, reversal, and conflict tests.
8. Provider adapters require local deterministic simulators, sandbox contract tests, failure injection, and controlled live drills.
9. Security verification must include authorization/IDOR, sessions, CSRF, CORS, headers, webhook replay, uploads, rate limits, secrets, dependencies, DAST, recovery, and manual abuse testing.
10. Accessibility requires automated testing plus keyboard, screen-reader, zoom, reflow, focus, contrast, target-size, reduced-motion, and device evaluation.
11. Performance budgets must cover Marketplace, search, product, cart, checkout, seller, Rider, Operations, API latency, database queries, queues, and provider calls.
12. Backup readiness requires an isolated restoration test, not merely proof that a backup job ran.
13. Progressive Food, External Vendor, FBN, Pre-Owned, Priority, and Saver capabilities require complete tests before activation.
14. Critical security, payment, payout, data-isolation, custody, and recoverability failures remain launch blockers regardless of schedule.
15. Pilot stages require simulation, founding-team, founding-seller, closed-pilot, and expansion evidence.

---

## 4. Normative language

- **MUST / MUST NOT:** mandatory for the applicable pilot stage.
- **SHOULD / SHOULD NOT:** expected unless a documented and approved reason exists.
- **MAY:** optional within the locked scope.
- **P0:** launch-blocking journey or control. Failure blocks the affected paid operation or pilot stage.
- **P1:** progressive or material supporting capability. Failure blocks activation of that capability.
- **P2:** non-critical supporting behaviour. Failure may be accepted only through documented triage.
- **TEST ORACLE:** the authoritative rule or evidence used to determine the expected result.
- **FIXTURE:** controlled test input or persisted setup with explicit ownership and cleanup.
- **SIMULATOR:** deterministic implementation of an application port used to reproduce provider outcomes without a real provider.
- **CONTRACT TEST:** verification that a public API, event, job, adapter, or provider interaction conforms to a versioned schema and behaviour.
- **PROPERTY TEST:** generated-input verification of an invariant rather than only selected examples.
- **MODEL-BASED TEST:** generated sequence of commands compared with a simplified reference state model.
- **UAT:** user acceptance testing performed by the intended operational or business actors against approved scripts.
- **RELEASE GATE:** a required automated or human decision that prevents promotion or activation when evidence is insufficient.
- **QUARANTINED TEST:** a temporarily excluded non-critical test with a recorded owner, defect, expiry, and replacement coverage. Quarantine is not deletion.
- **CONTROLLED LIVE DRILL:** an authorised, low-value production exercise with identified test records, reconciliation, owner, and rollback plan.

---

# Part A — Quality model and ownership

## 5. Testing principles

Every Noma test programme MUST follow these principles:

1. **Test business truth, not implementation trivia.** Tests should assert observable rules, persisted invariants, public contracts, and honest outcomes.
2. **Place tests at the lowest reliable layer.** Domain rules belong in fast unit/property tests; database constraints require real PostgreSQL; complete obligations require end-to-end tests.
3. **Use real infrastructure for infrastructure behaviour.** Prisma, PostgreSQL locking, Redis/BullMQ, migrations, and SQL constraints must not be “proven” by in-memory substitutes.
4. **Mock at provider ports, not inside domain policy.** Production adapters are replaced with deterministic simulators through the same interfaces.
5. **Failure is a first-class path.** Timeout, duplicate, out-of-order, denied, stale, unavailable, expired, reversed, and partial outcomes are required coverage.
6. **Retries must be safe.** A retried test command must reveal duplicate side effects rather than hiding them.
7. **Flakiness is a defect.** A test that passes only after retry is not treated as healthy evidence.
8. **Production data is not test data.** Local, CI, preview, and staging use synthetic or specifically approved de-identified records.
9. **Tests must be deterministic.** Time, randomness, IDs, provider outcomes, locale, and worker schedules are controlled.
10. **Security and accessibility are continuous.** They are tested throughout development, not applied only before launch.
11. **Manual operation is still testable.** Queues, authority, evidence, approvals, audit, deadlines, and consequences are exercised.
12. **Progressive code is not trusted by existence.** Feature, cohort, capacity, institution, and emergency guards are tested before activation.
13. **Evidence must be reproducible.** A reviewer must know the command, commit, environment, fixtures, result, and artefacts.
14. **Tests must preserve privacy.** Logs, screenshots, traces, fixtures, reports, and videos must not expose secrets or real sensitive data.
15. **A green pipeline cannot waive a known Critical risk.** Automated tests are evidence, not a substitute for judgement and governance.

## 6. Quality risk classes

| Class | Examples | Required evidence | Failure effect |
|---|---|---|---|
| `P0-FINANCIAL` | payment, refund, ledger, hold, withdrawal, payout | unit, DB integration, property, concurrency, provider simulation, sandbox/live drill, reconciliation | block money movement |
| `P0-CUSTODY` | reservation, package pickup, handoff, return custody, quarantine | state, DB, one-time credential, concurrency, Rider E2E, operational drill | block affected fulfilment |
| `P0-AUTHORITY` | roles, scopes, MFA, maker-checker, emergency control | policy unit, matrix integration, negative IDOR, browser/API, manual abuse | block protected surface/action |
| `P0-PRIVACY` | identity evidence, bank data, messages, cases, exports | field projection, signed access, retention, access audit, privacy/UAT | block affected processing |
| `P0-RECOVERY` | backups, restore, outbox replay, provider reconciliation | recovery integration, restore drill, replay tests, runbook exercise | block paid launch |
| `P0-COMMERCE` | multi-vendor checkout, order continuity, cancellation, promises | API, DB, state, E2E, exception path, UAT | block checkout/order activation |
| `P1-PROGRESSIVE` | Food, FBN, External Vendor, Pre-Owned, Priority, Saver | full relevant P0-equivalent suite for scoped feature | block feature activation |
| `P1-OPERATIONS` | dispatch board, work queues, seller/rider workflows | integration, E2E, accessibility, UAT, monitoring | block operating stage |
| `P2-PRESENTATION` | non-critical content and visual refinements | component, accessibility, visual regression | triage; may release with approved bounded issue |

A feature inherits the highest risk class of any value, right, custody, personal data, or operational obligation it can change.

## 7. Test ownership

| Test concern | Primary owner | Required reviewers |
|---|---|---|
| Domain rules and state machines | Engineering | Product/domain owner, QA |
| Database constraints and migrations | Engineering/Data | QA, DevOps for production risk |
| API and authorization | Engineering | QA, Security for P0 authority |
| Web components and journeys | Web Engineering | Design, QA, Accessibility reviewer |
| Provider adapters | Engineering | Finance/Operations where money/obligation exists |
| Performance | Engineering/DevOps | Product, Operations |
| Security | Security + Engineering | Privacy/Finance/Operations as applicable |
| Accessibility | Design/Web/QA | Human accessibility reviewer |
| UAT | Product/Operations | Intended actors and accountable owner |
| Backup/recovery | DevOps | Engineering, Finance/Data, Security |
| Release evidence | QA/Release owner | Engineering, Product, Operations, Security/Finance as applicable |

Codex may generate tests, fixtures, or scripts but cannot self-approve P0 acceptance evidence.

## 8. Independence and separation of duties

- The author of a P0 change MUST NOT be the only reviewer of its test evidence.
- A Finance maker cannot approve their own payout/refund live drill.
- A privileged-access test must be reviewed by someone who does not rely on the tested privilege for ordinary access.
- The person executing a restore drill must have a second person verify recovered financial and order integrity.
- A security exception cannot be approved solely by the feature author.
- UAT sign-off must come from the actor group responsible for operating the flow, not only Engineering.

---

# Part B — Test pyramid and toolchain

## 9. Required test layers

Noma uses a broad test pyramid with many fast deterministic tests, fewer real-boundary integration tests, and a focused set of high-value browser and operational tests.

```text
                    Controlled live drills / pilot UAT
                End-to-end browser and operational journeys
             Provider sandbox / recovery / performance / DAST
          API, module, database, queue, adapter contract tests
       Component, authorization matrix, state and property tests
    Static analysis, schemas, lint, types, unit and pure-domain tests
```

No layer replaces another. In particular:

- unit tests do not prove SQL locking;
- integration tests do not prove accessible interaction;
- browser tests do not exhaust financial invariants;
- provider sandbox tests do not prove local reconciliation;
- automated accessibility tests do not prove WCAG conformance;
- code coverage does not prove correct assertions; and
- UAT does not replace security or concurrency tests.

## 10. Testing toolchain

The pilot SHOULD use the following stable, pinned tools:

| Purpose | Primary tool | Rule |
|---|---|---|
| TypeScript unit/integration runner | Vitest | shared config, deterministic environment, V8 coverage |
| DOM/component tests | Testing Library + Vitest | query by role/name; test behaviour, not internal markup |
| NestJS HTTP integration | Supertest or equivalent HTTP client | start the real Nest application with production middleware |
| PostgreSQL/Redis integration | Testcontainers for Node.js | pinned PostgreSQL and Redis-compatible images |
| Property/model tests | fast-check | fixed/reported seeds; shrinking artefacts retained |
| Browser/E2E | Playwright Test | isolated browser context, traces on first retry, HTML/JUnit results |
| Accessibility automation | `@axe-core/playwright` and axe-core | run in rendered states; manual evaluation remains required |
| Performance/load | Grafana k6 | thresholds encoded as test failures |
| Browser performance diagnostics | Lighthouse CI or scripted Lighthouse | regression signal; not sole field-performance oracle |
| Dynamic security | OWASP ZAP Automation Framework | authenticated staging plans plus manual review |
| Static/dependency/secret security | repository-selected SAST, dependency, container, and secret scanners | fail according to Part 10 severity gates |
| API schema | OpenAPI generation/validation and breaking-change diff | generated spec is reviewed and tested |

Package versions MUST be pinned through the repository lockfile. Preview, beta, or unsupported releases MUST NOT enter the paid pilot without explicit review.

## 11. Repository test layout

Recommended layout:

```text
apps/
├── web/
│   ├── src/
│   └── tests/
│       ├── component/
│       ├── accessibility/
│       └── e2e-support/
├── api/
│   └── tests/
│       ├── integration/
│       ├── authorization/
│       └── contracts/
└── worker/
    └── tests/
        ├── jobs/
        ├── outbox/
        └── deadlines/

packages/
├── platform/src/modules/**/__tests__/
├── database/tests/
├── contracts/tests/
├── integrations/**/__tests__/
├── ui/**/__tests__/
└── testing/
    ├── builders/
    ├── fixtures/
    ├── scenarios/
    ├── simulators/
    ├── containers/
    ├── clocks/
    ├── authorization/
    ├── assertions/
    └── evidence/

tests/
├── e2e/
│   ├── p0/
│   ├── progressive/
│   └── smoke/
├── contracts/
├── performance/
├── security/
├── accessibility/
├── recovery/
└── uat/
```

Exact folder names may adapt to implementation conventions, but responsibilities may not disappear.

## 12. Test commands

The repository MUST expose stable commands similar to:

```text
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:component
pnpm test:integration
pnpm test:contracts
pnpm test:property
pnpm test:e2e:smoke
pnpm test:e2e:p0
pnpm test:a11y
pnpm test:security:static
pnpm test:security:dast
pnpm test:performance:smoke
pnpm test:performance:capacity
pnpm test:recovery
pnpm test:all
pnpm build
```

Commands MUST work from a clean checkout using documented prerequisites. A contributor must not need private unrecorded setup steps.

---

# Part C — Static verification and unit testing

## 13. Static verification

Every pull request MUST run:

- formatting verification;
- ESLint or approved lint rules;
- TypeScript strict type checking;
- forbidden-import/module-boundary checks;
- generated-contract drift detection;
- Prisma schema validation and migration checks;
- secret scanning;
- dependency review;
- production build for affected applications; and
- checks that no focused/skipped test (`.only`, unauthorised `.skip`) enters protected branches.

Generated code may be excluded from lint/coverage only through explicit configuration.

## 14. Pure domain unit tests

Unit tests MUST cover pure rules including:

- value-object validation;
- money arithmetic in integer minor units;
- price, discount, fee, allocation, and refund calculations;
- delivery-tier and promise eligibility;
- category and product-policy decisions;
- verification scoring and duplicate-resolution rules;
- seller, rider, and feature eligibility;
- cancellation consequences;
- seller earning eligibility;
- deadline calculation from versioned policy;
- safe public-status mapping;
- redaction and field-projection policy;
- notification obligation creation;
- search ranking factors that are deterministic; and
- risk/approval threshold rules that do not make prohibited autonomous decisions.

Tests SHOULD use table-driven cases for policy matrices and explicit boundary values.

## 15. State-transition unit tests

For all 42 machines in `docs/08-state-machines.md`, unit tests MUST cover:

1. every permitted source state and command/event;
2. every target state;
3. every forbidden source state for each command;
4. capability, scope, institution, assurance, feature, capacity, risk, and approval guards;
5. deadline values immediately before, at, and after expiry;
6. safe repeated-command behaviour;
7. side-effect intent construction;
8. audit and outbox event intent;
9. reversal/compensation paths;
10. unknown provider-state handling;
11. terminal-state rejection; and
12. truthful safe result/error mapping.

A new state or transition cannot merge until its transition-table tests and documentation change in the same pull request.

## 16. Authorization-policy unit tests

Policy functions MUST test:

- role/capability presence and absence;
- active, expired, suspended, and revoked memberships;
- resource ownership and institution scope;
- seller-owner versus seller-operator capability differences;
- Support, Operations, Finance, Trust and Safety, Access Admin, Platform Admin, Security Admin, and Super Admin separation;
- maker-checker self-approval denial;
- recent-authentication and MFA requirements;
- emergency pause and incident containment;
- field-level projections;
- export permissions;
- temporary access expiry; and
- service-principal scope.

A broad `ADMIN` success test is insufficient.

## 17. Cryptography and security-helper unit tests

Tests MUST cover:

- Argon2id wrapper configuration and rehash detection;
- token generation and one-way storage;
- OTP/PIN hashing and constant-time comparison where applicable;
- key-version metadata;
- authenticated-encryption encrypt/decrypt/tamper failure;
- redaction of passwords, OTPs, tokens, bank details, evidence, and provider secrets;
- CSP/security-header configuration builders;
- webhook signature verification;
- signed file-access policy; and
- secure random source failure handling.

Tests must never print secret values into reports.

## 18. Unit-test isolation

Pure unit tests MUST NOT require:

- PostgreSQL;
- Redis;
- network calls;
- provider SDKs;
- wall-clock time;
- uncontrolled randomness; or
- production environment variables.

Use injected clocks, ID generators, random sources, and provider ports.

---

# Part D — Component and frontend testing

## 19. Component tests

Reusable components in `packages/ui` MUST test the applicable:

- approved variants;
- default, loading, empty, error, disabled, processing, success, stale, restricted, and offline states;
- long titles, large naira values, missing images, and translated/expanded content;
- keyboard activation and focus movement;
- accessible name, role, description, error, and status announcements;
- destructive confirmation and cancellation;
- pointer and touch interaction;
- reduced motion;
- high-contrast compatibility;
- responsive layout behaviour; and
- prohibited state combinations.

Snapshot-only tests are prohibited for interactive components.

## 20. Page and route tests

Page-level tests SHOULD prove:

- correct surface and layout;
- route capability gating;
- feature-gated navigation absence;
- actor-specific field projection;
- safe deep-link denial;
- loading, empty, stale, failure, and retry behaviour;
- truthful provider/payment/refund/payout language;
- preserved original promise after ETA changes;
- form validation and duplicate-submit prevention;
- query/filter URL state where applicable;
- notification deep links; and
- no deferred route or action appears because an enum exists.

## 21. Visual-regression testing

Critical pages and components SHOULD have deterministic screenshot coverage for:

- Marketplace search/product/offer comparison;
- cart and multi-vendor checkout;
- payment verifying/uncertain/failure states;
- Buyer Parent Order and item-level refund states;
- Seller Vendor Order and preparation states;
- Rider online/offline, scan, custody, and failed-handoff states;
- Operations queues, cases, Finance details, and emergency controls;
- dialogs for destructive and maker-checker actions; and
- accessibility states such as visible focus, 200% zoom, and high contrast where the tooling supports it.

Visual baselines MUST use fixed fonts, viewport, locale, time, data, and animations. Baseline updates require human review; “update all snapshots” without inspection is prohibited.

## 22. Responsive viewport matrix

Automated component/E2E coverage MUST include at least:

| Profile | Representative viewport | Primary surfaces |
|---|---:|---|
| Narrow mobile | 360 × 800 | Marketplace, Buyer Account |
| Large mobile | 412 × 915 | Marketplace, Buyer, Seller quick actions |
| Tablet portrait | 768 × 1024 | Rider, Seller, Operations secondary use |
| Tablet landscape | 1024 × 768 | Rider, Operations, Seller |
| Laptop | 1366 × 768 | Seller, Operations, Admin |
| Wide desktop | 1440 × 900 or larger | Operations, Finance, Trust and Safety |

Content must remain usable at 200% browser zoom and reflow at 320 CSS pixels where the WCAG requirement applies.

## 23. Browser matrix

Before the closed pilot:

- Chromium is the full E2E reference browser;
- Firefox runs the P0 smoke and accessibility-critical suite;
- WebKit runs the P0 buyer, authentication, checkout, payment-status, and critical form suite;
- Android Chrome receives manual and automated responsive/PWA validation;
- installed Rider PWA behaviour is tested on the approved pilot tablet/browser combination.

A browser-specific defect affecting a P0 journey is a release blocker until fixed or the unsupported browser is clearly and validly excluded from the pilot support policy.

## 24. PWA and offline tests

Rider PWA tests MUST cover:

- valid manifest and installability prerequisites;
- service-worker update and cache-version behaviour;
- first-load online requirement where applicable;
- cached assignment visibility;
- online/offline indicator accuracy;
- safe local draft creation;
- queued safe action resubmission;
- conflict when assignment changes while offline;
- no offline final payment, pickup, delivery, payout, or high-risk decision without approved protocol;
- cache clearing on logout/revocation;
- private-data minimisation on shared devices; and
- recovery after browser/process/device restart.

Offline simulation must not bypass server authorization or one-time credential checks.

---

# Part E — Database and module integration testing

## 25. Real infrastructure requirement

Database and queue integration tests MUST use:

- a real supported PostgreSQL version compatible with production;
- the real Prisma schema and migrations;
- real database constraints, transactions, isolation, row locks, indexes, and SQL;
- a real Redis-compatible instance for BullMQ where queue semantics are tested; and
- the same environment/config validation used by production runtimes.

Testcontainers for Node.js is the preferred local/CI mechanism. Shared CI services MAY be used when isolation and cleanup remain reliable.

## 26. Migration tests

Every schema change MUST prove:

1. clean database migration from zero;
2. upgrade from the latest production/staging schema snapshot;
3. compatibility with the previous application version where expand/migrate/contract requires it;
4. constraints and indexes exist as designed;
5. backfills are idempotent and resumable;
6. representative production-scale data does not cause unacceptable locks or duration;
7. rollback or forward-fix procedure is documented;
8. Prisma client generation succeeds;
9. seed/test fixtures remain valid; and
10. no destructive reset command can target production.

Applied migration files MUST NOT be edited.

## 27. Database constraint tests

Tests MUST intentionally violate and confirm rejection of:

- duplicate active institution identifiers;
- duplicate provider event identities;
- duplicate active idempotency keys;
- invalid quantities and negative monetary values where prohibited;
- unbalanced ledger postings;
- allocations exceeding source value;
- refunds exceeding refundable value;
- reservations exceeding available stock;
- duplicate active package custody;
- duplicate one-time credential consumption;
- multiple active payout-account records where policy forbids it;
- feature-gated entities created outside enabled scope;
- invalid tenant/seller relationships; and
- prohibited deletion/update of append-only records.

## 28. Repository integration tests

Each owning repository must test:

- scoped retrieval;
- actor-specific field projection;
- expected-state/version update predicates;
- not-found versus forbidden information safety;
- transaction participation;
- lock acquisition;
- pagination/order stability;
- index-supported query plans for critical queues; and
- soft-delete/retention behaviour specific to the entity.

## 29. Module integration tests

Module tests start the actual application service with real repositories and controlled ports. They MUST cover:

- command authorization;
- current-state guard;
- persistence effects;
- audit record;
- outbox event;
- idempotency response replay;
- conflict result;
- notification/work-item obligation;
- safe error contract; and
- no direct write into another module's tables.

## 30. Transactional outbox tests

Tests MUST prove:

1. state change and outbox intent commit atomically;
2. rollback leaves neither authoritative change nor event;
3. publisher retries after Redis outage;
4. duplicate publication is harmless to consumers;
5. out-of-order events are handled by event/version logic;
6. consumer restart resumes safely;
7. poison events enter a visible dead-letter/attention path;
8. replay rebuilds projections without duplicating value movement;
9. retention does not remove events required for recovery before policy permits; and
10. monitoring detects stalled publication.

## 31. Worker and deadline tests

Worker tests MUST cover:

- due/not-due boundary;
- persisted policy version;
- operating-hours pause rules where applicable;
- lease acquisition and expiry;
- duplicate job delivery;
- job retry after process death;
- expected-state revalidation;
- revoked capability/feature/pause revalidation;
- safe no-op when already completed;
- dead-letter and escalation;
- clock skew tolerance; and
- metrics/audit/outbox behaviour.

A worker must call the same application command used by API/admin flows rather than duplicating state rules.

## 32. Projection tests

Search, dashboard, balance, queue, and order-progress projections MUST prove:

- duplicate event handling;
- out-of-order event handling;
- rebuild from authoritative records;
- stale-version rejection;
- delayed-event convergence;
- no projection value used to approve protected commands;
- correct privacy/field projection; and
- visible stale/rebuilding behaviour where required.

---

# Part F — API, event, job, and contract testing

## 33. OpenAPI contract tests

Every supported API route MUST be represented in the generated OpenAPI specification with:

- method and path;
- authentication requirement;
- request schema;
- response schema;
- stable error codes;
- pagination/filter behaviour;
- idempotency header where required;
- public-safe state vocabulary;
- example payloads without secrets; and
- deprecation/version metadata where applicable.

CI MUST:

1. generate the specification;
2. fail on uncommitted drift;
3. validate the specification;
4. compare protected branches for unapproved breaking changes;
5. generate or validate the typed Web client; and
6. run representative request/response conformance tests.

## 34. API behaviour tests

HTTP integration tests MUST start the real NestJS application and production middleware. They must test:

- authentication and session cookies;
- CSRF and CORS behaviour;
- rate limits;
- validation and unknown-field rejection;
- mass-assignment protection;
- authorization and resource scope;
- feature/capacity/emergency gates;
- expected-state/version conflict;
- idempotency key behaviour;
- stable error body and correlation ID;
- safe not-found/forbidden distinction;
- audit/metrics/outbox effects; and
- response redaction.

Direct controller method calls are not sufficient API tests.

## 35. Authorization matrix tests

`packages/testing/authorization` MUST provide a generated or table-driven matrix covering:

```text
actor template
membership state
institution scope
seller/resource scope
capability
authentication assurance
feature state
business state
action
expected allow/deny
expected field visibility
expected audit/security event
```

The suite must include:

- every protected API family;
- positive cases;
- negative horizontal IDOR cases;
- negative vertical privilege cases;
- cross-institution cases;
- cross-seller cases;
- revoked/expired/stale-session cases;
- maker-checker conflict cases;
- service-principal cases; and
- direct-route/API attempts after navigation removal.

## 36. Event-contract tests

Every domain/outbox event MUST have:

- stable event name;
- event ID;
- aggregate ID and version/sequence;
- occurred time;
- schema version;
- institution/scope where required;
- minimum payload;
- privacy classification; and
- compatibility rules.

Tests MUST prove:

- current producer payload validates;
- each consumer accepts current and supported prior versions;
- unknown optional fields do not break tolerant readers;
- missing required fields fail visibly;
- event upcasters/migrations are tested where used;
- sensitive fields are absent; and
- replay remains idempotent.

## 37. Job-contract tests

Every BullMQ job type MUST define and test:

- stable job name;
- schema version;
- payload validation;
- idempotency identity;
- retry classification;
- backoff policy;
- maximum attempts;
- timeout;
- dead-letter/attention behaviour;
- privacy classification; and
- compatibility after deployment rollback.

A job payload must contain identifiers and required facts, not whole sensitive database records.

## 38. Provider-port contract suites

Every provider-neutral port MUST have one reusable contract suite executed against:

1. the deterministic simulator; and
2. the concrete provider adapter in sandbox/test where available.

The suite tests:

- valid request mapping;
- stable internal result mapping;
- known provider statuses;
- unknown provider statuses;
- timeouts and uncertainty;
- idempotency/reference reuse;
- authentication/signature behaviour;
- data minimisation/redaction;
- disabled/misconfigured environment failure; and
- retry/reconciliation metadata.

Provider SDK objects must not leak into application contracts.

---

# Part G — Property-based, model-based, and concurrency testing

## 39. Property-testing policy

Property-based tests are required where examples cannot reasonably cover the input or sequence space.

Each property test MUST:

- state the invariant in business language;
- use constrained generators representing valid and invalid domain inputs;
- record the random seed and shrink path on failure;
- permit deterministic reproduction;
- use a bounded run count appropriate to CI;
- run a larger campaign nightly for P0 invariants; and
- convert discovered counterexamples into permanent regression tests when material.

## 40. Financial properties

Generated tests MUST prove:

1. every posted journal entry balances debits and credits;
2. sum of payment allocations equals the allocatable payment amount;
3. item/vendor/delivery/platform allocation never creates or destroys value;
4. total refunds never exceed refundable value;
5. refund reversals preserve balanced history;
6. seller earnings never exceed supported net entitlement;
7. available + pending + held + reserve + processing + paid/other defined buckets reconcile to ledger evidence;
8. a payout debit occurs once for one successful payout;
9. failed/reversed/uncertain attempts do not duplicate value restoration;
10. rounding in integer minor units is deterministic and fully allocated; and
11. manual adjustments require balanced, authorised, auditable postings.

## 41. Inventory properties

Generated tests MUST prove:

- on-hand, reserved, available, quarantined, damaged, and other defined quantities remain non-negative;
- active reservation quantity never exceeds eligible available stock;
- reservation commit/release/expiry is idempotent;
- one unit cannot belong to two active buyers/orders;
- cancellation and refund do not automatically restore stock without a valid physical/inventory event;
- FBN movements preserve source/destination quantity; and
- cycle-count adjustments are explicit rather than silent rewrites.

## 42. Order properties

Generated command sequences MUST prove:

- Parent Order summary is derived from Vendor Orders/items/fulfilments;
- one seller's failure does not cancel unaffected portions;
- one item quantity is not simultaneously delivered and cancelled/refunded beyond quantity;
- snapshots remain immutable after payment;
- substitutions preserve original and accepted replacement facts;
- order-level totals reconcile with item and financial records;
- terminal items reject unrelated transitions; and
- feature pauses prevent new obligations without falsifying in-flight outcomes.

## 43. Custody properties

Generated tests MUST prove:

- each package has exactly one current custodian or defined controlled-location state;
- custody event sequence is ordered and append-only;
- pickup requires the assigned/authorised actor and valid one-time credential;
- delivery credential is consumed once;
- delegate credential invalidates/replaces the prior recipient credential as designed;
- reassignment after pickup requires a custody transfer;
- failed handoff does not become delivery;
- return-to-custody preserves chain of custody; and
- lost/damaged incidents do not silently delete the last known custodian.

## 44. State model tests

For high-risk machines, fast-check model-based tests SHOULD generate command sequences against a reference model and the application service.

Required candidate machines:

- M09 Inventory Reservation;
- M10 Checkout Session;
- M11 Buyer Payment;
- M13 Vendor Order;
- M14 Order Item disposition;
- M17 Delivery Job;
- M19 Package Custody;
- M20 Handoff Credential;
- M24 Refund;
- M25 Seller Earning;
- M26 Financial Hold;
- M28 Withdrawal Request;
- M29 Transfer Attempt;
- M41 Feature Activation; and
- M42 Emergency Incident/Pause.

## 45. Concurrency harness

`packages/testing/concurrency` MUST support:

- coordinated barriers/latches;
- parallel HTTP and application commands;
- separate database connections/transactions;
- deterministic delay/fault injection;
- expected conflict classification;
- deadlock retry verification;
- final-state/ledger/custody assertions; and
- repeat campaigns.

Sleep-only race tests are prohibited where a barrier can create the interleaving directly.

## 46. Required concurrency scenarios

Before closed-pilot launch, tests MUST prove at least:

1. two buyers race for the final stock unit;
2. reservation expiry races payment confirmation;
3. browser payment return races payment webhook;
4. ten duplicate payment webhooks race one verification job;
5. successful payment arrives after local Checkout expiry;
6. one Vendor Order rejects while another accepts;
7. seller acceptance races buyer cancellation;
8. cancellation races parcel pickup;
9. two riders accept the same assignment offer;
10. reassignment races pickup;
11. pickup credential is submitted twice;
12. buyer and delegate credentials race at handoff;
13. delivery confirmation races failed-attempt recording;
14. two remedies try to refund the same item value;
15. refund submission races duplicate worker delivery;
16. hold release races refund liability placement;
17. two withdrawal requests reserve the same available earnings;
18. payout approval races payout-account revocation/change;
19. transfer timeout reconciliation races a late success webhook;
20. transfer reversal races payout display/projection update;
21. role revocation races an in-flight privileged command;
22. emergency checkout pause races payment initialisation;
23. feature pause races new progressive-entity creation;
24. outbox publication races worker restart; and
25. projection rebuild races live events.

Final assertions must inspect authoritative database state, ledger postings, custody history, idempotency records, audit, and outbox—not only HTTP responses.

---

# Part H — Provider simulation, sandbox, and failure injection

## 47. Deterministic provider simulators

Local and CI simulators MUST implement the same ports as production adapters and support scripted outcomes.

Required simulator families:

- payment;
- refund;
- bank list/account resolution;
- transfer recipient;
- transfer;
- email;
- object storage;
- web push;
- telemetry/analytics availability;
- maps/SMS disabled state; and
- partner-logistics/manual adapter where applicable.

Each test can specify a scenario such as:

```ts
providerScenario.payment("PAY-001")
  .initialiseAccepted()
  .verificationPending(2)
  .webhook("charge.success", { duplicate: 3, beforeResponse: true })
  .verifySucceeded({ amountMinor: 1320000, currency: "NGN" });
```

Simulators must be deterministic, inspectable, resettable, and unable to contact production.

## 48. Required payment simulations

Tests MUST cover:

- successful initialisation and verification;
- abandoned customer payment;
- provider-declined payment;
- processing/pending payment;
- wrong amount;
- wrong currency;
- wrong internal/provider reference;
- callback before webhook;
- webhook before callback;
- webhook before initialisation response persistence;
- duplicate event;
- out-of-order event;
- forged signature;
- unknown event type;
- provider timeout before acceptance;
- provider acceptance followed by Noma timeout;
- payment after Checkout expiry;
- successful payment while checkout/feature is paused; and
- reconciliation recovery from paid-but-unconfirmed state.

## 49. Required refund simulations

Tests MUST cover:

- full refund;
- partial refund;
- multiple partial refunds within remaining value;
- attempted over-refund;
- provider accepted/processing/completed;
- provider failed;
- needs-attention;
- timeout/unknown result;
- duplicate submission worker;
- duplicate/out-of-order final webhooks;
- refund after seller earning release;
- refund liability against reserve/future earnings; and
- reversal/correction without deleting history.

## 50. Required transfer simulations

Tests MUST cover:

- account resolution success and mismatch;
- recipient creation and stable reuse;
- transfer initiation accepted;
- OTP-required state where provider account configuration uses it;
- processing;
- success;
- failure;
- reversal;
- timeout before/after provider acceptance;
- duplicate initiation attempt with same reference;
- late final webhook;
- uncertain state and reconciliation;
- safe retry only after confirmed non-payment; and
- provider success after local process crash.

## 51. Required file-storage simulations

Tests MUST cover:

- valid presigned upload;
- expired upload intent;
- wrong object key/owner;
- oversized file;
- MIME/header mismatch;
- file-signature mismatch;
- disallowed extension/type;
- malware/quarantine rejection;
- incomplete multipart/upload;
- missing object after metadata creation;
- signed download expiry;
- unauthorised download;
- public-access policy failure;
- derivative processing failure; and
- deletion/legal-hold conflict.

## 52. Required email and notification simulations

Tests MUST cover:

- accepted;
- delivered;
- delayed;
- bounced;
- complained;
- suppressed;
- provider unavailable;
- template/render failure;
- invalid recipient;
- duplicate notification obligation;
- security recipient suppressed with operational escalation;
- optional channel disabled; and
- in-app source of truth preserved despite external failure.

## 53. Cross-provider failure injection

At minimum, the suite MUST reproduce:

1. provider returns `500` before receiving request;
2. provider accepts request but Noma times out;
3. webhook arrives before outbound response is persisted;
4. duplicate webhook arrives ten times;
5. final events arrive out of order;
6. Worker dies after provider success but before local transition;
7. database commit fails before a provider call is scheduled;
8. queue is unavailable after outbox commit;
9. API restarts during callback/webhook processing;
10. payment succeeds after local expiry;
11. refund remains uncertain beyond expected duration;
12. transfer succeeds and later reverses;
13. email provider suppresses a security recipient;
14. S3 upload has wrong signature/content;
15. observability provider is unavailable; and
16. production credential is configured in staging and fails closed.

## 54. Provider sandbox contract tests

Against official test/sandbox systems where supported, Noma MUST verify:

- payment initialisation and server verification;
- authenticated webhook processing;
- mismatch rejection;
- full and partial refund lifecycle;
- account resolution;
- transfer recipient and transfer lifecycle;
- presigned upload/download/expiry;
- email send and event handling;
- telemetry/analytics ingestion with redaction; and
- test/live environment isolation.

Sandbox tests run on schedule and before provider-impacting releases. They must not use production credentials.

## 55. Controlled live drills

Before the closed pilot, authorised small-value live drills MUST test:

- buyer payment and order confirmation;
- partial or full refund;
- payout-account resolution;
- transfer recipient creation;
- withdrawal approval and transfer;
- transfer final event;
- transactional email delivery;
- private file upload/access;
- monitoring alert; and
- database backup/restoration.

Each drill records:

```text
drill ID
owner and approvers
purpose and Journey/Machine IDs
maximum value/exposure
production records/references
expected events and ledger entries
start/end time
observability links
actual result
reconciliation result
cleanup/exclusion from commercial analytics
incidents/deviations
sign-off
```

A controlled live drill never uses a real customer without explicit approved participation.

---

# Part I — End-to-end browser and journey testing

## 56. E2E principles

Playwright E2E tests MUST:

- use public UI and supported API setup helpers rather than direct state mutation for the journey under test;
- create data through approved builders or setup APIs;
- use role/name locators and accessible semantics;
- avoid fixed sleeps;
- wait for authoritative UI state rather than provider callback assumptions;
- preserve traces, screenshots, video, console, network, and server correlation on failure;
- assert database/provider truth through controlled test inspection only where necessary;
- clean up or isolate data by run ID; and
- avoid testing third-party webpages beyond Noma's controlled boundary.

## 57. P0 journey coverage

Every active P0 journey from `docs/03-user-journeys.md` MUST have:

1. one happy-path E2E test;
2. each material exception path at an appropriate lower or E2E layer;
3. negative permission/state tests;
4. truthful loading/processing/uncertain/error states;
5. audit and Operations visibility evidence; and
6. test traceability to Journey and Machine IDs.

## 58. Minimum active end-to-end scenarios

Before the closed pilot, the automated and UAT suites together MUST validate at least:

1. guest discovery, cart, and Covenant verification gate;
2. account creation, email verification, and secure sign-in;
3. Covenant automatic verification and manual-review fallback;
4. verified Buyer search, filters, product comparison, and offer choice;
5. stale offer removed/requoted without losing unaffected cart items;
6. multi-vendor checkout and immutable quote review;
7. payment browser return remains verifying until provider evidence;
8. successful payment creates one Parent Order and correct Vendor Orders;
9. paid-but-unconfirmed payment enters reconciliation and recovers;
10. seller onboarding approval remains separate from activation;
11. seller listing, inventory update, moderation, and publication;
12. seller acceptance/preparation/ready handoff;
13. one seller rejection while unaffected Vendor Orders continue;
14. lifecycle-based buyer cancellation with preview and partial refund;
15. dispatch recommendation, manual override, and assignment;
16. secure pickup with one-time QR and custody event;
17. Buyer delivery with one-time PIN/QR;
18. delegate approval and credential replacement;
19. failed handoff with evidence and return to controlled custody;
20. in-app product/order messaging without contact/payment bypass;
21. buyer-approved and expired substitution;
22. structured return/dispute evidence and human decision;
23. physical return and inspection where required;
24. partial refund approved, submitted, processing, and completed;
25. verified-purchase review and moderation;
26. seller pending-to-available earning release;
27. payout-account change, cooling, withdrawal, Finance approval, transfer finality;
28. seller restriction/suspension with safe continuity for active obligations;
29. appeal that reverses connected metrics/restrictions correctly;
30. emergency checkout/payout pause and independently approved restart;
31. revoked privileged/rider role loses navigation and direct API access;
32. private evidence cannot be accessed by another actor or expired link; and
33. Operations can identify and own every configured stuck P0 state.

## 59. Progressive-feature E2E gates

Before first activation, each progressive capability requires its scoped E2E and UAT suite:

### Food

- outlet/menu/hours/availability;
- seller acceptance/rejection timeout;
- preparation and ready state;
- approved substitution;
- food-specific cancellation/refund;
- separate urgent fulfilment;
- failed handoff/perishable remedy;
- outlet capacity and pause.

### External Vendor

- invite-only activation;
- off-campus promise;
- inbound shipment/receipt/discrepancy;
- custody boundary;
- campus last-mile continuity;
- delay/cancellation/recovery.

### FBN

- SKU enrolment;
- inbound plan;
- receiving/discrepancy;
- putaway/bin movement;
- reservation/pick/pack;
- rider custody;
- return/quarantine;
- cycle count;
- physical-site and capacity gate.

### Pre-Owned

- actual-unit photos;
- category condition report;
- defect disclosure;
- ownership declaration;
- serial/IMEI privacy foundation;
- unit-specific reservation;
- stronger handoff evidence;
- return exact-unit check;
- no false Noma Verified badge.

### Priority and Saver

- tier availability/capacity;
- distinct promise/pricing;
- batch compatibility;
- priority not delayed by incompatible batch;
- promise miss and remedy;
- pause/rollback.

## 60. E2E environment

P0 E2E tests run against an ephemeral or isolated deployment with:

- isolated PostgreSQL schema/database;
- isolated Redis namespace/instance;
- deterministic providers by default;
- non-production file bucket/prefix;
- email sandbox/capture;
- fixed institution and location graph;
- seeded synthetic actors;
- environment-specific feature configuration; and
- no production credentials or customer data.

Staging provider-sandbox E2E runs are separate from deterministic CI runs.

## 61. Retry and trace policy

- Local and first CI run use no retries for unit/integration tests.
- Playwright MAY retry a failed E2E test once in CI to classify flakiness and collect a trace.
- A test that passes only on retry is marked **flaky**, creates/links a defect, and cannot count as clean P0 evidence.
- P0 tests cannot remain quarantined for release.
- Traces are retained on first retry/failure and redacted of secrets.
- Repeated flaky tests trigger merge/release blocking according to Section 112.

---

# Part J — Accessibility testing

## 62. Accessibility target

All active Noma web surfaces target **WCAG 2.2 Level AA**.

Automated tools detect only part of accessibility conformance. Noma therefore requires both automated testing and human evaluation.

## 63. Automated accessibility tests

Automated axe-core checks MUST run on the rendered critical states of:

- public Marketplace home/search/category/product/store;
- sign-up, sign-in, verification, recovery, and MFA;
- cart and checkout;
- payment verifying/uncertain/failure;
- Buyer order, cancellation, case, refund, review, and account settings;
- Seller dashboard/listing/inventory/order/earnings/payout;
- Rider shift/assignment/pickup/delivery/failed attempt/offline;
- Operations queues/order/delivery/case/Finance/Trust workspaces; and
- Admin access, feature, emergency, and approval pages.

Tests must activate dialogs, menus, tabs, errors, expandable evidence, and other hidden states before analysis.

No unreviewed `disableRules` configuration is permitted.

## 64. Keyboard testing

Human or automated keyboard testing MUST verify:

- logical focus order;
- visible focus not obscured;
- skip links/landmarks;
- no keyboard trap;
- menus, tabs, dialogs, comboboxes, tables, disclosures, and date/time controls;
- Enter/Space/Escape/Arrow behaviour where expected;
- focus restoration after dialogs and route actions;
- validation error focus and summary;
- destructive confirmation safety;
- no drag-only function;
- Rider fallback actions; and
- emergency controls without pointer dependency.

## 65. Screen-reader testing

Pilot manual coverage MUST include at minimum:

- NVDA with Firefox or Chrome on Windows for P0 desktop flows;
- TalkBack with Chrome on Android for key Buyer and Rider/tablet flows; and
- VoiceOver with Safari spot checks for Buyer authentication, checkout, status, and forms before broad public expansion.

Tests verify:

- page title and heading hierarchy;
- landmarks;
- control names, roles, values, and descriptions;
- table headers and dense Operations content;
- errors and help;
- asynchronous status announcements;
- progress and timelines;
- loading/processing/uncertain completion;
- modal focus; and
- privacy-safe status wording.

## 66. Visual accessibility tests

Tests MUST cover:

- normal and high-contrast modes;
- text/non-text contrast;
- 200% zoom;
- 400% text zoom where applicable;
- 320 CSS pixel reflow;
- text spacing override;
- reduced-motion preference;
- large naira values and long content;
- focus visibility;
- target size; and
- colour-independent meaning.

## 67. Accessible authentication and security flows

Authentication, verification, MFA, consent, recovery, data-rights, and incident/security notifications MUST be tested for:

- labelled instructions;
- accessible authentication without prohibited cognitive puzzles;
- paste/password-manager support;
- no forced re-entry of already supplied information unless necessary;
- clear error prevention and recovery;
- time-limit warnings/extensions where applicable;
- privacy-safe errors; and
- accessible alternative path to Support/manual review.

## 68. Accessibility release rules

A release is blocked by:

- any known Critical/Serious automated violation on a P0 route;
- keyboard trap;
- inaccessible primary action;
- missing accessible name for a material control;
- screen-reader status that falsely reports payment/refund/payout/delivery completion;
- focus loss that prevents completion;
- unreadable critical text at required zoom/reflow; or
- no accessible route for verification, checkout, Support, or protected remedy.

Medium issues require an owner and approved remediation date. Automated zero violations do not equal conformance.

---

# Part K — Performance, capacity, and resilience testing

## 69. Performance objectives

Performance tests protect both user experience and operational correctness. They must not optimise throughput by weakening authorization, transactions, evidence, audits, or provider verification.

## 70. Core Web Vitals budgets

For field data, Noma targets the current recommended “good” thresholds at the 75th percentile, measured separately for mobile and desktop:

| Metric | Budget |
|---|---:|
| Largest Contentful Paint (LCP) | `<= 2.5 s` |
| Interaction to Next Paint (INP) | `<= 200 ms` |
| Cumulative Layout Shift (CLS) | `<= 0.10` |

Before sufficient field data exists, lab tests and synthetic measurements act as regression gates, not a guarantee of field outcomes.

## 71. Web page budgets

Under the agreed pilot mobile lab profile, the following SHOULD pass:

| Surface | Lab target |
|---|---|
| Marketplace home/search/product | LCP `<= 3.0 s`, no critical layout shift |
| Cart/checkout review | actionable content `<= 3.0 s` excluding provider page |
| Buyer order/status | primary status `<= 2.5 s` |
| Seller order queue/detail | primary work content `<= 2.5 s` on laptop/tablet |
| Rider current assignment | cached/online primary action `<= 2.0 s` after shell load |
| Operations critical queue | first useful rows `<= 3.0 s` under pilot data volume |

Budgets must be measured with realistic images, data volume, JavaScript, and network conditions.

## 72. API latency budgets

Under the configured average pilot load, excluding unavoidable third-party latency where explicitly separated:

| API class | p95 | p99 |
|---|---:|---:|
| public catalogue read | `<= 500 ms` | `<= 1,000 ms` |
| search/filter | `<= 800 ms` | `<= 1,500 ms` |
| authenticated ordinary query | `<= 600 ms` | `<= 1,200 ms` |
| cart mutation | `<= 500 ms` | `<= 1,000 ms` |
| checkout validation/quote | `<= 1,200 ms` | `<= 2,000 ms` |
| seller/rider ordinary command | `<= 750 ms` | `<= 1,500 ms` |
| Operations queue/detail | `<= 1,000 ms` | `<= 2,000 ms` |
| provider-independent protected command | `<= 1,000 ms` | `<= 2,000 ms` |

Internal HTTP 5xx rate SHOULD remain below `1%` and P0 command integrity errors must be zero in a passing test.

## 73. Queue and event budgets

Under ordinary pilot load:

| Measure | Target |
|---|---:|
| transactional outbox unpublished age p95 | `<= 5 s` |
| ordinary async job queue wait p95 | `<= 10 s` |
| payment/refund/transfer webhook local durable acknowledgement | `<= 2 s` when dependencies are healthy |
| provider event to local projected status p95 | `<= 15 s` |
| security/critical operational alert dispatch p95 | `<= 60 s` |
| stuck-work detection | within configured deadline-monitor interval |

These targets may be tightened in `docs/13-covenant-pilot-readiness.md` after baseline tests.

## 74. Database budgets

Tests and monitoring MUST identify:

- p95/p99 query latency;
- slow queries;
- sequential scans on critical bounded queries where an index is expected;
- lock wait and deadlock count;
- connection pool saturation;
- long transactions;
- migration duration;
- projection rebuild time; and
- backup/restore throughput.

Critical queue/detail queries SHOULD remain below `500 ms` at representative pilot data volume. Exceptions require query-plan evidence and owner.

## 75. Capacity model

Before load testing, Part 13 will configure the expected pilot peak for:

```text
active buyers per operating window
searches per minute
checkout starts per minute
payments/provider events per minute
seller commands per minute
concurrent deliveries/rider commands
Operations queue users
messages/uploads per minute
refunds/withdrawals per day
catalogue/order/ledger data volume
```

Performance tests MUST run at:

- **smoke:** one/few users, every PR for critical endpoints;
- **average load:** expected configured peak for at least 15 minutes;
- **headroom:** at least 2× configured peak for 30 minutes;
- **spike:** at least 3× peak for 5–10 minutes;
- **soak:** expected peak or representative mixed load for at least 2 hours before paid launch;
- **stress/breakpoint:** controlled test to understand degradation, not a routine PR gate.

Exact virtual-user counts come from the pilot capacity plan, not arbitrary internet-scale claims.

## 76. Performance scenarios

k6 suites MUST include:

- browse/search/product detail;
- cart mutations;
- checkout quote and reservation;
- payment-status polling/retrieval without duplicate order creation;
- seller order queue and accept/prepare commands;
- Rider assignment retrieval and scan/status commands;
- Operations queue/filter/detail;
- webhook burst and deduplication;
- outbox/worker backlog recovery;
- file upload intent/metadata flow; and
- authentication/rate-limit behaviour.

Money-moving provider calls use simulators during load unless an explicitly approved provider test permits otherwise.

## 77. Resource and cost budgets

Tests monitor:

- Web/API/Worker CPU and memory;
- database CPU/storage/IO/connections;
- Redis memory/latency;
- queue backlog;
- object-storage request/transfer volume;
- provider call rate;
- log/trace/analytics volume; and
- estimated cost at configured pilot capacity.

A performance improvement that creates unbounded provider or observability cost fails review.

## 78. Degraded-mode tests

Tests MUST verify safe behaviour when:

| Dependency | Required test outcome |
|---|---|
| PostgreSQL unavailable | authoritative writes stop; controlled outage/read-only only where safe |
| Redis unavailable | committed outbox remains; queue-dependent promises pause; no lost obligation |
| Paystack unavailable | new payment initialisation disabled; confirmed orders remain valid |
| Email unavailable | obligations persist/retry; transactions do not reverse |
| S3 unavailable | new uploads blocked; incomplete evidence cannot be treated complete |
| Search stale/unavailable | browse/fallback as approved; checkout revalidates authoritative data |
| Observability unavailable | fallback alert/log and risk-based pause if blind operation unsafe |
| Maps unavailable | approved location graph/manual dispatch remains; no invented ETA |
| Web runtime unavailable | API/Worker integrity remains; controlled status/recovery |
| API unavailable | no client-side fabrication of success; safe retry/reference preserved |

## 79. Resilience and chaos tests

Staging or isolated environments SHOULD exercise:

- API/Worker restart during in-flight jobs;
- Redis restart and backlog recovery;
- database connection termination;
- network latency/timeouts;
- provider circuit breaker open/half-open;
- outbox publisher failure;
- dead-letter processing;
- object-storage interruption;
- observability outage;
- deployment rollback with compatible schema; and
- emergency pause during partial dependency failure.

Fault injection must not target live customer operations without an approved incident exercise.

---

# Part L — Security and privacy testing

## 80. Security test basis

Security tests map to:

- `security/threat-model.yml`;
- `security/risk-register.yml`;
- `security/asvs-matrix.yml`;
- OWASP ASVS 5.0 Level 2 plus selected higher-assurance controls from Part 10;
- provider and infrastructure boundaries; and
- all P0 actor/resource/state transitions.

## 81. CI security tests

Every protected branch MUST run the applicable:

- SAST/security lint;
- dependency vulnerability review;
- lockfile integrity;
- secret scanning;
- container/image scan where images are built;
- infrastructure/configuration validation;
- licence/policy review where configured;
- OpenAPI schema security checks; and
- production build with secure environment validation.

Critical findings block merge. High findings follow the Part 10 release rule and require owner/compensating control if not immediately fixed.

## 82. Authentication security tests

Tests MUST cover:

- password length and Unicode/passphrase behaviour;
- compromised-password rejection where implemented;
- Argon2id hash/rehash;
- email-verification expiry and replay;
- login enumeration resistance;
- rate limiting under shared campus NAT;
- session fixation and rotation;
- concurrent session revocation;
- password reset expiry, replay, and account notification;
- MFA enrolment, verification, recovery, removal, and bypass attempts;
- recent-authentication enforcement;
- trusted/stale device assumptions;
- logout/cache cleanup; and
- compromised account containment with active obligations.

## 83. Authorization and IDOR tests

Manual and automated tests MUST attempt:

- Buyer reading/changing another Buyer's cart/order/case;
- Seller reading another Seller's offer/order/earnings/payout;
- Rider acting on another Rider's assignment/package;
- Support performing Finance actions;
- Finance editing provider/payment truth;
- Operations granting itself Admin roles;
- Trust and Safety accessing unrelated bank evidence;
- Institution Admin crossing institution scope;
- revoked role using stale UI, deep link, API, token, or queued action;
- service principal using a human endpoint;
- guessed UUID/public reference access;
- mass assignment of protected fields; and
- export without scope/reason/recent authentication.

## 84. Browser security tests

Tests MUST cover:

- CSP and security headers;
- CSRF on state-changing cookie-authenticated requests;
- CORS explicit allowlist;
- XSS in listings, messages, reviews, evidence names, and admin content;
- open redirect;
- clickjacking/frame policy;
- sensitive caching;
- referrer leakage;
- cookie flags and scope;
- upload active content/SVG/HTML rejection;
- unsafe URL/link handling; and
- third-party script/consent boundaries.

## 85. API and webhook abuse tests

Tests MUST cover:

- schema bypass and oversized inputs;
- unknown fields/mass assignment;
- SQL/injection payloads;
- SSRF-relevant URLs/metadata;
- forged signatures;
- replayed provider events;
- duplicate idempotency keys with different payloads;
- rate-limit evasion;
- pagination/export abuse;
- provider event with wrong environment/reference/amount/currency;
- unsafe error detail; and
- timing/existence leaks where material.

## 86. File security tests

Tests MUST cover:

- extension/MIME/magic mismatch;
- polyglot or active content;
- decompression/resource abuse where relevant;
- malware test file in isolated scanner workflow;
- path/key traversal;
- overwrite of another actor's object;
- expired or replayed signed URL;
- public ACL/bucket-policy regression;
- unscanned object access;
- private evidence in CDN/public cache;
- filename/content-disposition injection;
- retention/legal hold/deletion; and
- unauthorised staff access audit.

## 87. Data protection and privacy tests

Tests MUST verify:

- data minimisation in forms and provider payloads;
- actor-specific API projection;
- consent and optional analytics gating;
- privacy notice/version acceptance where required;
- data access/correction/deletion/portability workflow;
- restriction/objection effects;
- identity-evidence deletion/minimisation;
- retention job and legal hold;
- backup re-deletion after restore;
- analytics/log redaction;
- no private message/evidence/bank data in telemetry;
- cross-border/provider configuration inventory; and
- safe public errors that do not disclose record existence.

## 88. DAST and manual security review

Before paid launch:

- OWASP ZAP Automation Framework runs against authenticated and unauthenticated staging scopes;
- active scanning excludes destructive endpoints unless configured with safe fixtures;
- results are triaged, deduplicated, and mapped to owners;
- a human reviews authentication, authorization, payment, payout, upload, export, and admin flows;
- abuse cases include phishing/social engineering, recovery, message bypass, and operator mistakes; and
- an independent penetration test or qualified external review is required before broad paid expansion.

## 89. Denial-of-service and abuse budgets

Tests MUST prove:

- endpoint-specific limits;
- per-account plus IP/device/session signals;
- shared campus NAT does not mass-lock legitimate users;
- OTP/email resend controls;
- upload count/size controls;
- search/message/review abuse controls;
- checkout/coupon/refund/withdrawal limits;
- expensive admin/export query controls;
- graceful `429`/cooldown messaging; and
- system remains observable under attack-like load.

## 90. Security release blockers

The paid pilot is blocked while any known issue can practically permit:

- account takeover;
- cross-user/seller/institution/role access;
- privileged operation without MFA/revocation/audit;
- forged or duplicate payment confirmation;
- unauthorised refund, ledger change, payout, or payout-account replacement;
- credential reuse for false pickup/delivery;
- public/private-file exposure;
- production secret/card/credential leakage;
- critical injection/XSS/SSRF;
- inability to detect/pause/respond; or
- unrecoverable material data loss.

---

# Part M — Backup, restore, migration, and recovery testing

## 91. Backup verification

Automated tests/monitoring MUST verify:

- backup job ran;
- expected scope was included;
- backup is encrypted;
- retention/lifecycle applies;
- failure alerts reach the owner;
- independent logical export schedule where required;
- object versioning/lifecycle appropriate to class; and
- credentials/runbook remain valid.

A backup success notification does not prove restore readiness.

## 92. Isolated restore drill

Before paid launch and periodically thereafter, Noma MUST:

1. create an isolated recovery environment;
2. restore PostgreSQL to a selected point;
3. apply/verify migrations;
4. restore or reconnect required object/config data;
5. start compatible API/Worker/Web components;
6. validate representative identities, memberships, products, offers, inventory, orders, payments, provider events, ledger, refunds, payouts, delivery/custody, cases, audit, and outbox;
7. reconcile financial totals;
8. verify one-time credentials and secrets are not incorrectly reusable;
9. apply deletion/legal-hold/re-deletion obligations;
10. measure recovery time and data loss against claimed targets;
11. document gaps; and
12. destroy the recovery environment safely.

## 93. Point-in-time recovery scenarios

Tests SHOULD include restoration to:

- immediately before an erroneous deployment/migration;
- immediately before a simulated bulk data corruption;
- a point with in-flight payment/provider events;
- a point with outbox backlog; and
- a point after a deletion request whose backup copy requires re-deletion handling.

## 94. Deployment rollback tests

Release candidates MUST prove:

- previous Web/API/Worker version can run against the expanded schema where promised;
- queue jobs/events are compatible across rolling deployment;
- feature activation remains separate from deployment;
- rollback does not replay money/custody effects;
- provider webhooks remain accepted during rollback;
- migrations are not destructively reversed; and
- forward-fix/restore decision is documented for incompatible failures.

## 95. Reconciliation recovery tests

Tests MUST recover from:

- payment succeeded but order not confirmed;
- order paid but allocation/ledger projection delayed;
- refund provider final but local state stale;
- transfer provider final but payout local state stale;
- provider reversal after apparent success;
- duplicate provider events;
- outbox event missing from queue but present in database;
- projection loss/rebuild;
- email/file notification obligation backlog; and
- restore with in-flight provider operations.

Reconciliation cannot fabricate provider finality.

## 96. Incident runbook exercises

Tabletop or technical exercises MUST cover at least:

- account takeover;
- privileged-account compromise;
- leaked provider/production secret;
- payout-account takeover;
- forged/duplicate payment event;
- personal-data breach;
- malicious file upload;
- cross-tenant exposure;
- database outage/data loss;
- payment/provider outage;
- lost operations device; and
- serious fraud/safety event.

Exercises record detection, owner, containment, evidence, decision clock, communication, recovery, restart approval, and lessons.

---

# Part N — Test data and fixture governance

## 97. Test-data principles

Test data MUST be:

- synthetic by default;
- deterministic and reproducible;
- realistic enough to exercise limits and layouts;
- classified and access-controlled;
- isolated by environment and test run;
- free of production secrets and unnecessary real personal data;
- traceable to a scenario/fixture version; and
- disposable without deleting authoritative production records.

## 98. Prohibition on production copies

Production databases, identity documents, bank information, messages, cases, evidence, analytics, or logs MUST NOT be copied into local, CI, preview, or ordinary staging environments.

A rare approved investigation dataset must be:

- necessary;
- authorised by Privacy/Security;
- minimised/de-identified;
- time-limited;
- access-restricted;
- logged; and
- deleted after use.

## 99. Synthetic personas

`packages/testing/fixtures/personas` MUST provide stable synthetic actors including:

- Guest;
- unverified account;
- verified Covenant Buyer;
- Covenant affiliation manual-review applicant;
- Student Vendor owner;
- Campus Store owner/operator;
- invited External Vendor;
- Noma Rider;
- CU Express Rider and Dispatcher;
- Support agent;
- Operations agent/dispatcher;
- Catalogue reviewer;
- FBN operator;
- Finance maker and checker;
- Trust and Safety investigator;
- Institution Admin;
- Access Admin;
- Security Admin;
- Platform/Super Admin with restricted use; and
- service principals for Worker/outbox/provider callbacks.

Each persona has explicit active, expired, suspended, and revoked variants where relevant.

## 100. Scenario datasets

Required reusable scenario families include:

```text
simple_product_order
multi_vendor_order
last_unit_inventory
preowned_unit
food_order
external_inbound_order
fbn_order
payment_uncertain
partial_vendor_failure
buyer_cancellation
failed_handoff
return_and_refund
seller_hold
payout_account_change
withdrawal_and_transfer
seller_enforcement_appeal
recall_incident
feature_pause
account_compromise
```

Scenarios must identify Journey IDs, Machine IDs, feature state, expected authoritative records, and cleanup.

## 101. Builders and factories

Builders SHOULD:

- produce valid objects by default;
- require explicit opt-in for privileged/sensitive states;
- expose named overrides;
- preserve relationship and tenant scope;
- create money in minor units;
- create realistic timestamps through an injected clock;
- create immutable snapshots distinctly from current product data; and
- refuse impossible state shortcuts unless a database-constraint test intentionally constructs them.

A generic unrestricted `createAnyRecord()` helper is prohibited.

## 102. Time control

Tests MUST use an injectable clock for:

- token/OTP expiry;
- reservation expiry;
- checkout/payment deadlines;
- seller acceptance/preparation;
- assignment/pickup/handoff windows;
- evidence/return/refund/payout deadlines;
- cooling periods;
- retention/deletion;
- feature reviews; and
- incident escalation.

The test clock must support exact instants, timezone-aware display assertions, and before/at/after boundary advancement without wall-clock sleeps.

## 103. Randomness and identifiers

Tests MUST inject or record:

- random seed;
- UUID generator;
- one-time token generator;
- public-reference generator; and
- property-test seed/shrink path.

Uniqueness tests still use genuine concurrent generation where the risk requires it.

## 104. Currency, locale, and timezone fixtures

The pilot uses:

- currency: `NGN`;
- money: integer kobo/minor units;
- business timezone: `Africa/Lagos` unless a specific UTC/provider event is being tested;
- database timestamps: UTC/timestamptz;
- realistic Nigerian names only as synthetic fixtures; and
- long prices, names, product titles, and institutional identifiers for layout/validation tests.

Tests must cover daylight/timezone conversion safely even though Nigeria does not currently observe daylight-saving time.

## 105. Provider payload fixtures

Provider fixtures MUST:

- come from documented/sandbox examples or captured authorised test events;
- remove secrets and real personal data;
- preserve exact raw-body bytes where signature tests require them;
- identify provider version/date/environment;
- include unknown/extra fields;
- include malformed and mismatched payloads; and
- be reviewed when provider contracts change.

## 106. File fixtures

The repository maintains small safe fixtures for:

- valid JPEG/PNG/WEBP;
- oversized metadata test without committing huge binaries;
- MIME/extension mismatch;
- truncated/corrupt image;
- EXIF/private metadata removal;
- duplicate image/hash;
- EICAR or scanner-approved harmless malware test string in isolated security suite;
- prohibited SVG/HTML/active content;
- QR/barcode test images; and
- pre-owned defect/evidence images generated for testing.

Never commit real identity documents or bank statements.

## 107. Data reset and cleanup

- Unit tests create no external state.
- Integration tests use isolated database/schema or transaction-safe cleanup.
- Concurrency tests must commit and then delete by run ID or destroy the container.
- E2E uses run-specific tenant/data prefixes.
- Sandbox/provider records are tagged with test references.
- Live-drill records are retained/audited according to financial and test policy, not deleted to hide them.
- Cleanup failure creates an operational/test defect.

---

# Part O — Coverage, mutation, flakiness, and test quality

## 108. Coverage policy

Coverage is a diagnostic and minimum guard, not the quality oracle.

Initial minimums:

| Scope | Lines/statements | Branches | Additional rule |
|---|---:|---:|---|
| all hand-written production TypeScript | `>= 80%` | `>= 75%` | no unexplained decline |
| critical domain/state/access/ledger/inventory/custody packages | `>= 90%` | `>= 90%` | every documented transition/invariant covered |
| changed lines in protected modules | `>= 90%` | review branches | generated/migration files separately reviewed |

Exclusions must be explicit and reviewed. A high percentage with weak assertions does not pass acceptance.

## 109. Requirement coverage

The more important coverage matrix maps:

```text
scope decision
Journey ID
Machine ID
API/command
role/capability
threat/control
unit test
integration test
contract test
E2E/UAT scenario
performance/accessibility/security evidence
release status
```

Every P0 requirement must have an identified test oracle and evidence owner.

## 110. Mutation testing

Mutation testing SHOULD run periodically on selected high-risk pure modules:

- financial calculations;
- authorization policies;
- state guards;
- cancellation/refund calculations;
- inventory availability;
- one-time credential validation;
- redaction; and
- feature/emergency gates.

Surviving material mutations create test-quality work. Mutation testing is not required on generated code or provider SDK wrappers where contract tests are more meaningful.

## 111. Flaky-test definition

A test is flaky when identical code/config/data can both pass and fail without an intentional environmental change.

Flake indicators include:

- passing only on retry;
- timing-dependent sleep;
- order dependence;
- shared-state collision;
- uncontrolled provider/network call;
- nondeterministic data/clock;
- browser animation/layout race; and
- resource exhaustion.

## 112. Flaky-test policy

- P0 flaky tests block release until fixed.
- A non-P0 test may be quarantined only with defect ID, owner, reason, replacement coverage, expiry no longer than 14 days, and approval by QA/owner.
- Quarantined tests remain visible in reports.
- Repeated quarantine expiry blocks merge/release for the owning area.
- Retrying is for classification/diagnostics, not conversion of a failure into green evidence.
- Flake rate is measured per suite and owner.
- The target for protected-branch suites is below `1%`, with P0 target `0%`.

## 113. Test review checklist

Reviewers check that a test:

- asserts a requirement/invariant;
- fails before the fix or for the right reason;
- is deterministic;
- uses the correct layer;
- does not duplicate another expensive test without value;
- uses public/module contracts rather than private implementation details;
- covers relevant negative/failure boundaries;
- does not leak sensitive data;
- has clear failure output;
- cleans up state; and
- references Journey/Machine/control IDs where material.

---

# Part P — CI/CD test stages and release gates

## 114. Developer pre-commit expectations

Before opening a pull request, the contributor SHOULD run affected:

- formatting/lint;
- type checks;
- unit/component tests;
- relevant integration tests;
- generated contract/migration checks; and
- production build for affected app/package.

P0 changes should include a focused local failure/concurrency demonstration where relevant.

## 115. Pull-request fast gate

Every pull request MUST pass:

```text
format/lint
strict typecheck
unit tests
component tests for affected UI
contract/schema drift
migration validation
static security and secret checks
affected production builds
changed-code coverage
```

Affected integration and E2E smoke tests run based on dependency mapping. The target median PR gate is under 20 minutes; quality requirements may not be deleted merely to meet duration.

## 116. Protected-branch merge gate

Before merge:

- all required PR checks pass cleanly;
- no P0 flaky/quarantined test applies;
- required integration/authorization tests pass;
- OpenAPI/event/job contracts are compatible;
- migration and rollback compatibility is reviewed;
- security findings meet Part 10 rules;
- design/accessibility evidence exists for affected critical UI;
- documentation/traceability is updated; and
- human review approves code and evidence.

## 117. Post-merge/staging gate

Staging deployment triggers:

- migration deployment and verification;
- API/Worker/Web health/readiness;
- P0 smoke E2E;
- authorization matrix sample;
- provider deterministic suite;
- provider sandbox smoke on schedule or provider-impact change;
- axe-core critical-route suite;
- ZAP baseline/passive scan;
- k6 performance smoke;
- outbox/queue/reconciliation checks;
- monitoring test event; and
- rollback compatibility check.

## 118. Nightly gate

Nightly runs include:

- full unit/integration/contract suite;
- all 42 state-machine generated/table suites;
- larger property-based campaigns;
- concurrency campaign;
- full P0 Playwright matrix;
- progressive suites for enabled test features;
- accessibility suite;
- DAST authenticated plan;
- dependency/container rescan;
- provider sandbox contract tests as rate/terms permit;
- projection rebuild/replay test;
- performance average-load test on schedule; and
- flake trend report.

## 119. Release-candidate gate

A release candidate requires:

```text
□ all protected-branch checks clean
□ P0 E2E on required browsers/devices passes
□ P0 state/concurrency/property tests pass
□ authorization/IDOR matrix passes
□ provider simulations and relevant sandbox contracts pass
□ migration/rollback compatibility passes
□ performance smoke and applicable capacity suite pass
□ accessibility automated and required manual checks pass
□ security scans/manual review meet severity gates
□ backup/restore evidence remains current
□ observability/alerts/runbooks are current
□ known risks and exceptions are approved and unexpired
□ feature/capacity/emergency configuration is correct
□ release notes identify migrations, providers, flags, and rollback
```

## 120. Paid-pilot activation gate

Real payments/orders remain disabled until Part 13 records evidence that:

- all P0 active journeys pass automated and UAT coverage;
- provider live payment/refund/transfer/file/email drills reconcile;
- financial ledger and provider reconciliation show no unexplained material difference;
- inventory and custody race tests pass;
- privileged roles use MFA and access reviews pass;
- no Critical security/privacy/accessibility defect remains;
- performance at configured pilot capacity passes;
- backup restoration succeeds;
- incident/emergency pause/restart exercise succeeds;
- Support/Operations/Finance/Trust roles can operate without developer database intervention;
- founding sellers and riders pass their scripts; and
- accountable Product, Engineering, Operations, Finance, Security/Privacy, Logistics, and Partnership owners sign off.

## 121. Progressive-feature activation gate

A progressive feature may activate only when:

1. its P1 scope is approved;
2. all inherited P0 rules are covered;
3. feature-specific state, data, UI, provider, security, accessibility, performance, and UAT tests pass;
4. capacity and staffing are configured;
5. monitoring and rollback/pause exist;
6. physical approvals exist where required;
7. no adjacent deferred capability becomes visible; and
8. activation evidence and review date are recorded.

Code deployment alone never activates the feature.

## 122. Emergency release gate

An emergency patch may use an abbreviated pipeline only when:

- incident commander authorises it;
- affected scope and risk are recorded;
- focused tests reproduce and fix the incident;
- static/type/build/security minimums run;
- P0 smoke for affected journey runs;
- rollback is prepared;
- deployment is monitored; and
- full omitted suites run immediately after containment.

Emergency does not permit unreviewed direct production database edits or waiver of provider/ledger/custody truth.

## 123. Test evidence manifest

Every release candidate MUST produce a machine-readable and human-readable manifest containing:

```text
commit/release ID
build artefact digests
environment
schema/migration version
feature configuration version
test suite names and versions
commands and timestamps
pass/fail/flake/quarantine counts
coverage and requirement matrix
browser/device matrix
performance results
accessibility results
security scan/manual review results
provider sandbox/live drill references
backup/restore evidence
open defects/risks/exceptions and expiry
approvals
artefact locations and retention
```

Test artefacts must avoid secrets and sensitive personal data.

## 124. Evidence retention

Recommended minimum internal retention:

| Evidence | Retention |
|---|---|
| PR unit/integration reports | 90 days |
| release-candidate evidence | life of pilot + 24 months or approved policy |
| security scan/pen-test evidence | per security retention schedule, minimum 24 months where appropriate |
| controlled live financial drills | financial/audit retention policy |
| UAT sign-off | life of pilot + 24 months |
| restore/incident exercises | minimum 24 months |
| screenshots/traces/videos | 30–90 days unless attached to material defect/incident |

Part 10 retention/legal-hold rules override this table where applicable.

---

# Part Q — User acceptance testing and operational rehearsal

## 125. UAT principles

UAT proves that intended users can achieve the approved outcome safely, not merely that they like the interface.

Each UAT script includes:

```text
UAT ID
Journey/Machine IDs
participant role
preconditions and feature/capacity state
test data
steps and permitted assistance
expected visible outcome
expected authoritative records/evidence
time/deadline expectations
exception/recovery branch
accessibility/device context
observations and defects
pass/fail/conditional decision
participant and accountable-owner sign-off
```

Developers may observe but should not secretly repair data during the script.

## 126. Founding-team UAT

Founding-team UAT MUST prove:

- account, role, and environment setup;
- full multi-vendor purchase;
- payment uncertainty/reconciliation;
- seller order and inventory intervention;
- dispatch, pickup, handoff, and failed attempt;
- cancellation, case, refund, earnings, withdrawal, and payout;
- access separation among Support, Operations, Finance, Trust/Safety, and Admin;
- monitoring and work-queue ownership;
- emergency pause/restart;
- incident/runbook use; and
- no developer database intervention required.

## 127. Founding-seller UAT

Selected sellers MUST demonstrate:

- sign-in and seller surface switching;
- profile/payout setup;
- listing/variant/condition/image creation;
- inventory accuracy;
- order acceptance/rejection;
- preparation and packaging;
- pickup handoff;
- cancellation/substitution/case response;
- earnings understanding;
- withdrawal request; and
- policy/support escalation.

A seller who needs continuous founder operation is not ready for activation.

## 128. Rider and CU Express UAT

Rider/dispatcher participants MUST demonstrate:

- approved device/session;
- shift availability;
- assignment offer/decline/expiry;
- pickup point and parcel scan;
- custody confirmation;
- online/offline distinction;
- delivery point and credential;
- delegate;
- failed handoff;
- damage/loss/safety escalation;
- reassignment/custody transfer; and
- end-of-shift/incomplete obligation handling.

## 129. Support and Operations UAT

Participants MUST demonstrate:

- finding orders/cases from safe references;
- understanding Parent/Vendor/Fulfilment separation;
- seller delay and partial failure intervention;
- dispatch override and failed handoff;
- return logistics;
- case evidence and deadlines;
- customer communication;
- escalation to Finance/Trust/Safety;
- work queue and audit use;
- capacity limit/pause; and
- no unauthorised sensitive-data access.

## 130. Finance UAT

Finance participants MUST demonstrate:

- provider/payment verification and reconciliation;
- allocation and ledger reading;
- partial/full refund approval under authority limits;
- maker-checker flow;
- order-specific hold/release;
- payout-account review;
- withdrawal approval;
- transfer attempt/finality/reversal;
- unknown provider outcome reconciliation;
- export controls; and
- inability to edit provider or ledger history directly.

## 131. Trust and Safety UAT

Participants MUST demonstrate:

- message/report review;
- counterfeit/stolen/safety allegation intake;
- temporary safeguard versus final decision;
- evidence minimisation and access;
- seller restriction/suspension;
- continuity of active safe obligations;
- appeal and correction;
- recall/containment;
- conflict-of-interest/escalation; and
- inability to perform unrelated Finance/Admin actions.

## 132. Accessibility UAT

At least one UAT cycle SHOULD include participants or reviewers using:

- keyboard only;
- screen reader;
- browser zoom/reflow;
- Android tablet/phone; and
- intermittent connectivity for Rider workflows.

Accessibility defects are recorded against the same acceptance process, not a separate optional list.

## 133. Pilot rehearsal

Before opening the closed pilot, the team MUST run a timed production-like rehearsal from order opening to end-of-day reconciliation, including:

- configured buyer/seller/order capacity;
- realistic catalogue;
- multiple simultaneous orders;
- one seller failure;
- one payment uncertainty;
- one delivery failed attempt;
- one return/refund;
- one payout workflow;
- one security/access incident;
- one emergency pause and restart review;
- shift handover;
- provider/ledger/order reconciliation; and
- debrief with measured workload and unresolved obligations.

---

# Part R — Traceability and minimum validation inventory

## 134. Journey traceability

The testing repository MUST use Journey IDs from `docs/03-user-journeys.md` in test names or metadata where practical.

Example:

```ts
test("J05/M11 confirms one order after duplicate payment events", async () => {});
```

## 135. State-machine traceability

Each state-machine suite MUST map to M01–M42 and expose a generated coverage report showing:

- states exercised;
- transitions exercised;
- forbidden transitions exercised;
- deadline boundaries;
- reversal paths;
- concurrency scenarios; and
- uncovered documented rules.

## 136. Security traceability

Security tests map to:

- threat IDs T-001–T-050;
- ASVS matrix controls;
- security decision records;
- data classifications;
- provider boundaries; and
- paid-pilot security blockers.

## 137. Scope-decision traceability

| Scope decision | Required testing emphasis |
|---|---|
| 1 Food progressive activation | full shared order/payment/delivery/protection tests plus food acceptance/prep/perishable exceptions |
| 2 External Vendor | invite scope, inbound boundary, delay/discrepancy, custody, privacy |
| 3 FBN | receiving, movement, reservation, pick/pack, custody, return/quarantine, physical gate |
| 4 Pre-Owned | actual unit, condition, defects, serial privacy, exact-unit return, no false badge |
| 5 Product + gated Food only | disabled routes/entities/actions and no future-type checkout |
| 6 Multi-vendor checkout | one payment, Parent/Vendor/Fulfilment separation, partial failure, allocation |
| 7 Payments/payouts | provider finality, ledger, holds, refunds, withdrawal, transfer, reconciliation |
| 8 Hybrid dispatch | assignment, capacity, QR/PIN, offline, failed attempt, reassignment, custody |
| 9 Covenant verification | automatic/manual fallback, duplicates, privacy, expiry/revalidation |
| 10 Distinct role surfaces | navigation plus server capability/resource/field scope |
| 11 Messaging | anti-bypass, privacy, moderation, substitution formal action |
| 12 Protection cases | evidence, deadlines, human decision, remedies, reviews, enforcement, appeal |
| 13 Search/merchandising/AI | relevance, filters, stale revalidation, transparent promotion, human-reviewed AI |
| 14 Production baseline | auth, security, monitoring, backups, restore, CI, incident gates |
| 15 Pilot gates | simulation/UAT/live drills/capacity/pause/restart/expansion evidence |

## 138. Minimum state-machine scenarios

The 36 scenarios in `docs/08-state-machines.md` Section 47 are mandatory and are incorporated into this strategy. No scenario may be dropped because an equivalent-looking happy path exists.

## 139. Minimum IA/design scenarios

The IA and design-system validation scenarios remain mandatory, including:

- narrow mobile comparison;
- long content and large naira values;
- stale cart/checkout revalidation;
- payment/refund/payout uncertainty;
- role-specific field/action separation;
- Rider offline and wrong-parcel states;
- progressive navigation hidden until activation;
- 200% zoom, narrow reflow, keyboard, screen reader, reduced motion, and high contrast;
- empty/loading/stale/error/unavailable/processing/offline states; and
- no rejected generic AI visual patterns.

## 140. Minimum integration scenarios

The adapter, sandbox, failure-injection, and controlled live-drill scenarios in `docs/09-integrations.md` Sections 117–120 are mandatory and are incorporated into this strategy.

## 141. Minimum security scenarios

The security programme and paid-launch blockers in `docs/10-security-and-compliance.md` Sections 98–102 are mandatory and are incorporated into this strategy.

---

# Part S — Prohibited testing shortcuts

## 142. Prohibited shortcuts

Codex, Engineering, QA, and contributors MUST NOT:

1. mark a feature done because its page renders;
2. test only the happy path;
3. replace PostgreSQL constraint/locking tests with an in-memory repository;
4. mock the state machine under test;
5. call private implementation methods instead of the public command where the contract is the subject;
6. use production data in local/CI/staging;
7. use production provider credentials in tests;
8. contact live providers from ordinary CI;
9. infer payment/refund/payout success from browser redirects or mocked `200`;
10. assert only a provider call and ignore local ledger/order/custody effects;
11. use arbitrary sleeps for concurrency or asynchronous correctness;
12. make flaky P0 tests green through retries;
13. silently quarantine or delete failing tests;
14. mass-update visual snapshots without review;
15. use snapshot-only tests for interactive behaviour;
16. test hidden navigation and skip direct API authorization;
17. treat Super Admin access as a valid bypass fixture;
18. modify database state directly to complete an E2E journey under test;
19. edit append-only financial/custody history during cleanup;
20. use one generic fixture with every privilege;
21. expose passwords, OTPs, bank details, evidence, or production secrets in traces/reports;
22. skip unknown/out-of-order/duplicate provider states;
23. retry uncertain value movement blindly in a test helper;
24. assert dashboard/search projection instead of authoritative state for protected outcomes;
25. test queue success as provider success;
26. omit negative state/capability/tenant tests;
27. use code coverage as the sole acceptance criterion;
28. disable accessibility rules without documented review;
29. claim WCAG conformance from axe/Lighthouse alone;
30. load-test a live paid pilot without approved scope and containment;
31. performance-tune by removing authorization, audit, transactions, or evidence;
32. claim backup readiness without restore and integrity checks;
33. treat a runbook document as a successful incident exercise;
34. let developers sign off UAT for roles they do not operate;
35. activate a progressive feature because tests exist without capacity/operations approval;
36. skip tests because the capability is feature-gated;
37. allow a migration to merge without upgrade/compatibility evidence;
38. ignore test cleanup or sandbox artefacts;
39. accept Critical security/accessibility/financial/custody defects for a launch date; or
40. allow Codex-generated tests to override the governing product contracts.

---

# Part T — Required implementation outputs

## 143. Repository outputs

Engineering and QA MUST produce or maintain:

```text
docs/11-testing-strategy.md
packages/testing/
tests/e2e/
tests/contracts/
tests/performance/
tests/security/
tests/accessibility/
tests/recovery/
tests/uat/
test-data/scenario-catalogue.yml
test-data/provider-fixture-register.yml
quality/requirement-test-matrix.yml
quality/state-machine-coverage.yml
quality/browser-device-matrix.yml
quality/performance-budgets.yml
quality/release-gates.yml
quality/known-flakes.yml
quality/test-evidence-schema.json
.github/workflows/quality-*.yml
runbooks/testing/
```

Exact names may follow repository conventions, but the responsibilities may not disappear.

## 144. Rules for Codex and contributors

For every implementation task, Codex MUST state:

1. governing scope decision and Journey ID(s);
2. affected Machine ID(s);
3. risk class;
4. test oracle;
5. unit/component tests;
6. database/module/API integration tests;
7. authorization/negative tests;
8. property/concurrency/idempotency tests where applicable;
9. provider simulation/contract/sandbox impact;
10. browser/E2E/UAT impact;
11. accessibility impact;
12. security/privacy tests;
13. performance/degraded/recovery impact;
14. fixtures and cleanup;
15. commands executed and evidence; and
16. intentionally inactive progressive/deferred branches.

Codex must not invent a test expectation that changes business policy. Ambiguity must be reported against the Build Pack hierarchy.

## 145. Test definition of done

A feature, module, journey, provider, or progressive capability is test-complete only when the applicable items are satisfied:

1. requirement and test oracle are identified;
2. risk class is assigned;
3. deterministic fixtures exist;
4. pure rules are covered at the lowest reliable layer;
5. real database/queue behaviour is covered where relevant;
6. every documented permitted and forbidden state transition is covered;
7. authorization, scope, field projection, and assurance are covered;
8. happy and material failure paths are covered;
9. idempotency, replay, and concurrency are proven where applicable;
10. financial, inventory, custody, and order invariants pass;
11. API/event/job/provider contracts pass;
12. provider uncertainty and reconciliation pass;
13. UI states, responsive behaviour, and browser support pass;
14. automated and required manual accessibility checks pass;
15. security tests and vulnerability gates pass;
16. performance/capacity/degraded behaviour passes;
17. migration, rollback, backup, restore, and recovery impact is proven;
18. Operations can observe and intervene in stuck outcomes;
19. UAT is signed by the intended actors where required;
20. flakiness is zero for P0 and within policy elsewhere;
21. coverage/requirement matrices are updated;
22. reports contain no sensitive data;
23. documentation and runbooks are updated;
24. no deferred capability is activated; and
25. human reviewers approve the code and evidence.

---

# Part U — Decision records and research basis

## 146. Testing decision records

| ID | Decision |
|---|---|
| TDR-001 | Vitest is the primary TypeScript unit/integration runner. |
| TDR-002 | Playwright is the primary browser E2E runner. |
| TDR-003 | Testcontainers runs real PostgreSQL and Redis-compatible integration dependencies. |
| TDR-004 | fast-check provides property/model-based testing for high-risk invariants. |
| TDR-005 | k6 provides performance, capacity, spike, and soak testing. |
| TDR-006 | axe-core automation plus human testing verifies accessibility; automation alone is insufficient. |
| TDR-007 | OWASP ZAP Automation Framework supports staging DAST; human review remains required. |
| TDR-008 | Deterministic provider simulators implement the same ports as production adapters. |
| TDR-009 | Provider sandbox tests and controlled live drills supplement, but do not replace, local invariant tests. |
| TDR-010 | P0 flaky tests block release; retries classify rather than excuse flakiness. |
| TDR-011 | Coverage is a minimum diagnostic; requirement/invariant coverage is authoritative. |
| TDR-012 | Every P0 journey requires end-to-end and operational acceptance evidence. |
| TDR-013 | Financial, inventory, custody, permission, idempotency, and feature-gate rules require concurrency/property tests. |
| TDR-014 | WCAG 2.2 Level AA is the accessibility target. |
| TDR-015 | Core Web Vitals good thresholds are field performance targets at the 75th percentile. |
| TDR-016 | Load volumes are derived from configured Covenant capacity, with 2× headroom and 3× spike tests. |
| TDR-017 | Backup readiness requires isolated restore, reconciliation, and re-deletion checks. |
| TDR-018 | Release and feature activation remain separate gates. |

## 147. Official research basis reviewed 30 July 2026

The tooling recommendations were checked against current official documentation available on 30 July 2026, including:

- [Playwright Test documentation](https://playwright.dev/docs/intro), including projects, retries, locators, traces, and accessibility testing;
- [Vitest documentation](https://vitest.dev/), including mocking and V8/Istanbul coverage;
- [Testcontainers for Node.js](https://node.testcontainers.org/), including PostgreSQL and Redis modules;
- [fast-check documentation](https://fast-check.dev/), including property, model-based, and race-condition testing;
- [Grafana k6 documentation](https://grafana.com/docs/k6/latest/), including thresholds, load types, and automated performance testing;
- [axe-core](https://github.com/dequelabs/axe-core) and the Playwright integration for automated WCAG checks;
- [OWASP ZAP Automation Framework](https://www.zaproxy.org/docs/desktop/addons/automation-framework/);
- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/) and Accessibility Conformance Testing materials;
- [Core Web Vitals guidance](https://web.dev/articles/vitals); and
- the official provider documentation and standards already recorded in `docs/09-integrations.md` and `docs/10-security-and-compliance.md`.

Tools and thresholds may evolve. Stable versions must be pinned, and Product/Engineering/QA/Security must review material changes before adoption.

## 148. Handoff to Part 12 delivery backlog

`docs/12-delivery-backlog.md` MUST convert this strategy into implementation tasks that:

- create the testing package and CI foundation early;
- build fixtures and simulators before provider-dependent features;
- pair every domain/API/UI task with its required test layers;
- schedule concurrency, security, accessibility, performance, and recovery work before Weeks 7–8 become overloaded;
- identify P0 release gates and evidence owners;
- include founding-team/seller/rider/staff UAT preparation; and
- prohibit “testing later” backlog items for already implemented P0 obligations.

## 149. Final testing declaration

Noma's Covenant University pilot will use a layered, risk-based testing programme that begins with strict types, schemas, pure-domain rules, authorization policies, state transitions, and deterministic fixtures; proves persistence and concurrency against real PostgreSQL and Redis-compatible infrastructure; validates public APIs, events, jobs, and provider adapters through versioned contracts; and demonstrates complete obligations through browser journeys, operational UAT, provider sandbox tests, controlled live drills, performance tests, accessibility evaluation, security review, and recovery exercises.

Money, stock, orders, custody, permissions, one-time credentials, provider finality, and emergency controls will receive property, concurrency, replay, failure, and reconciliation evidence. No browser redirect, dashboard projection, queue completion, mocked `200`, code-coverage percentage, screenshot, or flaky retry may replace authoritative state and invariant checks.

Every active P0 journey must be independently operable and recoverable without developer database intervention. Progressive Food, External Vendor, FBN, Pre-Owned, Priority, and Saver capabilities will receive complete scoped test evidence before activation. Deployment will remain separate from feature and paid-pilot activation.

Real Covenant orders and money cannot launch while P0 tests are failing or flaky, provider/live drills do not reconcile, critical authorization/security/accessibility defects remain, configured capacity budgets fail, backups have not restored successfully, incident controls are untested, or intended Operations, Finance, Support, Trust and Safety, seller, and Rider actors cannot complete their responsibilities safely.

This strategy is the binding quality and release-gate authority for Codex and all future contributors.
