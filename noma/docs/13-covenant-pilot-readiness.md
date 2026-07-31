# Noma Covenant Pilot Readiness, Launch and Expansion Contract

> **Repository path:** `docs/13-covenant-pilot-readiness.md`  
> **Status:** Binding final numbered Build Pack readiness contract  
> **Version:** 1.0  
> **Effective date:** 30 July 2026  
> **Applies to:** Noma's controlled Covenant University marketplace pilot  
> **Primary audience:** Founders, Product, Design, Engineering, Codex, QA, Release/DevOps, Operations, Support, Finance, Trust and Safety, Security, Privacy, Legal/DPCO advisers, Logistics, Covenant/partnership stakeholders, and future contributors

---

## 1. Purpose

This document is the final numbered Build Pack contract for deciding whether Noma may:

- deploy a release candidate;
- activate production capabilities;
- accept real buyer payments;
- create real seller earnings and payouts;
- move real parcels under Noma-controlled custody;
- admit a closed Covenant pilot cohort;
- increase capacity;
- activate a progressive feature;
- continue, restrict, roll back, pause, or suspend the pilot; or
- proceed toward broader Covenant or future institutional expansion.

It converts Parts 1–12 into a single readiness system containing:

- mandatory launch gates;
- a version-controlled evidence register;
- accountable owners and independent approvers;
- explicit UAT sign-off by the people who will operate each workflow;
- conservative initial capacity limits;
- measurable launch and expansion thresholds;
- `GO`, `HOLD`, `RESTRICT`, `PAUSE`, `ROLL_BACK`, and `SUSPEND` decision rules;
- emergency stop-the-line authority;
- progressive-feature activation gates; and
- post-launch review and evidence-expiry rules.

The objective is:

> **A formally approved, capacity-controlled Covenant pilot in which Noma can accept, fulfil, protect, reconcile, support, recover, and stop real obligations safely—not merely a deployed website that appears ready.**

---

## 2. Authority and document hierarchy

1. `docs/01-mvp-scope.md` controls what is active, progressive, manual, prohibited, or deferred.
2. `docs/02-user-roles.md` controls actors, capabilities, resource scope, assurance, maker-checker rules, exports, and sensitive-field visibility.
3. `docs/03-user-journeys.md` controls required end-to-end outcomes, exception paths, evidence, and honest completion.
4. `docs/04-information-architecture.md` and `docs/05-design-system.md` control product surfaces, content hierarchy, component behaviour, responsive states, and accessibility.
5. `docs/06-technical-architecture.md`, `docs/07-domain-model.md`, and `docs/08-state-machines.md` control runtimes, modules, persistence, states, transitions, transactions, idempotency, and concurrency.
6. `docs/09-integrations.md` controls providers, adapters, webhooks, environments, uncertainty, reconciliation, and outage behaviour.
7. `docs/10-security-and-compliance.md` controls threat treatment, authentication, privacy, NDPA/FCCPC responsibilities, retention, access review, incident response, and legal/security blockers.
8. `docs/11-testing-strategy.md` controls test layers, tools, fixtures, mandatory scenarios, evidence, quality ownership, and release gates.
9. `docs/12-delivery-backlog.md` controls implementation sequence, task boundaries, dependencies, acceptance criteria, and delivery evidence.
10. **This document controls final readiness evidence, capacity, UAT acceptance, activation authority, launch decisions, pause/rollback authority, and expansion criteria.**

A calendar date, merged pull request, attractive demonstration, provider dashboard, green coverage report, founder preference, feature flag, or one successful live order cannot override a failed readiness gate.

---

## 3. Source-derived requirements

The supplied Noma documents and Parts 1–12 require all of the following:

1. Production deployment and real-commerce activation are separate decisions.
2. The pilot proceeds through simulation, founding-team testing, founding-seller testing, closed paid pilot, and controlled expansion.
3. Real transactions require approved policies, university/physical operations, trained people, realistic sellers/catalogue, tested payments/refunds/payouts, tested fulfilment/custody, security/privacy readiness, monitoring, backups, recovery, and staffed Support.
4. Every material requirement must have evidence that can be found in the repository or approved evidence system without searching private chats.
5. Engineering cannot self-approve UAT for a role it does not perform operationally.
6. Codex cannot self-approve, merge, deploy production, activate a feature, or grant readiness.
7. Provider confirmation, Noma's authoritative records, and reconciliation must agree for money-moving outcomes.
8. Money, inventory, custody, identity, permissions, cases, and emergency controls require concurrency, replay, failure, and recovery evidence.
9. Progressive Food, External Vendor, FBN, Pre-Owned, Priority, and Saver capabilities remain disabled until their own gates pass.
10. Capacity limits, operating windows, cohorts, value limits, and emergency controls must exist before accepting real orders.
11. Growth metrics cannot override safety, security, financial integrity, privacy, consumer protection, or recovery failures.
12. Expansion, restriction, rollback, pause, and suspension must be explicit recorded decisions.
13. A backup is not ready until restoration succeeds in an isolated environment.
14. A feature is not ready because its code, enum, route, schema, or page exists.
15. Manual operation must remain system-controlled, role-scoped, evidenced, and audited.
16. The complete locked P0 scope represents a large delivery programme; an eight-week date is conditional on actual staffing, throughput, evidence, and operational readiness.

---

## 4. Readiness decisions introduced and locked here

This document additionally locks the following pilot decisions:

- readiness is gate-based, not score-based;
- no critical gate may be averaged away by strong commercial metrics;
- the first real-money activation uses a deliberately small `CONTROLLED_LIVE` cohort before the broader closed pilot;
- initial paid capacity is lower than the maximum tested capacity;
- standard delivery is the only required launch tier;
- Food, Priority, Saver, External Vendor, FBN, and expanded Pre-Owned remain independently gated;
- the closed pilot begins with adults aged 18 or above unless the Part 10 minor-user requirements are formally completed;
- all P0 UAT journeys require actor-specific sign-off without developer database intervention;
- the paid pilot requires unanimous PASS from the mandatory readiness owners defined in this document;
- any mandatory owner may issue `HOLD` within their risk domain;
- authorised Operations, Finance, Security, Engineering/Release, and Product leaders may invoke a scoped emergency `PAUSE` where accepted obligations are at risk;
- exact initial capacity limits and thresholds are conservative defaults and may only be increased through the evidence-based change process defined here;
- the first expansion requires a minimum evidence period and order sample rather than a successful launch day; and
- every readiness decision expires or must be revalidated after material code, provider, policy, staff, university, infrastructure, or operating-model change.

---

## 5. Normative language

- **MUST / MUST NOT:** mandatory for the applicable stage.
- **SHOULD / SHOULD NOT:** expected unless a documented, time-limited, approved exception exists.
- **MAY:** permitted within the locked scope.
- **P0:** launch-blocking obligation or control.
- **P1:** progressive capability that cannot delay the closed product pilot unless separately approved.
- **PASS:** evidence satisfies the requirement and remains current.
- **FAIL:** evidence proves the requirement is not met.
- **HOLD:** launch or expansion cannot proceed until specified deficiencies are corrected.
- **PAUSE:** new obligations or a scoped capability stop while existing obligations are contained and resolved.
- **SUSPEND:** the pilot stops more broadly because safe operation cannot be assured.

---

## 6. Readiness principles

1. **Evidence over assertion.** “We tested it” is not evidence without a traceable result.
2. **Authority over convenience.** The intended actor must approve the operational workflow.
3. **Provider truth over optimism.** Money is not final because an API request returned successfully.
4. **Custody truth over status text.** Pickup and delivery require accepted custody evidence.
5. **Reconciliation over dashboards.** Provider, order, ledger, refund, payout, inventory, and custody records must agree.
6. **Capacity before growth.** Noma must know how many obligations it can safely accept.
7. **Recovery before launch.** Noma must prove it can restore and continue safely.
8. **Privacy before collection.** Live evidence flows require approved purpose, access, retention, and deletion.
9. **Consumer remedy before marketing.** Returns, refunds, complaints, and Support must work before broader promotion.
10. **Progressive activation.** Code completion does not activate Food, FBN, external vendors, Pre-Owned expansion, Priority, or Saver.
11. **Reversibility.** Every material activation needs a stop, restriction, rollback, and communication plan.
12. **No silent waiver.** Any exception is explicit, scoped, approved, time-limited, and non-critical.

---

## 7. Readiness status model

Every gate and evidence item uses one of:

```text
NOT_STARTED
IN_PROGRESS
PASS
FAIL
EXPIRED
WAIVED_NON_BLOCKING
NOT_APPLICABLE
```

Rules:

- `WAIVED_NON_BLOCKING` is forbidden for critical financial, authorization, custody, privacy, security, recovery, legal, or university-operating requirements.
- `NOT_APPLICABLE` requires a written reason and approver.
- `PASS` expires when its evidence expiry date is reached or a material change invalidates it.
- `FAIL` remains visible after correction; successor evidence records the new PASS.
- readiness history is append-only.

---

## 8. Readiness decision vocabulary

### 8.1 Launch decisions

```text
GO_CONTROLLED_LIVE
GO_CLOSED_PILOT
HOLD
PAUSE_SCOPED
TEMPORARILY_SUSPEND_PILOT
```

### 8.2 Continuing-operation decisions

```text
CONTINUE_AT_CURRENT_CAPACITY
RESTRICT_A_CAPABILITY
REDUCE_CAPACITY
PAUSE_NEW_ORDERS
ROLL_BACK_RECENT_EXPANSION
TEMPORARILY_SUSPEND_PILOT
```

### 8.3 Expansion decisions

```text
EXPAND_COHORT
EXPAND_SELLERS
EXPAND_CAPACITY
ACTIVATE_PROGRESSIVE_FEATURE
ADD_OPERATING_WINDOW
NO_CHANGE
```

No generic `READY = true` field may replace these explicit decisions.

---

## 9. Pilot stages

| Stage | Name | Real money | Real customers | Purpose |
|---|---|---:|---:|---|
| `P0` | Development and simulation | No | No | prove rules, states, failures, concurrency, providers, and recovery |
| `P1` | Founding-team production-like test | Normally no | authorised internal actors only | prove production operations without ordinary customers |
| `P2` | Founding-seller rehearsal | No ordinary commerce | selected sellers/riders/staff | prove catalogue, preparation, custody, cases, earnings, and runbooks |
| `P3` | Controlled live smoke | Yes, tightly limited | designated participants | prove the complete real-money loop at minimal exposure |
| `P4` | Closed Covenant pilot | Yes | invited verified adults | validate the operating model under bounded real demand |
| `P5` | Controlled Covenant expansion | Yes | expanded cohorts | increase capacity or activate one progressive capability at a time |
| `P6` | Future institution readiness | Not granted here | future | repeat institution-specific approval and operating readiness |

A stage may be rolled back without deleting historical records.

---

## 10. Gate architecture

The paid pilot uses fourteen readiness gates:

| Gate | Name | Primary owner | Critical |
|---|---|---|---:|
| `RG-00` | Scope, repository authority, and change control | Product/Release | Yes |
| `RG-01` | Legal, privacy, policy, and Covenant operating approval | Legal/Privacy/Partnership | Yes |
| `RG-02` | People, access, segregation of duties, and training | Operations/Security | Yes |
| `RG-03` | Production infrastructure, deployment, configuration, and observability | Engineering/Release | Yes |
| `RG-04` | Founding sellers, catalogue, inventory, and commercial terms | Product/Catalogue/Operations | Yes |
| `RG-05` | Payments, refunds, earnings, ledger, withdrawals, and payouts | Finance/Engineering | Yes |
| `RG-06` | Fulfilment, dispatch, rider assignment, custody, handoff, and recovery | Logistics/Operations | Yes |
| `RG-07` | Support, protection cases, returns, disputes, reviews, and enforcement | Support/Trust and Safety | Yes |
| `RG-08` | Security, authentication, authorization, privacy, and compliance | Security/Privacy | Yes |
| `RG-09` | Quality, concurrency, accessibility, performance, and compatibility | QA/Engineering | Yes |
| `RG-10` | Backups, restoration, incidents, degraded modes, and emergency controls | Release/Security/Operations | Yes |
| `RG-11` | Role-specific UAT and operational acceptance | QA/Business owners | Yes |
| `RG-12` | Pilot capacity, cohorts, operating windows, staffing, and stop-line controls | Operations/Product | Yes |
| `RG-13` | Final readiness review and activation authorization | Readiness Council | Yes |

All critical gates must be `PASS` for a paid `GO` decision.

---

## 11. Evidence register

The authoritative evidence register MUST be version-controlled or stored in an approved system with immutable history and repository references.

Recommended repository structure:

```text
evidence/
  readiness/
    register.yml
    gates/
      RG-00.yml
      RG-01.yml
      ...
      RG-13.yml
    uat/
    drills/
    performance/
    accessibility/
    security/
    providers/
    recovery/
    training/
    policies/
    decisions/
```

The register points to evidence; it must not store production secrets, raw identity documents, bank data, or private case content.

---

## 12. Evidence item schema

Each evidence item MUST include:

```yaml
id: READ-RG05-001
gate: RG-05
requirement: "Provider charge creates exactly one paid order and balanced ledger allocation"
source_requirements:
  - docs/01-mvp-scope.md
  - docs/08-state-machines.md
  - docs/09-integrations.md
risk_class: P0-FINANCIAL
pilot_stage: P3
status: PASS
evidence_type: controlled_live_drill
owner: Finance Lead
verifier: Engineering Reviewer
environment: production-controlled
commit_sha: "..."
release_id: "..."
provider_environment: live
performed_at: "2026-..-..T..:..:..+01:00"
expires_at: "2026-..-..T..:..:..+01:00"
artefact_links:
  - "evidence/releases/..."
redaction_review: PASS
result_summary: "..."
known_limitations: []
related_defects: []
approved_by:
  - "..."
```

---

## 13. Evidence classes

Acceptable evidence classes include:

- automated test report;
- contract-test report;
- concurrency/property-test report;
- security scan or manual security review;
- accessibility automated and manual evaluation;
- performance/load/soak result;
- provider sandbox evidence;
- controlled live drill;
- backup restoration report;
- operational rehearsal;
- role-specific UAT record;
- signed policy/legal/privacy approval;
- Covenant/partnership operating approval;
- training attendance and competency record;
- access review and segregation-of-duty report;
- production configuration attestation;
- monitoring/alert exercise;
- incident or emergency-pause drill;
- reconciliation report; and
- capacity model and staffing plan.

Screenshots may supplement evidence but do not prove backend truth alone.

---

## 14. Evidence quality rules

Evidence MUST be:

- traceable to a requirement, journey, state machine, task, release, and environment;
- reproducible where appropriate;
- dated and owned;
- independently verified for P0 money, access, custody, privacy, recovery, and emergency controls;
- free from production secrets and unnecessary personal data;
- explicit about failures and limitations;
- tied to the exact release candidate being approved;
- invalidated when a material change affects the tested behaviour; and
- preserved according to the Part 10 retention schedule.

A private chat, verbal assurance, or unrecorded provider-dashboard demonstration is not sufficient.

---

## 15. Evidence independence and maker-checker

The following evidence cannot be prepared and finally approved by the same person:

- payout and refund live drills;
- role or privileged-access reviews;
- security gate decisions;
- backup restoration acceptance;
- financial reconciliation;
- permanent or high-impact enforcement drills;
- emergency pause/restart drills; and
- final paid-pilot authorization.

Codex may generate implementation and test artefacts but cannot be an evidence approver.

---

## 16. Evidence expiry and invalidation

Evidence expires immediately when any of the following materially changes:

- payment, refund, payout, storage, email, hosting, database, queue, observability, or DNS provider;
- production environment or region;
- authorization policy or role mappings;
- financial ledger or payment-state logic;
- custody/handoff logic;
- checkout or inventory reservation logic;
- policy, legal basis, privacy notice, or university operating agreement;
- pilot capacity by more than the approved step;
- critical dependency version with security/behaviour impact;
- founding staff, approver, or provider-account ownership;
- recovery architecture;
- a serious incident showing the previous evidence was incomplete.

The readiness register MUST identify revalidation requirements before the affected capability continues.

---

## 17. Defect severity and launch treatment

| Severity | Meaning | Launch treatment |
|---|---|---|
| `S0 CRITICAL` | could cause account takeover, cross-tenant access, forged money state, unauthorised payout, public private evidence, serious safety harm, or unrecoverable material loss | zero open; no waiver |
| `S1 HIGH` | material loss, repeated failed custody, privacy exposure, major consumer harm, or unreliable critical path | zero open for active scope unless the entire affected capability is disabled and separately approved |
| `S2 MEDIUM` | significant degraded experience with safe workaround and no critical integrity loss | may be time-limited with owner, workaround, monitoring, and expiry |
| `S3 LOW` | minor usability/cosmetic issue | may remain with backlog and owner |

P0 flaky tests are treated as failed evidence, not as passing after retry.

---

## 18. Risk acceptance limits

No individual may accept an `S0` risk.

An `S1` risk may only be temporarily accepted if:

- the affected capability remains disabled or isolated;
- no accepted obligation depends on it;
- compensating controls are documented and tested;
- Product, Security/Privacy, Engineering, and the relevant domain owner approve;
- the exception expires before broader activation; and
- the readiness decision remains `HOLD` for that capability.

Commercial urgency is not a compensating control.

---

# Part A — Launch gates

## 19. `RG-00` — Scope, repository authority, and change control

`PASS` requires:

- Parts 1–13 exist in the approved repository version;
- no unresolved contradiction among the governing documents affects active P0 scope;
- protected branch, review, CI, issue, PR, ADR, scope-change, and evidence templates operate;
- all active P0 backlog tasks are `DONE` with traceability and evidence;
- every deferred or progressive capability remains correctly disabled;
- the release candidate is identified by immutable commit/release ID;
- no hidden P0 TODO or manual database workaround exists;
- rollback and forward-fix ownership are known; and
- the actual schedule and team capacity are documented honestly.

**Automatic FAIL conditions:** undocumented scope expansion, unreviewed production code, missing traceability, or launch depending on a deferred capability.

---

## 20. `RG-01` — Legal, privacy, policy, and Covenant operating approval

`PASS` requires approved, release-matched versions of:

- Terms of Use;
- Privacy Notice and contextual notices;
- Seller Agreement;
- Buyer Protection rules;
- returns, refunds, and cancellation policy;
- prohibited/restricted product policy;
- messaging and anti-bypass policy;
- seller enforcement and appeal policy;
- earnings, holds, withdrawals, and payout terms;
- rider and CU Express operating rules;
- pre-owned disclosures for any activated category;
- warranty and recall handling;
- data-retention schedule;
- provider/subprocessor register;
- lawful-basis and cross-border transfer registers;
- DPIAs required by Part 10;
- DCPMI/DPO/CAR applicability assessment;
- written Nigerian legal/DPCO review of the launch model;
- applicable Covenant University approval or operating understanding;
- approved locations, hours, rider/tablet use, handoff rules, incident routes, and FBN location where relevant; and
- an adults-only pilot control unless the under-18 process is formally approved.

**Automatic FAIL conditions:** unresolved legal launch blocker, missing university permission for a required physical activity, or policy promising a workflow the system cannot perform.

---

## 21. `RG-02` — People, access, segregation of duties, and training

`PASS` requires:

- named Product, Engineering, Release, Operations, Dispatch, Support, Finance, Trust and Safety, Security, Privacy, Logistics, and incident owners;
- no critical function depends on an unavailable single person without backup;
- privileged users use individual accounts and MFA;
- role/capability assignments match Part 2 and have been reviewed;
- high-risk role combinations are removed or controlled;
- maker-checker is tested for refunds, payouts, ledger adjustments, access, and serious enforcement;
- seller, rider, dispatcher, Support, Finance, Trust and Safety, and incident training is complete;
- staff can follow runbooks without developer intervention;
- coverage exists for every ordering window and accepted obligation; and
- access revocation and emergency account-disable procedures have been rehearsed.

**Automatic FAIL conditions:** shared privileged account, untrained primary operator, absent Support/Operations coverage, or one person able to prepare and approve a high-risk financial action without control.

---

## 22. `RG-03` — Production infrastructure, deployment, configuration, and observability

`PASS` requires:

- production Web, API, Worker, PostgreSQL, queue, S3, email, monitoring, analytics, telemetry, and DNS accounts are organisation-controlled;
- staging and production credentials/data are isolated;
- secrets are stored, scoped, inventoried, and rotated as required;
- deployment, migration, promotion, rollback, and health procedures have passed;
- production configuration is versioned or attested;
- liveness, readiness, dependency, business-health, and queue health are monitored;
- alerts reach named people and have been deliberately exercised;
- logs, metrics, traces, release IDs, and correlation IDs are available without exposing sensitive data;
- feature, cohort, capacity, and emergency controls are configured; and
- progressive features are disabled unless separately approved.

**Automatic FAIL conditions:** production database/queue is ephemeral, secrets exist in browser/repository, monitoring is blind, rollback is unproven, or deployment automatically activates paid checkout.

---

## 23. `RG-04` — Founding sellers, catalogue, inventory, and commercial terms

`PASS` requires:

- each founding seller is verified, approved, trained, payout-ready, and explicitly activated;
- seller type and category permissions are correct;
- realistic canonical Products, Seller Offers, variants, prices, condition, images, warranty, return classification, and fulfilment source are approved;
- stock is reconfirmed shortly before launch;
- inventory reservation and movement invariants pass under concurrency;
- no placeholder, deceptive, prohibited, recalled, or unsupported item is live;
- pre-owned goods, if activated, use actual-unit photos, condition disclosures, unit identity, and approved category/value limits;
- seller preparation, packaging, cancellation, handoff, case, and message workflows have passed rehearsal;
- search, product grouping, offer comparison, availability, and checkout revalidation work; and
- seller order-volume limits are configured.

**Automatic FAIL conditions:** known false stock, missing commercial snapshots, unrestricted high-risk electronics, or a seller requiring routine founder/database intervention.

---

## 24. `RG-05` — Payments, refunds, earnings, ledger, withdrawals, and payouts

`PASS` requires:

- Paystack live account and credentials are organisation-controlled and production-scoped;
- server-side initialisation, exact amount/currency/reference verification, signed webhooks, durable receipt, deduplication, and reconciliation pass;
- one successful payment creates exactly one paid order and balanced internal allocation;
- uncertain payment states do not create optimistic fulfilment;
- full and partial refund approval, submission, provider events, failures, needs-attention, and reconciliation pass;
- seller earnings remain separate from buyer payment and release only after the approved conditions;
- balanced ledger invariants pass for order, commission, delivery, hold, reserve, refund, payout, failure, and reversal;
- bank resolution, seller confirmation, payout-account change protection, withdrawal, approval, transfer initiation, success, failure, reversal, and uncertainty pass;
- no payout is marked paid from initiation alone;
- Finance can reconcile provider money to orders, refunds, ledger, earnings, and payouts;
- controlled real payment, refund, payout, and reconciliation drills pass with small authorised value; and
- exposure and approval limits are configured.

**Required threshold:** `100%` of controlled-live money movements reconcile with no unexplained material difference.

**Automatic FAIL conditions:** browser redirect used as success, duplicate order/earning/refund/payout, unbalanced ledger, blind retry of uncertain transfer, or unauthorised money action.

---

## 25. `RG-06` — Fulfilment, dispatch, custody, handoff, and recovery

`PASS` requires:

- approved location graph, pickup points, delivery points, zones, hours, and instructions are configured;
- Noma owns every Delivery Job and assignment history;
- CU Express and Noma Fleet operating procedures are approved;
- rider identity, membership, shift, capacity, and assignment controls work;
- seller handoff, parcel identity, pickup QR, one-time delivery PIN/QR, delegation, and failed-attempt evidence pass;
- custody events are append-only and cannot be fabricated by status editing;
- reassignment after pickup uses controlled custody transfer;
- buyer unavailable, refusal, unsafe handoff, credential failure, damaged parcel, lost parcel, and return-to-custody workflows pass;
- Standard promise calculation and status communication are truthful;
- dispatch board, queue ownership, alerts, and emergency reassignment work;
- no continuous map/GPS or invented CU Express API is required; and
- live drills demonstrate successful pickup, delivery, failed attempt, reassignment, and return to controlled custody.

**Automatic FAIL conditions:** parcel can be delivered without valid proof, credential can be consumed twice, custody history can be edited, or no staffed response exists for failed handoff.

---

## 26. `RG-07` — Support, protection cases, returns, disputes, reviews, and enforcement

`PASS` requires:

- accessible Support exists in every operating window;
- product questions, order conversations, system timelines, moderation, and anti-bypass controls work;
- cases use structured reason codes, item links, deadlines, evidence, queues, and audited decisions;
- targeted seller holds and releases work without freezing unrelated funds by default;
- returns create controlled logistics and inspection where required;
- item-level full refund, partial refund, replacement, repair, redelivery, or rejection paths work;
- Support, Operations, Finance, and Trust and Safety responsibilities are separated;
- verified-purchase reviews and moderation work;
- seller warnings, restrictions, suspension, continuity, appeals, and corrective reversals work;
- warranty, recall, counterfeit, threat, and safety cases can be recorded and manually coordinated; and
- ordinary customer cases do not require private WhatsApp or database edits.

**Automatic FAIL conditions:** no complaint route, seller alone controls Buyer Protection, evidence is public/unscoped, or serious safety/fraud cases lack containment authority.

---

## 27. `RG-08` — Security, authentication, authorization, privacy, and compliance

`PASS` requires:

- secure password hashing, email verification, recovery, revocable sessions, and session rotation;
- privileged MFA and recent-authentication controls;
- server-side capability, institution, seller/resource, state, feature, assurance, and approval checks;
- horizontal, vertical, IDOR, mass-assignment, field-visibility, and cross-institution tests pass;
- rate limits and abuse controls are tested for shared campus networks;
- secure cookies, CSRF, CORS, CSP, headers, validation, upload, webhook, and secret controls pass;
- private evidence uses short-lived access and scan/quarantine states;
- data inventory, lawful bases, notices, rights, retention, deletion, legal holds, and cross-border records are ready;
- security and provider accounts are individually controlled;
- critical and high vulnerabilities affecting active scope are closed;
- access reviews pass;
- incident and breach clocks/owners are known; and
- the Security/Privacy Lead issues a written PASS.

**Automatic FAIL conditions:** account takeover path, cross-tenant exposure, forged payment webhook, public private evidence, shared admin credential, unresolved critical vulnerability, or legal/privacy blocker.

---

## 28. `RG-09` — Quality, concurrency, accessibility, performance, and compatibility

`PASS` requires:

- all P0 automated suites pass without unresolved flakiness;
- required unit, integration, database, contract, provider simulation, state, property, and end-to-end tests pass;
- the 25 mandatory concurrency scenarios from Part 11 pass;
- provider duplicate, delay, timeout, unknown, reversal, and reconciliation scenarios pass;
- Marketplace, Buyer, Seller, Rider, Operations, and Admin critical flows pass on the supported browser/device matrix;
- WCAG 2.2 Level AA automated and human evaluation passes for active P0 flows;
- keyboard, screen-reader, zoom, reflow, focus, contrast, target-size, reduced-motion, and Rider tablet checks pass;
- average, 2× headroom, 3× spike, and two-hour soak tests pass at the capacity defined here;
- API, queue, database, and frontend budgets from Part 11 pass or have approved non-critical evidence; and
- no P0 command integrity error occurs under load.

**Automatic FAIL conditions:** flaky P0 financial/custody/authorization test, inaccessible critical action, load-created duplicate obligation, or failure at configured pilot peak.

---

## 29. `RG-10` — Backups, restoration, incidents, degraded modes, and emergency controls

`PASS` requires:

- automated backups and failure alerts operate;
- point-in-time recovery availability is verified for the selected plan;
- an independent logical backup exists;
- an isolated restoration drill reconstructs representative users, products, orders, payments, ledger, payouts, custody, cases, and audit records;
- recovery time and recovery point are measured;
- provider, database, queue, storage, email, search, observability, Web, and API degraded modes have passed;
- incident runbooks exist and named owners can use them;
- secret exposure, privileged compromise, payout takeover, personal-data breach, database outage, malicious upload, cross-tenant exposure, and lost-device drills are rehearsed;
- emergency controls can pause checkout, payments, payouts, sellers, categories, tiers, features, or the institution;
- emergency pause and controlled restart are audited and tested; and
- status/customer communication procedures exist.

**Initial objectives:** managed-database recovery point `<= 15 minutes` where provider PITR supports it; independent logical backup recovery point `<= 24 hours`; isolated critical database restoration and application verification `<= 4 hours` in the drill.

**Automatic FAIL conditions:** backup exists but cannot restore, emergency pause requires a code release, or Noma would continue accepting obligations while blind to critical health.

---

## 30. `RG-11` — Role-specific UAT and operational acceptance

`PASS` requires:

- all required UAT personas complete their assigned P0 scenarios;
- the intended actor performs the workflow using the intended surface and permissions;
- no developer database edit, hidden script, shared privileged account, or private chat is needed;
- each actor understands responsibility, deadlines, errors, escalation, evidence, and safe fallback;
- UAT includes failure and exception paths, not only happy paths;
- all UAT blockers and high defects are resolved;
- medium accepted defects have documented workarounds and do not compromise integrity or consumer rights;
- each business owner signs their acceptance matrix; and
- QA verifies the evidence belongs to the release candidate.

Engineering demonstration does not substitute for seller, rider, Finance, Support, Trust and Safety, or Operations UAT.

---

## 31. `RG-12` — Capacity, cohorts, operating windows, staffing, and stop-line controls

`PASS` requires:

- the current pilot stage and cohort are configured;
- buyer, seller, catalogue, cart, order, value, delivery, refund, payout, case, upload, and staffing limits are enforced server-side;
- checkout closes or adjusts safely when capacity is reached;
- promises widen only through approved rules;
- accepted obligations remain visible after intake closes;
- staff coverage is scheduled for the complete operating window plus outstanding obligation handling;
- queue, rider, Support, Finance, and incident capacity is known;
- load tests use the exact configured peak and pass at 2× headroom;
- emergency owners can restrict or stop intake; and
- a capacity increase cannot occur through a casual configuration change.

**Automatic FAIL conditions:** no enforceable daily/concurrent limit, no staffed response for accepted orders, or capacity exceeds tested headroom.

---

## 32. `RG-13` — Final readiness review and activation authorization

`PASS` requires:

- `RG-00` through `RG-12` are PASS and current;
- the release candidate, policies, configuration, cohort, capacity, provider accounts, and evidence register are frozen for decision;
- no `S0` or active-scope `S1` defect remains;
- all mandatory approvers issue signed PASS or the decision is HOLD;
- rollback, pause, status communication, and on-call rosters are confirmed;
- the exact activation time and initial ordering window are recorded;
- live payment and order feature controls require authorised maker-checker activation;
- a post-activation monitoring room and decision cadence are scheduled; and
- the resulting decision record is preserved.

No single founder, engineer, provider, or investor can overrule a failed critical gate.

---

# Part B — Capacity and operating limits

## 33. Capacity principles

- Capacity limits are obligations limits, not marketing targets.
- Tested system capacity and safe operational capacity are both required; the lower value controls.
- The pilot starts below tested headroom.
- Capacity may vary by operating window, seller, category, delivery zone, tier, and staff coverage.
- Reaching a limit must fail safely and honestly.
- Increasing capacity is an expansion decision and requires evidence.
- A reduced capacity may be imposed immediately where risk rises.

---

## 34. Pilot capacity ramp

### Stage `C0` — simulation

- no real money;
- synthetic/test identities only;
- no public seller activation;
- full P0 journey and failure simulation;
- no capacity entitlement.

### Stage `C1` — controlled live smoke

- designated participants only;
- small real value;
- one limited operating window;
- Standard delivery only;
- no Food, External Vendor, FBN, Priority, Saver, or unrestricted Pre-Owned;
- Finance, Operations, Engineering/Release, and Support present throughout.

### Stage `C2` — closed Covenant pilot

- invited, verified adults;
- selected founding sellers;
- bounded daily windows and order intake;
- Standard delivery;
- progressive features separately disabled unless their gate passes.

### Stage `C3` — controlled expansion

- larger cohorts/capacity only after the expansion criteria pass;
- one material operational change at a time where possible;
- ability to return immediately to `C2` or `C1` limits.

---

## 35. Initial `C1` controlled-live limits

| Dimension | Initial limit |
|---|---:|
| invited/designated buyers | `25` |
| active sellers | `5` |
| paid orders per day | `10` |
| checkout starts per 15 minutes | `5` |
| concurrent active deliveries | `2` |
| sellers per cart | `2` |
| order line items | `5` |
| units per line | `3` |
| maximum order value | `NGN 25,000` |
| maximum single item value | `NGN 20,000` |
| seller orders per operating window | `5` unless lower seller capacity applies |
| ordinary approved refund per Support agent | `NGN 5,000`; above requires Finance |
| total payout batch | `NGN 100,000` |
| seller withdrawal per day | `NGN 25,000` |
| operating intake window | one configured window of up to `3 hours` |
| delivery tier | Standard only |
| active high-risk cases | maximum `3`; further intake may pause |

These are maximums, not guarantees. Lower limits may be configured.

---

## 36. Initial `C2` closed-pilot limits

| Dimension | Initial limit |
|---|---:|
| invited verified adult buyers | `100` |
| active sellers | `8` |
| canonical products | `300` |
| active seller offers | `500` |
| paid orders per day | `25` |
| checkout starts per 15 minutes | `10` |
| paid orders per hour | `6` |
| concurrent active deliveries | `4` |
| sellers per cart | `3` |
| order line items | `10` |
| units per line | `5` |
| maximum order value | `NGN 50,000` |
| maximum single item value | `NGN 30,000` |
| seller orders per operating window | `8` unless lower seller capacity applies |
| total pending payout exposure | `NGN 500,000` |
| total payout batch | `NGN 250,000` |
| seller withdrawal per day | `NGN 50,000` |
| ordinary Support refund authority | `NGN 5,000` recommendation/approved rule only |
| Finance single refund approval | `NGN 50,000`; higher requires second approval |
| active ordinary protection cases | `15` |
| active high-risk Trust and Safety cases | `5` |
| evidence uploads per case | `10` files, approved formats, size limits from Part 9 |
| delivery tier | Standard only at initial C2 |

The exact operating days and hours require Covenant and staffing approval and are stored in configuration. The pilot MUST NOT open outside staffed coverage.

---

## 37. Initial `C3` expansion ceiling

Part 13 grants no automatic right to reach this ceiling. It is the maximum next step after approved expansion evidence.

| Dimension | Maximum next expansion step |
|---|---:|
| invited verified adult buyers | `250` |
| active sellers | `15` |
| paid orders per day | `50` |
| paid orders per hour | `10` |
| concurrent active deliveries | `8` |
| maximum order value | `NGN 75,000` |
| total pending payout exposure | `NGN 1,500,000` |
| active ordinary cases | `30` |

Any capacity beyond `C3` requires a new approved readiness amendment and updated load/operational evidence.

---

## 38. Buyer cohort controls

- Buyers must be invited or included in an approved cohort.
- Covenant affiliation must be verified and active.
- The closed pilot is adults-only unless Part 10 requirements for minors are approved.
- Cohort membership must be revocable.
- Public browsing may remain open while protected checkout is cohort-limited.
- A cohort increase must not silently increase delivery or Support capacity.

---

## 39. Seller and catalogue controls

Each seller has configurable limits for:

- active offers;
- orders per window;
- simultaneous preparation;
- item/category/value exposure;
- auto-confirmation eligibility;
- delivery source;
- payout exposure; and
- progressive-feature participation.

Noma may pause one seller without pausing the whole pilot.

---

## 40. Cart and order controls

Checkout MUST revalidate:

- cohort eligibility;
- institution status;
- active seller and offer status;
- stock/reservation;
- category and feature activation;
- value, quantity, line, and seller limits;
- delivery capacity and promise;
- payment method availability;
- operating window; and
- emergency pause state.

A stale cart may be corrected or rejected honestly; it must not create an invalid order.

---

## 41. Financial exposure controls

Limits apply to:

- maximum order and item value;
- seller pending earnings;
- seller available balance;
- open dispute exposure;
- total refunds awaiting provider completion;
- pending/uncertain transfers;
- payout batch total;
- approval authority; and
- total institution exposure.

When a financial limit is reached, new payout or high-value intake pauses while existing records remain reconcilable.

---

## 42. Delivery capacity controls

Delivery capacity considers:

- available eligible riders/carriers;
- active assignments;
- pickup and delivery zones;
- expected readiness;
- parcel compatibility;
- failed-attempt/return workload;
- current incidents;
- operating window; and
- tier promise.

No new order may receive a promise that current capacity cannot reasonably meet.

---

## 43. Support and case capacity controls

Operations may restrict or close new order intake when:

- Support or dispatch queue exceeds safe staffing;
- active high-risk cases reach the configured limit;
- unresolved buyer-unavailable/return-to-custody parcels consume capacity;
- Finance reconciliation exceptions accumulate;
- monitoring alerts are not being acknowledged; or
- an incident removes a required role from coverage.

Accepted obligations remain supported after intake closes.

---

## 44. Operating-window control

Every window records:

```text
institution
start/end time
eligible cohorts
active sellers/categories
delivery tier
order/value limits
staff roster
rider/carrier capacity
Support/Finance/incident coverage
pause owner
```

The system MUST prevent new checkout outside the window while preserving tracking, messaging, Support, refunds, security, and outstanding operations.

---

## 45. Limit enforcement evidence

Readiness evidence MUST show:

- the limit is enforced server-side;
- concurrent requests cannot exceed the limit materially;
- the buyer receives a truthful message;
- reservations/payments are not created after rejection;
- Operations sees the limit event;
- accepted obligations continue;
- authorised users can reduce the limit quickly; and
- the action is audited.

---

# Part C — Metrics and thresholds

## 46. Metrics principles

- Metric definitions, denominators, exclusions, and data source are documented.
- Authoritative financial and order metrics come from PostgreSQL/provider reconciliation, not analytics alone.
- Small samples are labelled; percentages without counts are prohibited.
- Safety and integrity metrics are reviewed as events, not diluted by volume.
- A growth metric cannot convert a failed critical gate into PASS.
- Metrics support decisions; they do not replace incident judgment.

---

## 47. Launch integrity thresholds

The following are required for `GO_CLOSED_PILOT`:

| Measure | Required threshold |
|---|---:|
| controlled live provider/order/ledger reconciliation | `100%` |
| duplicate paid orders from one charge | `0` |
| duplicate seller earnings/refunds/payouts | `0` |
| unauthorised payout/refund/access action | `0` |
| cross-seller/cross-institution exposure | `0` |
| fulfilment from unverified payment | `0` |
| oversell in mandatory concurrency tests | `0` |
| duplicate pickup/delivery credential consumption | `0` |
| unresolved `S0` defects | `0` |
| active-scope unresolved `S1` defects | `0` |
| successful isolated restore drill | `1 PASS` for release candidate architecture |
| P0 UAT blockers | `0` |

---

## 48. Performance and reliability thresholds

Part 11 budgets remain authoritative. At the configured `C2` peak:

- public catalogue p95 `<= 500 ms`;
- search/filter p95 `<= 800 ms`;
- ordinary authenticated query p95 `<= 600 ms`;
- cart mutation p95 `<= 500 ms`;
- checkout validation/quote p95 `<= 1,200 ms`;
- seller/rider ordinary command p95 `<= 750 ms`;
- Operations queue/detail p95 `<= 1,000 ms`;
- internal HTTP 5xx below `1%` under average load;
- outbox unpublished age p95 `<= 5 s`;
- ordinary queue wait p95 `<= 10 s`;
- provider event to local projected state p95 `<= 15 s` when provider/dependencies are healthy;
- critical alert dispatch p95 `<= 60 s`;
- average, 2× headroom, 3× spike, and two-hour soak tests PASS; and
- no P0 integrity error occurs at any test level.

---

## 49. Seller and inventory operating thresholds

For the first expansion review, using at least `100` completed paid orders unless a safety event requires earlier review:

| Measure | Expansion target |
|---|---:|
| stock accuracy at order time | `>= 98%` |
| seller-caused cancellation | `<= 5%` |
| out-of-stock cancellation | `<= 3%` |
| preparation on time | `>= 90%` |
| seller pickup readiness accuracy | `>= 90%` |
| confirmed wrong-item/misdescription rate | `<= 3%` |
| founding seller requiring routine developer intervention | `0` |

A single serious counterfeit, stolen-good, or safety incident is reviewed independently and may pause a seller/category regardless of rate.

---

## 50. Delivery operating thresholds

For the first expansion review:

| Measure | Expansion target |
|---|---:|
| completed deliveries within truthful Standard promise | `>= 85%` at C1/C2; `>= 90%` before activating Priority |
| successful first handoff attempt | `>= 90%` |
| parcel loss | `0` |
| confirmed custody mismatch | `0` |
| damage attributable to logistics | `<= 1%` |
| assignments requiring emergency reassignment | `<= 10%` |
| buyer-unavailable rate | monitored; no automatic blame threshold without evidence |
| severe rider/customer safety incident | `0 unresolved` |

A missed promise is not hidden by changing the promise after the event.

---

## 51. Support and protection thresholds

During staffed operating periods:

| Measure | Required/expansion target |
|---|---:|
| urgent safety/fraud case acknowledged | `<= 5 minutes` |
| ordinary Support case first response | `80% <= 30 minutes`; `95% <= 2 hours` |
| ordinary case resolution | `90% <= 24 hours` where no external dependency blocks |
| approved refund submitted to provider | `<= 2 hours` during operating coverage |
| refund/payout needs-attention item without owner | `0` |
| unresolved case past deadline without escalation | `0` |
| verified review linked to real completed order | `100%` |

Provider processing time is reported separately from Noma approval/submission time.

---

## 52. Security, privacy, and incident thresholds

- unresolved critical security/privacy issue: `0`;
- privileged accounts without MFA: `0`;
- active privileged access without named owner/review: `0`;
- unscoped private-evidence access: `0`;
- personal data or secrets in test/evidence artefacts: `0`;
- qualifying breach without active incident owner: `0`;
- missed applicable regulator/individual communication deadline: `0`;
- critical alert without acknowledgement in the runbook target: `0`;
- unresolved material incident at launch decision: `0`.

---

## 53. Customer and seller value metrics

These are informative at launch and become expansion evidence after sufficient sample:

- search success and zero-result rate;
- product/offer engagement;
- add-to-cart and checkout completion;
- successful completed order rate;
- CSAT;
- repeat purchase;
- recommendation intent;
- seller first-order time;
- seller repeat-selling rate;
- payout completion; and
- seller/rider satisfaction.

For first broad expansion, target `CSAT >= 4.0/5` from at least `20` completed-order responses. A smaller sample is reported but does not prove the target.

---

## 54. Unit economics thresholds

Noma MUST calculate per completed order:

```text
marketplace commission
+ delivery revenue
- payment cost
- carrier/rider cost
- delivery subsidy
- promotion subsidy
- refund/protection cost
- directly attributable Support/Operations cost
= contribution per completed order
```

The founding pilot may operate with a planned subsidy, but:

- the subsidy must be explicit;
- no unexplained financial difference is permitted;
- contribution must be measured by seller/order/category/tier;
- capacity expansion requires a documented funding and exposure decision; and
- negative economics cannot be hidden by excluding refunds, protection, or delivery costs.

---

## 55. Sample and review requirements

### `C1 → C2`

Requires at least:

- `20` completed controlled-live real orders;
- at least `3` separate operating days/windows;
- complete reconciliation for all money movements;
- no unresolved critical incident;
- successful refund and payout drills; and
- a readiness council review.

### `C2 → C3` or first progressive activation

Requires at least:

- `100` completed paid orders;
- at least `14` calendar days after C2 activation;
- two consecutive weekly reviews with critical gates green;
- thresholds in Sections 47–53 met or a documented no-change decision;
- spare staffing and delivery capacity;
- no unresolved severe incident; and
- a separately approved expansion record.

Noma may hold at current capacity longer where sample or confidence is insufficient.

---

## 56. Immediate HOLD triggers

A launch or expansion decision is `HOLD` when:

- any critical gate is not PASS;
- required evidence is missing, expired, release-mismatched, or unverified;
- UAT is incomplete;
- capacity or staffing is not confirmed;
- a required provider account or live drill is incomplete;
- policy/legal/university dependency is unresolved;
- an active-scope `S1` defect remains;
- reconciliation has an unexplained difference;
- restore or emergency-pause drill failed;
- progressive features are active without their gate; or
- the release candidate changed materially after evidence collection.

---

## 57. Immediate PAUSE or SUSPEND triggers

Noma MUST pause the affected capability or pilot when any of the following occurs:

- forged or uncertain payment creates fulfilment;
- duplicate charge/order/earning/refund/payout is detected;
- ledger does not balance or provider reconciliation materially differs;
- unauthorised payout or payout-account takeover is suspected;
- cross-seller, cross-institution, or privileged access exposure occurs;
- private identity, bank, case, message, or custody evidence is publicly exposed;
- parcel is lost or custody cannot be established;
- serious rider/customer safety incident cannot be contained;
- critical provider/database/queue/monitoring outage makes safe intake impossible;
- Support/Operations coverage is unavailable while new orders are being accepted;
- emergency controls fail;
- a qualifying privacy/security breach requires containment;
- a university/legal instruction requires suspension; or
- Noma cannot reconstruct authoritative order, money, inventory, or custody truth.

Existing obligations are contained and resolved; records are not erased.

---

# Part D — User acceptance and operational approval

## 58. UAT principles

- UAT proves that the actual business role can complete and recover the workflow.
- UAT occurs against the release candidate in an approved production-like environment.
- Controlled live financial drills use production only when authorised.
- UAT uses realistic data and policies without exposing unnecessary personal data.
- Every UAT case records actor, role, environment, start/end, result, defects, evidence, and approver.
- Happy, failure, permission, state, deadline, and escalation paths are included.
- UAT cannot depend on private database edits or developer impersonation.

---

## 59. Buyer UAT

A verified buyer representative MUST demonstrate:

1. registration and email/Covenant verification;
2. public browse, search, filter, product/offer comparison;
3. cart and multi-vendor checkout;
4. truthful capacity/availability/price changes;
5. Paystack payment and uncertain-status handling;
6. order tracking across vendor orders and fulfilments;
7. cancellation where eligible;
8. delegation and secure handoff;
9. buyer-unavailable or failed-delivery communication;
10. product question and order messaging without contact bypass;
11. structured return/dispute evidence;
12. refund status and provider-completion distinction;
13. verified-purchase review; and
14. account/session/security controls.

---

## 60. Seller UAT

A Seller Owner and, where used, Seller Operator MUST demonstrate:

1. onboarding, seller activation, and payout-account confirmation;
2. canonical Product/Offer creation and approval;
3. variants, stock, price, condition, images, warranty, and return classification;
4. order acceptance/confirmation rules;
5. preparation and deadline handling;
6. stock failure and seller cancellation;
7. packaging and pickup handoff;
8. buyer message/substitution controls;
9. case response and evidence;
10. earnings, holds, available balance, withdrawal, and payout states;
11. performance/policy notices; and
12. restriction, suspension continuity, and appeal where applicable.

---

## 61. Rider UAT

A Noma rider representative MUST demonstrate:

1. secure login, shift, availability, and assignment;
2. offline/weak-Wi-Fi indicators and safe retry;
3. pickup instructions and parcel QR;
4. wrong assignment/parcel rejection;
5. custody acceptance;
6. in-transit status;
7. buyer/delegate PIN or QR handoff;
8. invalid/used credential rejection;
9. buyer unavailable, refusal, unsafe handoff, and damaged parcel;
10. evidence capture and incident escalation;
11. reassignment/custody transfer; and
12. return to controlled custody.

---

## 62. CU Express dispatcher/partner UAT

The approved CU Express participant MUST demonstrate:

- receipt/acceptance of Noma-controlled assignments through the agreed interface;
- rider/partner assignment details where available;
- pickup and delivery status handling;
- exception escalation;
- no dependency on an invented partner API;
- custody and evidence boundaries;
- partner reconciliation; and
- safe manual fallback.

---

## 63. Operations and Dispatch UAT

Operations MUST demonstrate:

- live order and exception queues;
- parent/vendor/fulfilment separation;
- seller preparation delay;
- dispatch recommendation and override;
- batching where enabled;
- failed pickup/handoff;
- reassignment and return to custody;
- capacity closure and promise adjustment;
- payment/refund/payout reconciliation queues;
- provider outage/degraded mode;
- emergency pause and controlled restart;
- complete case/order/custody timeline; and
- handover between shifts without private notes.

---

## 64. Support UAT

Support MUST demonstrate:

- product/order communication boundaries;
- case creation and reason codes;
- evidence request and access;
- permitted low-risk actions;
- refund recommendation versus Finance approval;
- deadlines and escalation;
- buyer/seller communication;
- privacy-minimised views;
- harassment/bypass report routing;
- customer status wording; and
- closure without altering provider, ledger, or custody truth.

---

## 65. Finance UAT

Finance MUST demonstrate:

- payment reconciliation;
- order/fee/discount allocation;
- balanced ledger review;
- item-level partial refund;
- refund needs-attention handling;
- seller earning release/hold;
- payout-account review;
- withdrawal approval with maker-checker;
- transfer success/failure/reversal/uncertainty;
- provider-dashboard action import/audit;
- exposure limits; and
- emergency payout pause.

---

## 66. Trust and Safety UAT

Trust and Safety MUST demonstrate:

- bypass/harassment report;
- counterfeit/stolen/prohibited product allegation;
- serious safety case;
- evidence access and preservation;
- temporary containment without premature guilt;
- seller restriction/suspension;
- affected-order continuity;
- appeal and reversal;
- recall case; and
- coordination with Support, Operations, Finance, Security, and university contacts.

---

## 67. Security, Privacy, and Admin UAT

Authorised representatives MUST demonstrate:

- privileged MFA and step-up authentication;
- role/capability grant and revocation;
- maker-checker access change;
- sensitive-data redaction and access audit;
- provider/secret account ownership;
- security alert investigation;
- compromised account/session revocation;
- data-subject request workflow;
- retention/deletion/legal hold;
- incident and breach record;
- feature/capacity/emergency controls; and
- break-glass access with review.

---

## 68. UAT acceptance matrix

| UAT area | Performer | Business approver | Independent verifier |
|---|---|---|---|
| Buyer | invited representative | Product | QA |
| Seller | founding Seller Owner/Operator | Seller Operations | QA/Product |
| Rider | approved rider | Logistics/Operations | QA |
| CU Express | approved partner dispatcher | Partnership/Logistics | Operations/QA |
| Operations/Dispatch | operations staff | Operations Lead | QA/Product |
| Support | support staff | Support Lead | QA/Privacy where relevant |
| Finance | finance staff | Finance Lead | QA/Engineering reviewer |
| Trust and Safety | T&S staff | T&S Lead | Security/QA |
| Security/Privacy/Admin | authorised staff | Security/Privacy Lead | independent reviewer |

All required rows must PASS for paid pilot activation.

---

## 69. UAT defect handling

- UAT defects receive severity, owner, reproduction, affected requirement, workaround, and target release.
- `S0` and active-scope `S1` defects block UAT approval.
- A workaround cannot require unauthorised access, database edits, policy violation, or private consumer communication.
- Re-tested evidence is linked; the original failure remains preserved.
- UAT sign-off expires after a material workflow or permission change.

---

# Part E — Decision authority and records

## 70. Readiness Council

The mandatory readiness council contains:

- Founder/Product owner;
- Engineering owner;
- QA/Release evidence owner;
- Operations owner;
- Finance owner;
- Security/Privacy owner;
- Logistics/Partnership owner;
- Support/Trust and Safety representatives as required; and
- legal/DPCO/university stakeholders as required by their gate.

QA/Release attests evidence completeness. Domain owners accept operational responsibility.

---

## 71. Paid `GO` approval rule

`GO_CONTROLLED_LIVE` or `GO_CLOSED_PILOT` requires signed PASS from:

- Product;
- Engineering/Release;
- QA;
- Operations;
- Finance;
- Security/Privacy;
- Logistics/Partnership; and
- every required Legal/Covenant dependency recorded as resolved.

Silence is not approval. A missing mandatory approval means `HOLD`.

---

## 72. `GO_CONTROLLED_LIVE`

This decision authorises only:

- the `C1` cohort and limits;
- the recorded operating window;
- Standard delivery;
- the approved sellers/categories;
- controlled real payment, fulfilment, refund, earning, withdrawal, and payout activity; and
- the named on-call team.

It does not authorise the broader C2 cohort or progressive capabilities.

---

## 73. `GO_CLOSED_PILOT`

This decision authorises only:

- the recorded `C2` cohort and limits;
- the approved operating windows;
- selected founding sellers and categories;
- Standard delivery;
- the approved policy/configuration/release; and
- progressive features explicitly listed as active—normally none at first C2 activation.

Any unlisted progressive capability remains disabled.

---

## 74. `HOLD`

`HOLD` means:

- production may remain deployed;
- real payment/order activation does not proceed, or expansion does not occur;
- the decision identifies failed/missing gates;
- owners and corrective evidence are assigned;
- a new review date is recorded; and
- no one bypasses the hold through provider dashboards or feature flags.

---

## 75. `PAUSE_SCOPED`

A scoped pause may stop:

- checkout;
- a payment method;
- payouts;
- one seller;
- one category;
- one delivery tier;
- one operating window;
- Food;
- External Vendor commerce;
- FBN;
- Pre-Owned;
- messaging; or
- one compromised privileged account.

The pause record includes reason, scope, owner, accepted obligations, communication, evidence preservation, and restart conditions.

---

## 76. Temporary pilot suspension

`TEMPORARILY_SUSPEND_PILOT` stops all new real obligations for the institution while:

- existing orders and parcels are contained;
- customers/sellers are informed appropriately;
- money and custody are reconciled;
- incidents are investigated;
- recovery evidence is produced; and
- the Readiness Council determines restart or closure.

Public status information may remain available.

---

## 77. Emergency stop authority

Without waiting for a full council meeting, the following may invoke an emergency pause within their domain:

- Finance Lead — payments, refunds, payouts, financial reconciliation;
- Security Lead — compromised accounts, access, secrets, data exposure, attack;
- Operations/Logistics Lead — unsafe intake, dispatch, custody, rider/customer safety;
- Engineering/Release Lead — database, queue, integrity, deployment, severe outage;
- Product/Founder — broad consumer or policy risk.

Emergency actions are audited and reviewed as soon as practicable. Emergency authority cannot mark false outcomes or delete obligations.

---

## 78. Restart after pause

Restart requires:

- incident/deficiency contained;
- authoritative money, order, inventory, custody, and access truth reconstructed;
- affected evidence preserved;
- corrective change tested;
- relevant gate revalidated;
- customer/seller remediation planned;
- monitoring increased where appropriate;
- responsible owners approve; and
- a restart decision is recorded.

A feature flag flip alone is not restart evidence.

---

## 79. Decision record schema

```yaml
decision_id: READY-2026-001
decision: GO_CLOSED_PILOT
release_id: "..."
commit_sha: "..."
institution: covenant-university
pilot_stage: P4
capacity_profile: C2
active_features:
  - PRODUCT
  - STANDARD_DELIVERY
inactive_progressive_features:
  - FOOD
  - PRIORITY
  - SAVER
  - EXTERNAL_VENDOR_LIVE
  - FBN
  - PRE_OWNED_EXPANDED
approved_sellers: []
approved_cohorts: []
operating_window: "..."
gate_statuses: {}
open_non_blocking_defects: []
known_limitations: []
pause_triggers: []
approvals: []
effective_at: "..."
review_at: "..."
expires_at: "..."
```

---

## 80. Decision validity

A GO decision expires at the earliest of:

- its recorded expiry;
- material release/configuration/policy/provider change;
- capacity increase beyond approval;
- serious incident;
- staff/coverage loss;
- university/legal instruction;
- critical evidence expiry; or
- emergency pause.

Ordinary releases that do not affect a critical path still require normal release gates and smoke evidence.

---

# Part F — Progressive feature and expansion gates

## 81. Common progressive-feature gate

A progressive capability may move through:

```text
NOT_ELIGIBLE
EVIDENCE_PENDING
APPROVED_FOR_INTERNAL_TEST
LIMITED_PILOT
ACTIVE
PAUSED
```

Activation requires:

- scope remains permitted by Part 1;
- complete lifecycle, permissions, states, persistence, UI, operations, cases, finance, and security exist;
- actor UAT passes;
- capacity and staffing exist;
- metrics and rollback triggers are defined;
- baseline product pilot is stable;
- only the approved cohort/sellers/categories are enabled; and
- a separate decision record exists.

---

## 82. Food activation gate

Food may enter `LIMITED_PILOT` only after:

- at least `100` stable completed product orders and `14` days at C2;
- food catalogue, operating hours, availability, modifiers, allergens where applicable, preparation estimates, seller acceptance, ready state, perishable cancellation, and handoff flows pass;
- selected outlet training and UAT pass;
- food-specific Support/remedy wording exists;
- delivery capacity protects freshness and does not degrade existing obligations;
- initial limit is no more than `2` outlets and `5` food orders per day;
- Food can be paused independently; and
- no FBN/cold-chain assumption exists.

---

## 83. Priority delivery activation gate

Priority may enter `LIMITED_PILOT` only after:

- at least `50` completed Standard deliveries;
- Standard promise accuracy is `>= 90%`;
- dedicated capacity exists;
- the premium creates a real operational distinction;
- compensation/refund treatment for missed Priority promise is approved;
- Priority orders are protected from incompatible batching; and
- initial limit is no more than `5` Priority deliveries per day.

---

## 84. Saver activation gate

Saver may enter `LIMITED_PILOT` only after:

- batching rules and parcel-level custody are proven;
- at least `30` successful compatible batch simulations/drills and `20` live Standard deliveries provide route-density evidence;
- buyer sees a truthful wider window and lower price where justified;
- food/perishable and incompatible high-risk parcels are excluded;
- each parcel retains individual pickup/handoff proof; and
- initial limit is no more than `10` Saver orders per day.

---

## 85. External Vendor activation gate

Selected external vendors may enter `LIMITED_PILOT` only after:

- baseline Covenant commerce is stable;
- vendor is invite-only and completes enhanced verification;
- external inbound shipment, identity, tracking, receipt, discrepancy, delay, cancellation, refund, and customer communication pass;
- the Noma/CU Express campus-last-mile boundary is approved;
- no nationwide public onboarding exists;
- initial limit is `1–2` vendors and no more than `5` external orders per day; and
- external delays cannot silently consume Standard campus capacity.

---

## 86. FBN activation gate

FBN may enter `LIMITED_PILOT` only after:

- one physical location is formally approved;
- access, safety, security, insurance/liability, hours, and staffing are approved;
- inbound, receiving, discrepancy, putaway, bin, label, inventory movement, reservation, pick, pack, handoff, return, quarantine, and cycle-count workflows pass;
- staff UAT passes;
- at least `30` simulated/test pick-pack-handoff cycles pass;
- inventory/cycle-count accuracy is `>= 99%` before live stock;
- initial live stock is low-risk, non-perishable, selected SKUs only;
- capacity is configured by bin/SKU/unit; and
- hot food, medicines, fragile/high-value electronics, cold-chain, hazardous, oversized, and unsupported pre-owned electronics remain prohibited.

---

## 87. Limited Pre-Owned activation gate

Low-risk Pre-Owned may enter `LIMITED_PILOT` only after:

- approved categories are books, selected clothing/accessories, and ordinary non-electronic student items;
- actual-unit images, condition grade, defects, included items, ownership declaration, unit quantity, snapshot, evidence, returns, and dispute flows pass;
- seller/category/value limits are configured;
- initial active pre-owned offers do not exceed `20`;
- initial pre-owned item value does not exceed `NGN 15,000` without a separate review;
- phones, laptops, high-risk electronics, Noma Verified badge, and general refurbished claims remain disabled; and
- Operations can pause one offer/category/seller independently.

---

## 88. Noma Verified Pre-Owned gate

`NOMA_VERIFIED_PRE_OWNED` remains disabled until a future approved contract defines and proves:

- qualified inspector/partner;
- testing standards and tools;
- inspection custody;
- evidence and expiry;
- liability and warranty;
- reinspection;
- quality assurance;
- counterfeit/ownership handling; and
- customer remedy.

Seller self-declaration can never activate this badge.

---

## 89. Expansion review cadence

During C1 and the first two weeks of C2:

- daily operational review;
- end-of-window reconciliation;
- immediate incident review; and
- weekly Readiness Council review.

After stability:

- weekly operating review;
- monthly access/security/privacy review as required by Part 10;
- expansion review no more frequently than weekly; and
- one material operational expansion at a time where possible.

---

## 90. Expansion decision criteria

An expansion may proceed only when:

- critical gates remain PASS;
- sample/time criteria in Section 55 are met;
- financial reconciliation is complete;
- thresholds are achieved or the decision explains why no expansion occurs;
- Operations, Support, Finance, riders, sellers, and infrastructure have spare capacity;
- no unresolved severe incident exists;
- increased capacity has passed average, 2× headroom, spike, and relevant soak testing;
- additional funding/exposure is approved;
- rollback triggers and lower capacity profile are ready; and
- the decision states exactly one cohort, seller, capacity, window, category, or feature change.

---

## 91. Continue, restrict, reduce, or roll back

Noma SHOULD choose `NO_CHANGE` or `CONTINUE_AT_CURRENT_CAPACITY` when evidence is positive but sample or staffing remains insufficient.

Noma MUST choose restriction/reduction/rollback when:

- a recent expansion worsens promise accuracy, cancellations, case load, safety, reconciliation, or staff overload;
- one seller/category/tier is the source of material failures;
- Support or delivery capacity falls;
- provider cost or reliability becomes unsafe; or
- progressive capability evidence no longer remains valid.

Rolling back capacity is a successful safety control, not a product failure.

---

# Part G — Launch-day and post-launch operations

## 92. Pre-activation freeze

Before GO:

- release candidate, migrations, configuration, policies, sellers, catalogue, cohorts, capacity, and evidence are frozen;
- only launch-blocker corrections may enter;
- any change triggers impact review and evidence revalidation;
- production credentials and feature controls are checked by maker-checker;
- on-call and stakeholder contacts are confirmed; and
- status/Support messages are prepared.

---

## 93. Activation sequence

Recommended controlled sequence:

```text
1. confirm production health and current backups
2. confirm staff/on-call attendance
3. confirm sellers/riders/locations/capacity
4. confirm Paystack/provider health
5. confirm emergency pause controls
6. enable approved buyer cohort
7. enable real payment initialisation
8. enable order confirmation for verified payments
9. place one authorised smoke order
10. reconcile payment/order/ledger/custody/notifications
11. open the approved intake window
```

If the smoke order fails a critical invariant, checkout remains paused.

---

## 94. Launch monitoring room

During C1 and initial C2 windows, named staff monitor:

- payment initialisation/verification/webhooks;
- paid-but-unconfirmed exceptions;
- inventory reservations;
- seller acceptance/preparation;
- unassigned or delayed delivery jobs;
- pickup and handoff failures;
- Support and case queues;
- refunds, holds, and payout exposure;
- errors, latency, queues, database, storage, and email;
- security alerts; and
- capacity limits.

Issues are recorded in the operational system, not only in group chat.

---

## 95. First 24 hours

Before the next expansion/window, Noma MUST review:

- every payment and order reconciliation;
- every failed/abandoned/uncertain payment;
- every seller cancellation or preparation miss;
- every delivery attempt and custody event;
- every case/refund;
- every privileged action;
- every alert and error cluster;
- user feedback;
- staff workload; and
- whether capacity should remain, reduce, or pause.

No automatic cohort expansion occurs after a good first day.

---

## 96. First seven days

The first weekly readiness review includes:

- complete metric counts and rates;
- financial reconciliation sign-off;
- seller and inventory review;
- delivery and safety review;
- Support/protection review;
- security/privacy/access review;
- performance/reliability review;
- provider cost and limits;
- unresolved defects/incidents;
- staffing sustainability;
- unit economics; and
- a recorded continue/restrict/pause decision.

---

## 97. Status and stakeholder communication

Noma must have approved communication for:

- delayed or paused checkout;
- payment uncertainty;
- seller cancellation;
- delivery delay/failed attempt;
- refund approval versus completion;
- provider outage;
- feature/category pause;
- security/privacy incident where disclosure is required;
- pilot suspension; and
- restart.

Communication must be accurate, privacy-conscious, and not claim completion before authoritative evidence.

---

## 98. Pilot closure or end-of-phase review

At the end of a pilot phase, Noma records:

- completed and unresolved obligations;
- money and custody reconciliation;
- metrics and incidents;
- policy and consumer-remedy outcomes;
- seller, rider, buyer, and staff feedback;
- security/privacy and provider findings;
- unit economics;
- retained/deleted evidence;
- decision to expand, continue, redesign, restrict, or close; and
- required updates to Parts 1–13.

Pilot closure does not delete financial, consumer, incident, or audit obligations.

---

# Part H — Repository artefacts and governance

## 99. Required readiness artefacts

```text
docs/13-covenant-pilot-readiness.md
evidence/readiness/register.yml
evidence/readiness/gates/*.yml
evidence/readiness/uat/*.yml
evidence/readiness/decisions/*.yml
evidence/releases/<release-id>/
quality/release-gates.yml
quality/requirement-test-matrix.yml
operations/capacity-profiles.yml
operations/operating-windows.yml
operations/on-call-roster.yml
operations/pilot-cohorts.yml
operations/approved-sellers.yml
runbooks/launch/
runbooks/incidents/
runbooks/integrations/
compliance/processing-register/
compliance/provider-register/
compliance/retention-schedule/
security/access-reviews/
```

Exact layout may adapt to repository conventions, but the responsibilities and traceability may not disappear.

---

## 100. Gate register schema

```yaml
gate_id: RG-05
name: Payments and finance
critical: true
owner: Finance Lead
status: IN_PROGRESS
requirements:
  - id: READ-RG05-001
    status: PASS
  - id: READ-RG05-002
    status: IN_PROGRESS
blocking_defects: []
non_blocking_defects: []
approvals: []
last_reviewed_at: "..."
expires_at: "..."
```

Automated validation SHOULD fail when a gate references missing evidence or a PASS item has expired.

---

## 101. Capacity profile schema

```yaml
profile_id: C2
institution: covenant-university
buyer_cohort_limit: 100
active_seller_limit: 8
paid_orders_per_day: 25
paid_orders_per_hour: 6
concurrent_delivery_limit: 4
max_order_minor: 5000000
max_item_minor: 3000000
max_sellers_per_cart: 3
max_lines_per_order: 10
active_features:
  - PRODUCT
  - STANDARD_DELIVERY
inactive_features:
  - FOOD
  - PRIORITY
  - SAVER
  - EXTERNAL_VENDOR_LIVE
  - FBN
  - NOMA_VERIFIED_PRE_OWNED
approved_by: []
effective_at: "..."
```

---

## 102. Readiness dashboard rules

A dashboard MAY summarise:

- gate statuses;
- evidence expiry;
- defects;
- capacity consumption;
- financial exceptions;
- operational queues;
- metrics and thresholds;
- incidents; and
- decisions.

The dashboard is a projection. The evidence register, provider records, PostgreSQL authoritative data, approvals, and decision records remain the source of truth.

No single readiness percentage may display `READY` while a critical gate fails.

---

## 103. Scope-change impact on readiness

Every approved scope change identifies:

- affected gates;
- affected UAT;
- affected evidence;
- capacity impact;
- provider/security/privacy impact;
- release impact;
- revised schedule; and
- whether the current GO decision expires.

Last-minute P1 additions cannot displace P0 readiness work without explicit Product and Readiness Council approval.

---

## 104. Provider and legal re-verification

Before each paid launch or material expansion, owners re-check:

- current provider account approval, plan, limits, region, terms, webhooks, and security settings;
- current Paystack live behaviour and transfer/refund requirements;
- current hosting/database/queue backup and recovery capability;
- provider subprocessors and cross-border records;
- applicable NDPC/FCCPC obligations;
- Covenant approvals and operating restrictions; and
- unresolved legal/DPCO advice.

Earlier research dates do not replace launch-time verification.

---

## 105. Readiness evidence retention

- Release and gate evidence follows the Part 10 retention schedule.
- Evidence containing personal data is minimised, access-controlled, and deleted when no longer required.
- Security details are restricted by need-to-know.
- Financial and audit evidence is retained without mutating authoritative history.
- Superseded evidence remains traceable but clearly marked.
- Legal holds suspend deletion only for the defined scope and reason.

---

## 106. Audit requirements

Audit events are required for:

- gate status changes;
- evidence upload/replacement;
- waiver or `NOT_APPLICABLE` decision;
- GO/HOLD/PAUSE/ROLLBACK/SUSPEND decision;
- capacity change;
- cohort/seller activation;
- progressive-feature activation;
- emergency control use;
- final activation of real payments/orders;
- restart; and
- access to restricted readiness evidence.

---

## 107. Prohibited readiness shortcuts

Noma, Codex, and contributors MUST NOT:

1. equate deployment with launch;
2. calculate one readiness percentage that hides a critical failure;
3. mark a gate PASS without evidence links;
4. use an expired or different-release result;
5. let Codex approve its own work;
6. let Engineering sign seller/rider/Finance UAT for the intended actor;
7. waive an S0 issue;
8. waive an active-scope S1 issue merely for a date;
9. treat a provider `200` as final payment/refund/payout truth;
10. trust a browser redirect as payment success;
11. accept an unbalanced ledger;
12. retry an uncertain money movement blindly;
13. open checkout without enforceable capacity;
14. open ordering without staffed Support and Operations;
15. rely on WhatsApp or private notes as the only operational record;
16. use direct database edits to pass UAT;
17. use shared privileged accounts;
18. launch with privileged MFA disabled;
19. launch with public or permanently accessible private evidence;
20. claim backup readiness without isolated restore;
21. continue accepting orders when monitoring blindness makes operation unsafe;
22. claim a parcel delivered without valid one-time handoff evidence;
23. erase or rewrite financial, custody, case, enforcement, or audit history;
24. activate Food, FBN, External Vendor, Priority, Saver, or expanded Pre-Owned because code exists;
25. activate Noma Verified Pre-Owned without genuine inspection capability;
26. add minors without the approved legal/guardian workflow;
27. hardcode unconfirmed Covenant email or identifier rules;
28. depend on an invented Covenant or CU Express API;
29. make maps, SMS, external search, wallet, COD, or native apps launch dependencies;
30. hide unresolved defects behind feature flags where active paths still depend on them;
31. expand buyer count without matching delivery/Support capacity;
32. expand payout exposure without Finance approval and reconciliation evidence;
33. change policies after buyer payment without preserving the purchased version;
34. change capacity during an operating window without an authorised emergency reason;
35. silently reopen after a pause;
36. let commercial metrics override a security, safety, financial, privacy, or legal blocker;
37. treat one successful order as proof of operating readiness;
38. treat “pilot” as permission for weak consumer remedies;
39. store production secrets or private personal data in the evidence repository; or
40. allow a deadline, investor, provider, founder, or administrator to override the gate contract.

---

## 108. Definition of readiness done

Part 13 is operationally complete only when:

- all gate/evidence schemas are implemented;
- named owners and approvers exist;
- C1/C2 capacity profiles are configured and tested;
- the UAT matrix is complete;
- GO/HOLD/PAUSE controls are implemented and rehearsed;
- progressive-feature gates are represented;
- decision records are version-controlled;
- launch, incident, pause, restart, and review runbooks exist;
- the release evidence pack can be assessed without private demonstrations; and
- no critical decision depends on an undocumented assumption.

---

## 109. Handoff after numbered Build Pack completion

This document completes the thirteen numbered Build Pack contracts:

```text
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

The complete repository documentation pack still requires the foundation files identified by Part 1:

```text
docs/00-product-vision.md
AGENTS.md
README.md
```

Those files summarise and route contributors into the binding contracts; they must not weaken Parts 1–13.

---

## 110. Final readiness declaration

Noma may accept real Covenant University marketplace obligations only through a staged, evidence-based, capacity-limited decision.

Real payment and order activation requires the complete system—not only the storefront—to demonstrate together:

- approved scope and repository authority;
- Nigerian legal/privacy/consumer and applicable Covenant operating readiness;
- trained and properly authorised people;
- organisation-controlled production infrastructure and providers;
- truthful sellers, catalogue, inventory, prices, condition, warranty, and policy snapshots;
- provider-verified payments, item-level allocations, balanced ledger, refunds, earnings, withdrawals, and provider-confirmed payouts;
- Noma-controlled fulfilment, assignment, custody, one-time handoff, failed-attempt, and recovery;
- structured Support, protection, returns, disputes, reviews, enforcement, appeals, recalls, and safety containment;
- secure identity, sessions, authorization, data protection, evidence, secrets, and incident response;
- passing concurrency, provider-failure, accessibility, performance, compatibility, and recovery evidence;
- role-specific UAT without developer intervention;
- enforceable cohorts, operating windows, value limits, delivery limits, financial exposure, and emergency stops; and
- unanimous approval from the mandatory Readiness Council owners.

The first paid activation uses `C1` controlled-live limits. The closed pilot uses `C2` limits only after successful controlled-live evidence. Expansion or a progressive feature requires its own later decision, sample, capacity, test, UAT, staffing, rollback, and monitoring evidence.

When Noma cannot safely support new obligations, it will hold, restrict, reduce, pause, roll back, or suspend intake while preserving and resolving existing money, orders, inventory, custody, cases, consumer rights, and audit history.

> **Noma is ready only when it can prove not just that it can take an order, but that it can truthfully fulfil, protect, reconcile, support, recover, and stop the marketplace under real Covenant conditions.**
