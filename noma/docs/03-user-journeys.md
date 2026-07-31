# Noma End-to-End User Journeys and Critical Flows

> **Repository path:** `docs/03-user-journeys.md`  
> **Status:** Locked journey contract  
> **Version:** 1.0  
> **Effective date:** 30 July 2026  
> **Applies to:** Noma's two-month Covenant University pilot build  
> **Primary audience:** Founders, Product, Design, Engineering, Codex, Operations, Support, Finance, Trust and Safety, Logistics, Quality Assurance, and future contributors

---

## 1. Purpose

This document defines the end-to-end user journeys and critical operational flows that Noma must support for the controlled Covenant University pilot.

It translates the locked MVP scope and role model into observable journeys across:

- the public Marketplace and Buyer Account;
- Seller Centre;
- Rider PWA;
- CU Express partner workflows;
- Noma Operations;
- Support;
- Finance;
- Trust and Safety; and
- Restricted Administration.

For each journey, this document establishes:

- the user or operational objective;
- participating actors and surfaces;
- entry conditions and triggers;
- the required happy path;
- material exception paths;
- ownership handoffs;
- evidence, audit, and notification requirements;
- completion conditions; and
- prohibited shortcuts.

The purpose is not to prescribe final page layouts or database schemas. It is to ensure that Design, Engineering, Codex, Operations, and Quality Assurance implement and test the same complete operating model.

A journey is not complete because its first screen renders. It is complete only when the user obligation, operational obligation, financial consequence, custody consequence, communication, and recovery path have all reached an honest and auditable outcome.

---

## 2. Authority and relationship to other Build Pack documents

This document is governed by:

1. `docs/01-mvp-scope.md`, which controls what is active, progressive, manual, deferred, or prohibited for the Covenant pilot.
2. `docs/02-user-roles.md`, which controls who may view, initiate, approve, execute, or override each action.
3. This document, which controls the required end-to-end behaviour and cross-surface handoffs.
4. Future documents, which may define information architecture, visual patterns, technical architecture, domain models, state machines, integrations, security controls, tests, backlog tasks, and launch evidence.

Future documents may clarify implementation but must not:

- activate a deferred commerce type;
- give an actor authority prohibited by `docs/02-user-roles.md`;
- collapse customer payment, seller earning, refund, payout, or custody into one state;
- remove a required exception path;
- replace provider-confirmed or evidence-confirmed truth with a manual status edit; or
- make a journey appear complete while a material obligation remains unresolved.

Where this document uses illustrative state names, `docs/08-state-machines.md` will define the final machine-readable state vocabulary. The semantic checkpoints, ownership boundaries, and completion rules in this document remain binding.

---

## 3. Normative language

The keywords below are binding:

- **MUST / MUST NOT:** mandatory for the applicable pilot stage.
- **SHOULD / SHOULD NOT:** expected unless an approved, documented reason exists.
- **MAY:** optional within the locked boundary.
- **SYSTEM:** a trusted backend or provider-driven action, not a client claim.
- **HUMAN DECISION:** a decision made by an authorised person through a controlled, auditable workflow.
- **PROGRESSIVE:** implemented or architected but exposed only after a separate activation gate.
- **FEATURE-GATED:** unavailable to ordinary users until the applicable institution/category/seller gate is enabled.
- **TERMINAL:** no normal forward transition remains, although reconciliation, appeal, audit, or reversal records may still be added.
- **RESUMABLE:** the user or operator can safely continue from the last confirmed checkpoint without duplicating money, stock, custody, or records.

---

## 4. Journey design principles

### 4.1 One human identity, multiple scoped experiences

A person may act as a buyer, seller representative, rider, or authorised staff member through one Noma identity with separately approved memberships and capabilities.

Surface switching must not merge authority. A user acting in Seller Centre does not gain Operations access, and a rider who is also a buyer cannot use buyer ownership to alter an assigned Delivery Job.

### 4.2 The customer sees one understandable order; Noma preserves internal independence

A multi-vendor checkout produces one understandable Buyer Order while Noma internally maintains independent:

- Vendor Orders;
- item allocations;
- Fulfilment Groups;
- Delivery Jobs;
- seller earnings;
- cancellations;
- refunds; and
- protection outcomes.

One seller's failure must not silently destroy unaffected portions.

### 4.3 Status language must describe truth, not aspiration

Noma must distinguish:

- payment initiated from payment confirmed;
- refund approved from refund completed;
- transfer initiated from payout paid;
- rider arrived from parcel delivered;
- seller message from formal order transition;
- temporary safeguard from final fault decision;
- updated ETA from the original committed promise; and
- application approval from seller activation.

### 4.4 Provider truth and custody truth are authoritative

A browser redirect, seller statement, staff note, or manually edited field must not replace:

- verified Paystack payment information;
- provider-confirmed refund status;
- provider-confirmed transfer outcome;
- valid pickup credential and custody event;
- valid delivery credential and handoff event; or
- controlled return/inspection evidence.

### 4.5 Every critical journey requires an exception path

The following are not edge cases to be added after launch:

- duplicate or delayed provider events;
- seller rejection or out-of-stock failure;
- buyer cancellation;
- preparation delay;
- rider unavailability;
- failed pickup;
- failed handoff;
- damaged or missing item;
- partial refund;
- payout failure or reversal;
- identity conflict;
- unauthorised access;
- serious safety concern; and
- temporary platform pause.

### 4.6 Manual operation still requires system control

Where the pilot uses human judgement, the system must still provide:

- a defined queue;
- an authorised actor;
- current state and deadlines;
- evidence and communication;
- allowed decisions;
- financial and operational consequences;
- audit history; and
- escalation or appeal.

Manual must not mean spreadsheets, private WhatsApp messages, or unexplained database edits as the source of truth.

### 4.7 Minimise data at every handoff

Each actor receives only the information required for their current task.

Examples:

- a seller does not receive the buyer's private room location or unrelated cart contents;
- a rider receives only the assignment, approved points, parcel, handling, and recipient credential information required for delivery;
- Support sees only cases within authorised scope;
- Finance does not receive unrestricted identity evidence; and
- Trust and Safety does not receive seller payout credentials unless the case requires them.

### 4.8 Critical journeys must be resumable and idempotent

Retries, refreshes, duplicate clicks, duplicate webhooks, worker retries, and intermittent Wi-Fi must not create duplicate:

- orders;
- payments;
- reservations;
- refunds;
- seller earnings;
- Delivery Jobs;
- pickup events;
- handoffs;
- withdrawals; or
- enforcement actions.

### 4.9 Feature and capacity gates participate in the journey

A technically implemented flow is not automatically live.

Every journey must check applicable:

- institution activation;
- buyer cohort eligibility;
- seller activation;
- category and product policy;
- commerce type;
- delivery tier;
- operating hours;
- order-value and order-volume limits;
- logistics capacity;
- financial exposure; and
- emergency pause state.

### 4.10 No protected journey depends on off-platform communication

WhatsApp, personal telephone calls, private bank transfer, and private delivery arrangements are not authoritative parts of a Noma journey.

Where exceptional contact is necessary, it must be authorised, purpose-limited, and recorded through the applicable case or Operations workflow.

---

## 5. Journey specification standard

Each detailed journey in this document uses the following fields:

| Field | Meaning |
|---|---|
| Journey ID | Stable reference for design, engineering, testing, and backlog traceability |
| Criticality | `P0` launch-blocking, `P1` progressive activation-blocking, or `P2` important but not a paid-order launch blocker |
| Primary actor | Person or system pursuing the main objective |
| Supporting actors | Other participants required to complete the journey |
| Surfaces | Marketplace, Buyer Account, Seller Centre, Rider, Operations, Support, Finance, Trust and Safety, Admin, worker, or provider |
| Preconditions | Facts that must be true before entry |
| Trigger | Event that begins the journey |
| Required flow | Binding sequence of user-visible and system-visible checkpoints |
| Exception paths | Material alternate or failure branches |
| Evidence and audit | Records that must be preserved |
| Completion | Honest terminal or handoff condition |
| Metrics | Minimum journey measurements |
| Prohibited shortcuts | Behaviour the pilot must reject |

The journeys define outcomes and boundaries. Exact screen names, API names, event names, and database models will be locked in later Build Pack documents.

---

## 6. Journey inventory and pilot priority

| ID | Journey | Criticality | Pilot status |
|---|---|---:|---|
| `J01` | Public discovery, registration, and account entry | P0 | Active |
| `J02` | Hybrid Covenant affiliation verification | P0 | Active |
| `J03` | Search, product comparison, and offer selection | P0 | Active |
| `J04` | Cart, eligibility, delivery promise, and checkout review | P0 | Active |
| `J05` | Paystack payment and confirmed order creation | P0 | Active |
| `J06` | Payment uncertainty, failure, duplicate event, and reconciliation | P0 | Active |
| `J07` | Seller application, approval, training, and activation | P0 | Active for selected sellers |
| `J08` | Product/offer listing, moderation, and inventory publication | P0 | Active |
| `J09` | Vendor Order acceptance, preparation, and readiness | P0 | Active |
| `J10` | Multi-vendor partial failure and unaffected-order continuity | P0 | Active |
| `J11` | Lifecycle-based buyer or operational cancellation | P0 | Active |
| `J12` | Dispatch, rider assignment, pickup, and custody transfer | P0 | Active |
| `J13` | Delivery arrival, authenticated handoff, and completion | P0 | Active |
| `J14` | Delegated collection | P1 | Controlled activation |
| `J15` | Failed handoff, secure custody, redelivery, or specialised disposal | P0 | Active |
| `J16` | Structured messaging and buyer-approved substitution | P1 | Active with limited substitution |
| `J17` | Protection Case, return, dispute, and remedy decision | P0 | Active |
| `J18` | Full or partial refund lifecycle | P0 | Active |
| `J19` | Verified-purchase review and moderation | P2 | Active after eligible completion |
| `J20` | Seller earnings release, withdrawal, and payout | P0 | Active with human Finance approval |
| `J21` | Seller payout-account creation or change | P0 | Active with strong controls |
| `J22` | Rider application, approval, shift, and availability | P0 | Active for approved capacity |
| `J23` | Seller performance restriction, suspension, appeal, and continuity | P0 | Active |
| `J24` | Food order lifecycle | P1 | Feature-gated |
| `J25` | External-vendor inbound and campus last-mile handoff | P1 | Invite-only late-beta |
| `J26` | Fulfilled by Noma Campus inbound, storage, pick, pack, and return | P1 | Physical-site gated |
| `J27` | Structured pre-owned listing and high-risk controls | P1 | Lower-risk categories first |
| `J28` | Product safety incident, recall, and parcel/inventory containment | P0 | Recorded and manually coordinated |
| `J29` | Operational incident, emergency pause, recovery, and restart | P0 | Active |
| `J30` | Account recovery, session revocation, and compromised-access containment | P0 | Active |

A P1 journey must pass its own activation tests before exposure. A P2 journey may not delay first paid orders if its absence does not weaken legal, financial, safety, or protection obligations, but any implemented version must still comply with this contract.

---

## 7. Common cross-journey experience requirements

### 7.1 Required status presentation

Every material object visible to a user or operator must expose:

- current status in plain language;
- last confirmed event and time;
- next expected action and responsible party;
- applicable deadline or promise;
- whether the user must act;
- whether money or custody is still processing;
- escalation path when delayed; and
- complete history appropriate to the actor's scope.

### 7.2 Required action-result pattern

For a material action, Noma must:

1. validate identity, capability, scope, feature, current state, and capacity;
2. show the material consequence before confirmation where practical;
3. require explicit confirmation;
4. create an idempotency boundary;
5. perform the transaction or queue the asynchronous work;
6. return an honest result such as `accepted`, `processing`, `completed`, or `failed`;
7. record an audit or domain event where material;
8. notify affected actors; and
9. provide a safe retry or Support path.

### 7.3 Required error experience

Errors must distinguish:

- invalid user input;
- no longer eligible;
- changed inventory or price;
- capacity unavailable;
- authentication required;
- permission denied;
- state conflict;
- provider processing;
- temporary infrastructure failure;
- action already completed; and
- action requiring staff review.

The interface must not tell a user to repeat a payment, refund, or payout action when the outcome is uncertain.

### 7.4 Required notification behaviour

Material transitions must create an in-app notification. Transactional email is required where the event affects payment, order, refund, payout, security, enforcement, or a time-sensitive action.

Progressive web push may supplement, but not replace, the authoritative in-app record.

Notifications must not reveal sensitive details on a locked device and must link the user to an authenticated Noma surface rather than asking them to act through WhatsApp.

### 7.5 Required timeline behaviour

Buyer, seller, rider, staff, and system events must be distinguishable.

System-generated events cannot be edited by participants. Corrections create new entries or explicit reversals rather than rewriting history.

---

# Part A — Buyer and Marketplace Journeys

## 8. `J01` — Public discovery, registration, and account entry

**Criticality:** P0  
**Primary actor:** Guest or returning Account Holder  
**Supporting actors:** Identity service, notification worker  
**Surfaces:** Marketplace, authentication, Buyer Account

### Objective

Allow anyone to understand Noma's public catalogue and value before registration, while requiring a secure account and appropriate Covenant eligibility before protected campus checkout.

### Preconditions

- Covenant Marketplace visibility is enabled.
- Public catalogue records are approved and active.
- The platform is not under a public-browsing pause.

### Trigger

A visitor opens Noma directly or follows a product, seller, category, collection, or campaign link.

### Required flow

1. The Guest can browse public products, categories, seller offers, prices, general promises, and policies.
2. The Guest can search, filter, compare offers, and maintain a temporary cart.
3. Private seller, buyer, operational, or institutional information remains hidden.
4. At a protected action—checkout, order history, messaging, review, seller application, rider application, or case submission—Noma requests authentication.
5. A new user submits the minimum account fields and accepts applicable terms and privacy notices.
6. Noma creates one general identity and begins email verification.
7. On successful verification, the user enters Buyer Account but does not automatically receive Covenant checkout, seller, rider, or staff authority.
8. The temporary cart is safely attached to the authenticated account where eligible.
9. The user is directed to `J02` when Covenant affiliation is required.

### Exception paths

- Existing email: direct to secure sign-in or account recovery without disclosing account details.
- Expired verification: issue a new bounded token subject to rate limits.
- Suspended account: block protected access and show the permitted Support or appeal route.
- Capacity-limited pilot cohort: allow browsing but explain that checkout is not currently available to the account.
- Terms or privacy notice changed materially: require acknowledgement before the applicable protected action.

### Evidence and audit

- account creation;
- verification events;
- terms/privacy version accepted;
- login and security events;
- cart ownership transfer; and
- restriction or cohort decision.

### Completion

The user either:

- remains a Guest with a public cart;
- becomes an authenticated Account Holder;
- continues to Covenant verification; or
- receives a truthful restriction/recovery outcome.

### Metrics

- browse-to-registration conversion;
- registration completion;
- email-verification completion;
- duplicate-account recovery rate; and
- failed/abusive registration attempts.

### Prohibited shortcuts

- forcing registration before ordinary public browsing;
- granting Covenant checkout because an account exists;
- creating duplicate identities for buyer, seller, and rider roles; or
- exposing whether an email belongs to a specific person.

---

## 9. `J02` — Hybrid Covenant affiliation verification

**Criticality:** P0  
**Primary actor:** Account Holder  
**Supporting actors:** Institution Verification Reviewer, notification worker, future institution provider  
**Surfaces:** Buyer Account, Operations/verification queue, Restricted Administration

### Objective

Verify current Covenant student or staff affiliation using the minimum necessary evidence, automatically approving straightforward cases and routing conflicts to proportionate manual review.

### Preconditions

- The user has an active Noma account.
- Covenant verification rules, approved domains, identifier formats, retention policy, and reviewer access are configured by authorised staff.

### Trigger

The user starts Covenant verification or attempts a Covenant-protected action without an active affiliation.

### Required flow

1. The user selects `STUDENT` or `STAFF` and enters full name, approved institutional email, matric/staff identifier, and required contact information.
2. Noma normalises inputs and checks format, domain, identifier, duplication, account conflicts, and active restrictions.
3. The user proves control of the institutional email through a one-time link or code.
4. Straightforward cases satisfying configured rules are auto-approved.
5. The affiliation record becomes active with method, time, institution, affiliation type, and revalidation information.
6. Covenant-specific capabilities are recalculated without changing unrelated account roles.
7. The user receives a clear confirmation and returns to the interrupted protected action where still eligible.

### Manual-review branch

1. Conflicting, duplicate, unusual, or high-risk submissions enter `PENDING_MANUAL_REVIEW` or `MORE_INFORMATION_REQUIRED`.
2. The user is told why additional evidence is required, acceptable evidence, what may be concealed, how it will be used, and expected response path.
3. Evidence is uploaded privately and exposed only to authorised reviewers.
4. The reviewer approves, requests more information, rejects with reason, or routes the matter to account recovery/security review.
5. The decision is recorded without repeatedly exposing the source document.

### Exception paths

- User lost institutional email access: account-recovery/manual route; no automatic approval.
- Identifier already used: block auto-approval; do not silently merge accounts.
- Email verified but status cannot be established: manual review or remain unverified.
- Affiliation expired/revoked: preserve Noma account and order history but disable Covenant-specific actions.
- Suspected identity misuse: contain sensitive actions and escalate under `J30` or Trust and Safety.

### Evidence and audit

- submitted normalized fields;
- verification method and results;
- duplicate/conflict signals;
- evidence access log;
- reviewer decision and reason;
- affiliation activation, expiry, revocation, and revalidation.

### Completion

The affiliation is `VERIFIED`, `MORE_INFORMATION_REQUIRED`, `REJECTED`, `EXPIRED`, or routed to security/account recovery with an understandable next step.

### Metrics

- auto-approval rate;
- manual-review rate and ageing;
- evidence resubmission rate;
- false duplicate rate;
- verification completion; and
- privacy/access incidents.

### Prohibited shortcuts

- guessing or hardcoding unconfirmed Covenant domains or identifier formats;
- collecting GPA, results, disciplinary history, or routine biometrics;
- treating staff affiliation as Noma staff authority; or
- using document upload for every ordinary user where lower-friction verification succeeds.

---

## 10. `J03` — Search, product comparison, and offer selection

**Criticality:** P0  
**Primary actor:** Guest or Buyer  
**Supporting actors:** Catalogue Operator, search indexer, seller  
**Surfaces:** Marketplace, search, product detail

### Objective

Help the user find the correct product, compare eligible seller offers, and understand total value and fulfilment before adding an item to cart.

### Preconditions

- Canonical products and seller offers are approved, active, and eligible for the institution/public context.
- Search/index information can be revalidated against authoritative stock and policy data.

### Trigger

The user enters a query, selects a category, collection, recommendation, or product link.

### Required flow

1. Noma normalises the query and applies relevance-first search, approved synonyms, typo tolerance, category data, and filters.
2. Results group standardised products around a canonical product identity and expose meaningful offer context.
3. The user can inspect product attributes, actual seller offer, price, condition, stock/availability, seller type and indicators, fulfilment source, warranty/return classification, and delivery estimate.
4. Pre-owned offers show actual-unit photographs and disclosed defects.
5. Sponsored architecture, if present, remains disabled or clearly labelled and relevant.
6. The user selects a specific seller offer and variant/condition.
7. Noma rechecks eligibility, price, stock, category policy, feature activation, seller status, and delivery feasibility before adding to cart.
8. Search and selection analytics are recorded without replacing catalogue or order truth.

### Exception paths

- Zero results: show useful correction, category, synonym, or Support-safe recovery—not fabricated results.
- Stale offer: explain changed price/stock and require renewed selection.
- Disabled category or seller: remove purchase action and avoid exposing enforcement details.
- Similar canonical products: do not silently merge distinct editions, specifications, or compatibility.
- User is not eligible for an institution-only offer: explain eligibility and verification route.

### Evidence and audit

- search query and result count where privacy policy permits;
- selected product and offer;
- catalogue version/offer eligibility checks;
- manual boosts or collection placement; and
- listing moderation history.

### Completion

The user adds a valid offer to cart, saves/leaves the product, or receives a truthful unavailability/eligibility outcome.

### Metrics

- zero-result rate;
- result click-through;
- product-to-offer selection;
- stale-offer rate;
- search-to-cart conversion; and
- reported catalogue mismatch.

### Prohibited shortcuts

- ranking primarily by payment or seller commercial importance;
- hiding sponsored status;
- showing seller-declared stock as guaranteed without revalidation;
- AI-fabricated specifications or product evidence; or
- grouping materially different products as one canonical product.

---

## 11. `J04` — Cart, eligibility, delivery promise, and checkout review

**Criticality:** P0  
**Primary actor:** Buyer  
**Supporting actors:** inventory service, pricing/promotion rules, promise engine, Operations capacity controls  
**Surfaces:** Cart, Checkout

### Objective

Convert selected offers from multiple sellers into one understandable checkout while validating eligibility, reserving stock, calculating total cost, and preserving internal vendor and fulfilment separation.

### Preconditions

- Buyer has an active account and required Covenant affiliation.
- Real checkout and payment are enabled for the institution/cohort.
- Cart items refer to active, eligible offers.

### Trigger

The Buyer opens cart or selects checkout.

### Required flow

1. Noma revalidates every cart item for seller activation, product policy, price, condition, variant, stock, fulfilment source, operating hours, category and buyer eligibility.
2. Invalid or changed items are clearly isolated; unaffected items remain selectable.
3. Noma groups items internally into Vendor Orders and candidate Fulfilment Groups without exposing unrelated seller data.
4. Delivery options and promise windows are calculated using approved points, inventory location, seller preparation, tier, capacity, batching, and feature activation.
5. Standard delivery is available where feasible; Priority or Saver appears only if activated and operationally valid.
6. Promotions, funding sources, delivery subsidies, and total customer amount are calculated transparently.
7. Stock is reserved according to the applicable inventory mode and reservation expiry.
8. The Buyer reviews seller/offer, quantity, condition, fulfilment, delivery point, promise, cancellation/return/warranty information, discounts, delivery charge, and final amount.
9. Noma creates an immutable checkout snapshot and payment intent reference.
10. The Buyer explicitly confirms and proceeds to `J05`.

### Exception paths

- Last unit becomes unavailable: remove or adjust only the affected item; release/retain other reservations appropriately.
- Delivery capacity unavailable: offer a later window, different active tier, or prevent checkout.
- Price changed: display old/new price and require acceptance.
- Promotion no longer eligible: recalculate transparently; do not conceal the change.
- Mixed commerce type not supported: reject unsupported cart combination before payment.
- Capacity ceiling reached: close slots or schedule the next permitted window.
- Checkout session expires: release reservations safely and allow a fresh recalculation.

### Evidence and audit

- validated cart snapshot;
- reservation records and expiry;
- pricing/promotion/delivery allocations;
- original committed promise inputs;
- buyer-selected handoff point and tier; and
- checkout version/reference.

### Completion

A valid, immutable checkout is ready for payment, or the Buyer receives a clear action to fix, remove, reschedule, or abandon affected items.

### Metrics

- cart validation failures;
- stock reservation conflicts;
- checkout recalculation rate;
- delivery-option availability;
- checkout abandonment; and
- promise-calculation exceptions.

### Prohibited shortcuts

- charging a price not displayed at final confirmation;
- creating one indivisible multi-vendor order record;
- treating fulfilment groups as identical to Vendor Orders;
- accepting unsupported service/rental/digital/event items; or
- bypassing capacity and feature gates from the client.

---

## 12. `J05` — Paystack payment and confirmed order creation

**Criticality:** P0  
**Primary actor:** Buyer  
**Supporting actors:** Paystack, payment service/worker, order service, inventory service, notification worker  
**Surfaces:** Checkout, Paystack experience, Buyer Account, Operations/Finance

### Objective

Collect one prepaid buyer payment and create the Parent Order, Vendor Orders, allocations, reservations/stock effects, fulfilment candidates, and pending seller earnings exactly once.

### Preconditions

- `J04` produced a valid, unexpired checkout snapshot and reservations.
- Paystack live processing is enabled and secure.
- Expected amount, currency, buyer, checkout, and reference are stored server-side.

### Trigger

The Buyer confirms payment.

### Required flow

1. Noma initialises Paystack from the backend using the authoritative amount, currency, buyer, and unique reference.
2. The Buyer completes the provider payment experience.
3. A callback may return the Buyer to Noma, but Noma displays `VERIFYING PAYMENT` until server-side truth is established.
4. Noma verifies provider status, reference, amount, and currency and/or processes an authenticated webhook.
5. The event is preserved and deduplicated.
6. Inside a safe transactional/idempotent boundary, Noma:
   - marks the Payment successful once;
   - confirms the Parent Order once;
   - creates independent Vendor Orders and item allocations;
   - converts/reconciles inventory reservations;
   - creates pending seller-earning entries;
   - creates the required fulfilment work;
   - records the committed delivery promise; and
   - creates notifications.
7. The Buyer sees one order confirmation and an understandable breakdown by item/vendor progress.
8. Sellers see only their own Vendor Orders.
9. Finance/Operations can trace provider reference to order, allocations, and ledger.

### Exception paths

- Payment failed/abandoned: proceed to `J06`; do not confirm order.
- Callback arrives before webhook/verification: remain processing; do not ask the Buyer to pay again.
- Webhook arrives twice: second processing is harmless and recorded as duplicate/no-op.
- Amount or currency mismatch: do not confirm order; open reconciliation exception.
- Payment succeeds after checkout/reservation expiry: hold order confirmation and route to reconciliation/recovery; do not oversell.
- Internal transaction fails after verified payment: create a paid-but-unconfirmed critical exception for immediate recovery.

### Evidence and audit

- checkout snapshot;
- payment attempts;
- raw provider events;
- signature/verification result;
- expected and verified amounts;
- idempotency keys;
- order/allocation/ledger creation; and
- reconciliation exception if any.

### Completion

Either:

- payment is verified and exactly one confirmed Parent Order exists; or
- no order is falsely confirmed and `J06` owns the unresolved outcome.

### Metrics

- payment success rate;
- verification latency;
- duplicate event count;
- amount/currency mismatch;
- paid-but-unconfirmed incidents;
- order duplication incidents; and
- reservation conversion failures.

### Prohibited shortcuts

- trusting a browser success page;
- using client-submitted amount as authority;
- delivering value before verification;
- creating seller earnings without a confirmed allocation; or
- allowing a manual role to mark payment successful.

---

## 13. `J06` — Payment uncertainty, failure, duplicate event, and reconciliation

**Criticality:** P0  
**Primary actor:** SYSTEM / Finance Analyst  
**Supporting actors:** Buyer, Paystack, Operations, Finance Approver  
**Surfaces:** Buyer Account, Finance reconciliation, Operations

### Objective

Resolve non-happy payment outcomes without double charging, double fulfilment, lost paid orders, or dishonest customer messaging.

### Preconditions

A payment attempt exists and has not reached a clean confirmed-order outcome.

### Trigger

A failed, abandoned, timed-out, mismatched, duplicated, delayed, or internally inconsistent payment event occurs.

### Required flow

1. Noma classifies the outcome as failed, abandoned, expired, processing, paid-unconfirmed, mismatched, duplicated, or reconciliation-required.
2. The Buyer sees an honest state and must not be encouraged to pay again while status is uncertain.
3. Safe automatic checks query provider status and compare reference, amount, currency, checkout, and existing order.
4. Duplicate events are marked processed/no-op without duplicating side effects.
5. Failed or expired attempts release stock reservations when safe.
6. Verified successful payment without order creates a critical reconciliation item and blocks accidental second payment.
7. Finance reviews unresolved provider/internal differences and chooses an authorised recovery:
   - complete the existing order if stock and policy allow;
   - cancel and initiate refund;
   - correct a linkage through an auditable reconciliation workflow; or
   - escalate a provider issue.
8. The Buyer receives the final confirmed order or refund path.

### Exception paths

- Provider unreachable: keep `PROCESSING/RECONCILIATION_REQUIRED`, retry safely, and alert when ageing threshold is exceeded.
- Buyer presents debit evidence but provider not confirmed: collect evidence through Support, do not create an order manually.
- Duplicate charge: create a duplicate-payment refund case; preserve the valid order.
- Reservation unavailable after late payment: refund or authorised recovery, not silent substitution.

### Evidence and audit

- all provider/internal checks;
- reconciliation owner and decision;
- reservation release;
- order recovery or refund linkage; and
- customer communications.

### Completion

Every attempt ends with one of:

- no charge/no order;
- one charge/one confirmed order;
- duplicate/incorrect charge with a tracked refund; or
- explicitly open provider reconciliation with owner and deadline.

### Metrics

- unresolved-payment ageing;
- duplicate charge rate;
- paid-but-unconfirmed recovery time;
- false repeat-payment rate; and
- reconciliation accuracy.

### Prohibited shortcuts

- asking the Buyer to pay again without resolving uncertainty;
- deleting failed attempts;
- creating a manual fake provider event; or
- marking reconciliation complete without evidence.

---

## 14. `J10` — Multi-vendor partial failure and unaffected-order continuity

**Criticality:** P0  
**Primary actor:** Buyer / Operations  
**Supporting actors:** affected seller, unaffected sellers, Finance, Dispatch  
**Surfaces:** Buyer Account, Seller Centre, Operations, Finance

### Objective

Preserve valid portions of a multi-vendor order when one seller or fulfilment fails and calculate the exact item, promotion, delivery, seller-earning, and refund consequences.

### Preconditions

- A confirmed Parent Order contains two or more independent Vendor Orders or fulfilment responsibilities.

### Trigger

One Vendor Order is rejected, out of stock, unfulfillable, unsafe, materially delayed, or cancelled while another remains valid.

### Required flow

1. The failing seller or Operations selects a structured reason.
2. Noma isolates the affected Vendor Order/items and pauses their settlement eligibility.
3. Unaffected Vendor Orders continue unless their own feasibility has changed.
4. Noma recalculates:
   - affected item refund;
   - delivery adjustment;
   - promotion funding and legitimate buyer benefit;
   - commission reversal;
   - seller-earning reversal/hold;
   - fulfilment and routing changes; and
   - liability attribution.
5. Where an approved substitute is possible, the Buyer receives a recorded approve/decline action under `J16`.
6. Complex Cross-Seller Rescue may be proposed and executed by authorised Operations, not autonomous AI.
7. The Buyer sees which item failed, which items continue, updated delivery information, and the exact refund status.
8. Seller performance and stock consequences are applied only to the responsible seller/resource.

### Exception paths

- Remaining fulfilment becomes uneconomical or impossible: Operations offers an authorised cancellation/reschedule with transparent calculation.
- Promotion threshold is broken by seller fault: preserve legitimate buyer-earned value according to policy rather than retroactively penalising the Buyer.
- A substitute costs more: require explicit buyer approval and an approved payment-adjustment approach; do not charge silently.
- Fulfilment already picked up: treat under return/interception rules, not pre-fulfilment cancellation.

### Evidence and audit

- failure reason and actor;
- original and revised allocations;
- buyer decision on substitute/recovery;
- seller performance effect;
- fulfilment changes; and
- refund linkage.

### Completion

The unaffected portion continues to a valid completion, while the failed portion reaches an explicit replacement, cancellation/refund, or controlled case outcome.

### Metrics

- partial-failure rate;
- unaffected-order completion;
- rescue/substitution acceptance;
- allocation correction accuracy; and
- customer contacts per partial failure.

### Prohibited shortcuts

- cancelling the whole Parent Order by default;
- exposing one seller's unrelated order data to another;
- stripping legitimate promotion value without policy basis; or
- changing allocations without ledger/audit entries.

---

## 15. `J11` — Lifecycle-based buyer or operational cancellation

**Criticality:** P0  
**Primary actor:** Buyer, Seller, or Operations depending on cause  
**Supporting actors:** Finance, Dispatch, Support  
**Surfaces:** Buyer Account, Seller Centre, Operations, Finance

### Objective

Allow cancellation only where the current lifecycle permits, show the economic outcome before confirmation, record fault attribution, and transition post-pickup problems into return/protection flows.

### Preconditions

- A paid or confirmed order/item exists.
- The actor is authorised for the affected item/Vendor Order.

### Trigger

Buyer requests cancellation, seller cannot fulfil, or Operations identifies a logistics, system, fraud, or safety reason.

### Required flow

1. Noma evaluates item/category, current Vendor Order and custody state, incurred costs, promise, seller preparation, and cause.
2. Before final buyer confirmation, Noma shows:
   - product refund;
   - delivery refund;
   - disclosed non-recoverable cost if policy permits;
   - promotion effect; and
   - expected total refund.
3. The actor selects a structured attribution such as buyer mistake, seller out of stock, logistics failure, payment failure, system failure, or safety.
4. Authorisation and approval thresholds are checked.
5. Noma cancels only the eligible item/Vendor Order scope.
6. Inventory, fulfilment, delivery, promotion, earnings, and financial allocations are adjusted.
7. Any money due enters `J18`; the interface says approved/processing, not completed prematurely.
8. Seller- or system-caused failure generally protects the Buyer from inappropriate cancellation cost.

### Lifecycle boundaries

- Before seller commitment/preparation: cancellation is generally easiest.
- During preparation: cancellation may be permitted or cost-sensitive by category.
- Ready for pickup: cancellation may be restricted.
- After pickup/custody transfer: ordinary cancellation closes; route to return, interception, or Protection Case.
- Food after accepted/preparation-started: change-of-mind cancellation is restricted under `J24`.

### Exception paths

- Parcel already picked up: create an interception/return decision, not a fake pre-pickup cancellation.
- Partial quantity: cancel and refund only the eligible quantity.
- Safety/fraud: permit immediate containment and targeted holds while final case remains open.
- Buyer attempts repeated abusive cancellation: preserve rights but apply risk-dependent review; no automatic guilt.

### Evidence and audit

- state and custody at request;
- pre-confirmation calculation shown;
- cause attribution;
- decision actor and approval;
- allocation/inventory/fulfilment changes; and
- refund status.

### Completion

The cancellation is rejected with reason, completed with all connected consequences, or routed into a return/protection/interception flow.

### Metrics

- cancellations by cause and lifecycle;
- seller-caused cancellation;
- cancellation calculation errors;
- post-pickup cancellation attempts; and
- refund completion after cancellation.

### Prohibited shortcuts

- hiding cancellation cost until after confirmation;
- treating cancellation and return as the same process;
- allowing seller free-form messages to cancel an order; or
- deleting the order to represent cancellation.

---

# Part B — Seller Journeys

## 16. `J07` — Seller application, approval, training, and activation

**Criticality:** P0  
**Primary actor:** Seller Applicant  
**Supporting actors:** Seller Onboarding/Operations, Trust and Safety, Finance, Institution Administrator  
**Surfaces:** Seller Centre, Operations, Finance, Admin

### Objective

Approve and activate only selected, eligible, trained sellers under the correct seller-type and category controls.

### Preconditions

- Seller applications or invitations are enabled for the relevant seller type.
- Covenant pilot capacity permits another seller.

### Trigger

A verified eligible person starts a Student Vendor/Campus Store application or an External Vendor receives an invitation.

### Required flow

1. The applicant chooses or is assigned seller type: `STUDENT_VENDOR`, `CAMPUS_STORE`, or `EXTERNAL_VENDOR`.
2. Noma collects risk-appropriate identity, organisation, representative, category, fulfilment, contact, and policy information.
3. The applicant accepts seller, prohibited-product, fulfilment, messaging, earnings, returns, and enforcement terms.
4. Noma performs automated validation and routes the application to the correct review queue.
5. Reviewers approve, request more information, or reject with a reason and permitted appeal/reapplication path.
6. Approval creates the seller entity and scoped Seller Owner membership but does not make the seller live.
7. The seller completes payout-account verification under `J21` and required training/test-order steps.
8. Initial catalogue/offers are reviewed under `J08`.
9. An authorised actor activates the seller for Covenant with explicit category, capacity, confirmation mode, and feature scope.
10. The seller receives activation status and starts operating within limits.

### Exception paths

- Application identity conflicts: route to verification/security; no duplicate seller ownership shortcut.
- Seller approved but physical/operational requirements incomplete: remain approved/inactive.
- External Vendor: invitation-only; off-campus inbound route must be configured before activation.
- Restricted category: approve seller generally but withhold category authority.
- Capacity full: keep approved seller on controlled waitlist without public activation.

### Evidence and audit

- application versions;
- submitted evidence and access;
- review decision;
- policy acceptance;
- training/test completion;
- payout readiness;
- activation actor, scope, limits, and date.

### Completion

The applicant is rejected, awaiting information, approved but inactive, or active for defined Covenant capabilities.

### Metrics

- application completion and ageing;
- approval/rejection reasons;
- training completion;
- time from approval to activation;
- first-listing quality; and
- first-order success.

### Prohibited shortcuts

- treating Covenant student verification as seller approval;
- activating a seller merely because the application was approved;
- granting platform-wide permissions to a seller representative; or
- enabling public external-vendor registration in the founding pilot.

---

## 17. `J08` — Product/offer listing, moderation, and inventory publication

**Criticality:** P0  
**Primary actor:** Seller Owner/Operator/Catalogue Manager  
**Supporting actors:** Catalogue Operator, policy engine, assistive AI, object storage  
**Surfaces:** Seller Centre, Catalogue Operations, Marketplace

### Objective

Publish accurate, policy-compliant seller offers attached to the correct product identity with valid images, attributes, inventory, condition, pricing, and fulfilment.

### Preconditions

- Seller is active for Covenant and authorised for the category/listing type.
- Product commerce is active; food/pre-owned/FBN rules apply where relevant.

### Trigger

Seller creates a unique listing, attaches an offer to an existing canonical product, or edits an offer.

### Required flow

1. Seller selects category and listing type.
2. Noma searches for a matching canonical product using identifiers and structured attributes.
3. Seller attaches an offer to a confirmed canonical product or proposes a new/unique product for review.
4. Seller enters price, variants, inventory mode, quantity/availability, condition, fulfilment mode, warranty/return information, preparation data where relevant, and required images.
5. Noma validates required fields, contradictions, category policy, prohibited content, contact/payment bypass, image quality, and seller eligibility.
6. Assistive AI may suggest titles, categories, attributes, image cleanup, or missing fields; the seller must review and approve changes.
7. High-risk, ambiguous, or new canonical product proposals enter Catalogue review.
8. Approved offers become active only if seller, category, feature, inventory, and fulfilment remain eligible.
9. Marketplace/search index updates asynchronously and safely.
10. Seller can pause, update, or retire the offer without rewriting historical order snapshots.

### Inventory behaviour

- `TRACKED_QUANTITY`: physical, reserved, and available quantities must reconcile.
- `AVAILABILITY_ONLY`: seller confirms whether the offer is currently available.
- Out-of-stock seller cancellation pauses the affected offer until inventory is reconfirmed.

### Exception paths

- Incorrect canonical match: block publication or route to Catalogue review.
- Missing/poor images: request correction; do not auto-fabricate evidence.
- Suspicious pricing: warn or review; expensive alone is not a violation.
- Seller loses category authority or is suspended: stop new sales while preserving historical records.
- Concurrent final-unit purchase: reservation logic determines the valid buyer.

### Evidence and audit

- listing/offer versions;
- original and modified images where AI processing occurs;
- seller approval of AI suggestions;
- moderation decision;
- inventory changes and reconfirmation;
- canonical merge/link history; and
- publication/pausing actor.

### Completion

The offer is active, paused, rejected with correction path, or awaiting review.

### Metrics

- listing completion;
- moderation rejection reasons;
- canonical-match corrections;
- stock accuracy;
- out-of-stock cancellations; and
- image/attribute quality.

### Prohibited shortcuts

- one giant listing model that activates future commerce workflows;
- AI silently changing or fabricating product facts;
- reusing stock images for actual-unit pre-owned goods;
- seller creation of self-declared trust/verification badges; or
- editing historical order snapshots after purchase.

---

## 18. `J09` — Vendor Order acceptance, preparation, and readiness

**Criticality:** P0  
**Primary actor:** Seller Order Manager/Owner  
**Supporting actors:** Buyer, Operations, notification worker, inventory service  
**Surfaces:** Seller Centre, Buyer Account, Operations

### Objective

Move each seller's independent portion from confirmed payment to a properly prepared, packaged, and pickup-ready state within the committed promise.

### Preconditions

- `J05` created a confirmed Vendor Order.
- Seller is active and has access to that seller only.
- The Vendor Order has a configured confirmation mode.

### Trigger

Seller receives a new Vendor Order notification.

### Required flow

1. Seller sees only their items, quantities, variants, condition, packaging/handling requirements, deadline, pickup point, and permitted communication.
2. For `AUTO`, the Vendor Order enters preparation according to policy.
3. For `SELLER_ACCEPTANCE`, seller accepts or rejects within the configured deadline.
4. Seller verifies stock/availability and starts preparation.
5. Buyer sees seller progress in customer language without internal operational noise.
6. Seller may request an approved substitution under `J16` if the category permits.
7. Seller packs the exact items and records required package/serial/evidence information.
8. Seller marks ready only when the parcel is physically ready at the approved pickup point.
9. Noma creates/updates the fulfilment and dispatch readiness under `J12`.
10. Preparation performance and original promise remain auditable.

### Exception paths

- Seller rejects/out of stock: invoke `J10`; pause affected offer where required.
- Acceptance/preparation deadline missed: alert seller and Operations; move order through watch/at-risk/critical handling.
- Seller marks ready falsely: rider records pickup exception; seller performance case may result.
- Item condition/variant mismatch discovered before pickup: correct through substitution/cancellation, not informal handoff.
- Seller suspended after order: `J23` determines whether safe orders continue under controlled access/Operations.

### Evidence and audit

- notification and acceptance times;
- preparation start/readiness;
- package/serial/condition evidence where required;
- missed-deadline reasons;
- seller messages and structured actions; and
- Operations interventions.

### Completion

The Vendor Order is ready for valid pickup, cancelled/rejected through `J10/J11`, or placed in an explicit exception queue.

### Metrics

- acceptance time;
- preparation-on-time rate;
- false-ready/pickup failure;
- out-of-stock rate;
- substitution rate; and
- Operations interventions per Vendor Order.

### Prohibited shortcuts

- exposing buyer private contact information;
- marking ready through chat text;
- allowing seller direct delivery as a normal path; or
- skipping readiness/custody evidence to protect a promise metric.

---

## 19. `J16` — Structured messaging and buyer-approved substitution

**Criticality:** P1  
**Primary actor:** Buyer or Seller  
**Supporting actors:** Support/Operations, moderation service  
**Surfaces:** Marketplace, Buyer Account, Seller Centre, Support

### Objective

Permit necessary product/order communication while preserving privacy, transaction evidence, and explicit buyer control over material substitutions.

### Preconditions

- The participant has access to the specific product question or order.
- Messaging is not restricted for the account/case.

### Trigger

Buyer asks a product question, seller needs clarification, or seller proposes an allowed substitute.

### Required flow

1. Noma creates the correct context: product question, order conversation, Support case, dispute, or system timeline.
2. Participants see only information relevant to that context.
3. Message content is checked for contact details, payment instructions, external links, harassment, spam, or other bypass signals.
4. Noma allows, warns, blocks with explanation, or routes for review.
5. A proposed substitution is represented as a structured object containing original item, proposed item/variant, price impact, fulfilment impact, and expiry.
6. Buyer explicitly approves or rejects.
7. Approval triggers authorised order/allocation/inventory changes; a message alone does not.
8. Rejection returns the item to fulfil, cancel, or recovery handling.
9. Relevant messages remain available to authorised case reviewers and are retained according to policy.

### Exception paths

- Accidental number-like content: allow correction; detection is not guilt.
- Repeated deliberate bypass: create a policy signal/case under `J23`.
- Threat or harassment: restrict communication and escalate immediately.
- Price increase: do not charge without approved payment-adjustment flow.
- Ordinary chat attachment: restrict; use secure evidence workflow for product/issue proof.

### Evidence and audit

- message content/status;
- moderation signal and action;
- report/block event;
- substitution proposal and buyer decision;
- order/allocation changes; and
- authorised staff access.

### Completion

The question is answered, substitution approved/rejected, or conversation escalated/restricted with a recorded outcome.

### Metrics

- response time;
- blocked/warned message rate;
- false-positive review;
- substitution approval and expiry; and
- off-platform attempt recurrence.

### Prohibited shortcuts

- WhatsApp button as transaction workflow;
- personal bank-account instructions;
- treating seller's message as buyer consent;
- exposing private room location; or
- autonomous permanent suspension from a detector match.

---

# Part C — Rider, Dispatch, and Custody Journeys

## 20. `J22` — Rider application, approval, shift, and availability

**Criticality:** P0  
**Primary actor:** Rider Applicant/Rider  
**Supporting actors:** Operations, Dispatch, Trust and Safety, Institution Administrator, CU Express Dispatcher  
**Surfaces:** Rider PWA, Operations, Admin

### Objective

Activate only approved, trained, eligible riders or partner riders and expose assignments according to shift, carrier, capacity, and current status.

### Preconditions

- Rider capacity and the applicable rider programme are enabled.
- Institution and partner requirements are configured.

### Trigger

A candidate applies/receives invitation, or an approved rider begins a shift.

### Required flow

1. Candidate submits required identity, Covenant/partner affiliation, eligibility, device, payment/earnings, and safety information appropriate to rider type.
2. Operations verifies documents/training and approves, requests information, or rejects.
3. Approved rider receives a scoped Rider membership, not buyer/seller/admin authority.
4. Before active work, rider accepts operating, custody, privacy, incident, and safety procedures.
5. Rider starts a shift and declares availability/capacity through the Rider PWA.
6. Noma checks active status, restrictions, carrier, location, shift, and device/session assurance.
7. Eligible jobs may be offered or assigned under `J12`.
8. Rider can pause/end availability without abandoning an active custody obligation.

### Exception paths

- Rider approval expired/revoked: prevent new assignments and resolve active jobs safely.
- Device/session compromised: revoke sessions and reassign under `J30/J12`.
- Academic or capacity conflict: pause future assignment; do not change active custody silently.
- CU Express rider: partner dispatcher may manage partner capacity, but Noma retains job/custody truth.

### Evidence and audit

- application and approval;
- training/policy acceptance;
- shift and availability events;
- device/session security;
- assignment eligibility; and
- suspension/revocation.

### Completion

Rider is active and eligible for scoped assignments, inactive, or restricted with all active jobs safely handled.

### Metrics

- rider approval/training completion;
- active capacity;
- assignment acceptance;
- shift reliability;
- incident rate; and
- revoked rider access latency.

### Prohibited shortcuts

- shared `rider-tablet` identity for custody actions;
- assigning work to an inactive/restricted rider;
- using buyer identity as rider proof; or
- allowing a rider to keep active jobs after immediate access revocation without Operations containment.

---

## 21. `J12` — Dispatch, rider assignment, pickup, and custody transfer

**Criticality:** P0  
**Primary actor:** Dispatch Operator / assigned Rider  
**Supporting actors:** Seller, CU Express Dispatcher, Operations, Buyer  
**Surfaces:** Operations dispatch board, Seller Centre, Rider PWA, Buyer Account

### Objective

Create a Noma-controlled Delivery Job, assign a suitable carrier/rider, and transfer the exact parcel from seller to rider through verified custody proof.

### Preconditions

- One or more fulfilment items are ready.
- Approved pickup/delivery points, tier, promise, handling, and parcel credentials exist.
- Eligible carrier capacity exists or the job is placed in an explicit queue.

### Trigger

Seller/FBN marks a fulfilment ready or Operations authorises dispatch.

### Required flow

1. Noma creates or activates a Delivery Job separate from Vendor Order identity.
2. Rules filter eligible carriers/riders using availability, capacity, current load, pickup/delivery points, tier, handling, food urgency, and compatible batches.
3. The system recommends an assignment; authorised Dispatch confirms or overrides with reason.
4. Rider receives only necessary job information and accepts where the workflow requires it.
5. Seller and Buyer receive relevant status/promise notifications.
6. Rider travels to the approved pickup point and signals arrival.
7. Arrival does not transfer custody.
8. Rider scans/presents the parcel credential; Noma validates rider, assignment, parcel, seller/FBN location, readiness, and prior pickup status.
9. Seller and rider confirm handoff; required package/condition exceptions are recorded.
10. Custody transfers once, and the job proceeds to transit.
11. Batch jobs preserve parcel-level credentials, custody, and promises.

### Exception paths

- Assignment declined/unavailable: create new assignment history; do not overwrite the old record.
- Rider arrives but parcel not ready: record seller/pickup delay and Operations action.
- Wrong/damaged/unsealed parcel: block pickup or capture authorised exception; do not accept silently.
- Credential invalid/already used: block custody transfer and escalate.
- Connectivity lost: cache safe assignment details/draft evidence, but final pickup requires approved backend validation unless a specifically authorised low-risk offline protocol exists.
- Reassignment after pickup: require controlled rider-to-rider or rider-to-custody transfer.

### Evidence and audit

- assignment recommendation and override;
- rider acceptance;
- arrival time;
- pickup credential validation;
- seller/rider confirmation;
- parcel condition/exception;
- custody transfer; and
- all reassignments.

### Completion

The exact parcel is in verified rider/carrier custody, remains waiting with an explicit exception, or returns to seller/FBN control.

### Metrics

- ready-to-assignment time;
- assignment acceptance;
- pickup waiting;
- invalid credential attempts;
- false-ready events;
- reassignment; and
- custody discrepancy.

### Prohibited shortcuts

- treating assignment as pickup;
- changing rider name to simulate custody transfer;
- scanning one parcel for an entire batch;
- using free-form staff notes as custody proof; or
- giving CU Express control of Noma order/financial policy.

---

## 22. `J13` — Delivery arrival, authenticated handoff, and completion

**Criticality:** P0  
**Primary actor:** Assigned Rider  
**Supporting actors:** Buyer or authorised Delegate, Operations, notification worker  
**Surfaces:** Rider PWA, Buyer Account, Operations

### Objective

Complete delivery at an approved point to the eligible recipient using the risk-appropriate credential and preserve proof of handoff.

### Preconditions

- Parcel is in current rider custody.
- Delivery point, recipient eligibility, and handoff risk level are known.
- Handoff credential is active and single-use.

### Trigger

Rider reaches the approved delivery point.

### Required flow

1. Buyer receives advance/arrival notification and collection instructions.
2. Rider marks arrival; Noma records time and point but does not mark delivered.
3. Buyer or eligible Delegate presents the required PIN/QR/credential.
4. Noma validates Delivery Job, parcel, current rider, point, recipient/delegate, expiry, prior use, and risk requirements.
5. Where required, rider and recipient complete a structured visual/condition check without waiving hidden-defect rights.
6. Credential is consumed once.
7. Custody transfers to the recipient; parcel and Delivery Job become delivered.
8. Buyer Order/item progress updates while preserving independent remaining fulfilments.
9. Seller earning remains pending until applicable protection/risk conditions pass.
10. Buyer receives completion and issue-reporting guidance.

### Exception paths

- Invalid/expired credential: do not hand over; allow secure regeneration/recovery through authorised flow.
- Wrong recipient or unsafe condition: refuse handoff and escalate.
- Buyer disputes visible damage before acceptance: record evidence and route to Operations/Protection Case.
- One parcel in a batch fails: complete eligible parcels individually; do not mark the batch delivered wholesale.
- Connectivity unavailable: do not silently finalise high-risk delivery; use approved fallback or retain custody.

### Evidence and audit

- arrival;
- credential challenge/result;
- recipient/delegate identity reference;
- parcel-level handoff;
- visual exception where required;
- custody transfer; and
- notification timeline.

### Completion

The parcel is validly delivered to the Buyer/Delegate or proceeds to `J15` without false completion.

### Metrics

- first-attempt success;
- arrival-to-handoff time;
- credential failure;
- wrong-recipient attempts;
- parcel-level batch completion; and
- post-handoff issue rate.

### Prohibited shortcuts

- treating arrival as delivery;
- accepting rider self-attestation alone;
- sharing a reusable universal OTP;
- exposing unrelated buyer information; or
- releasing seller earnings solely because rider marked arrived.

---

## 23. `J14` — Delegated collection

**Criticality:** P1  
**Primary actor:** Buyer  
**Supporting actors:** Delegate, Rider, Operations  
**Surfaces:** Buyer Account, Rider PWA, Operations

### Objective

Allow the Buyer to authorise an eligible person to collect one specific order without giving that person control over payment, cancellation, refund, dispute, or account settings.

### Preconditions

- Delegation is permitted for the product, value, risk, buyer, and fulfilment.
- The order has not been delivered or locked against delegation.

### Trigger

Buyer selects `Authorise someone else to collect`.

### Required flow

1. Noma explains the authority being granted and any risk restrictions.
2. Buyer selects an eligible verified Noma/institution account or follows the approved limited alternative.
3. Buyer confirms through required authentication.
4. Noma creates an expiring, revocable, single-use delegation linked only to the specified fulfilment.
5. Delegate receives collection instructions without buyer financial/private data.
6. Rider sees permitted delegate and required risk level.
7. At handoff, Noma validates delegate and credential under `J13`.
8. Buyer, delegate, rider, point, and handoff are recorded.
9. Buyer receives confirmation and retains all post-purchase rights.

### Exception paths

- High-value/sensitive/elevated-risk order: prohibit or require stronger verification.
- Buyer revokes before handoff: invalidate credential immediately.
- Delegate account becomes restricted: block handoff and notify Buyer.
- Credential shared with another person: fail identity check and retain custody.

### Evidence and audit

- authoriser;
- delegate;
- scope, expiry, revocation;
- authentication assurance;
- handoff result.

### Completion

The eligible Delegate collects the parcel, the Buyer revokes/changes delegation before use, or delivery follows the normal Buyer path.

### Metrics

- delegation creation and use;
- revocation;
- failed delegate verification; and
- delegation-related incidents.

### Prohibited shortcuts

- granting delegate access to Buyer Account/order controls;
- indefinite delegation;
- reusable collection credential; or
- manual rider acceptance of an unrecorded delegate.

---

## 24. `J15` — Failed handoff, secure custody, redelivery, or specialised disposal

**Criticality:** P0  
**Primary actor:** Rider / Operations  
**Supporting actors:** Buyer, Seller/FBN, Support, Finance  
**Surfaces:** Rider PWA, Operations, Buyer Account, Seller Centre

### Objective

Record a valid failed delivery attempt and route the parcel according to product risk without falsely marking delivery or abandoning custody.

### Preconditions

- Rider arrived with parcel in valid custody.
- Handoff could not be completed.

### Trigger

Buyer unavailable, invalid recipient, closed point, credential failure, refusal, unsafe condition, damage, or another structured reason.

### Required flow

1. Rider selects a structured failed-attempt reason.
2. Noma requires applicable evidence: arrival point/time, contact attempts, wait duration, notes, photo where privacy-safe, and Operations contact.
3. Noma confirms the attempt is credible and gives rider appropriate work credit.
4. Buyer receives a clear missed-handoff notification and next options.
5. Operations routes the parcel based on category/risk:
   - ordinary parcel to secure Noma custody, approved pickup, or redelivery;
   - high-value item to controlled custody;
   - food/perishable item to short specialised recovery/disposal policy;
   - unsafe/damaged item to incident/quarantine handling.
6. Custody transfer is recorded at every movement.
7. Any buyer-caused redelivery cost is disclosed and calculated before confirmation.
8. Seller earnings remain pending; a failed attempt is not delivery completion.

### Exception paths

- Rider cannot return safely: immediate Operations incident and alternative custody transfer.
- Buyer disputes rider arrival: Support/Operations review location/time/contact evidence.
- Repeated buyer unavailability: risk-aware restrictions may apply, but isolated legitimate misses do not establish abuse.
- Perishable item cannot be safely retained: follow approved food outcome and financial attribution.

### Evidence and audit

- reason and evidence;
- rider work credit;
- customer communications;
- custody route;
- redelivery cost and attribution;
- disposal/quarantine where applicable.

### Completion

Parcel is redelivered, collected from controlled custody, returned/intercepted, disposed/quarantined under approved policy, or converted to a Protection Case with all custody accounted for.

### Metrics

- failed-attempt rate and reasons;
- redelivery success;
- buyer-unavailable rate;
- time in controlled custody;
- disputed-attempt rate; and
- unaccounted parcel incidents.

### Prohibited shortcuts

- marking failed attempt as delivered;
- leaving parcel at an unauthorised location;
- returning directly to seller without custody event;
- automatic buyer punishment from one miss; or
- making the rider personally collect redelivery payment.

---

# Part D — Protection, Refund, Review, and Financial Journeys

## 25. `J17` — Protection Case, return, dispute, and remedy decision

**Criticality:** P0  
**Primary actor:** Buyer or authorised staff  
**Supporting actors:** Seller, Rider/Carrier, Support, Operations, Finance, Trust and Safety, inspector where approved  
**Surfaces:** Buyer Account, Seller Centre, Support, Operations, Finance, Trust and Safety

### Objective

Resolve an order-linked problem through structured reason, evidence, deadlines, targeted safeguards, authorised decision, item-level remedy, and appeal where applicable.

### Preconditions

- A qualifying order/item or safety/policy relationship exists.
- The requester is authorised and within applicable reporting rules, subject to statutory rights and safety exceptions.

### Trigger

Buyer reports non-delivery, wrong/damaged/missing/misdescribed item, counterfeit/stolen-goods concern, safety issue, warranty concern, or another protected problem.

### Required flow

1. Buyer opens `Get help with this item` and selects a structured reason.
2. Noma shows applicable policy, evidence requirements, deadlines, and immediate safe steps.
3. Case links to exact Buyer Order, Vendor Order, item, seller, Delivery Job, payment allocation, and relevant snapshots.
4. Buyer uploads evidence through secure private workflow.
5. Noma applies proportionate immediate safeguards where required, such as order-specific seller hold, payout block, message preservation, parcel interception, or FBN quarantine.
6. Safeguard is labelled temporary; fault is not yet final.
7. Case routes to Support, Operations, Finance, or Trust and Safety according to reason, severity, value, evidence, and risk.
8. Seller/carrier/other party receives a scoped response request and deadline where appropriate.
9. Staff review transaction, listing, custody, communication, serial, inspection, and behavioural evidence.
10. Straightforward approved rules may decide low-risk cases; material/ambiguous/safety/fraud cases require authorised human decision.
11. Decision records fault attribution and one or more item-level remedies:
    - full/partial refund;
    - return and refund;
    - replacement;
    - redelivery;
    - missing component;
    - repair/warranty route;
    - returnless refund where authorised; or
    - reasoned rejection.
12. Physical returns become controlled reverse-logistics jobs with custody and inspection where required.
13. Financial effects flow through `J18`; seller standing/enforcement may flow through `J23`.
14. Buyer and seller receive a reasoned outcome and eligible appeal path.

### Exception paths

- Counterfeit/stolen/safety allegation: immediate targeted containment and Trust and Safety review.
- Seller fails to respond: apply policy/default progression; do not leave case indefinitely open.
- Conflicting evidence: independent inspection or specialist review where available.
- Buyer abuse suspicion: preserve Buyer Protection; remove trust-dependent convenience or investigate, but seller report alone is not guilt.
- External payment chargeback: track separately from marketplace dispute while coordinating financial exposure.
- Statutory complaint: preserve external rights and records; Noma process does not replace them.

### Evidence and audit

- immutable checkout/listing snapshot;
- messages;
- pickup/delivery/return custody;
- buyer/seller/carrier evidence;
- access log;
- safeguards;
- decision, attribution, remedy, approvals, and appeal.

### Completion

The case is resolved with executed remedy or reasoned rejection, all custody and financial work is linked, and any appeal/enforcement remains explicitly tracked.

### Metrics

- issue rate per completed order;
- first response and resolution time;
- evidence completeness;
- seller response;
- escalation and appeal;
- remedy accuracy; and
- repeat issue/fraud/safety rate.

### Prohibited shortcuts

- seller unilateral final refund authority;
- automatic refund for every complaint;
- autonomous AI serious decision;
- deleting negative evidence or case history; or
- holding all seller earnings for an ordinary item-level case without risk basis.

---

## 26. `J18` — Full or partial refund lifecycle

**Criticality:** P0  
**Primary actor:** Finance/SYSTEM after authorised decision  
**Supporting actors:** Buyer, Support, Operations, seller ledger, Paystack  
**Surfaces:** Buyer Account, Finance, Support, Seller Centre

### Objective

Return the authorised amount through the provider, adjust exact financial allocations and seller exposure, and communicate asynchronous status honestly.

### Preconditions

- A cancellation, Protection Case, duplicate payment, or operational decision produced an approved refund amount and allocation.
- The actor meets approval thresholds and separation-of-duty rules.

### Trigger

Refund is approved for full or partial amount.

### Required flow

1. Noma calculates item value, delivery, promotion funding, commission, seller earning, and other affected allocations.
2. Buyer sees refund amount, destination/method, and `APPROVED` status.
3. Finance/system submits the refund using the original verified payment/provider reference.
4. Noma records provider request and moves to `SUBMITTED/PROCESSING`.
5. Provider events/status checks are verified and processed idempotently.
6. Seller ledger posts explicit reversal/adjustment entries; history is not deleted.
7. On provider-confirmed success, Buyer sees `COMPLETED` with amount and date.
8. On failed/needs-attention/unknown status, a reconciliation item is created with owner and customer communication.
9. If seller was already paid, the liability is allocated through reserve, available/future earnings, or approved negative exposure workflow.

### Exception paths

- Provider needs customer details or manual action: request through secure Support flow.
- Refund amount exceeds available/verified payment: block and escalate.
- Duplicate refund request: return existing refund state; do not resubmit.
- Partial refund plus continuing order: preserve unaffected allocations and order state.
- Provider says completed but ledger not adjusted: reconciliation-critical until both sides align.

### Evidence and audit

- approving decision and actor;
- refund calculation;
- provider request/events;
- ledger entries;
- customer messages;
- reconciliation result.

### Completion

Refund is provider-confirmed complete, failed/cancelled with an alternative authorised resolution, or explicitly under reconciliation with no false completion claim.

### Metrics

- approval-to-submission time;
- processing age;
- provider success/failure;
- duplicate prevention;
- ledger/refund reconciliation; and
- customer contacts.

### Prohibited shortcuts

- displaying approved as completed;
- refunding from an unrelated payment;
- directly editing seller balance;
- marking provider outcome manually without evidence; or
- reversing unaffected seller allocations.

---

## 27. `J19` — Verified-purchase review and moderation

**Criticality:** P2  
**Primary actor:** Buyer  
**Supporting actors:** Seller, moderation/Support, search/reputation services  
**Surfaces:** Buyer Account, Marketplace, Seller Centre, Operations

### Objective

Collect transaction-linked product and seller feedback while preventing manipulation, retaliation, private-data exposure, and improper removal of legitimate criticism.

### Preconditions

- Buyer owns an eligible completed Noma transaction.
- Review window and account standing permit submission.

### Trigger

Noma invites review or Buyer opens an eligible completed item.

### Required flow

1. Noma identifies the verified purchase and eligible product/seller.
2. Buyer separately rates product quality/description accuracy and seller experience where applicable.
3. Buyer may add permitted text/images under moderation rules.
4. Noma checks harassment, private data, irrelevant content, manipulation, and prohibited material.
5. Review is published, held for review, or rejected with reason.
6. Seller may respond under Noma rules but cannot edit/remove the review.
7. Objective performance metrics remain separate from review text.
8. Review may affect public/private reputation only according to transparent policy and sufficient data.

### Exception paths

- Active serious dispute: review may remain allowed but moderation avoids publishing unsafe/private evidence.
- Seller pressures Buyer to change review: messaging/policy case.
- Refund issued: legitimate review is not automatically removed.
- Proven wrong product mapping: Catalogue/Support correct linkage with audit.

### Evidence and audit

- verified purchase link;
- review versions/moderation;
- seller response;
- report and decision.

### Completion

Review is published, rejected for valid policy reason, or remains in scoped moderation with owner/deadline.

### Metrics

- review participation;
- moderation rate;
- report/uphold rate;
- manipulation signals; and
- review-to-product mapping errors.

### Prohibited shortcuts

- reviews from unverified purchases;
- public buyer ratings;
- seller removal of negative feedback; or
- generating AI reviews or claims.

---

## 28. `J20` — Seller earnings release, withdrawal, and payout

**Criticality:** P0  
**Primary actor:** Seller / Finance  
**Supporting actors:** settlement rules, Paystack transfer service, reconciliation worker  
**Surfaces:** Seller Centre, Finance

### Objective

Move protected seller earnings from pending to available and then through a controlled, provider-confirmed payout without paying disputed or ineligible money.

### Preconditions

- Confirmed seller-earning ledger entries exist.
- Applicable fulfilment, handoff, protection, dispute, risk, reserve, and seller-status conditions are known.
- Seller has an active verified payout account.

### Trigger

An earning becomes eligible or seller requests withdrawal.

### Required flow

1. Earning begins `PENDING` at payment/order confirmation.
2. Rules evaluate fulfilment/handoff, protection window, open cases, holds, reserve, seller status, and negative exposure.
3. Eligible amount moves to `AVAILABLE` through explicit ledger entries/system settlement event.
4. Seller sees pending, available, held, reserve, processing, paid, and negative positions with understandable references.
5. Seller submits a withdrawal not exceeding available balance.
6. Noma reserves amount from available to processing and prevents duplicate withdrawal.
7. Finance Analyst reviews eligibility and prepares payout; Finance Approver approves where required.
8. Noma creates provider recipient/transfer attempt with unique reference.
9. Successful initiation is `PROCESSING`.
10. Verified provider event determines `PAID`, `FAILED`, `REVERSED`, or `RECONCILIATION_REQUIRED`.
11. Failed/reversed amount returns only after evidence confirms no final payout remains.
12. Seller receives final status and reason where available.

### Exception paths

- Open item dispute: hold only connected exposure where appropriate.
- Seller suspended: `J23` determines safe treatment; no automatic confiscation.
- Transfer uncertain: do not retry until reconciled.
- Provider reversal: post reversal entry and restore eligible funds according to policy.
- Withdrawal exceeds available: reject with current balance; do not create negative payout.
- Maker-checker conflict: require separate authorised approval.

### Evidence and audit

- earning and settlement entries;
- eligibility rule result;
- withdrawal request;
- approval chain;
- provider recipient/attempt/events;
- failure/reversal/reconciliation; and
- seller notification.

### Completion

Withdrawal is provider-confirmed paid, safely failed/reversed with funds reconciled, rejected before transfer, or explicitly under reconciliation.

### Metrics

- pending-to-available time;
- withdrawal approval time;
- payout success/failure/reversal;
- uncertain-transfer ageing;
- ledger/provider reconciliation; and
- unauthorised payout incidents.

### Prohibited shortcuts

- instant settlement at buyer checkout;
- automatic daily/weekly payout in founding pilot;
- marking payout paid at initiation;
- retrying uncertain transfer blindly; or
- editing balances without ledger entries.

---

## 29. `J21` — Seller payout-account creation or change

**Criticality:** P0  
**Primary actor:** Seller Owner  
**Supporting actors:** Finance/Security, bank-resolution provider, notification worker  
**Surfaces:** Seller Centre, Finance, Security

### Objective

Create or change the seller's payout destination with strong authentication, beneficiary resolution, audit, notification, and risk controls.

### Preconditions

- Seller Owner has payout-management capability.
- Session meets recent-authentication and contact-verification requirements.

### Trigger

Seller adds or changes payout account.

### Required flow

1. Noma requests recent authentication and required second factor/OTP.
2. Seller enters bank and account details through secure server-controlled workflow.
3. Noma resolves account name server-side and displays masked account plus resolved beneficiary.
4. Seller explicitly confirms the beneficiary.
5. Noma applies duplicate, mismatch, high-risk-change, and account-security checks.
6. New payout account is stored securely; full number is not exposed in routine UI/logs.
7. Previous record is preserved as inactive historical evidence.
8. Seller receives security notification.
9. Where risk warrants, existing withdrawals pause and a cooling/manual review period applies.
10. Finance/Security resolves flagged cases before activation.

### Exception paths

- Name resolution fails/mismatches: do not activate; request correction/review.
- Account compromised suspicion: revoke sessions, pause payouts, open `J30`.
- Change followed immediately by withdrawal: enforce cooling/review.
- Seller Operator without authority: deny server-side even if request is crafted manually.

### Evidence and audit

- recent-auth assurance;
- resolution result;
- masked account and provider recipient;
- previous/new status;
- security notification;
- review/cooling decision.

### Completion

The account is verified and active, rejected, or pending security/Finance review with payouts safely controlled.

### Metrics

- resolution success;
- change-review rate;
- payout-account fraud attempts;
- time to activation; and
- withdrawals blocked after suspicious change.

### Prohibited shortcuts

- changing payout account through Support chat;
- storing full account number in logs;
- allowing seller staff without capability to change it;
- immediately paying a newly changed account where risk control requires cooling; or
- silently overwriting the previous account record.

---

# Part E — Enforcement, Safety, Security, and Operational Control

## 30. `J23` — Seller performance restriction, suspension, appeal, and continuity

**Criticality:** P0  
**Primary actor:** Operations or Trust and Safety  
**Supporting actors:** Seller, Support, Finance, Dispatch, FBN, Catalogue, senior approver  
**Surfaces:** Operations, Trust and Safety, Seller Centre, Finance, Admin

### Objective

Apply proportionate, evidence-based seller controls while safely resolving active orders, inventory, returns, cases, and money.

### Preconditions

- A performance, policy, safety, fraud, identity, or security signal/case exists.
- Actor has appropriate capability and approval.

### Trigger

Repeated ordinary failure, serious allegation, confirmed violation, account compromise, or appeal request.

### Required flow

1. Noma opens or links a policy/enforcement case with evidence, severity, scope, history, and continuing risk.
2. Ordinary problems normally progress through education, warning, listing correction, confirmation mode change, category/order-volume restriction, or other narrow controls.
3. Credible serious fraud, counterfeit, unsafe product, threat, or identity concern may trigger immediate temporary safeguards.
4. Action records policy basis, evidence, scope, actor, duration/review, corrective requirement, and appeal eligibility.
5. New activity is blocked only to the necessary scope.
6. Active orders are evaluated individually:
   - safe/unrelated orders may continue under monitoring;
   - unfulfillable orders are rescued/cancelled/refunded;
   - unsafe/counterfeit items are intercepted/quarantined;
   - account compromise may allow Noma-controlled fulfilment while seller access is blocked.
7. Payout holds remain exposure-linked; no automatic confiscation.
8. Seller receives notice and permitted appeal/reinstatement route.
9. Appeal is reviewed with appropriate independence and may uphold, modify, overturn, request information, or reinstate with conditions.
10. Successful appeal reverses connected metrics, rankings, restrictions, charges, holds, and trust effects through auditable records.

### Exception paths

- Immediate safety risk: contain first, review promptly.
- Seller has FBN stock: keep each unit auditable; quarantine only affected scope.
- Permanent closure: resolve all orders, returns, refunds, disputes, payouts, and inventory before final closure.
- Repeated appeal without new evidence: reject under policy while preserving history.

### Evidence and audit

- source signals and case;
- temporary safeguards;
- final action and approvals;
- per-order/inventory treatment;
- financial holds/releases;
- appeal evidence and outcome;
- correction entries.

### Completion

Seller returns to compliant operation, remains under defined restriction, is suspended/removed with all obligations controlled, or has the action overturned and consequences corrected.

### Metrics

- warning-to-recovery rate;
- repeat violation;
- temporary safeguard ageing;
- appeal overturn/modification;
- active-order continuity; and
- incorrect financial consequence.

### Prohibited shortcuts

- permanent ban from one automated signal;
- cancelling every active order automatically;
- confiscating all seller money;
- deleting listings/orders/evidence to represent suspension; or
- allowing the original decision-maker to self-approve a serious appeal where independence is required.

---

## 31. `J28` — Product safety incident, recall, and parcel/inventory containment

**Criticality:** P0  
**Primary actor:** Trust and Safety / Operations  
**Supporting actors:** Catalogue, Seller, FBN, Dispatch, Support, Finance, affected Buyers, manufacturer/regulator where applicable  
**Surfaces:** Trust and Safety, Operations, Catalogue, Seller Centre, Buyer Account

### Objective

Contain a credible product safety risk across listings, stock, parcels, and historical orders and coordinate an auditable remedy without waiting for full automation.

### Preconditions

A safety complaint, manufacturer notice, regulator instruction, pattern of incidents, or credible internal signal exists.

### Trigger

Authorised staff classify the concern as requiring safety/recall review.

### Required flow

1. Case links the concern to canonical product, seller offers, batch/serial/unit, FBN inventory, active parcels, and historical Buyer Orders where data exists.
2. Trust and Safety applies proportionate immediate controls:
   - stop-sale;
   - seller/category restriction;
   - FBN quarantine;
   - pickup/delivery interception;
   - targeted payout hold; and/or
   - urgent customer warning.
3. Operations locates every affected unit and records custody/disposition.
4. Seller/manufacturer/partner is asked for evidence and instructions where appropriate.
5. Noma decides and coordinates repair, replacement, refund, safe collection, disposal, or regulator-directed action.
6. Affected customers are not charged recall logistics costs where Noma policy/rights place responsibility elsewhere.
7. Progress is tracked per unit/customer until risk and remedy are resolved.
8. Listing deletion or seller suspension does not close recall obligations.

### Exception paths

- Scope uncertain: begin narrow containment and expand as evidence supports.
- Parcel already delivered: targeted customer notification and collection/remedy.
- Unsafe evidence handling: provide safety instructions; do not ask customer to continue using item merely to prove defect.
- Manufacturer process delayed: maintain Noma case, updates, and consumer-rights review.

### Evidence and audit

- source and severity;
- affected-product mapping;
- stop-sale/quarantine/interception;
- customer communications;
- custody and disposition;
- financial remedy;
- closure approval.

### Completion

Every identified affected unit/customer has a known status and the safety risk/remedy is resolved or under an external authority's controlled process with ongoing Noma tracking.

### Metrics

- time to stop-sale;
- affected units located;
- customer contact success;
- containment completeness;
- remedy completion; and
- repeat incident.

### Prohibited shortcuts

- closing recall because seller is suspended;
- deleting the product to hide the issue;
- charging customer for required recall movement; or
- sending broad warnings without evidence-based affected scope where targeted action is possible.

---

## 32. `J29` — Operational incident, emergency pause, recovery, and restart

**Criticality:** P0  
**Primary actor:** Authorised Operations/Security/Platform Administrator  
**Supporting actors:** Product/Founder, Finance, Support, Trust and Safety, Logistics, Engineering  
**Surfaces:** Operations, Admin, monitoring/alerting, status communication

### Objective

Contain a material operational, payment, security, logistics, or data incident; protect existing obligations; and restart only after evidence-based approval.

### Preconditions

- Emergency controls are configured, access-restricted, audited, and tested.
- Named incident owners and runbooks exist.

### Trigger

Monitoring alert, staff report, provider outage, security incident, reconciliation failure, logistics breakdown, unsafe condition, or capacity overload crosses a defined threshold.

### Required flow

1. The authorised incident owner classifies severity, affected institution/capability, and immediate risk.
2. Noma applies the narrowest sufficient control:
   - pause new checkout;
   - disable a payment method;
   - pause payouts;
   - pause a seller/category/tier/food/FBN/external flow;
   - revoke a compromised account/session; or
   - suspend the Covenant pilot.
3. Existing paid orders and custody obligations are inventoried and assigned owners.
4. Provider, ledger, order, parcel, case, and customer impacts are preserved; no records are deleted.
5. Support communicates truthful impact and next steps to affected users.
6. Engineering/Operations executes the approved runbook, preserves evidence, monitors recovery, and documents changes.
7. Restart requires the configured maker-checker/authority, passed health/reconciliation/security checks, and rollback readiness.
8. Capacity may restart below previous level.
9. Post-incident review records cause, impact, recovery, missed detection, corrective actions, and owner.

### Exception paths

- Financial truth uncertain: keep payments/payouts paused while unrelated browsing may remain active.
- Logistics capacity collapse: close new delivery slots and resolve existing parcels.
- Data breach suspicion: contain access and follow privacy/legal incident process.
- Emergency actor unavailable: use break-glass access with short expiry, reason, and review.

### Evidence and audit

- alert/source;
- incident timeline;
- pause/restart actor and scope;
- affected obligations;
- communications;
- recovery evidence;
- post-incident actions.

### Completion

The incident is contained, existing obligations have owners/outcomes, affected capability is safely restored/restricted, and corrective actions are tracked.

### Metrics

- detection-to-containment;
- affected orders/users;
- recovery time;
- restart rollback;
- recurrence; and
- unowned obligation count.

### Prohibited shortcuts

- restarting because the homepage loads;
- one-person silent restart of a high-risk capability where approval is required;
- deleting logs or financial exceptions;
- continuing to accept orders beyond staffed capacity; or
- hiding incident impact from Support.

---

## 33. `J30` — Account recovery, session revocation, and compromised-access containment

**Criticality:** P0  
**Primary actor:** Account Holder or Security/Support  
**Supporting actors:** Identity service, Access/Security Administrator, Finance/Operations for high-risk accounts  
**Surfaces:** Authentication, Buyer/Seller/Rider surfaces, Security/Admin, Support

### Objective

Restore legitimate access or contain a compromised account without granting an attacker control of orders, seller funds, rider custody, or privileged systems.

### Preconditions

- Account exists or a suspected compromise signal is present.

### Trigger

Forgotten password, lost institutional email, suspicious login, payout-account change alert, stolen device, reported account takeover, or privileged-access concern.

### Required flow

1. User starts recovery without revealing whether sensitive identifiers match beyond safe responses.
2. Noma verifies control using approved recovery factors and risk-based checks.
3. High-risk recovery—seller payout, rider custody, staff/admin, identity conflict—requires stronger evidence/manual review.
4. On confirmed compromise or material suspicion, Noma may:
   - revoke sessions/tokens;
   - pause payout-account changes and withdrawals;
   - prevent new seller/rider/admin actions;
   - preserve active order/custody operations under Operations control; and
   - alert the legitimate account contacts.
5. Recovery changes credentials, rotates/revokes sessions, and requires MFA/recent authentication as applicable.
6. Existing roles/memberships remain only if their integrity is confirmed; access may stay temporarily restricted.
7. Security reviews actions during the compromise window and reverses/contains unauthorised changes through explicit workflows.
8. User receives a security summary and next steps.

### Exception paths

- Lost Covenant email but valid account: manual affiliation/account review, not automatic duplicate account.
- Attacker changed payout account: pause payouts and use `J21` historical evidence.
- Rider device lost during active job: immediate session revocation and controlled reassignment/custody under `J12`.
- Privileged account compromised: emergency containment under `J29`, access review, and stronger restart approval.

### Evidence and audit

- recovery attempts and assurance;
- session/token revocation;
- account/security changes;
- privileged/financial holds;
- reviewed actions and corrections.

### Completion

Legitimate access is restored with safe credentials and reviewed memberships, or the account remains contained with a documented investigation/recovery path.

### Metrics

- recovery success/time;
- takeover detection;
- revocation latency;
- unauthorised financial/access change; and
- repeated recovery abuse.

### Prohibited shortcuts

- Support manually changing payout account during recovery;
- restoring Super Admin access with ordinary email-only proof;
- leaving old sessions active after compromise; or
- creating a new identity to bypass unresolved ownership conflict.

---

# Part F — Progressively Activated Commerce and Fulfilment Journeys

## 34. `J24` — Food order lifecycle

**Criticality:** P1  
**Primary actor:** Buyer / Food Seller  
**Supporting actors:** Operations, Dispatch, Rider, Support, Finance  
**Surfaces:** Marketplace, Seller Centre, Rider, Operations

### Activation gate

This journey remains unavailable until selected outlets, food policies, preparation workflow, perishability handling, operating hours, Support coverage, and delivery capacity pass activation review.

### Required flow

1. Buyer sees only currently eligible menu items based on outlet hours, availability, modifiers, preparation estimate, category policy, and delivery capacity.
2. Checkout records food-specific acceptance, cancellation, perishability, and promise rules.
3. After verified payment, Food Vendor Order enters seller acceptance.
4. Seller accepts/rejects within deadline, confirms item availability, and begins preparation.
5. Change-of-mind cancellation becomes restricted after acceptance/preparation according to displayed policy.
6. Seller may propose an approved substitute through `J16`; Buyer must explicitly decide.
7. Seller marks food ready only when prepared/packaged for pickup.
8. Dispatch prioritises freshness and avoids incompatible long batching.
9. Pickup and handoff use normal custody proof with food-specific urgency.
10. Failed handoff follows short perishable rules; financial attribution and buyer communication are explicit.

### Exception paths

- Outlet closed/unavailable after payment: seller-caused cancellation and refund.
- Preparation delay: proactive notification, Operations intervention, possible cancellation/remedy.
- Item unavailable: substitution or partial failure.
- Buyer unavailable: specialised retention/disposal/redelivery rules.
- Safety/allergen concern: stop fulfilment and open Protection/Safety Case.

### Completion

Food is delivered within the applicable promise, cancelled/refunded, or resolved through food-specific failed-handoff/protection handling.

### Prohibited shortcuts

- treating food as an ordinary stocked product;
- allowing unrestricted free cancellation after preparation starts;
- batching hot food behind incompatible Saver parcels; or
- activating food before staffed operational capacity exists.

---

## 35. `J25` — External-vendor inbound and campus last-mile handoff

**Criticality:** P1  
**Primary actor:** Invited External Vendor  
**Supporting actors:** External carrier, Noma Operations, CU Express/Noma Fleet, Buyer, Finance  
**Surfaces:** Seller Centre, Operations, Buyer Account, Rider

### Activation gate

External Vendor is invitation-only and activates only after campus commerce is stable, inbound boundary/SOP is approved, and Operations can supervise the small cohort.

### Required flow

1. External Vendor lists approved offers with off-campus stock and conservative inbound promise.
2. Checkout snapshots external fulfilment source and inbound plus campus-last-mile promise.
3. After payment/acceptance, vendor prepares and dispatches to the approved Noma inbound boundary.
4. External carrier tracking/reference is recorded, but it does not replace Noma custody.
5. At inbound receipt, Operations verifies parcel, order, condition/exception, and transfer into Noma-controlled custody.
6. Campus last mile becomes a Noma Delivery Job under `J12`.
7. Buyer sees transparent inbound and campus stages.
8. Delays, damage, loss, and failed inbound use Operations-managed recovery and financial attribution.

### Exception paths

- Inbound parcel late/missing: proactive delay, vendor/carrier evidence, buyer options.
- Wrong/damaged parcel at boundary: reject/quarantine and open case before campus dispatch.
- Vendor sends direct-to-buyer: prohibit and investigate bypass.
- Consolidation needed: operate manually; no advanced nationwide automation.

### Completion

Parcel enters verified Noma custody and completes campus delivery, or the inbound failure reaches cancellation/refund/protection outcome.

### Prohibited shortcuts

- public external onboarding;
- external carrier performing unapproved direct campus handoff;
- hiding inbound-stage risk from Buyer; or
- treating vendor carrier scan as Noma pickup proof.

---

## 36. `J26` — Fulfilled by Noma Campus inbound, storage, pick, pack, and return

**Criticality:** P1  
**Primary actor:** Seller / FBN Operator  
**Supporting actors:** FBN Supervisor, Operations, Buyer, Rider, Finance  
**Surfaces:** Seller Centre, FBN Operations, Rider, Buyer Account

### Activation gate

FBN remains disabled until one approved physical location, SOPs, trained staff, capacity limits, storage policy, and safety/security controls are approved.

### Required flow

1. Eligible seller enrols selected low-risk, non-perishable SKU at SKU level.
2. Seller creates planned inbound shipment with expected items/quantities.
3. FBN Operator receives physical goods, verifies shipment, records discrepancy/damage, and accepts or quarantines each unit/quantity.
4. Accepted stock moves through receiving to putaway/bin with internal QR/label and inventory movement ledger.
5. Marketplace availability reflects only auditable FBN stock.
6. After order confirmation, stock is reserved and a pick task is generated.
7. Operator picks exact SKU/unit, records exceptions, packs, and marks ready.
8. Rider pickup transfers custody under `J12`.
9. Returns enter FBN return intake, inspection/quarantine, and disposition workflow.
10. Cycle counts and reconciliation correct inventory through audited movements, not direct quantity edits.

### Exception paths

- Inbound discrepancy: seller is notified; accepted/rejected quantities remain explicit.
- Damaged/unsafe unit: quarantine and case.
- Pick shortage: pause affected stock and invoke partial failure/recovery.
- Inventory discrepancy: supervisor-approved adjustment with evidence and cycle count.
- Seller suspended: stock remains individually auditable and is handled under `J23`.

### Completion

Each unit/quantity has a known received, stored, reserved, picked, packed, dispatched, returned, quarantined, or reconciled state.

### Prohibited shortcuts

- activating without a physical location/SOP;
- storing hot food, medicines, fragile/high-value electronics, or other excluded categories;
- editing FBN stock without movement records;
- mixing receiving and available inventory before inspection; or
- treating seller-declared inbound quantity as received stock.

---

## 37. `J27` — Structured pre-owned listing and high-risk controls

**Criticality:** P1  
**Primary actor:** Seller  
**Supporting actors:** Catalogue Operator, Buyer, Operations, Trust and Safety, inspection partner later  
**Surfaces:** Seller Centre, Marketplace, Operations

### Activation gate

Lower-risk approved categories may activate first. High-risk phones/laptops remain disabled or tightly invite-only until serial, ownership, activation-lock, inspection, and operational controls pass.

### Required flow

1. Seller selects approved pre-owned category and condition grade.
2. Noma requires actual-unit photos, category-specific condition answers, defects, included/missing accessories, and ownership declaration.
3. Unit-specific goods normally use quantity one or individually tracked units.
4. Applicable serial/IMEI fields are captured securely and masked publicly.
5. Listing checks detect missing angles, contradictions, prohibited goods, and suspicious ownership/serial issues.
6. Buyer sees prominent condition, defects, actual-unit evidence, included items, warranty, and Buyer Protection.
7. Checkout snapshots all condition/serial/evidence information.
8. Handoff may require structured visible-condition check.
9. Return/dispute verifies the same unit and compares immutable listing snapshot.
10. `NOMA_VERIFIED_PRE_OWNED` remains unavailable unless a genuine approved inspection has passed.

### Exception paths

- Ownership/serial concern: block listing and route to Trust and Safety.
- Activation lock or unusable account binding: reject high-risk device.
- Seller edits defects after sale: historical snapshot prevails.
- Buyer returns different unit: inspection/serial dispute.

### Completion

Offer is approved/active within allowed category, held/rejected for correction/risk, or sold and protected through unit-specific evidence.

### Prohibited shortcuts

- stock photos only;
- AI removing real defects;
- grouping materially different used units under one best-looking photo;
- self-declared Noma Verified badge; or
- unrestricted high-risk electronics at pilot start.

---

# Part G — Journey Ownership, Testing, and Delivery Rules

## 38. Cross-surface ownership handoff matrix

| Handoff | Outgoing owner | Incoming owner | Required proof |
|---|---|---|---|
| Guest to Account Holder | Marketplace | Identity | verified account event |
| Account Holder to Covenant eligibility | Identity | Institution verification | approved affiliation record |
| Cart to payment | Checkout | Payment provider/service | immutable checkout + provider reference |
| Payment to confirmed order | Payment service | Order/Inventory/Ledger | verified amount/currency + idempotent transaction |
| Parent Order to seller work | Order | Seller | scoped Vendor Order notification |
| Seller preparation to dispatch | Seller/FBN | Dispatch | ready state + parcel credential |
| Seller/FBN to rider custody | Seller/FBN | Rider/carrier | valid pickup credential + dual/controlled confirmation |
| Rider to Buyer/Delegate | Rider/carrier | Recipient | valid risk-based handoff credential |
| Failed handoff to custody/recovery | Rider | Operations/custody | failed-attempt evidence + custody transfer |
| Complaint to case queue | Buyer/Support | Support/Operations/T&S | structured reason + item link + evidence |
| Approved remedy to refund | Case decision | Finance/provider | approved amount/allocation + authority |
| Earning eligibility to withdrawal | Settlement rules | Seller/Finance | ledger balance + no blocking exposure |
| Payout initiation to final status | Finance | Provider/ledger | signed/verified transfer event |
| Policy signal to enforcement | System/staff | Trust and Safety/authorised approver | case evidence + scope + approval |
| Incident containment to restart | Incident owner | authorised restart authority | recovery checks + explicit approval |

No handoff is complete because the outgoing actor clicked a button. The incoming domain must validate and accept the transfer according to its own rules.

---

## 39. Minimum end-to-end launch scenarios

Before paid pilot orders, Noma must pass end-to-end tests for at least:

1. Guest browses, registers, verifies Covenant, and returns to cart.
2. Straightforward Covenant auto-verification.
3. Covenant manual-review fallback and rejection/retry.
4. Search, compare offers, reserve final unit, and checkout.
5. Successful Paystack payment creates one Parent Order and multiple Vendor Orders exactly once.
6. Duplicate payment webhook causes no duplicate order, stock, earning, or notification.
7. Paid-but-unconfirmed payment enters and exits reconciliation correctly.
8. Two sellers fulfil successfully into one or more valid fulfilments.
9. One seller fails while unaffected Vendor Order continues and partial refund reconciles.
10. Buyer cancellation before pickup shows calculation and completes correct partial/full refund.
11. Post-pickup cancellation request routes to return/protection rather than deletion.
12. Seller prepares, rider is assigned, pickup QR transfers custody, and delivery PIN completes handoff.
13. Wrong rider/parcel/credential is denied.
14. Failed handoff returns parcel to controlled custody with no false delivery.
15. Delegated collection works and revocation blocks use.
16. Buyer opens damage/not-as-described case with evidence; targeted hold and human decision work.
17. Approved partial refund reaches provider-confirmed completion and ledger reconciliation.
18. Seller earning remains pending before completion and becomes available only after eligibility.
19. Withdrawal uses maker-checker where required and payout becomes paid only on provider confirmation.
20. Failed/reversed/uncertain payout restores or holds funds correctly.
21. Payout-account change requires recent authentication, notification, and risk controls.
22. Seller out-of-stock cancellation pauses the affected offer until stock reconfirmation.
23. Seller suspension prevents new activity while active safe orders and money are handled individually.
24. Emergency checkout/payment/payout pause works, is audited, and restart requires approval.
25. Compromised privileged or rider account loses access promptly and active obligations remain controlled.

Feature-gated journeys must have equivalent tests before activation:

- Food acceptance/preparation/cancellation/failed handoff;
- External inbound receipt and campus last mile;
- FBN receiving through dispatch and return/quarantine; and
- Pre-owned actual-unit, serial, handoff, and return dispute.

---

## 40. Journey-level accessibility and device requirements

Every active journey must:

- support keyboard navigation and visible focus on applicable surfaces;
- provide labelled controls and understandable status text;
- not depend on colour alone;
- provide suitable touch targets for Rider/tablet workflows;
- support responsive buyer and seller use;
- preserve action/result feedback for screen readers where applicable;
- expose loading, empty, error, expired, and retry states;
- prevent accidental duplicate submission; and
- avoid animations or layout shifts that obscure payment, confirmation, custody, or error status.

Rider journeys must visibly indicate online/offline state and which actions are drafts versus server-confirmed.

---

## 41. Journey analytics and privacy

Analytics may measure:

- entry, progression, completion, abandonment, and recovery;
- time at material checkpoints;
- error and exception reasons;
- operational handoff delay;
- intervention volume;
- promise performance; and
- outcome quality.

Analytics must not become the source of truth for payment, order, custody, refund, payout, or enforcement.

Analytics events must not include passwords, OTPs, full bank details, private identity evidence, private message content, or unnecessary personal information.

Journey identifiers in this document should be used in analytics naming, test cases, backlog traceability, and incident reports where practical.

---

## 42. Rules for Design

For every critical journey, Design must provide the applicable:

- entry and exit screens;
- happy, loading, empty, processing, success, failure, expired, and restricted states;
- action consequence confirmation;
- status timeline;
- responsive behaviour;
- accessibility behaviour;
- role-specific information exposure;
- safe retry/recovery path;
- notification link target; and
- operational intervention view.

Design must not make an asynchronous or unresolved state look complete merely to simplify the interface.

---

## 43. Rules for Codex and contributors

For every implementation task mapped to a journey, Codex must:

1. cite the Journey ID(s) and relevant scope/role sections;
2. identify primary and supporting actors;
3. identify entry and completion conditions;
4. identify current-state, feature, capacity, and permission checks;
5. identify authoritative provider/system evidence;
6. preserve item/vendor/fulfilment separation;
7. implement material exception paths, not only the happy path;
8. make money, inventory, custody, and privileged actions idempotent;
9. add audit events and operational visibility;
10. add notifications with honest status language;
11. add negative permission and state-transition tests;
12. add concurrency/retry tests where applicable;
13. avoid off-platform or manual database shortcuts;
14. state which progressive/deferred branches were intentionally not activated; and
15. provide lint, type-check, test, build, migration, and applicable security evidence.

When a journey is ambiguous, Codex must stop at the affected boundary and report the conflict rather than inventing business policy.

---

## 44. Journey definition of done

A journey or journey segment is not complete until:

- the intended actor can enter it from an approved source;
- unauthorised actors and scopes are denied server-side;
- preconditions and feature/capacity gates are enforced;
- the happy path reaches an honest completion;
- required failure and exception paths are implemented;
- retries and duplicate events are safe;
- state, money, stock, custody, and evidence remain consistent;
- every ownership handoff has verifiable acceptance;
- user-visible statuses match provider/system truth;
- required notifications and timelines exist;
- material actions are auditable;
- Operations can find and intervene in stuck cases;
- accessibility/responsive/degraded states are covered;
- analytics do not leak sensitive data;
- end-to-end and negative tests pass; and
- the implementation does not silently activate a deferred capability.

---

## 45. Traceability to scope and role contracts

This document implements the following locked foundations:

1. Public discovery with Covenant-protected checkout.
2. Hybrid Covenant verification and one identity with multiple memberships.
3. Selected seller onboarding and separate approval/activation.
4. Canonical products, seller offers, structured inventory, and pre-owned controls.
5. One cart, one payment, Parent Order, independent Vendor Orders, and separate Fulfilment Groups.
6. Paystack provider truth, protected seller earnings, refunds, withdrawals, and controlled payouts.
7. Noma-controlled hybrid logistics with secure pickup, handoff, failed attempt, and custody.
8. Structured in-app communication and buyer-approved substitution.
9. Structured Protection Cases, returns, disputes, remedies, reviews, enforcement, and appeals.
10. Progressive Food, External Vendor, FBN, Priority, Saver, and pre-owned activation.
11. Human control for material financial, fraud, counterfeit, safety, and permanent-enforcement decisions.
12. Production-grade monitoring, recovery, emergency pause, and account-containment journeys.
13. Deny-by-default role, resource, institution, state, assurance, and approval boundaries.
14. Provider/system truth that no human role may fabricate.
15. Staged, measurable, reversible Covenant pilot activation.

---

## 46. Final journey declaration

Noma's Covenant pilot must function as one connected operating system, not a collection of attractive pages.

A buyer must be able to discover a valid offer, verify eligibility, pay once, receive a correctly split multi-vendor order, track each fulfilment, collect securely, receive protection and refund where warranted, and review the verified purchase.

A seller must be able to become approved and activated, publish accurate offers, maintain stock, prepare only their Vendor Orders, hand parcels into verified custody, respond to cases, understand protected earnings, and receive provider-confirmed payouts.

A rider or logistics partner must be able to accept only eligible assignments, transfer parcel-level custody through valid credentials, complete authenticated handoff, and record failed attempts without false delivery.

Operations, Support, Finance, Trust and Safety, and authorised administrators must be able to find, own, intervene in, audit, pause, reconcile, and resolve every material exception without overwriting provider truth, financial history, or custody evidence.

Progressive capabilities may activate only after their complete journey—including exceptions, staffing, security, and recovery—has passed its own gate.
