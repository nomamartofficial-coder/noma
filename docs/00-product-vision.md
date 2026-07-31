# Noma Product Vision

> **Repository path:** `docs/00-product-vision.md`  
> **Status:** Product direction and contributor orientation  
> **Version:** 1.0  
> **Effective date:** 30 July 2026  
> **Applies to:** Noma's Covenant University founding pilot and the longer-term product direction it is intended to validate  
> **Primary audience:** Founders, Product, Design, Engineering, Codex, Operations, Finance, Support, Trust and Safety, university and logistics partners, and future contributors

---

## 1. Purpose

This document explains why Noma exists, whom it serves, what kind of marketplace it intends to become, what the Covenant University pilot must prove, and which principles must remain recognisable as Noma grows.

It is an orientation document. It helps a contributor understand the product before reading implementation detail, but it does not replace the binding Build Pack contracts.

The founding product direction is:

> **Noma is a university-native, multi-vendor marketplace that combines trusted campus identity, structured commerce, protected payments, Noma-controlled fulfilment, buyer protection, and auditable operations.**

Noma is not being built merely to display products and collect checkout details. It is being built to coordinate a complete marketplace obligation from discovery through payment, fulfilment, handoff, support, financial reconciliation, and recovery.

---

## 2. Authority and source-of-truth hierarchy

This vision must be interpreted through the following hierarchy:

1. `docs/01-mvp-scope.md` controls what is active, progressive, manual, prohibited, or deferred for the Covenant pilot.
2. `docs/02-user-roles.md` controls actors, capabilities, scopes, assurance, maker-checker separation, and data visibility.
3. `docs/03-user-journeys.md` controls required end-to-end behaviour, exception paths, evidence, and honest completion.
4. `docs/04-information-architecture.md` and `docs/05-design-system.md` control product surfaces, navigation, content hierarchy, components, responsive behaviour, accessibility, and truthful presentation.
5. `docs/06-technical-architecture.md`, `docs/07-domain-model.md`, and `docs/08-state-machines.md` control runtimes, modules, data, transactions, states, transitions, idempotency, and concurrency.
6. `docs/09-integrations.md` controls provider selection, adapters, webhooks, environments, uncertainty, and reconciliation.
7. `docs/10-security-and-compliance.md` controls security, privacy, Nigerian compliance, retention, access review, and incident response.
8. `docs/11-testing-strategy.md` controls test evidence and release quality.
9. `docs/12-delivery-backlog.md` controls implementation order and task boundaries.
10. `docs/13-covenant-pilot-readiness.md` controls whether Noma may deploy, accept real payments, open a cohort, activate a progressive feature, expand, hold, pause, or roll back.
11. The Noma Product Decisions Blueprint remains the source of long-term intent and rationale where it does not conflict with the locked pilot classification.

This document may summarise those contracts. It must not weaken them, silently activate a deferred capability, invent university cooperation, or convert long-term ambition into an immediate launch requirement.

---

## 3. The problem Noma is solving

Campus commerce often exists as a fragmented mixture of physical stores, informal student sellers, social-media posts, private messages, manual transfers, uncertain stock, inconsistent delivery, and limited recourse when something goes wrong.

That fragmentation creates recurring problems:

- buyers struggle to discover and compare trustworthy offers;
- sellers struggle to reach verified campus demand through a structured channel;
- product identity, condition, price, stock, warranty, and delivery promises are inconsistent;
- one transaction may move across several private chats without a reliable record;
- payment confirmation can be confused with order completion;
- delivery responsibility and custody can become unclear;
- refunds, returns, disputes, enforcement, and seller earnings are difficult to administer fairly;
- a university environment introduces location, access, safety, identity, schedule, and policy constraints that ordinary national marketplaces do not model well; and
- growth becomes dangerous when operational volume expands faster than support, logistics, finance, security, or recovery capacity.

Noma addresses these problems by treating marketplace trust as a system of verified facts, bounded permissions, controlled workflows, evidence, and recoverable operations—not as a logo, badge, chat promise, or one-time identity check.

---

## 4. The Noma proposition

For a buyer, Noma should make campus shopping easier to discover, compare, pay for, receive, and resolve when something goes wrong.

For a seller, Noma should provide structured access to campus demand, accurate catalogue and inventory tools, transparent order responsibilities, protected earnings, and a path to earn greater privileges through reliable performance.

For a rider or logistics partner, Noma should provide scoped assignments, clear pickup and delivery responsibilities, evidence-backed custody, safe handoff, and operational support.

For Noma Operations, Support, Finance, Trust and Safety, and administrators, the platform should provide the queues, evidence, authority boundaries, alerts, audit history, and emergency controls required to run a real marketplace rather than watch a storefront dashboard.

For a university partner, Noma should minimise unnecessary institutional data while respecting campus locations, access rules, category restrictions, fulfilment realities, consumer protection, and safety responsibilities.

---

## 5. Founding users and participants

The Covenant pilot is designed around the following participant groups.

### 5.1 Buyers

- Covenant students and staff who qualify for protected campus checkout and fulfilment;
- ordinary Noma account holders who may browse public content and use future non-campus capabilities when activated; and
- guests who can discover, search, compare, and build a cart before account or affiliation requirements become necessary.

### 5.2 Sellers

- approved Campus Stores;
- verified and approved Student Vendors; and
- selected External Vendors introduced only through controlled, invitation-based activation.

Seller participation is not unrestricted. Identity, payout eligibility, category rules, activation state, capacity, performance, and enforcement remain separate facts.

### 5.3 Fulfilment participants

- CU Express as the primary planned campus logistics partner;
- a small Noma student-rider fleet used within approved capacity; and
- authorised Operations and Dispatch staff who retain responsibility for assignment, exception handling, and custody visibility.

No CU Express API or Covenant University identity API is assumed for the founding pilot.

### 5.4 Marketplace operators

- Product and Engineering;
- Seller Operations;
- Dispatch and fulfilment Operations;
- Support;
- Finance;
- Trust and Safety;
- Security and Privacy;
- restricted administrators; and
- independent reviewers or auditors where required.

The marketplace is ready only when these people can operate their responsibilities without hidden developer intervention.

---

## 6. Covenant-first, not Covenant-only forever

Noma is publicly discoverable, but Covenant University is the first active institution and operating zone.

The founding pilot is deliberately single-institution because Noma needs to validate the complete operating model under real constraints before introducing more universities, public external-vendor participation, nationwide fulfilment, or broader commerce types.

The architecture therefore recognises configurable institutions, locations, zones, seller types, fulfilment modes, policies, capabilities, and feature assignments. Recognition in architecture does not equal activation in the pilot.

The long-term direction is a reusable university-commerce platform capable of expanding to other institutions and selected external service areas only after Noma demonstrates that it can preserve the same trust, protection, operational control, and recoverability at greater scale.

---

## 7. The Covenant pilot objective

The founding pilot must prove that Noma can coordinate, together:

- public discovery and relevance-first search;
- one underlying user identity with scoped buyer, seller, rider, partner, and staff memberships;
- hybrid Covenant affiliation verification with manual fallback and data minimisation;
- approved sellers, canonical products, seller offers, condition and commercial disclosures;
- accurate availability, inventory reservations, and oversell prevention;
- one multi-vendor checkout and one buyer payment;
- provider-confirmed payment truth, item-level allocations, balanced financial records, protected seller earnings, refunds, withdrawals, and controlled payouts;
- Noma-owned Vendor Orders, Fulfilment Groups, Delivery Jobs, assignment, pickup, custody, and one-time handoff evidence;
- buyer, seller, rider, partner, Support, Finance, Trust and Safety, Operations, and Admin surfaces;
- structured messaging, substitutions, cancellations, returns, protection cases, reviews, enforcement, appeals, recalls, and safety containment;
- secure authentication, scoped authorization, privacy-safe evidence, monitoring, backups, restoration, and incident response;
- explicit cohort, order, value, delivery, operating-window, and staffing limits; and
- the ability to hold, restrict, pause, reconcile, recover, restart, or stop safely.

The pilot is not successful merely because a buyer can place one attractive demo order.

---

## 8. The product promise

Noma's product promise is:

> **Make campus commerce understandable and convenient for users while keeping money, inventory, custody, rights, and operational responsibility truthful behind the interface.**

That promise requires five disciplines.

### 8.1 Verified, not over-collected

Noma verifies only what a capability requires. Covenant affiliation, seller approval, payout verification, rider approval, and staff authority remain separate. Noma does not need GPA, academic results, disciplinary history, biometrics, or unrelated identity evidence for ordinary shopping.

### 8.2 Structured, not informal

Products, offers, inventory, orders, messages, substitutions, evidence, delivery events, cases, refunds, and payouts use structured records. Manual operation still occurs inside controlled queues and audit trails.

### 8.3 Protected, not merely paid

A successful buyer payment is not the end of the transaction. Noma must allocate the payment correctly, preserve seller entitlement separately, control fulfilment, support remedies, and reconcile every provider outcome.

### 8.4 Delivered with custody truth

Noma does not infer pickup or delivery from a message or a rider's assertion. Assignment, parcel identity, one-time credentials, evidence, and custody transitions must support the claim.

### 8.5 Operated within capacity

Noma does not accept obligations it cannot safely support. Pausing checkout or reducing capacity is a designed safety mechanism, not a product embarrassment.

---

## 9. Product principles

### 9.1 One identity, multiple scoped capabilities

A person should not need unrelated buyer, seller, and rider accounts. One Noma identity may hold independent memberships and capabilities, each with its own approval, scope, state, assurance, and revocation.

### 9.2 Trust is earned and multidimensional

Identity verification, Covenant affiliation, seller approval, payout verification, product quality, fulfilment performance, policy standing, financial risk, account security, and public trust status are distinct. Noma must not compress them into one meaningless tick.

### 9.3 The buyer sees simplicity; the system preserves internal truth

A buyer should understand one order, but Noma must preserve separate Vendor Orders, item allocations, fulfilment groups, delivery obligations, cancellations, refunds, and seller earnings behind it.

### 9.4 Provider truth is not browser truth

Browser redirects, client messages, initial API responses, and provider dashboard appearances do not become final payment, refund, or payout truth without the required server-side verification and reconciliation.

### 9.5 Custody requires evidence

A package does not become picked up or delivered because someone changes a status. The required actor, assignment, one-time handoff credential, parcel identity, time, location context, and custody record must agree.

### 9.6 Human decisions remain human where harm is material

AI and rules may assist listing cleanup, ranking, risk triage, moderation, and investigation. Serious counterfeit, safety, fraud, permanent-enforcement, refund, dispute, or rights-affecting outcomes require appropriate human review and appeal.

### 9.7 Manual does not mean invisible

When a workflow is manually operated, Noma must still own the case, state, evidence, deadline, permission, decision, financial effect, audit event, and next action.

### 9.8 Progressive activation is a product capability

Food, selected External Vendors, one-location Fulfilled by Noma Campus, limited Pre-Owned, Priority, and Saver may exist in code while remaining unavailable to real users. Activation requires its own evidence, staff, capacity, cohort, rollback, and approval.

### 9.9 Accessible and responsive by default

The Marketplace, Buyer Account, Seller Centre, Rider PWA, Operations, and Admin experiences must remain usable across supported phones, tablets, laptops, keyboard navigation, screen readers, zoom, reflow, reduced motion, and unstable connectivity where applicable.

### 9.10 Expansion follows evidence

Noma expands only when reliability, customer value, seller quality, financial accuracy, fulfilment performance, Support capacity, security, privacy, and recovery evidence support the next step.

---

## 10. The Noma experience

The intended product character is:

> **Dense enough for serious commerce, simple enough for students, Nigerian in context, university-native in operation, and recognisably Noma.**

The product should feel clear, direct, capable, and trustworthy rather than decorative or futuristic for its own sake.

Noma deliberately rejects:

- giant hero sections that delay shopping;
- oversized gradient cards;
- excessive rounded containers;
- meaningless dashboard statistics;
- empty space that hides useful commerce information;
- default purple AI-style visual language;
- animation that slows shopping or operational action;
- status colours without text and icon meaning;
- vague trust claims;
- hidden fees or delivery promises;
- misleading success states; and
- duplicated interfaces that drift across roles.

Final logo, wordmark, permanent brand-primary colour, proprietary font, illustration language, and campaign art direction remain separate brand decisions. They must not change semantic status meaning, accessibility, component anatomy, or product responsibility.

---

## 11. The founding commerce model

### 11.1 Products

Ordinary physical products are the primary active commerce lifecycle. Noma supports canonical product identity, seller-specific offers, variants where required, availability, inventory, condition, commercial terms, images, search, comparison, checkout, fulfilment, returns, and protection.

### 11.2 Food

Food is designed into the MVP foundation but activated progressively. It requires menu structure, opening hours, availability, modifiers, preparation estimates, perishability, seller acceptance deadlines, substitutions, and food-specific fulfilment rules. Ordinary Product records must not be overloaded to fake the Food lifecycle.

### 11.3 Future commerce types

Service, Rental, Digital, and Event boundaries may be recognised architecturally, but their complete lifecycles remain disabled and deferred for the Covenant pilot.

---

## 12. The founding seller model

Noma's seller ecosystem contains three controlled classes:

1. **Campus Stores** — approved merchants physically operating within the institution.
2. **Student Vendors** — verified students who apply, satisfy seller requirements, and begin within controlled limits.
3. **External Vendors** — approved businesses outside Covenant, introduced later through invitation and controlled inbound fulfilment.

Seller classification does not automatically grant publication, category, fulfilment, payout, or trust privileges.

Seller privileges may grow with verified identity, successful order history, stock accuracy, fulfilment reliability, customer outcomes, policy compliance, and operational capacity. Deterioration or serious concerns may narrow privileges, place holds, suspend listings, or trigger proportionate enforcement without erasing existing obligations.

---

## 13. The founding fulfilment model

Noma owns the customer-facing fulfilment promise.

The pilot uses a hybrid operating model:

- approved sellers prepare orders;
- CU Express is the primary planned carrier;
- a small Noma Fleet supplements capacity;
- Noma Operations creates and controls Delivery Jobs and assignments;
- approved institution locations govern pickup and delivery;
- pickup and delivery use secure one-time evidence;
- failed attempts preserve custody and define the next safe action; and
- direct seller-to-buyer delivery is not the ordinary pilot path.

Priority and Saver delivery are progressive tiers. Standard delivery must work reliably first.

Fulfilled by Noma Campus begins, if activated, as a small one-location, SKU-level, low-risk programme. It is not a warehouse-network project.

---

## 14. The founding financial model

The buyer pays once for a multi-vendor checkout through Paystack.

Noma then preserves separate internal truth for:

- the Payment and attempts;
- provider events and verification;
- Parent Order and Vendor Orders;
- item-level payment allocations;
- fees, delivery charges, taxes where applicable, and commercial snapshots;
- balanced ledger entries;
- seller earnings and holds;
- refunds and reversals;
- withdrawal requests;
- payout-account changes; and
- provider-confirmed transfer attempts.

Noma does not launch a customer wallet, cash on delivery, rider cash collection, peer-to-peer transfer, credit, cryptocurrency payment, or instant seller settlement during the Covenant pilot.

A displayed balance is a projection of ledger-backed records, not an editable wallet field.

---

## 15. Buyer protection and marketplace integrity

Noma's protection model includes:

- versioned product, offer, price, condition, warranty, fulfilment, and policy terms;
- structured cancellation eligibility;
- return and evidence workflows;
- Protection Cases and deadlines;
- targeted financial holds;
- full and partial remedies;
- provider-confirmed refunds;
- verified-purchase reviews;
- seller notices, restrictions, suspensions, and appeals;
- product recall and safety containment; and
- correction through reversals and successor records rather than erased history.

Protection is not an unlimited guarantee. It is a fair, evidence-based system that explains eligibility, responsibility, outcomes, and appeal paths.

---

## 16. Operations are part of the product

Noma's Operations, Support, Finance, Trust and Safety, and Admin capabilities are first-class product surfaces.

The founding marketplace cannot rely on developers, provider dashboards, spreadsheets, private messages, or direct database edits as the normal way to:

- resolve uncertain payments;
- assign a delivery;
- handle pickup failure;
- correct inventory;
- approve or process refunds;
- control seller earnings and payouts;
- investigate a case;
- apply or appeal enforcement;
- contain a recall;
- pause a feature or operating window; or
- recover from an incident.

Every material obligation must have a visible owner, queue, state, deadline, history, and next safe action.

---

## 17. Safety, privacy, and compliance principles

Noma is designed for a Nigerian university context and must treat security, privacy, consumer protection, and operational safety as product requirements.

The founding principles are:

- collect the minimum data required for the stated capability;
- keep privileged access scoped, authenticated, reviewed, and auditable;
- use private storage and short-lived access for identity and case evidence;
- never collect raw payment-card data;
- preserve append-only financial, provider, custody, case, enforcement, and audit history;
- provide clear commercial terms, complaints, remedies, and refund status;
- default the closed pilot to adults aged 18 and above until an approved minor workflow exists;
- maintain data-subject rights, retention, deletion, breach, and provider-governance processes;
- rehearse incident containment and controlled restart; and
- keep paid ordering disabled while a material identity, authorization, financial, evidence, security, legal, or recovery blocker remains.

---

## 18. What success looks like

The Covenant pilot succeeds when Noma can prove, under controlled real conditions, that:

- invited users can discover and buy useful products;
- founding sellers can list accurately and fulfil reliably;
- inventory remains trustworthy under concurrency;
- one buyer payment produces correct internal orders and balanced allocations;
- duplicate and uncertain provider events do not create duplicate value;
- sellers can see earnings and receive controlled, reconciled payouts;
- dispatch and riders can preserve custody and complete handoff safely;
- buyers receive understandable status, support, cancellation, return, and refund outcomes;
- Support, Finance, Trust and Safety, Operations, and Admin can work without developer intervention;
- security, privacy, accessibility, monitoring, backups, and restoration evidence pass;
- the marketplace can enforce capacity and pause safely; and
- the team can distinguish customer value from operational fragility before expanding.

Success is measured by integrity and repeatability, not only registrations, gross merchandise value, downloads, or social attention.

---

## 19. Founding pilot stages

Noma progresses through controlled stages:

1. development and simulation;
2. founding-team testing;
3. founding-seller and operational testing;
4. `C1` controlled live smoke;
5. `C2` closed Covenant pilot;
6. `C3` controlled expansion; and
7. future institution or geographic expansion.

Each stage has explicit cohort, order, value, delivery, operating-window, staffing, financial, security, and stop-line limits.

Deployment does not grant activation. A feature flag does not grant activation. A merged pull request does not grant activation. Only the applicable readiness decision does.

---

## 20. What Noma is not building in the founding pilot

The Covenant MVP is not:

- a nationwide marketplace;
- an all-university rollout;
- unrestricted seller registration;
- a customer bank account or wallet;
- a cash-on-delivery business;
- instant settlement;
- a complete restaurant-delivery platform;
- a broad external-vendor logistics network;
- a multi-location warehouse-management system;
- an unrestricted used-phone or laptop marketplace;
- an active Service, Rental, Digital, or Event marketplace;
- an autonomous AI-operated marketplace;
- predictive fleet-wide routing;
- a nationwide inspection, repair, warranty, or recall network;
- four separately maintained native applications; or
- the final implementation of every long-term product decision.

Deferred does not mean abandoned. It means Noma will not weaken the founding validation period by pretending scale exists before the operating model is proven.

---

## 21. Long-term direction

After the Covenant model is proven, Noma may progressively expand toward:

- additional universities and institution-specific policies;
- approved external service zones and customers;
- a broader, still-controlled seller ecosystem;
- more mature Food operations;
- scheduled External Vendor consolidation;
- larger Fulfilled by Noma Campus capabilities;
- structured Pre-Owned inspection and verified condition programmes;
- richer warranty, repair, recall, and safety networks;
- improved relevance, merchandising, and transparent sponsored placement;
- reviewable AI assistance for catalogue, support, risk, and operations;
- provider integrations justified by real volume;
- seller-system and inventory integrations;
- more sophisticated fulfilment promise and dispatch services; and
- additional commerce lifecycles only when each has a complete operational, financial, protection, and state model.

Long-term ambition must preserve the founding disciplines: scoped identity, truthful money, evidence-backed custody, structured protection, human accountability, capacity control, and reversible activation.

---

## 22. Strategic choices Noma will protect

Noma will protect the following choices even when shortcuts appear faster:

1. one identity with multiple scoped memberships rather than duplicate accounts;
2. canonical products separated from seller offers;
3. relational orders and allocations rather than one opaque JSON blob;
4. one buyer payment with internal multi-vendor independence;
5. protected seller earnings separated from payment receipt;
6. a balanced ledger rather than a mutable wallet balance;
7. provider-confirmed finality rather than browser or dashboard assumptions;
8. Noma-owned delivery and custody truth rather than private chat;
9. structured cases and appeals rather than arbitrary admin edits;
10. private, minimised evidence rather than permanent public files;
11. a modular monolith rather than premature microservices;
12. shared design and contract packages rather than duplicated role apps;
13. PostgreSQL authority with rebuildable projections rather than search or analytics as truth;
14. progressive activation rather than feature existence as permission; and
15. human-reviewed, evidence-based delivery rather than autonomous code generation and launch.

---

## 23. Decision filters

When evaluating a product proposal, the team should ask:

1. Which user or operator problem does this solve?
2. Which locked scope classification applies?
3. Does it improve or obscure product, payment, inventory, custody, rights, or provider truth?
4. What new operational obligation does it create?
5. Who owns the normal path and the failure path?
6. Which personal data is required, and can less be collected?
7. What permission, state, evidence, audit, and reconciliation controls are required?
8. Can the capability be safely capacity-limited, paused, and rolled back?
9. Which tests and readiness evidence prove it works?
10. What existing work must be delayed or removed if it enters the founding pilot?

A proposal that cannot answer these questions is not ready for implementation.

---

## 24. Product-language principles

Noma language must:

- describe verified truth rather than aspiration;
- distinguish pending, processing, confirmed, failed, reversed, and uncertain outcomes;
- explain who must act next;
- expose relevant deadlines, promises, money, and evidence;
- avoid implying that a badge is a guarantee;
- avoid blaming buyers, sellers, riders, or partners before evidence supports attribution;
- make irreversible or high-impact consequences clear before confirmation;
- explain why a capability is unavailable where disclosure is safe;
- give a recovery path rather than only an error code; and
- remain understandable to students, sellers, riders, and operators without internal jargon.

---

## 25. Product vision definition of done

This foundation document is complete when:

- the founder and Product owner agree that it expresses Noma's direction;
- it agrees with `docs/01-mvp-scope.md` and does not broaden the pilot;
- the target users, value proposition, principles, pilot objective, non-goals, and long-term direction are explicit;
- contributors can distinguish product vision from binding implementation authority;
- links to the full Build Pack resolve in the repository;
- no unsupplied university integration, brand asset, legal approval, provider capability, or operating capacity is presented as existing; and
- future revisions use the documented scope-change and decision process.

---

## 26. Final product declaration

Noma exists to make university commerce easier for buyers and sellers without hiding the hard responsibilities that make a marketplace trustworthy.

The Covenant founding pilot will prove whether Noma can coordinate verified campus demand, approved sellers, truthful catalogue and inventory, one protected multi-vendor payment, controlled fulfilment, secure custody, fair remedies, seller earnings, and real operational intervention inside explicit capacity limits.

Noma will grow only when it can preserve those responsibilities at the next scale.

> **Noma is not ready because it can take an order. Noma is ready when it can truthfully fulfil, protect, reconcile, support, recover, and stop the marketplace under real conditions.**
