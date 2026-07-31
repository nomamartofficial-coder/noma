# Noma Covenant Pilot MVP Scope

> **Repository path:** `docs/01-mvp-scope.md`  
> **Status:** Locked scope contract  
> **Version:** 1.0  
> **Effective date:** 30 July 2026  
> **Applies to:** Noma's two-month Covenant University pilot build  
> **Primary audience:** Founders, Product, Design, Engineering, Codex, Operations, Finance, Support, Trust and Safety, and future contributors

---

## 1. Purpose

This document is the binding scope contract for Noma's Covenant University minimum viable product (MVP).

It converts the 15 locked Build Pack Scope Decisions into one repository-ready definition of:

- what **must be built** for the Covenant pilot;
- what must be **architected now but activated progressively or operated manually**;
- what is **fully deferred** until after the pilot;
- what the pilot must **not permit**;
- what must be true before real payments and orders can launch;
- how pilot success, expansion, restriction, rollback, and suspension will be decided; and
- how scope changes are controlled during the two-month construction period.

The objective is to prevent Codex or any contributor from treating Noma's long-term product blueprint as a requirement to automate the entire nationwide marketplace in two months.

The target is:

> **A stable, secure, operationally testable and capacity-controlled Covenant pilot - not every future Noma capability.**

---

## 2. Authority and source-of-truth hierarchy

For Covenant MVP scope questions, the following hierarchy applies:

1. **This document** controls what is in scope, progressively activated, manual, prohibited, or deferred.
2. More detailed Build Pack documents may define roles, journeys, information architecture, technical architecture, domain models, state machines, integrations, security controls, tests, backlog items, and readiness evidence.
3. Those later documents may clarify implementation but **must not silently expand this scope**.
4. The Noma Product Decisions Blueprint remains the source of long-term product intent and rationale.
5. A Codex prompt, issue, pull request, design, database migration, or implementation convenience must not override this document.

Where a conflict is discovered, implementation must stop at the affected boundary until the conflict is recorded and resolved through the scope-change process in Section 30.

This contract consolidates the locked decisions and boundaries recorded in:

- `NOMA PRODUCT DECISIONS-BLUE PRINT.docx`;
- `NOMA BUILD PACK.docx`;
- `NOMA BUILD PACK SCOPE DECISIONS PART 1.docx`;
- `THE ACTUAL FIRST STEP- NOMA IMPLEMENTATION PACK.docx`; and
- `NOMA TWO-MONTH CONSTRUCTION PLAN.docx`.

The scope decisions in this document control the pilot classification where an earlier source describes a capability only as a long-term possibility.

---

## 3. Normative language

The keywords below are binding:

- **MUST / MUST NOT:** mandatory for the applicable pilot stage.
- **SHOULD / SHOULD NOT:** expected unless a documented reason is approved.
- **MAY:** optional within the locked boundary.
- **BUILD NOW:** implementation required during the two-month MVP.
- **ACTIVATE PROGRESSIVELY:** implementation may exist, but real customer exposure requires a separate gate.
- **OPERATE MANUALLY:** the system must record, control, and audit the workflow, while an authorised person makes or executes the decision.
- **ARCHITECT NOW:** preserve a clean domain boundary, type, capability, provider interface, status, or extension point without building the complete future workflow.
- **DEFER:** do not implement the complete capability during the Covenant MVP.
- **PROHIBITED:** the pilot must reject or prevent the behaviour, even if technically possible.

Illustrative model or endpoint names in this document express required responsibilities. Exact names will be locked in the technical architecture and domain-model documents.

---

## 4. Product vision and pilot objective

Noma is a university-native, multi-vendor marketplace that combines trusted campus identity, structured commerce, protected payments, Noma-controlled fulfilment, buyer protection, and auditable operations.

The Covenant pilot exists to validate that Noma can reliably coordinate:

- verified buyers;
- campus stores and student vendors;
- selected external vendors later in the beta;
- structured catalogue and inventory;
- one multi-vendor checkout and buyer payment;
- protected seller earnings and controlled payouts;
- CU Express and a small Noma Fleet;
- secure pickup and handoff;
- cancellations, refunds, returns, disputes, reviews, and enforcement; and
- real Operations, Support, Finance, and Trust and Safety intervention.

The pilot is not merely a storefront demonstration. It must test the complete end-to-end operating model under explicit capacity limits.

---

## 5. Covenant pilot assumptions

The MVP is designed around the following assumptions:

1. **Single-institution launch:** Covenant University is the only active institution during the founding pilot.
2. **Public discovery, protected campus commerce:** anyone may browse the public storefront, but Covenant-specific checkout and campus fulfilment require the appropriate verified affiliation and account capability.
3. **Selected sellers:** seller participation is approved and controlled; it is not an unrestricted public marketplace.
4. **Prepaid digital payment:** Paystack is the primary payment provider. Cash-on-delivery and rider cash collection are prohibited.
5. **Noma-controlled fulfilment:** ordinary seller-to-buyer direct delivery is not a normal pilot option.
6. **Hybrid logistics:** CU Express is the primary partner; a small Noma student-rider fleet supplements capacity.
7. **Approved locations:** pickups, deliveries, storage, and handoffs occur through configured and approved Covenant locations.
8. **Human-supervised operations:** sophisticated recovery, risk, inspection, enforcement, and exception handling may be rules-based and human-controlled.
9. **Feature-controlled activation:** food, external vendors, FBN, Priority, Saver, and selected pre-owned categories can be enabled separately without redeployment or schema redesign.
10. **Wi-Fi-aware workflows:** rider and campus workflows must tolerate intermittent connectivity without treating unsafe offline actions as final proof.
11. **Capacity-controlled launch:** seller count, buyer cohorts, order volume, delivery capacity, order value, operating hours, and category exposure remain configurable and limited.
12. **Two-month boundary:** Weeks 7 and 8 prioritise integration, security, testing, hardening, acceptance, and readiness. No major feature enters during those weeks unless it blocks a locked pilot flow or protects legal, safety, security, or financial integrity.

---

## 6. Scope classification summary

| # | Scope decision | Build for Covenant pilot | Progressive/manual/architected | Fully deferred or disabled |
|---|---|---|---|---|
| 1 | Food commerce | Complete food-specific foundation and tested workflow | Selected outlets activate after ordinary-product stability | Advanced restaurant integrations, subscriptions, ingredient inventory, predictive prep AI |
| 2 | External vendors | First-class seller type, invitation workflow, off-campus stock and inbound-leg foundation | Tiny, manually supervised late-beta activation | Public nationwide onboarding and advanced consolidation |
| 3 | Fulfilled by Noma Campus | Small one-location FBN capability | Activate only after physical location and SOP approval | Multi-location WMS, advanced optimisation, automated storage fees |
| 4 | Pre-owned commerce | Structured condition, actual-unit evidence, ownership and dispute foundation | Lower-risk categories first; electronics tightly controlled | Unrestricted electronics and unearned Noma Verified badge |
| 5 | Commerce types | Shared modular foundation; Product active; Food gated | Clean extension boundaries for future types | Service, Rental, Digital, and Event workflows and checkout |
| 6 | Multi-vendor checkout | One cart, one payment, Parent Order, Vendor Orders, Fulfilment Groups, allocations | Manual/rules-based substitutions and recovery | Autonomous restructuring and advanced optimisation |
| 7 | Payments and payouts | Paystack, internal ledger, refunds, withdrawals, controlled transfers and reconciliation | Human Finance approval; later payout schedules architected | Customer wallet, COD, instant settlement, automatic schedules |
| 8 | Delivery and dispatch | Noma Delivery Jobs, hybrid carriers, Standard, pickup/handoff proof, dispatch board | Priority then Saver; human-supervised batching and reassignment | Predictive routing, continuous GPS optimisation, autonomous dispatch |
| 9 | Covenant verification | Hybrid email/identifier verification and manual fallback | Future Covenant SSO/directory provider boundary | Mandatory government-ID/biometric proof for ordinary buyers |
| 10 | Product surfaces | One platform with distinct Buyer, Seller, Rider, Operations, and Admin surfaces | Rider PWA offline tolerance and progressive capability | Separate native applications and duplicated platforms |
| 11 | Messaging and notifications | Structured in-app messages, transactional email, anti-bypass and secure evidence | Opt-in web push; critical SMS later | WhatsApp transaction channel, unrestricted contact sharing, voice/video |
| 12 | Protection and enforcement | Structured cases, evidence, deadlines, remedies, reviews, controls and appeals | Human decisions for material, ambiguous, fraud, counterfeit, and safety matters | Autonomous serious decisions and complete automated warranty/recall networks |
| 13 | Search, merchandising and AI | Relevance-first search, filters, analytics, collections and transparent promotions | Reviewable assistive AI; sponsored foundation disabled/limited | Autonomous ranking AI, personalised pricing, AI-generated evidence, mature ad auction |
| 14 | Security and reliability | Production-grade pilot baseline before paid orders | Enterprise capabilities mature later | Multi-region active-active, full SOC/SIEM, enterprise-scale controls before validation |
| 15 | Pilot launch | Staged gates, capacity controls, metrics, pause/rollback and evidence-based expansion | Progressive cohort, seller, category, tier, and feature growth | Unrestricted launch or expansion without evidence |

---

## Part A - Build for the Covenant Pilot

### 7. Required buyer experience

A pilot buyer MUST be able to:

1. Browse the public marketplace without creating an account.
2. Register and verify the required Covenant affiliation before protected campus checkout.
3. Search, navigate categories, apply category-relevant filters, and compare seller offers.
4. Understand price, condition, seller, fulfilment source, availability, warranty/return classification, and delivery promise before payment.
5. Add eligible items from several sellers to one cart.
6. Complete one checkout and one prepaid Paystack payment.
7. Receive one understandable customer order while Noma manages internal Vendor Orders and Fulfilment Groups.
8. See independent item/vendor progress where one seller or fulfilment fails.
9. Receive clear order, preparation, pickup, dispatch, arrival, cancellation, refund, return, dispute, and payout-independent status messages.
10. Communicate through structured Noma messaging without exposing unnecessary contact information or private room locations.
11. Approve or reject a permitted substitution through a recorded action.
12. Cancel where the lifecycle permits and see the calculated refund/cost outcome before confirming.
13. Track deliveries and complete secure handoff with the applicable PIN, QR, or risk-based credential.
14. Authorise an eligible delegate for a specific order where policy permits.
15. Report a delivery, product, safety, or transaction problem through an order-linked Protection Case.
16. Submit evidence through the secure case uploader.
17. Receive an item-level remedy, refund status, or reasoned rejection.
18. Review a verified purchase after the eligible transaction stage.

The buyer experience MUST NOT require private WhatsApp negotiation, seller-directed bank transfer, direct seller delivery, or disclosure of unnecessary personal data.

---

### 8. Required seller experience

The MVP MUST support these seller types:

- `CAMPUS_STORE`
- `STUDENT_VENDOR`
- `EXTERNAL_VENDOR`

A seller MUST be able to:

1. Apply or be invited through the correct seller-type workflow.
2. Pass risk-appropriate identity, organisation, category, and payout verification.
3. Remain approved but inactive until explicitly activated for Covenant.
4. Create or attach offers to canonical products.
5. Manage price, variants, condition, fulfilment mode, stock, availability, images, and category-specific information.
6. Receive warnings or blocking validation for missing or contradictory listing information.
7. Manage tracked-quantity or availability-only inventory and reconfirm stock after out-of-stock cancellation.
8. Receive independent Vendor Orders containing only the seller's portion.
9. Prepare, mark ready, reject/accept where the commerce type requires it, and hand parcels to the assigned logistics actor.
10. Use seller-to-rider pickup proof.
11. Respond to order questions, substitutions, returns, disputes, policy cases, and evidence requests through Noma.
12. View pending, available, held, reserve, processing, paid, and negative financial positions where applicable.
13. Add and verify a payout account under strong security controls.
14. Request an eligible withdrawal and see its provider-confirmed status.
15. View seller-performance and enforcement information relevant to their account.
16. Appeal eligible enforcement or case outcomes.

Seller approval, seller activation, Covenant affiliation, payout verification, and trust status MUST remain separate concepts.

---

### 9. Required rider and logistics experience

The Rider surface MUST be a lightweight installable web/PWA experience optimised for approved tablets, touch input, scanning, and unreliable Wi-Fi.

A rider MUST be able to:

1. View shift, availability, capacity, and eligible assignments.
2. Accept or be assigned a Delivery Job according to role and carrier workflow.
3. View only information necessary for the assignment.
4. Navigate to approved pickup and handoff points.
5. Verify pickup through the parcel credential and current assignment.
6. Record custody transfer and applicable exceptions.
7. View the required delivery tier, promise, handling instructions, and permitted recipient/delegate.
8. Complete handoff using the correct risk-based credential.
9. Record a structured failed attempt with required evidence.
10. Escalate damage, loss, unsafe handoff, identity conflict, or operational incident.
11. Participate in a controlled reassignment or custody transfer.
12. See completed jobs and applicable earnings/credit information.

Offline capability MAY cache assignments and queue safe drafts, but MUST NOT silently finalise a high-risk pickup or delivery without required backend validation.

---

### 10. Required Operations, Support, Finance, Trust and Safety, and Admin experience

The MVP MUST provide distinct, capability-scoped operational surfaces.

#### Operations MUST be able to

- manage live order and fulfilment queues;
- intervene in seller preparation and delivery exceptions;
- view the dispatch board;
- assign, batch, reassign, and return parcels to controlled custody;
- pause or restrict affected commerce capabilities;
- coordinate external inbound and FBN workflows where activated;
- manage return logistics and operational incidents; and
- view complete auditable timelines within authorised scope.

#### Support MUST be able to

- open and manage order-linked cases;
- request evidence;
- apply approved low-risk rules;
- communicate reasoned outcomes; and
- escalate cases requiring Operations, Finance, Trust and Safety, or senior review.

#### Finance MUST be able to

- reconcile customer payments, allocations, refunds, seller earnings, withdrawals, transfers, and reversals;
- approve eligible material refunds and payout batches;
- manage exceptions without rewriting financial history; and
- inspect provider and internal status differences.

#### Trust and Safety MUST be able to

- investigate prohibited products, fraud, identity misuse, counterfeit or stolen-goods allegations, harassment, threats, and coordinated bypass;
- apply proportionate temporary safeguards;
- recommend or impose authorised enforcement; and
- preserve evidence and appeals.

#### Restricted administration MUST support

- roles and capabilities;
- institution configuration;
- feature activation;
- seller activation;
- category and policy controls;
- high-risk payout and ledger permissions;
- audit access;
- emergency pause controls; and
- configuration changes with strong authentication and audit evidence.

No employee receives unrestricted platform authority merely because their broad role is named `ADMIN`.

---

### 11. Commerce and catalogue scope

#### 11.1 Modular commerce foundation

The shared commerce architecture MUST recognise:

- `PRODUCT`
- `FOOD`
- `SERVICE`
- `RENTAL`
- `DIGITAL`
- `EVENT`

Activation for the founding Covenant pilot is:

| Type | Pilot status |
|---|---|
| Product | Active |
| Food | Built and feature-gated; selected activation only after product stability |
| Service | Disabled at creation, administration, discovery, API, cart, and checkout |
| Rental | Disabled at creation, administration, discovery, API, cart, and checkout |
| Digital | Disabled at creation, administration, discovery, API, cart, and checkout |
| Event | Disabled at creation, administration, discovery, API, cart, and checkout |

Unsupported types MUST NOT be disguised as ordinary products.

The system MUST preserve a shared listing identity and clean type-specific extension boundaries. It MUST NOT build one giant table filled with unrelated nullable food, service, rental, digital, and event fields.

#### 11.2 Canonical products and seller offers

The catalogue MUST distinguish:

- the shared product identity and structured attributes; and
- each seller's offer, including price, condition, availability, inventory, fulfilment, seller, and promise information.

Search SHOULD group materially identical offers under the canonical product while preserving distinct unit-specific pre-owned goods where appropriate.

#### 11.3 Inventory

The MVP MUST support:

- tracked quantity;
- availability-only inventory;
- reservations during checkout/payment;
- reservation release after expiry or failure;
- stock deduction following confirmed payment according to the locked order flow;
- offer and inventory-location awareness;
- listing pause/reconfirmation after seller-attributed out-of-stock cancellation; and
- auditable inventory movement for Noma-held stock.

#### 11.4 Food commerce

The food foundation MUST include:

- menus and food offers;
- current availability and operating windows;
- preparation estimates;
- seller acceptance/rejection and timeout;
- accepted, preparing, and ready states;
- food-specific cancellation/refund handling;
- perishable failed-handoff handling;
- allergen/dietary disclosure fields appropriate to the category;
- outlet capacity controls; and
- complete test coverage before customer activation.

Food customer ordering MUST remain disabled initially and MAY move through:

`DISABLED -> INTERNAL_TEST -> FOUNDING_OUTLETS -> LIMITED_BETA -> ACTIVE`

A feature flag controls exposure, not engineering quality. The workflow must be tested before activation.

#### 11.5 External vendors

`EXTERNAL_VENDOR` MUST exist as a first-class seller type.

The MVP MUST include:

- invitation or admin-created onboarding;
- stronger business and payout verification structure;
- approved-but-inactive status;
- off-campus inventory locations;
- external inbound and campus last-mile fulfilment legs;
- conservative promises visible before payment;
- admin feature controls; and
- complete audit history.

Public external-vendor registration MUST remain disabled.

A late-beta test MAY activate only:

- approximately 1-3 approved external vendors;
- low-risk categories;
- limited SKUs and order volume; and
- manual Operations oversight.

External couriers MUST stop at Noma's controlled inbound boundary. CU Express or Noma Fleet retains campus last-mile and buyer-handoff responsibility.

#### 11.6 Fulfilled by Noma Campus (FBN)

The MVP MUST support a small, controlled FBN pilot with:

- SKU-level enrolment rather than seller-wide enrolment;
- one approved fulfilment location;
- planned inbound shipments;
- receiving and discrepancy handling;
- receiving/putaway separation;
- simple bins and internal labels;
- auditable inventory movements;
- reservations, picking, packing, and rider handoff;
- returns, quarantine, cycle counts, and reconciliation; and
- capacity and category controls.

FBN MUST remain inactive until the physical location, responsible staff, security, storage rules, and operating procedures are approved.

Initial inventory MUST be low-risk and non-perishable, such as selected books, stationery, or packaged essentials.

#### 11.7 Pre-owned commerce

The MVP MUST support:

- controlled pre-owned condition grades;
- category-specific condition reports;
- mandatory photographs of the actual unit;
- mandatory material-defect disclosure;
- ownership/authority declaration;
- unit-specific inventory by default;
- immutable checkout snapshots;
- stronger pickup, return, dispute, and evidence requirements; and
- serial/IMEI and activation-lock data foundations for applicable categories.

The first live categories SHOULD be lower-risk items such as books, approved clothing/accessories, and ordinary non-electronic student goods.

High-risk phones and laptops MUST remain disabled or tightly invite-only until ownership, serial, activation-lock, inspection, custody, and dispute procedures are proven.

`NOMA_VERIFIED_PRE_OWNED` MUST NOT be displayed unless Noma or an approved inspection partner has genuinely inspected the exact unit under an approved procedure.

---

### 12. Multi-vendor checkout, orders, and fulfilment

The Covenant MVP MUST provide:

- one cart;
- one checkout;
- one buyer payment;
- one Parent Order;
- independent Vendor Orders;
- item-level financial allocations;
- separate Fulfilment Groups and fulfilment items;
- independent seller preparation and failure states;
- independent cancellation, refund, and settlement eligibility; and
- buyer-facing continuity when one seller fails.

Each seller MUST see only their portion of the transaction.

Vendor Order and Fulfilment MUST remain separate concepts. Several Vendor Orders may be combined into a compatible delivery, while one Vendor Order may require more than one fulfilment.

A seller failure MUST NOT automatically destroy unaffected Vendor Orders. The system MUST preserve legitimate buyer promotions and correctly adjust:

- affected item value;
- delivery allocations;
- commissions;
- seller earnings;
- funded discounts;
- refunds; and
- operational liabilities.

Cross-Seller Rescue, complex substitutions, delivery-cost redistribution, and post-failure fulfilment restructuring MAY be handled by transparent rules and authorised Operations staff. They MUST NOT be executed by autonomous AI during the pilot.

Checkout MUST preserve an immutable commercial snapshot of the information shown and agreed at payment time.

---

### 13. Payments, seller earnings, refunds, and payouts

#### 13.1 Customer payments

The MVP MUST use prepaid Paystack payments and MUST include:

- server-side transaction initialisation and verification;
- expected amount and currency validation;
- unique internal and provider references;
- raw provider-event preservation;
- HMAC webhook-signature verification;
- idempotent duplicate-event handling;
- transactional order confirmation;
- failed, abandoned, expired, and uncertain states; and
- reconciliation exceptions.

A browser redirect MUST NOT be treated as authoritative payment confirmation.

#### 13.2 Internal allocation and ledger

The internal financial ledger is Noma's source of truth for:

- item/vendor payment allocation;
- delivery allocation;
- platform commission;
- promotion funding;
- seller earnings;
- holds and reserves;
- refunds and reversals;
- rescue or liability costs;
- payouts and payout reversals; and
- manual adjustments.

Money MUST be stored in integer minor units. Financial history MUST be append-only: corrections and reversals create new entries rather than silently changing past entries.

Customer payment, seller earning, settlement eligibility, payout, and refund MUST remain separate lifecycle concepts.

#### 13.3 Seller earnings

Seller financial buckets MUST support, where applicable:

- pending;
- available;
- held/disputed;
- risk reserve;
- processing;
- paid; and
- negative exposure.

An earning begins as pending. It becomes available only after the applicable fulfilment, handoff, protection, dispute, and risk conditions pass.

An ordinary dispute SHOULD hold only the amount reasonably connected to the exposure. Broader safeguards require a documented serious-risk basis.

#### 13.4 Refunds

The MVP MUST support:

- full and partial refunds;
- asynchronous provider states;
- item-level allocation reversal;
- seller-earning and commission adjustment;
- provider-confirmed completion;
- stuck/failed/needs-attention reconciliation; and
- accurate buyer-facing status language.

"Refund approved" MUST NOT be displayed as "Refund completed" until provider confirmation supports it.

#### 13.5 Payouts

The MVP MUST support:

- verified seller payout accounts;
- account-name resolution and masked display;
- recent authentication and security notification for payout-account changes;
- cooling/review controls where risk warrants;
- withdrawal requests;
- Finance review and approval;
- payout batches;
- transfer recipients and transfer attempts;
- final success, failure, reversal, and uncertain states;
- restoration of funds only after reconciliation; and
- provider-confirmed final status.

Automatic daily/weekly payouts MUST remain disabled initially. A successful transfer initiation is `PROCESSING`, not `PAID`.

#### 13.6 Prohibited payment behaviour

The pilot MUST NOT offer:

- customer stored-value wallets;
- peer-to-peer transfers;
- customer cash withdrawals;
- cash-on-delivery;
- rider cash collection;
- personal bank-transfer instructions;
- seller instant settlement at checkout;
- automatic payout schedules during the founding pilot;
- cryptocurrency payment;
- Noma-issued credit, lending, or overdraft.

---

### 14. Delivery and dispatch

Every delivery MUST remain a Noma-controlled Delivery Job, even where CU Express or Noma Fleet performs the physical movement.

The MVP MUST support:

- carrier types for CU Express and Noma Fleet;
- rider profiles, shifts, availability, eligibility, and capacity;
- approved pickup and delivery points;
- manual and transparent rules-based assignment;
- assignment history and override reasons;
- Standard delivery;
- configurable Priority and Saver tiers;
- simple operator-created or rules-suggested batching;
- parcel-level tracking within a batch;
- pickup QR or equivalent credential;
- risk-based buyer/delegate delivery PIN/QR;
- failed-attempt reason codes and evidence;
- controlled reassignment and custody transfer;
- return to controlled custody;
- delivery incident records; and
- an Operations dispatch board.

Activation order is:

1. **Standard:** active from the first closed pilot.
2. **Priority:** limited activation only after capacity and promise handling are stable.
3. **Saver:** activation only after Noma demonstrates reliable batching and genuine operational savings.

Rules SHOULD consider eligibility, carrier availability, capacity, workload, locations, product handling, food urgency, tier, and compatible batches.

Predictive route optimisation, continuous GPS-dependent dispatch, automated surge pricing, multi-carrier bidding, and autonomous AI assignment are deferred.

---

### 15. Identity, account capability, and Covenant verification

The MVP MUST separate:

- Noma account status;
- email verification;
- phone/contact verification;
- Covenant affiliation;
- student/staff status;
- seller approval and activation;
- payout verification; and
- trust/standing.

Covenant verification MUST use:

- full name;
- approved institutional email;
- email verification;
- matric number or staff identifier;
- configurable format and normalisation rules;
- duplicate detection;
- automatic approval for straightforward cases; and
- proportionate manual fallback for conflicting or risky cases.

Exact Covenant email domains, identifier formats, and active-status sources MUST be confirmed with authorised Covenant stakeholders. They MUST NOT be guessed or permanently hardcoded from assumptions.

Manual evidence collection MUST be proportionate, access-restricted, purpose-limited, and governed by retention rules. Noma MUST NOT collect unrelated academic results, GPA, disciplinary information, or routine biometrics for ordinary campus checkout.

The architecture MUST support a future Covenant SSO or directory verification provider without requiring that integration during the MVP.

Affiliation MUST support expiry, revocation, and revalidation without deleting the person's general Noma account history.

---

### 16. Platform surfaces and authorisation

Noma MUST use one shared web platform and design system with distinct route groups or equivalent surfaces:

- Buyer Marketplace and Buyer Account;
- Seller Centre;
- Rider PWA;
- Noma Operations; and
- Restricted Administration.

The surfaces MAY share identity, sessions, API contracts, components, design tokens, notifications, files, and audit infrastructure.

They MUST retain distinct:

- navigation;
- information density;
- device priorities;
- workflows;
- permissions; and
- security requirements.

A single account MAY possess several approved capabilities, such as buyer, student vendor, and rider. Privileged staff access requires separately granted authority and stronger controls.

Backend authorisation MUST evaluate:

- actor identity;
- role and capability;
- institution, seller, order, case, or assignment scope;
- resource ownership/authority; and
- current business state.

Hiding a page or button is not authorisation.

Separate native Android/iOS applications and separately maintained repositories are deferred.

---

### 17. Messaging, evidence, and notifications

The MVP MUST support distinct conversation contexts for:

- product questions;
- active order conversations;
- Support cases;
- disputes/protection cases; and
- system-generated timelines.

Free-form messages MUST NOT replace formal order actions. For example, a seller message saying an order is ready does not replace the authorised `READY_FOR_PICKUP` transition.

The system MUST:

- limit identity and location exposure;
- hide buyer phone number and private room location by default;
- detect common contact, payment, external-link, and bypass patterns;
- block, warn, or route messages for review according to context;
- treat detection as a signal rather than automatic guilt;
- support report and block controls;
- apply graduated enforcement;
- restrict moderation access by case and capability;
- audit authorised conversation access; and
- preserve relevant evidence under approved retention rules.

Ordinary chat SHOULD be text-first. Issue evidence MUST use a separate secure upload workflow with allow-listed files, limits, private storage, controlled access, and safe processing.

Notification channels are:

- in-app: required authoritative notification centre;
- transactional email: required;
- web push: progressive opt-in activation;
- SMS: later for selected critical cases where justified.

Users MAY opt out of marketing messages but MUST still receive essential transaction and security notices.

WhatsApp MUST NOT serve as Noma's buyer-seller transaction, payment, delivery-instruction, or dispute channel.

---

### 18. Protection, returns, disputes, reviews, and enforcement

#### 18.1 Protection Case foundation

The MVP MUST use an order-linked Protection Case foundation for matters including:

- returns;
- item not received;
- wrong, damaged, missing, or misdescribed items;
- counterfeit or stolen-goods concerns;
- safety incidents;
- delivery incidents;
- payment disputes;
- warranties;
- recalls;
- policy violations; and
- appeals.

Cases MUST support:

- structured reason codes;
- item/order/seller/delivery linkage;
- required evidence by reason;
- deadlines;
- queue and assignee;
- severity and financial exposure;
- targeted safeguards;
- state transitions;
- decision and remedy;
- communication; and
- complete audit timeline.

Immediate safeguards do not equal a final finding of fault.

#### 18.2 Human decision control

Straightforward, objectively safe actions MAY be executed through approved rules.

Authorised humans MUST decide materially disputed, high-value, fraud, counterfeit, safety, permanent-enforcement, or complex financial-liability cases.

AI MAY later summarise evidence or identify missing information, but MUST NOT independently:

- reject a serious consumer claim;
- accuse a user of fraud;
- determine authenticity;
- permanently suspend a seller;
- confiscate earnings;
- decide a safety recall; or
- impose material liability.

#### 18.3 Remedies and return logistics

The MVP MUST support item-level remedies such as:

- full refund;
- partial refund;
- return and refund;
- replacement;
- repair/warranty routing where applicable;
- redelivery;
- missing-component delivery;
- returnless refund where authorised; and
- reasoned rejection.

An approved physical return MUST become a controlled logistics/custody workflow and MAY require inspection before the final remedy.

#### 18.4 Reviews

Only verified Noma purchases MAY produce public reviews.

Reviews SHOULD separate:

- product quality;
- description accuracy;
- seller experience;
- fulfilment/delivery experience; and
- optional written evidence.

Genuine negative feedback MUST NOT be removed merely because the seller dislikes it or issued a refund. Review moderation is limited to relevant policy grounds.

Noma MUST NOT launch public seller reviews of buyers. Seller reports about buyer abuse remain private risk signals.

#### 18.5 Enforcement and appeals

The MVP MUST support proportionate actions including:

- education;
- warning;
- listing correction/removal;
- category restriction;
- order-volume or confirmation-mode restriction;
- messaging restriction;
- payout safeguard;
- temporary suspension; and
- permanent removal by authorised decision.

Every action MUST record evidence, policy basis, scope, actor, time, review/expiry, corrective requirement, and appeal eligibility.

Successful appeals MUST reverse connected metrics, restrictions, financial charges, and trust effects through auditable entries rather than deleting history.

Warranty and recall cases MUST be recorded digitally but MAY be manually coordinated during the pilot.

---

### 19. Search, merchandising, promotions, and assistive AI

#### 19.1 Search

The MVP MUST provide:

- a search-provider abstraction;
- PostgreSQL full-text search;
- supported and patched typo/similarity matching such as `pg_trgm`;
- structured category and attribute filters;
- autocomplete and recent searches;
- approved synonyms;
- sorting;
- canonical-product result grouping with offer comparison;
- availability and fulfilment-promise signals;
- zero-result handling; and
- search analytics.

Ranking MUST prioritise query relevance before secondary signals such as:

- policy eligibility;
- availability;
- stock confidence;
- fulfilment reliability;
- delivery promise;
- product/seller quality;
- total value; and
- controlled discovery exposure.

New sellers MAY receive limited, measurable discovery exposure, but not at the expense of relevance, safety, eligibility, or availability.

Search-index information MUST be revalidated during cart/checkout because appearing in search does not guarantee a reservation.

#### 19.2 Merchandising and promotions

Operations MUST be able to create transparent, auditable collections and campaigns.

The promotion foundation MUST support, as required:

- seller-funded, Noma-funded, or shared discounts;
- fixed or percentage discounts;
- minimum-order and eligibility rules;
- usage limits;
- start/end times; and
- immutable checkout funding allocation.

The buyer MUST not encounter unexplained price increases between product display and checkout.

Sponsored-placement data foundations MAY exist, but broad paid placement MUST remain disabled or extremely limited until meaningful organic demand exists. Any future activation must be clearly labelled, relevant, and unable to purchase trust or erase meaningful organic results.

#### 19.3 Assistive AI

Pilot AI MAY provide reviewable suggestions for:

- listing titles;
- category and attribute mapping;
- missing data;
- image-quality warnings;
- possible catalogue duplicates;
- search synonyms; and
- operational case summaries later.

A human or seller MUST review and approve material output.

AI MUST NOT:

- silently alter live listings;
- invent specifications;
- remove real defects from pre-owned images;
- fabricate product evidence or accessories;
- create fake reviews or claims;
- autonomously merge canonical products;
- personalise prices; or
- make serious ranking, trust, dispute, or enforcement decisions.

---

## Part B - Architect Now, Activate Later, or Operate Manually

### 20. Required progressive/manual capabilities

The following concepts must be recognised by the architecture and, where relevant, supported by auditable Operations workflows, but do not require mature automation in the founding pilot:

- selected food-outlet activation;
- tiny late-beta external-vendor activation;
- external inbound coordination and return routing;
- one-location FBN activation;
- selected low-risk pre-owned category activation;
- invite-only high-risk electronics experiments after controls are proven;
- Priority delivery;
- Saver batching;
- Cross-Seller Rescue;
- buyer-approved substitutions;
- complex delivery-cost and promotion redistribution;
- exceptional seller holds and reserve decisions;
- payout schedules as inactive configuration;
- Covenant SSO/directory provider interface;
- opt-in web push and selected critical SMS;
- warranty, repair, recall, and inspection coordination;
- advanced buyer/seller risk signals;
- reviewable AI assistance;
- sponsored-placement foundation; and
- more sophisticated search, dispatch, or fraud services when scale justifies them.

"Manual" MUST NOT mean an undocumented spreadsheet or private WhatsApp decision. The platform must provide the case, status, record, audit trail, evidence, permission, and financial/operational effect needed to execute the workflow safely.

---

## Part C - Fully Defer Until After the Pilot

### 21. Deferred capabilities

The following are outside the two-month Covenant MVP unless a documented safety/legal blocker requires a narrow exception:

#### Commerce expansion

- active Service commerce;
- active Rental commerce;
- active Digital commerce;
- active Event commerce;
- subscriptions and complex recurring commerce;
- unrestricted custom commerce without a complete lifecycle.

#### Geographic and seller expansion

- public nationwide external-vendor registration;
- unrestricted external-vendor trading;
- multi-institution launch;
- nationwide pickup, consolidation, returns, or last-mile networks;
- seller self-service carrier integrations;
- large-scale cross-docking.

#### Fulfilment and logistics

- multi-location warehouse management;
- advanced wave picking, slotting, labour planning, and automated storage fees;
- robotics or conveyor systems;
- continuous GPS-dependent dispatch;
- predictive fleet-wide route optimisation;
- real-time multi-carrier bidding;
- automated surge pricing;
- autonomous AI dispatch.

#### Payments and finance

- customer stored-value wallet;
- peer-to-peer transfer;
- cash-on-delivery and rider cash collection;
- seller instant settlement at checkout;
- automatic payout schedules at founding launch;
- cryptocurrency payments;
- Noma-issued credit, lending, or overdraft;
- fully automated rolling reserves and negative-balance recovery.

#### Pre-owned, warranty, and protection

- unrestricted used-phone/laptop marketplace;
- self-declared Noma Verified Pre-Owned;
- nationwide inspection/refurbishment centres;
- complete manufacturer/repair-network automation;
- automated recall logistics at nationwide scale;
- autonomous counterfeit, dispute, refund, or permanent-enforcement decisions.

#### Search, ads, and AI

- mature advertising auctions and unrestricted seller self-service ads;
- autonomous ranking AI;
- complex individual recommendation models;
- behavioural personalised pricing;
- conversational or voice shopping as a core flow;
- AI-generated product evidence, reviews, or claims;
- unreviewed AI catalogue merges.

#### Applications and enterprise infrastructure

- separately maintained native buyer, seller, rider, and admin applications;
- separate repositories and authentication systems for each surface;
- multi-region active-active infrastructure;
- dedicated 24-hour security operations centre;
- enterprise SIEM and continuous red-team operations before product validation;
- formal enterprise certification programmes as a prerequisite to the controlled pilot.

---

### 22. Pilot prohibitions

The following behaviours are prohibited during the Covenant pilot:

1. Accepting real orders before the relevant launch gates pass.
2. Treating deployment as permission to activate live payments.
3. Trusting a browser redirect as payment confirmation.
4. Delivering value twice after duplicate provider events.
5. Marking a payout successful before provider-confirmed success.
6. Silently editing a financial ledger or audit event.
7. Allowing a seller to view another seller's order portion.
8. Allowing a rider to collect or complete an unassigned parcel.
9. Allowing direct seller-to-buyer payment or ordinary direct delivery.
10. Exposing buyer phone numbers, private room locations, matric numbers, or unrelated identity evidence without authorised necessity.
11. Using WhatsApp as the transaction, delivery-instruction, payment, or dispute source of truth.
12. Allowing unsupported commerce types to masquerade as products.
13. Displaying Noma Verified Pre-Owned without a real approved inspection.
14. Permitting public external-vendor self-activation.
15. Allowing an external courier to become the unverified campus handoff actor.
16. Allowing cash collection by riders or sellers.
17. Treating an AI signal as proof of guilt or final serious decision.
18. Collecting unrelated academic or biometric information for ordinary Covenant checkout.
19. Activating FBN without an approved physical location and operating procedure.
20. Expanding order volume beyond staffed payment, fulfilment, Support, and incident-response capacity.

---

## Part D - Security, Quality, and Pilot Readiness

### 23. Production-grade pilot baseline

Before paid orders, Noma MUST have:

- secure authentication and password/session handling;
- email verification and secure recovery;
- MFA for privileged roles;
- recent-authentication checks for sensitive actions;
- backend role, capability, resource, institution, and state authorisation;
- rate limiting and abuse controls;
- environment separation;
- secrets inventory and secure storage;
- encrypted transport and appropriate sensitive-field protection;
- Paystack signature, verification, replay, idempotency, and reconciliation controls;
- secure private evidence uploads;
- append-only financial and privileged-action audit records;
- application, business-operational, and security monitoring;
- health checks and actionable alerts;
- privacy-conscious product and operational analytics;
- automated database and critical-configuration backups;
- at least one successful isolated restoration test;
- incident-response and recovery runbooks;
- CI checks for formatting, lint, type, tests, build, migrations, dependencies, and secrets; and
- manual security testing of critical identity, order, seller, payment, payout, upload, and admin boundaries.

Provider defaults are useful but do not replace Noma-specific controls.

Paid transactions MUST remain disabled while any known launch-blocking flaw could permit account takeover, cross-seller data access, forged payment confirmation, unauthorised payout, public identity evidence, or unrecoverable material data loss.

---

### 24. Testing and definition of done

A feature is not "done" because its page renders or its happy-path test passes.

For each in-scope capability, the applicable definition of done MUST include:

1. Product rule mapped to this scope document.
2. Approved UX for the critical flow.
3. Server-side permission and state validation.
4. Database/domain behaviour and migrations.
5. API contract and error behaviour.
6. Happy-path and failure-path tests.
7. Idempotency/concurrency tests where money, stock, orders, or custody are involved.
8. Audit events for privileged or material transitions.
9. Monitoring and operational visibility.
10. Accessible and responsive behaviour for supported devices.
11. Loading, empty, error, and offline/degraded states where applicable.
12. Documentation updates.
13. Evidence that the feature does not activate a deferred capability.
14. Commands run: lint, type-check, tests, production build, and applicable security checks.
15. Human review of the diff and test evidence before merge.

A feature-gated capability still requires complete tests before its first activation.

---

### 25. Pilot stages and launch gates

Noma MUST progress through these stages:

1. **Development and simulation**
2. **Founding-team test**
3. **Founding-seller test**
4. **Closed Covenant pilot**
5. **Controlled Covenant expansion**
6. **Future institution expansion**

#### 25.1 Development and simulation gate

Before leaving simulation:

- critical automated tests pass;
- payment/refund/payout failure cases are exercised;
- duplicate events are harmless;
- stock reservations and releases are correct;
- Parent/Vendor Order consistency is demonstrated;
- pickup/handoff and failed-attempt paths work;
- financial ledgers reconcile;
- role/resource isolation tests pass;
- monitoring and backups operate; and
- no real customer obligations are created.

#### 25.2 Founding-team test gate

Before founding sellers:

- Operations can run the end-to-end workflow without developer database intervention;
- queues, timelines, audit records, alerts, and runbooks are usable;
- deployment and rollback procedures are documented;
- staff capabilities are correctly separated; and
- no launch-blocking security defect remains.

#### 25.3 Founding-seller test gate

Before the closed pilot:

- selected sellers complete training and test orders;
- stock, listings, preparation, packaging, handoff, cancellations, cases, earnings, and withdrawals are understood;
- payout accounts are verified;
- realistic catalogue entries are approved; and
- sellers do not require continuous founder intervention.

#### 25.4 Closed Covenant pilot gate

Real transactions require:

- approved pilot terms, privacy notice, seller rules, buyer protection, returns/refunds, prohibited products, messaging, payout, rider, and enforcement policies;
- applicable Covenant and physical-operations approval;
- configured approved locations and operating hours;
- trained Operations, Support, Finance, Trust and Safety, and riders;
- successful live-mode payment, refund, earnings, withdrawal, and transfer drills with controlled value;
- successful pickup, handoff, failed-attempt, reassignment, and return-to-custody drills;
- security/privacy baseline and restoration test;
- functioning support and escalation coverage during every open ordering period;
- explicit capacity limits and emergency pause controls; and
- documented approval by designated product, engineering, operations, finance, security/privacy, logistics, and partnership owners.

#### 25.5 Controlled expansion gate

Each expansion MUST define:

- the feature/cohort/category/capacity change;
- expected benefit;
- new risk and staffing requirement;
- metrics to watch;
- rollback or pause trigger;
- decision owner; and
- review date.

Noma SHOULD introduce one material operational change at a time where possible so outcomes can be attributed.

---

### 26. Capacity and emergency controls

The pilot MUST support configured limits for:

- active sellers;
- invited/eligible buyers;
- orders per day or operating window;
- concurrent deliveries;
- seller order volume;
- order and item value;
- refund approval authority;
- payout exposure;
- high-risk cases;
- FBN storage capacity; and
- food/outlet capacity where activated.

When capacity is reached, Noma MAY close checkout slots, widen promises, pause sellers/categories/tiers, schedule the next window, or stop new orders.

Authorised personnel MUST be able to stop or restrict:

- new checkout;
- a payment method;
- payouts;
- an institution;
- a seller;
- a product/category;
- a delivery tier;
- food commerce;
- external-vendor commerce;
- FBN; and
- a compromised privileged account.

Emergency controls MUST be access-restricted, audited, reversible where appropriate, documented, and tested.

---

### 27. Pilot success metrics

Exact numeric thresholds will be locked in `docs/13-covenant-pilot-readiness.md` before the closed pilot. This scope contract requires the following metric families.

#### Financial integrity

- provider-to-order reconciliation;
- payment verification success;
- duplicate-confirmation incidents;
- paid-but-unconfirmed orders;
- refund completion and ageing;
- seller-ledger accuracy;
- payout completion, failure, reversal, and reconciliation.

**Non-negotiable principle:** there must be no unexplained material difference between provider money movement, Noma orders, refunds, seller earnings, and payouts.

#### Catalogue, inventory, and seller reliability

- listing defect rate;
- stock accuracy;
- seller acceptance where required;
- seller-caused cancellation;
- preparation-on-time rate;
- pickup readiness;
- seller first-order and repeat-selling success.

#### Delivery

- assignment time;
- pickup waiting time;
- first-attempt handoff success;
- promise accuracy by tier;
- reassignment rate;
- buyer-unavailable rate;
- loss/damage and safety incidents;
- orders per rider-hour and batch effectiveness.

#### Customer protection

- issue rate per completed order;
- first Support response;
- time to resolution;
- refund processing time;
- escalation and appeal rates;
- repeat issue rate;
- serious safety/fraud cases.

#### Customer value

- search success and zero-result rate;
- product/offer engagement;
- add-to-cart and checkout completion;
- completed orders;
- customer satisfaction;
- repeat purchase and recommendation intent.

#### Operational sustainability

- cases and interventions per order;
- workload by queue and role;
- orders requiring founder/developer intervention;
- incident and alert response;
- seller/rider satisfaction;
- support coverage versus open capacity.

#### Unit economics

- marketplace commission;
- delivery revenue/subsidy;
- payment cost;
- carrier/rider cost;
- refund and protection cost;
- Support/Operations cost;
- promotion funding; and
- contribution per completed order.

Growth metrics MUST NOT override safety, security, financial integrity, or regulatory failures.

---

### 28. Expansion, restriction, rollback, and suspension decisions

At each review point, Noma MUST choose one of:

- `EXPAND`
- `CONTINUE_AT_CURRENT_CAPACITY`
- `RESTRICT_A_CAPABILITY`
- `PAUSE_NEW_ORDERS`
- `ROLL_BACK_RECENT_EXPANSION`
- `TEMPORARILY_SUSPEND_PILOT`

Expansion requires clean critical gates, acceptable customer outcomes, spare operational capacity, stable sellers/logistics, reconciling finance, and no unresolved severe incident.

Restriction, rollback, or suspension is appropriate when Noma cannot safely support accepted obligations, including:

- payment or payout uncertainty;
- cross-account data exposure;
- severe security/privacy incidents;
- repeated lost/damaged parcels;
- unavailable Support coverage;
- material ledger inconsistency;
- serious university-policy conflict; or
- uncontrolled operational overload.

Pausing checkout is a required safety mechanism, not a product failure.

---

### 29. Explicit MVP non-goals

The Covenant MVP is not:

- a nationwide marketplace;
- an all-university launch;
- an unrestricted seller marketplace;
- a general customer wallet or financial account;
- a cash-on-delivery operation;
- an instant-settlement marketplace;
- a complete restaurant-delivery ecosystem;
- a broad external-vendor logistics network;
- a large or multi-location warehouse system;
- an unrestricted used-electronics marketplace;
- a service, rental, digital-download, or event-ticketing platform;
- an autonomous AI-operated marketplace;
- a predictive fleet-optimisation platform;
- a nationwide inspection, repair, warranty, or recall network;
- four separate native applications; or
- a finished version of every long-term Noma decision.

Deferred does not mean abandoned. It means the capability must not destabilise the Covenant validation period.

---

### 30. Scope-change rules

A new feature or material expansion may enter the two-month MVP only when at least one condition is true:

1. It is necessary to complete a currently locked pilot flow.
2. It is required for safety, legal compliance, privacy, security, or financial integrity.
3. It removes a blocker to operating the controlled pilot.
4. It replaces an item of equal or greater implementation and operational cost.

Every scope change MUST record:

- requested change;
- affected locked decision;
- reason and evidence;
- classification before and after;
- engineering, design, operations, security, financial, and schedule impact;
- removed or delayed work, if any;
- owner and approvers;
- acceptance criteria;
- activation gate; and
- documentation updates.

During Weeks 7 and 8, no major feature may enter unless it blocks the pilot or protects safety, legal, security, privacy, or financial integrity.

A schema enum, hidden page, feature flag, partial endpoint, or prototype does not make a capability part of the live MVP.

Codex MUST:

- inspect this document before implementing a production feature;
- identify the specific in-scope requirement in its task report;
- state what it intentionally did not implement;
- avoid expanding adjacent deferred workflows;
- report ambiguities and conflicts rather than inventing policy; and
- provide test/build evidence for human review.

---

### 31. Traceability to the 15 locked decisions

1. Food is built into the MVP and activated progressively.
2. External vendors are first-class but invitation-only and late-beta controlled.
3. FBN is a small, one-location, low-risk campus fulfilment pilot.
4. Pre-owned is structured and limited; high-risk electronics and verification remain controlled.
5. Product and Food are the only implemented commerce lifecycles; future types remain disabled.
6. Multi-vendor checkout uses one payment with internal Parent Orders, Vendor Orders, Fulfilment Groups, and allocations.
7. Payments create protected internal allocations; seller earnings and controlled payouts remain separate.
8. Dispatch is Noma-controlled, hybrid, rules-based, and progressively tiered.
9. Covenant affiliation uses hybrid automated checks and manual fallback with data minimisation.
10. Noma uses one platform with distinct role-based surfaces and a Rider PWA.
11. Messaging remains in-app, privacy-limited, auditable, and protected against bypass.
12. Protection cases are structured; material and serious decisions remain human-controlled and appealable.
13. Search is relevance-first; merchandising is transparent; AI is assistive and reviewable.
14. Security, monitoring, backups, recovery, and CI controls are required before paid orders.
15. Launch and expansion are staged, capacity-limited, measurable, reversible, and formally approved.

---

### 32. Required companion documents

This scope contract is intended to constrain, not replace, the remaining Build Pack documents:

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

No companion document may silently convert a deferred capability into an MVP requirement.

---

### 33. Final scope declaration

Noma will build a controlled Covenant University marketplace that supports public discovery, verified campus checkout, approved sellers, canonical products and offers, inventory, relevance-first search, one multi-vendor payment, protected seller earnings, Noma-controlled hybrid fulfilment, secure pickup and delivery proof, structured messaging, refunds, protection cases, reviews, enforcement, auditable Operations, and production-grade security and recovery.

Food, selected external vendors, one-location FBN, selected pre-owned categories, Priority, and Saver may activate progressively only after their specific gates pass.

Noma will not launch unrestricted external commerce, future commerce types, customer wallets, cash-on-delivery, instant settlement, unrestricted used electronics, autonomous serious AI decisions, predictive fleet automation, or nationwide operations during the founding pilot.

Real payments and orders activate only after technical, operational, financial, logistics, support, security, privacy, policy, and recovery readiness have been demonstrated together.
