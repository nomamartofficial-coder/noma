# Noma Product Surfaces, Navigation, Pages, and Content Hierarchy

> **Repository path:** `docs/04-information-architecture.md`  
> **Status:** Binding Covenant pilot information-architecture contract  
> **Version:** 1.0  
> **Effective date:** 30 July 2026  
> **Applies to:** Noma's two-month Covenant University pilot build  
> **Primary audience:** Founders, Product, Design, Engineering, Codex, Operations, Support, Finance, Trust and Safety, Logistics, Quality Assurance, Content, and future contributors

---

## 1. Purpose

This document defines how Noma's Covenant University pilot is organised into product surfaces, navigation systems, route families, pages, page-level content hierarchy, work queues, cross-links, and feature-gated information.

It translates:

- the locked MVP boundary in `docs/01-mvp-scope.md`;
- the actor, capability, and data-access boundaries in `docs/02-user-roles.md`; and
- the end-to-end behaviour in `docs/03-user-journeys.md`

into one navigable product structure for:

- the public Marketplace;
- Buyer Account;
- Seller Centre;
- Rider PWA;
- Noma Operations and specialist staff workspaces; and
- Restricted Administration.

The objective is to prevent Design, Engineering, Codex, and future contributors from inventing page structures independently, hiding essential state behind attractive dashboards, duplicating the same object across unrelated screens, or exposing a route merely because a backend entity exists.

This document defines the required information architecture, not the final visual style. `docs/05-design-system.md` will define tokens, components, interaction patterns, responsive behaviour, and visual language. Later technical documents may refine folder structure and route implementation, but must preserve the user-visible hierarchy, authority boundaries, and page responsibilities defined here.

A page is not complete because it renders data. It is complete when the intended actor can understand:

1. what object or obligation they are viewing;
2. its current truthful status;
3. who must act next;
4. what deadline, promise, money, custody, or risk is involved;
5. which action they are authorised to take;
6. what evidence and history support the state; and
7. how to recover when the normal path fails.

---

## 2. Authority and relationship to other Build Pack documents

The following hierarchy applies:

1. `docs/01-mvp-scope.md` controls what is active, progressive, manual, prohibited, or deferred.
2. `docs/02-user-roles.md` controls who may enter a surface, view a field, and perform an action.
3. `docs/03-user-journeys.md` controls the required end-to-end sequence, exception paths, handoffs, and honest completion conditions.
4. This document controls surface organisation, navigation, route/page responsibility, content hierarchy, and cross-linking.
5. `docs/05-design-system.md` may define how these structures look and behave visually, but must not remove required information or authority checks.
6. `docs/06-technical-architecture.md` may define implementation details, route groups, rendering, caching, and deployment boundaries, but must not silently change the product structure.
7. `docs/07-domain-model.md` and `docs/08-state-machines.md` will define final entities and machine-readable states. This document remains authoritative for what each actor must be able to understand and do.

A wireframe, route, component, dashboard, API endpoint, Codex prompt, or pull request must not:

- activate a deferred commerce type;
- expose data outside the actor's scope;
- merge Buyer, Seller, Rider, Finance, Trust and Safety, and Admin authority into one generic dashboard;
- treat a hidden menu item as authorisation;
- replace provider-confirmed payment/refund/payout truth with an editable status;
- hide unresolved money, custody, or protection work behind a generic “Completed” label; or
- remove a required exception path because it complicates the page design.

Where an illustrative route in this document conflicts with a later framework constraint, the route string may be adjusted through a documented information-architecture change. The page responsibility, access boundary, and journey coverage must remain intact.

---

## 3. Normative language

- **MUST / MUST NOT:** mandatory for the applicable pilot stage.
- **SHOULD / SHOULD NOT:** expected unless an approved, documented reason exists.
- **MAY:** optional within the locked scope.
- **SURFACE:** a distinct role-oriented product experience with its own navigation, density, device priorities, and security boundary.
- **PAGE FAMILY:** a reusable route and page responsibility shared by several records, such as order detail or case detail.
- **WORKSPACE:** a capability-scoped area inside a surface, such as Finance or Dispatch.
- **QUEUE:** an actionable collection of records requiring attention, ordered and filterable by operational priority.
- **DETAIL PAGE:** the authoritative human-facing view of one resource within the actor's scope.
- **TIMELINE:** a chronological, actor-labelled record of relevant system and human events.
- **PRIMARY ACTION:** the single most important permitted next action for the actor in the current state.
- **FEATURE-GATED:** absent from ordinary navigation and blocked at route/API level until the relevant activation gate passes.
- **PROGRESSIVE:** implemented or architected but exposed only to approved cohorts, sellers, categories, or staff.
- **ROUTE EXAMPLE:** a stable product-level URL recommendation; final framework file paths may differ.

---

## 4. Information-architecture principles

### 4.1 One platform, distinct surfaces

Noma uses one shared web platform and design foundation, but it must not feel like one universal dashboard.

The root surface model is:

```text
/                    Marketplace
/account             Buyer Account
/seller              Seller Centre
/rider               Rider PWA
/operations          Noma Operations and specialist workspaces
/admin               Restricted Administration
```

These surfaces may share identity, sessions, notifications, design tokens, files, API contracts, and audit infrastructure. They must retain distinct navigation, information density, workflows, device priorities, and permission checks.

### 4.2 One identity, explicit surface switching

A person may be a Buyer, Seller representative, and Rider through one Noma account. Surface switching must be explicit and must not merge role responsibilities.

Example:

```text
Victor's Noma account
├── Shop on Noma
├── Seller Centre — Victor Supplies
└── Rider — Covenant Noma Flex
```

Operations and administrative workspaces must not appear in the normal consumer switcher unless separately granted and strongly authenticated.

### 4.3 Navigation does not grant authority

A route appearing in navigation means only that the current session may attempt to enter that surface. Every page and action must still verify capability, resource scope, institution, current state, feature activation, authentication assurance, and approval thresholds.

### 4.4 Objects have one authoritative detail page per actor context

Noma should avoid creating several unrelated pages that each claim to be the source of truth for the same object.

Examples:

- Buyer Parent Order detail is authoritative for the buyer's order view.
- Seller Vendor Order detail is authoritative for that seller's portion.
- Operations Order Workspace is authoritative for cross-domain intervention.
- Finance Payment/Refund/Payout detail is authoritative for provider and ledger review.
- Rider Delivery Job detail is authoritative for the assigned custody task.

Other lists, dashboards, notifications, and reports should deep-link to the relevant detail page rather than recreate the entire record.

### 4.5 Customer simplicity must not erase internal independence

The Buyer sees one understandable Parent Order with item/vendor/fulfilment progress. Noma internally preserves Vendor Orders, Fulfilment Groups, Delivery Jobs, payment allocations, refunds, seller earnings, and cases.

The customer page should explain independent progress without exposing private seller economics or operational jargon.

### 4.6 Status language must state truth and next responsibility

Every material page must answer:

```text
What is happening?
What was last confirmed?
Who acts next?
By when?
Is money or custody still processing?
What can I do now?
How do I get help?
```

“Successful,” “Completed,” “Paid,” “Refunded,” “Delivered,” and “Verified” must be used only when the corresponding authoritative event is confirmed.

### 4.7 Queues are for work; dashboards are for orientation

Operational dashboards may summarise health, but staff work must occur through explicit queues and detail pages.

A metric card such as “12 delayed orders” must link to the filtered queue containing those 12 records. It must not be decorative.

### 4.8 Progressive features must be invisible or explicitly controlled

Food, external vendors, one-location FBN, selected pre-owned categories, Priority, Saver, delegation, and other progressive capabilities must appear only when the actor, institution, seller, category, order, and pilot gate permit them.

Disabled future commerce types—Service, Rental, Digital, and Event—must not appear as selectable seller or buyer navigation.

### 4.9 Mobile, tablet, and desktop priorities differ

- Marketplace and Buyer Account: responsive, mobile-first but comfortable on tablets/laptops.
- Seller Centre: responsive, with tablet/laptop efficiency and safe mobile actions.
- Rider PWA: touch-first, scan-first, low typing, explicit connectivity state.
- Operations/Admin: desktop/tablet-first, dense queues, filters, timelines, and safe action panels.

### 4.10 Information minimisation is part of architecture

Pages must expose only the minimum data needed for the actor and task.

Examples:

- Seller sees approved handoff point, not private room location.
- Rider sees assignment-required recipient data, not Buyer account history.
- Support sees case-relevant details, not unrestricted payout credentials.
- Finance sees financial records, not unnecessary identity-document contents.
- Search indexes public/eligible commerce fields, not private risk or enforcement data.

### 4.11 Manual operation remains visible and accountable

When a workflow is manual, the interface must still provide:

- a queue;
- owner;
- status;
- deadline;
- evidence;
- permitted actions;
- reason fields;
- audit history; and
- escalation.

“Handled offline” is not a valid terminal state.

### 4.12 Critical journeys must be resumable

Payment, verification, listing creation, checkout, case evidence, payout-account change, refund processing, and rider assignments must support safe resume after refresh, weak connectivity, timeout, or device change.

The interface must not encourage duplicate payment, refund, payout, or custody actions when the outcome is uncertain.

---

## 5. Surface map and ownership

| Surface | Route root | Primary users | Primary purpose | Device priority |
|---|---|---|---|---|
| Marketplace | `/` | Guest, Buyer | Discover, compare, cart, checkout entry | Mobile, tablet, desktop |
| Buyer Account | `/account` | Account Holder, Buyer | Verification, orders, messages, cases, refunds, reviews, security | Mobile, tablet, desktop |
| Seller Centre | `/seller` | Seller Applicant, Seller Owner/Operator | Onboarding, catalogue, inventory, Vendor Orders, earnings, cases | Tablet, desktop, safe mobile |
| Rider PWA | `/rider` | Approved Rider | Shift, assignment, pickup, custody, handoff, incidents | Tablet/touch first |
| Operations | `/operations` | Support, Operations, Dispatch, Finance, Trust and Safety, Catalogue, FBN staff | Queues, interventions, reconciliation, cases, logistics | Desktop/tablet |
| Restricted Admin | `/admin` | Institution, Access, Platform, Security, Super Admin | Configuration, access, feature gates, policies, audit, emergency controls | Desktop/tablet |

### 5.1 Surface boundaries

The following must not be collapsed:

- Buyer order detail and Operations order workspace;
- Seller Vendor Order and Buyer Parent Order;
- Rider Delivery Job and Operations dispatch record;
- Support case review and Trust and Safety enforcement;
- Finance refund/payout processing and ordinary order intervention;
- Admin configuration and day-to-day Operations work.

### 5.2 Shared cross-surface services

The following may be shared but rendered according to role and scope:

- authentication and session recovery;
- notification centre;
- message threads;
- file/evidence viewer;
- timeline component;
- status vocabulary;
- search entry;
- account/surface switcher;
- help and policy links;
- audit correlation references; and
- accessible error/retry patterns.

---

## 6. Global route and URL rules

### 6.1 URL characteristics

Routes should be:

- human-readable where public;
- stable enough for notifications and Support links;
- scoped by opaque identifiers where privacy matters;
- free of sensitive data;
- shareable only within the applicable authorisation boundary; and
- resilient to renamed product titles through canonical identifiers or redirects.

Do not put the following in URLs:

- full name;
- matric number;
- email or phone number;
- bank-account number;
- private room/location;
- case evidence filename;
- payment secret/reference where public exposure creates risk;
- internal risk score; or
- enforcement allegation.

### 6.2 Public slugs and private identifiers

Public products, categories, collections, and approved stores may use readable slugs:

```text
/products/engineering-mathematics-textbook
/categories/books
/collections/exam-week-essentials
/stores/covenant-bookstore
```

Private orders, cases, payouts, and assignments should use non-sequential public identifiers:

```text
/account/orders/NM-48291
/seller/orders/VO-83K4Q
/rider/jobs/DJ-7F2M9
/operations/cases/PC-4N8Y2
```

The visible identifier must not be treated as authorisation.

### 6.3 Canonical and return URLs

Sign-in, verification, and reauthentication may accept a safe server-validated return destination. Open redirects are prohibited.

After successful action, the user should return to the object they were acting on rather than a generic dashboard where context is lost.

### 6.4 Route-state rules

Route query parameters may represent non-sensitive view state such as:

- search query;
- category filters;
- sort;
- queue filter;
- tab;
- date range; or
- safe pagination cursor.

They must not authoritatively set:

- payment status;
- refund status;
- seller activation;
- role/capability;
- case decision;
- assigned rider;
- fulfilment completion; or
- payout result.

### 6.5 Direct-link behaviour

When a user follows a deep link:

1. authenticate if required;
2. restore the intended route after safe authentication;
3. evaluate capability and resource scope;
4. evaluate feature and institution activation;
5. show the authoritative page or a safe denial/unavailable state; and
6. avoid confirming the existence of sensitive out-of-scope records.

---

## 7. Global navigation system

### 7.1 Public desktop header

The public desktop header should contain, in priority order:

1. Noma logo/home;
2. institution/service context where applicable;
3. primary search;
4. Categories;
5. Orders for signed-in Buyers;
6. account/surface switcher;
7. notifications;
8. cart; and
9. contextual help.

Promotions, Food, or campaign links may appear only when active and must not displace Search, Categories, Orders, or Cart.

### 7.2 Public mobile navigation

Mobile should prioritise:

```text
Home
Categories
Search
Orders
Cart
```

Account, verification, messages, notifications, Seller Centre, and other permitted surfaces may sit behind the account menu/switcher. The bottom navigation must not exceed what can be understood without horizontal scrolling.

### 7.3 Surface switcher

The account menu must show only active memberships:

```text
Shop on Noma
My account
Seller Centre — <seller name>
Rider — Covenant
Operations — <workspace>     [privileged only]
Admin                         [privileged only]
```

When multiple seller memberships eventually exist, the Seller Centre entry must require explicit seller selection and preserve scope in the header.

### 7.4 Breadcrumbs

Breadcrumbs are required on desktop/tablet for deep catalogue, Seller, Operations, Finance, case, and Admin pages. They are optional on shallow mobile Marketplace pages where a clear back pattern exists.

Breadcrumbs must reflect the user's surface, not the backend entity hierarchy.

Example:

```text
Operations > Protection Cases > PC-4N8Y2
```

not:

```text
Database > ProtectionCase > UUID
```

### 7.5 Notification centre

The shared notification centre must group notifications by audience and urgency without mixing private role contexts.

A Seller notification must open Seller Centre; a Rider notification must open the Rider job; a Buyer notification must open Buyer Account; a Finance alert must open Finance workspace.

### 7.6 Global search versus local search

- Marketplace global search searches public/eligible products, categories, and approved stores.
- Seller local search searches that seller's offers, inventory, Vendor Orders, cases, and payouts according to permission.
- Rider local search is limited to current/recent assigned jobs where needed.
- Operations local/global search searches authorised operational records and must respect workspace scope.
- Admin search searches configuration/access records, not ordinary commerce by default.

Search context must be visually clear so staff do not mistake a seller-scoped result for a platform-wide result.

---

## 8. Marketplace information architecture

### 8.1 Marketplace primary navigation

Primary Marketplace navigation:

```text
Home
Categories
Search
Active collections/campaigns
Food                     [feature-gated]
Orders                    [signed-in]
Cart
```

Secondary navigation:

```text
Help
Buyer Protection
Returns and refunds
Delivery information
Sell on Noma
Policies
```

### 8.2 Marketplace route map

```text
/
├── search
├── categories
│   └── [categorySlug]
├── collections
│   └── [collectionSlug]
├── products
│   └── [productSlug-or-id]
├── stores
│   └── [storeSlug-or-id]
├── food                                  [feature-gated]
│   ├── outlets
│   └── [outletSlug-or-id]
├── cart
├── checkout
│   ├── review
│   ├── payment
│   └── status
├── sign-in
├── register
├── verify-email
├── forgot-password
├── reset-password
├── help
└── policies
    ├── buyer-protection
    ├── returns-refunds
    ├── delivery
    ├── privacy
    ├── terms
    └── prohibited-products
```

Routes may be regrouped technically, but the page responsibilities below are binding.

### 8.3 Homepage `/`

**Purpose:** Begin discovery, communicate current Covenant availability, and route users to high-value catalogue paths without overwhelming them.

**Required content order:**

1. primary search;
2. current institution/service context and truthful availability;
3. active category shortcuts;
4. relevant operational notice, if any;
5. curated collections/campaigns;
6. available-now or high-confidence products;
7. useful Covenant-specific shopping groupings;
8. selected new-seller discovery where eligible;
9. delivery/Buyer Protection reassurance; and
10. help and policy links.

**Must not become:**

- a giant decorative hero that pushes products below the fold;
- a feed dominated by sponsored placements;
- a list of unavailable future commerce types;
- a claim that all products are verified or fulfilled by Noma; or
- a generic AI-generated marketing page.

### 8.4 Categories index `/categories`

**Purpose:** Expose the active catalogue taxonomy and help users browse without a known search term.

The page must:

- show active top-level categories only;
- expose understandable subcategories;
- exclude policy-disabled categories;
- indicate feature-gated categories only to eligible cohorts where approved; and
- link to category-specific help where condition, warranty, or return rules materially differ.

### 8.5 Category landing `/categories/[categorySlug]`

**Required hierarchy:**

1. category title and concise scope description;
2. relevant subcategories;
3. active collection/campaign where applicable;
4. result count and availability context;
5. category-specific filters;
6. sort;
7. product results grouped around canonical products;
8. pagination/load-more; and
9. zero-result recovery.

Filters must derive from structured category attributes, not one universal irrelevant filter set.

### 8.6 Search results `/search`

**Required hierarchy:**

1. query and result summary;
2. spelling/synonym clarification where applied;
3. active filters and clear-all;
4. category refinement;
5. sort;
6. canonical-product results with offer context;
7. availability and delivery-promise indicators;
8. transparent sponsored label if ever activated; and
9. zero-result or stale-result recovery.

Search results must not imply checkout eligibility until cart/checkout revalidation.

### 8.7 Collection `/collections/[collectionSlug]`

Collections are controlled merchandising pages such as Exam Week Essentials or Engineering Essentials.

Each collection must show:

- collection purpose;
- institution and active period where relevant;
- curation/sponsorship label where applicable;
- products that remain independently eligible; and
- no misleading guarantee that every item is discounted or recommended by Noma.

Expired collections should redirect safely or present an ended state without losing valid product links.

### 8.8 Product detail `/products/[productSlug-or-id]`

The Product page is the buyer's authoritative comparison page for a canonical product and its eligible seller offers.

**Required content hierarchy:**

1. product identity: title, brand/model/edition, category;
2. product media and actual-unit media where pre-owned;
3. selected offer summary: price, condition, seller, stock/availability;
4. delivery promise and fulfilment source;
5. variant/condition selection;
6. primary action: add selected valid offer to cart;
7. alternative seller offers and comparison;
8. product attributes/specifications;
9. condition details and defects for pre-owned;
10. included/excluded items;
11. warranty and return classification;
12. seller summary and relevant trust/performance indicators;
13. verified-purchase reviews;
14. product questions; and
15. policy/safety information where applicable.

The page must clearly distinguish:

- product information from seller-offer information;
- ordinary seller description from Noma verification;
- item price from delivery cost;
- new from pre-owned condition;
- seller-managed from FBN fulfilment; and
- current availability from historical/review information.

**Primary action behaviour:** before add-to-cart, revalidate offer status, variant, price, stock, policy, seller activation, and institution eligibility.

### 8.9 Storefront `/stores/[storeSlug-or-id]`

An approved seller storefront may show:

- public seller name and type;
- seller description and approved branding;
- active offers;
- fulfilment/return information;
- relevant verified performance indicators; and
- policy-safe questions/help.

It must not expose:

- owner personal data;
- payout information;
- internal Seller Health details;
- unrelated disputes;
- private campus location unless approved as a public store/pickup point; or
- a misleading Noma Trusted or verified badge.

### 8.10 Cart `/cart`

The Cart is a review and recovery page, not a final promise.

**Required hierarchy:**

1. item groups by seller or understandable fulfilment context;
2. selected offer, variant, condition, quantity;
3. current price and availability warnings;
4. estimated delivery grouping/tier where possible;
5. item and seller-specific eligibility issues;
6. subtotal, discounts, delivery estimate, and total estimate;
7. verification/checkout requirement;
8. primary action to continue; and
9. save/remove/update actions.

The Cart must support partial recovery when one item becomes invalid. It must not silently replace an offer or variant.

### 8.11 Checkout review `/checkout/review`

Checkout is a focused flow with minimal unrelated navigation.

**Required hierarchy:**

1. eligibility and Covenant verification status;
2. buyer identity/contact confirmation;
3. approved delivery point and recipient/delegate selection where permitted;
4. fulfilment groups and delivery tiers;
5. item/vendor review;
6. delivery promise and exceptions;
7. discounts and funding-visible customer total;
8. item, delivery, and total amount;
9. policy/consent summary;
10. primary action to initiate Paystack payment; and
11. safe edit links back to the relevant section.

The page must revalidate price, stock, reservation, seller status, feature activation, delivery capacity, and total before payment initialisation.

### 8.12 Payment `/checkout/payment`

This page coordinates provider payment but must not claim success from the browser alone.

It must show:

- order/checkout reference;
- exact amount and currency;
- provider handoff status;
- safe cancellation/return guidance;
- processing state after provider return; and
- explicit warning not to repeat payment while outcome is uncertain.

Secret keys, provider internals, or sensitive references must not be exposed.

### 8.13 Checkout status `/checkout/status`

Possible truthful states include:

- awaiting payment;
- verifying payment;
- order confirmed;
- payment failed;
- payment cancelled/abandoned;
- outcome uncertain/reconciliation in progress;
- duplicate or mismatch under review.

When confirmed, link to the Buyer Parent Order. When uncertain, provide a stable status page and Support route rather than an immediate “Pay again” action.

### 8.14 Public help and policies

Public help must cover:

- Covenant eligibility;
- how delivery points work;
- Buyer Protection;
- cancellation, return, and refund basics;
- pre-owned condition disclosures;
- safe payments and anti-bypass;
- how to sell;
- how to report prohibited products or safety concerns; and
- how to contact Noma Support.

Policies must be readable without account creation and versioned where legally or operationally material.

---

## 9. Buyer Account information architecture

### 9.1 Buyer Account navigation

Primary Buyer Account navigation:

```text
Overview
Orders
Messages
Returns & Cases
Refunds
Reviews
Verification
Notifications
Profile & Security
```

On mobile, Orders, Messages, and Help/Case actions must remain easy to reach. Less frequent settings may sit behind the account menu.

### 9.2 Buyer Account route map

```text
/account
├── orders
│   └── [parentOrderId]
│       ├── track
│       ├── messages
│       ├── cancel
│       ├── delegate
│       └── help
├── messages
│   └── [conversationId]
├── cases
│   └── [caseId]
├── returns
│   └── [returnId]
├── refunds
│   └── [refundId]
├── reviews
│   └── [reviewId-or-eligibility]
├── verification
│   ├── covenant
│   └── evidence
├── notifications
├── profile
├── delivery-preferences
└── security
    ├── sessions
    └── recovery
```

### 9.3 Account overview `/account`

**Purpose:** Orient the user to active obligations, not display vanity metrics.

Priority order:

1. urgent action required;
2. active order status;
3. verification or security issue;
4. open case/refund status;
5. unread order messages;
6. eligible review prompt; and
7. useful account shortcuts.

### 9.4 Orders list `/account/orders`

The list must support:

- active versus past orders;
- search by public order reference;
- status and next action;
- latest confirmed event;
- estimated/actual delivery;
- partial cancellation/refund indication;
- open case indication; and
- direct link to order detail.

Buyer-facing status must summarise the Parent Order honestly while indicating item/vendor differences.

### 9.5 Buyer Parent Order detail `/account/orders/[parentOrderId]`

This is the buyer's authoritative order page.

**Required hierarchy:**

1. overall customer-facing status and next action;
2. urgent warning or exception;
3. delivery promise and active handoff information;
4. item/vendor/fulfilment progress;
5. payment total and refund-adjusted summary;
6. cancellation/help actions allowed in current state;
7. active delivery tracking;
8. structured messages;
9. Protection Case/return/refund status;
10. order timeline; and
11. receipts/policy snapshot.

The page must distinguish:

- overall Parent Order status;
- each Vendor Order/item status;
- each Fulfilment/Delivery status;
- payment confirmation;
- refund processing; and
- case outcome.

A refunded item and a delivered item can coexist in one Parent Order.

### 9.6 Tracking `/account/orders/[parentOrderId]/track`

Tracking must show only appropriate operational information:

- fulfilment group;
- delivery tier;
- current confirmed stage;
- approved pickup/delivery point context;
- estimated window;
- rider/carrier identity limited to what is necessary;
- delegate status;
- handoff credential entry/display under secure controls;
- failed-attempt or redelivery status; and
- Support escalation.

Continuous live GPS is not required for the pilot and must not be implied if unavailable.

### 9.7 Cancellation `/account/orders/[parentOrderId]/cancel`

Cancellation must be a controlled review flow showing:

- cancellable items/quantities;
- lifecycle-based eligibility;
- estimated refund;
- delivery/handling consequence;
- seller or buyer attribution where relevant;
- effect on unaffected items; and
- explicit confirmation.

When cancellation is no longer allowed, explain the applicable return/help route.

### 9.8 Delegated collection `/account/orders/[parentOrderId]/delegate`

This route is visible only when delegation is active and eligible.

It must show:

- selected order/fulfilment;
- delegate information required by policy;
- credential generation/expiry;
- revocation;
- privacy notice;
- risk restrictions; and
- authoritative delegate status.

### 9.9 Order help `/account/orders/[parentOrderId]/help`

This is the entry point for structured issue intake.

It must:

1. ask which item/fulfilment is affected;
2. offer reason codes appropriate to state and category;
3. show immediate self-service options where legitimate;
4. collect explanation and secure evidence;
5. state likely next step and deadline;
6. create/link the Protection Case; and
7. preserve external consumer rights.

### 9.10 Messages `/account/messages`

Messages must be grouped by product question, order, Support case, or dispute. System timelines must remain distinguishable from participant messages.

The list should show:

- context title;
- counterpart role, not unnecessary personal identity;
- unread state;
- last message/action;
- order/case status; and
- restrictions or moderation state.

### 9.11 Protection Case `/account/cases/[caseId]`

**Required hierarchy:**

1. case reason and current status;
2. immediate safeguard or action required;
3. affected item/order;
4. submitted evidence;
5. response deadline;
6. communication;
7. decision/remedy;
8. refund/return/replacement execution status;
9. appeal route where eligible; and
10. case timeline.

Temporary safeguards must not be presented as final fault decisions.

### 9.12 Return detail `/account/returns/[returnId]`

Show:

- item being returned;
- approved reason/remedy;
- collection/drop-off method;
- credential and deadline;
- custody progress;
- inspection state where applicable;
- refund/replacement dependency; and
- help route.

### 9.13 Refund detail `/account/refunds/[refundId]`

Show distinct states:

```text
Approved
Submitted to provider
Processing
Completed
Failed / Needs attention
```

Include amount, affected item(s), destination/method description, submitted/completed times, and Support route. Do not display “refunded” before provider-confirmed completion.

### 9.14 Review creation `/account/reviews/[...]`

The review page must:

- prove eligible verified purchase;
- identify exact product and seller context;
- separate product quality/description from seller experience;
- permit policy-safe text/images;
- explain moderation;
- prevent private data; and
- show published/held/rejected status and reason.

### 9.15 Covenant verification `/account/verification/covenant`

The verification page must show:

- current affiliation status;
- required fields;
- email verification state;
- identifier validation result;
- manual-review branch;
- requested evidence and privacy guidance;
- reviewer outcome;
- expiry/revalidation; and
- next eligible capability.

It must not ask every user for high-friction identity documents when automated checks pass.

### 9.16 Profile, delivery preferences, and security

Profile pages must separate:

- general account identity;
- contact methods and consent;
- Covenant affiliation;
- delivery-point preferences;
- seller/rider memberships; and
- security/session controls.

Security must include password/recovery, active sessions, sign-out-all, recent security events, and compromised-account reporting. Privileged staff security belongs in the privileged surface as well.

---

## 10. Seller Centre information architecture

### 10.1 Seller Centre navigation

Primary navigation:

```text
Overview
Orders
Listings
Inventory
Fulfilment
Messages
Cases
Earnings
Payouts
Performance
Store Settings
```

Progressive sections appear only when relevant:

```text
Food Operations
External Inbound
FBN
Team
```

### 10.2 Seller context header

Every Seller Centre page must display:

- current seller name;
- seller type;
- institution/market context;
- activation/restriction state;
- current role within the seller; and
- safe seller switcher if multiple memberships are later enabled.

A user must never unknowingly act on the wrong seller.

### 10.3 Seller route map

```text
/seller
├── onboarding
│   ├── application
│   ├── verification
│   ├── training
│   └── activation
├── orders
│   └── [vendorOrderId]
├── listings
│   ├── new
│   └── [offerId]
├── products
│   └── [productId]
├── inventory
│   └── [inventoryItemId]
├── fulfilment
│   ├── pickups
│   ├── packaging
│   ├── external-inbound                 [feature-gated]
│   └── fbn                              [feature-gated]
│       ├── inbound
│       ├── inventory
│       └── returns
├── food                                 [feature-gated]
│   ├── menu
│   ├── availability
│   └── orders
├── messages
│   └── [conversationId]
├── cases
│   └── [caseId]
├── earnings
├── payouts
│   └── [payoutId]
├── payout-account
├── performance
├── policies
└── settings
    ├── store
    ├── members                          [progressive]
    └── security
```

### 10.4 Seller overview `/seller`

The overview prioritises action:

1. orders awaiting acceptance/action;
2. preparation deadlines at risk;
3. pickup waiting or custody exceptions;
4. stock/availability problems;
5. listings needing correction;
6. open cases/evidence requests;
7. payout/security actions;
8. current restrictions; and
9. concise earnings summary.

Every summary must link to the relevant filtered queue/detail page.

### 10.5 Seller onboarding `/seller/onboarding`

The onboarding experience must show a clear staged checklist:

```text
Seller type and application
Identity/organisation verification
Category approval
Payout account
Policy acceptance
Training/test order
Catalogue readiness
Activation decision
```

Approval and activation must be separate. A seller may be approved but not yet live.

### 10.6 Vendor Orders list `/seller/orders`

Required filters include:

- action required;
- awaiting acceptance;
- preparing;
- ready for pickup;
- pickup waiting;
- cancelled/rejected;
- completed;
- case open; and
- date/order reference.

The seller sees only its Vendor Orders and relevant fulfilment information.

### 10.7 Vendor Order detail `/seller/orders/[vendorOrderId]`

**Required hierarchy:**

1. current state, deadline, and primary permitted action;
2. seller's items/quantities and immutable order snapshot;
3. preparation and packaging requirements;
4. approved pickup point and assigned logistics status;
5. pickup credential/handoff state;
6. buyer-approved substitution workflow where enabled;
7. cancellation/rejection consequences;
8. messages;
9. related case/return; and
10. seller-facing timeline and financial reference.

The seller must not see unrelated sellers' items, prices, buyer messages, or earnings.

### 10.8 Listings list `/seller/listings`

The list must distinguish:

- drafts;
- submitted/reviewing;
- active;
- needs correction;
- out of stock/unavailable;
- restricted/removed;
- feature-gated; and
- archived.

Filters should include category, condition, fulfilment mode, inventory status, moderation state, and updated date.

### 10.9 Listing create/edit `/seller/listings/new` and `/seller/listings/[offerId]`

The form must be modular by commerce type and category.

For Product offers, content order should be:

1. canonical product match or new-product request;
2. seller offer identity;
3. category and structured attributes;
4. variant;
5. condition;
6. price;
7. inventory/availability;
8. fulfilment source;
9. images;
10. warranty/return information;
11. category-specific disclosures;
12. preview; and
13. submit/publish according to moderation authority.

Pre-owned flows require actual-unit photographs, condition grade, defects, included items, and ownership declaration.

AI suggestions, where active, must appear as reviewable suggestions and never silently write live data.

### 10.10 Inventory `/seller/inventory`

The inventory workspace must show:

- offer/product;
- inventory mode;
- physical quantity where applicable;
- reserved quantity;
- available-to-buy quantity;
- availability-only state;
- fulfilment location/source;
- low/out-of-stock warning;
- last confirmation/change; and
- linked order reservations.

Sellers may update allowed stock fields but cannot manually edit reservations or confirmed custody records.

### 10.11 Fulfilment and pickups `/seller/fulfilment`

Show:

- orders requiring packaging;
- ready parcels;
- assigned pickup windows;
- rider/carrier status;
- pickup credential state;
- failed pickup; and
- packaging or policy exception.

### 10.12 Messages `/seller/messages`

Messages are scoped to product questions, Vendor Orders, Support cases, or disputes. Anti-bypass warnings and moderation state must be visible to the sender without exposing detection internals that enable easy evasion.

### 10.13 Seller cases `/seller/cases/[caseId]`

Show only seller-relevant:

- allegation/reason;
- affected item/order;
- temporary safeguard;
- response/evidence deadline;
- submitted evidence;
- decision/remedy;
- seller financial/standing effect; and
- appeal route.

Sensitive Buyer data and unrelated risk evidence remain hidden.

### 10.14 Earnings `/seller/earnings`

The Seller earnings page must show:

```text
Pending
Available
Held / disputed
Risk reserve
Processing payout
Paid
Negative exposure
```

It must include understandable ledger references by Vendor Order/item and explain why money is not yet available. It must not expose editable balances.

### 10.15 Payout account `/seller/payout-account`

Show masked account, resolved name, verification status, change/security controls, cooling period where applicable, and history of masked changes.

Creating/changing the account requires recent authentication and the approved verification flow.

### 10.16 Payouts `/seller/payouts`

Show:

- available withdrawal amount;
- withdrawal request action;
- requested/under review/approved/processing/paid/failed/reversed/reconciliation state;
- provider-confirmed completion;
- related amount and account mask; and
- help route.

Do not present transfer initiation as payment success.

### 10.17 Performance `/seller/performance`

Show objective, understandable indicators:

- acceptance;
- seller-caused cancellation;
- stock accuracy;
- preparation timeliness;
- pickup readiness;
- confirmed wrong/misdescribed item;
- case outcomes; and
- restrictions/corrective actions.

Low-volume data must include context and must not imply certainty from one order.

### 10.18 Store settings and team

Store settings include approved public store data, operating status, pickup point, notification preferences, and policy acknowledgements.

Team management is progressive and must separate Seller Owner, Operator, Catalogue, Order, Finance Viewer, and Staff Admin authority. It must not grant platform roles.

---

## 11. Rider PWA information architecture

### 11.1 Rider navigation

The Rider PWA should use a minimal touch-first navigation:

```text
Current
Available / Assigned Jobs
History
Earnings
Profile / Shift
```

An active job may temporarily replace ordinary navigation with a focused task flow.

### 11.2 Rider route map

```text
/rider
├── onboarding
├── shift
├── jobs
│   └── [deliveryJobId]
│       ├── accept
│       ├── pickup
│       ├── custody
│       ├── delivery
│       ├── failed-attempt
│       └── incident
├── history
├── earnings
├── notifications
└── profile
```

### 11.3 Rider home `/rider`

Priority order:

1. connectivity/offline state;
2. active custody obligation;
3. active assignment and next action;
4. shift/availability;
5. assignments awaiting response;
6. operational notice; and
7. completed-today summary.

No vanity analytics should compete with the current job.

### 11.4 Shift `/rider/shift`

Show:

- approval/eligibility state;
- carrier/rider type;
- shift start/end;
- availability;
- capacity;
- pause/end action;
- active-job restriction; and
- safety/operational notice.

A rider cannot end a shift in a way that abandons active custody.

### 11.5 Jobs list `/rider/jobs`

Show only permitted offered/assigned jobs with:

- pickup and delivery zone/points;
- tier and promise;
- package count/handling;
- estimated workload;
- offer/assignment expiry; and
- accept/decline state where applicable.

Private Buyer and Seller data must not appear before assignment requires it.

### 11.6 Delivery Job detail `/rider/jobs/[deliveryJobId]`

The job page must be a task-oriented sequence:

1. current assignment/custody state;
2. next required action;
3. pickup point and instructions;
4. parcel identifiers and handling;
5. delivery point and permitted recipient/delegate;
6. promise/tier;
7. safe contact/escalation route;
8. timeline; and
9. incident action.

### 11.7 Pickup `/rider/jobs/[deliveryJobId]/pickup`

Show:

- assigned parcel list;
- seller/pickup point;
- arrival confirmation;
- QR/credential scan;
- parcel/packaging exception;
- custody acceptance consequence; and
- backend-confirmed completion.

Offline drafts may be queued where safe, but final high-risk pickup requires required validation.

### 11.8 Delivery `/rider/jobs/[deliveryJobId]/delivery`

Show:

- approved handoff point;
- recipient/delegate eligibility;
- arrival action;
- PIN/QR entry/scan;
- item/parcel count;
- condition/identity exception route;
- explicit final handoff confirmation; and
- truthful success/failure result.

### 11.9 Failed attempt `/rider/jobs/[deliveryJobId]/failed-attempt`

Require structured reason, contact attempts where applicable, waiting time, location/time evidence, safe photo only where policy permits, parcel condition, and Operations escalation.

The page must route to redelivery, return to custody, disposal, or incident review; it must not mark the job delivered.

### 11.10 Incident `/rider/jobs/[deliveryJobId]/incident`

High-priority reasons include damage, loss, unsafe situation, identity conflict, wrong parcel, device failure, and custody uncertainty.

The page must support immediate containment guidance, evidence, Operations contact, and safe resume/transfer.

### 11.11 Offline and connectivity architecture

Every Rider page must show whether data is:

- live and confirmed;
- cached;
- pending upload;
- conflicted; or
- unable to complete without connection.

Queued actions must display their submission state. The interface must not silently convert an offline draft into a completed pickup or delivery.

---

## 12. Operations information architecture

### 12.1 Operations shell

`/operations` is one protected surface containing capability-scoped workspaces. Users see only workspaces granted to them.

Workspace navigation may include:

```text
Overview
Orders
Fulfilment
Dispatch
Support
Protection Cases
Returns
Catalogue
Seller Operations
Identity Verification
Finance
Trust & Safety
FBN                    [feature-gated]
External Inbound       [feature-gated]
Incidents & Recalls
Reports
```

### 12.2 Operations route map

```text
/operations
├── orders
│   └── [parentOrderId]
├── fulfilments
│   └── [fulfilmentId]
├── dispatch
│   ├── board
│   ├── batches
│   └── deliveries
│       └── [deliveryJobId]
├── support
│   ├── queue
│   └── cases
│       └── [caseId]
├── returns
│   └── [returnId]
├── catalogue
│   ├── products
│   ├── offers
│   ├── moderation
│   └── collections
├── sellers
│   └── [sellerId]
├── verification
│   └── [verificationCaseId]
├── finance
│   ├── payments
│   ├── reconciliation
│   ├── refunds
│   │   └── [refundId]
│   ├── earnings
│   ├── withdrawals
│   ├── payouts
│   │   └── [payoutId]
│   └── ledger-adjustments
├── trust-safety
│   ├── queue
│   ├── cases
│   │   └── [caseId]
│   ├── enforcement
│   └── appeals
├── fbn                                      [feature-gated]
│   ├── inbound
│   ├── receiving
│   ├── inventory
│   ├── pick-pack
│   ├── returns
│   └── cycle-counts
├── external-inbound                         [feature-gated]
├── incidents
├── recalls
└── reports
```

### 12.3 Operations overview `/operations`

The overview must show operational health and actionable exceptions:

1. launch/commerce pause status;
2. paid orders requiring action;
3. orders at promise risk;
4. ready but unassigned fulfilments;
5. pickup/delivery exceptions;
6. payment/refund/payout reconciliation exceptions;
7. aged Support/Protection cases;
8. serious safety/security incidents;
9. capacity utilisation; and
10. workspace links.

Every number must link to a filtered queue and be scoped to the actor.

### 12.4 Queue standard

Every Operations queue must support, as relevant:

- owner/assigned team;
- status;
- severity/priority;
- institution;
- seller/carrier;
- age and deadline;
- value/exposure where authorised;
- last event;
- next action;
- saved views; and
- bulk actions only where safe and explicitly authorised.

Bulk actions must not apply serious financial or enforcement decisions without individual validation and approval.

### 12.5 Operations Order Workspace `/operations/orders/[parentOrderId]`

This is the cross-domain operational view of a Parent Order.

**Required hierarchy:**

1. current overall state and exception banner;
2. payment verification and financial-integrity summary;
3. Parent Order amount/allocation summary appropriate to capability;
4. Vendor Orders and seller states;
5. Fulfilment Groups and Delivery Jobs;
6. inventory/reservation snapshot;
7. cancellations, substitutions, refunds, and cases;
8. messages and notifications;
9. permitted intervention panel;
10. complete timeline; and
11. audit references.

Sensitive Finance, Trust and Safety, and identity evidence must be compartmentalised by capability even within the same workspace.

### 12.6 Fulfilment detail `/operations/fulfilments/[fulfilmentId]`

Show:

- included item quantities;
- pickup sources;
- readiness;
- fulfilment type;
- delivery-tier promise;
- parcel/packaging records;
- batching compatibility;
- current custody;
- assigned Delivery Job; and
- split/recovery history.

### 12.7 Dispatch board `/operations/dispatch/board`

Columns or views should represent operational states, not arbitrary team labels:

```text
Ready / Unassigned
Assignment Offered
Assigned
Approaching Pickup
At Pickup
Picked Up / In Transit
At Handoff
Exception / Reassignment
Return to Custody
Completed
```

Required controls:

- filter by tier, carrier, rider, pickup/delivery zone, promise risk, handling, and capacity;
- view recommended and final assignment;
- assign/reassign with reason;
- create/manage basic batches;
- open Delivery Job detail;
- pause affected carrier/rider/location where authorised; and
- preserve custody before reassignment.

### 12.8 Delivery Job workspace `/operations/dispatch/deliveries/[deliveryJobId]`

Show assignment history, parcel list, pickup and delivery credentials/status, rider/carrier, custody events, failed-attempt evidence, incident, redelivery/return decision, and audit.

### 12.9 Support queue `/operations/support/queue`

Support should see:

- new Buyer/Seller requests;
- response deadlines;
- order/item context;
- reason category;
- unread communication;
- low-risk rule eligibility;
- escalation requirement; and
- current owner.

### 12.10 Case workspace `/operations/support/cases/[caseId]`

The page must separate:

1. issue summary;
2. affected transaction/item;
3. immediate safeguard;
4. submitted evidence;
5. requested responses and deadlines;
6. messages;
7. applicable policy/rule;
8. recommended/authorised remedy;
9. linked return/refund/enforcement; and
10. timeline/audit.

Support actions must remain within configured remedy limits. Material decisions route to Finance, Operations, or Trust and Safety.

### 12.11 Catalogue workspace

Catalogue pages support:

- canonical product review;
- offer moderation;
- duplicate suggestions;
- structured attribute correction;
- image/policy review;
- category management within configured authority;
- collection/campaign management; and
- search synonym/zero-result improvement.

AI suggestions must be labelled and require review.

### 12.12 Seller Operations `/operations/sellers/[sellerId]`

Show:

- seller entity/type;
- verification and activation;
- representatives/memberships within authority;
- categories;
- listings/inventory health;
- Vendor Order performance;
- open cases;
- restrictions/corrective actions;
- financial status summary only if authorised;
- training/test-order readiness; and
- timeline.

Seller activation, trust, payout verification, and enforcement must remain distinct.

### 12.13 Identity verification workspace `/operations/verification/[verificationCaseId]`

Show only minimum required identity/affiliation data, conflict/duplicate signals, requested evidence, access log, decision options, expiry/revalidation, and reason.

Reviewers must be warned not to request GPA, results, disciplinary records, or unrelated biometrics.

### 12.14 Finance workspace

Finance navigation:

```text
Payments
Reconciliation
Refunds
Seller Earnings
Withdrawals
Payouts
Ledger Adjustments
Reports
```

It must not be hidden inside generic order pages.

### 12.15 Payment/reconciliation detail

Show:

- internal checkout/order reference;
- provider reference/status;
- expected and verified amount/currency;
- provider events;
- idempotency/duplicate status;
- allocation/reconciliation result;
- related order/refund;
- exception owner; and
- safe resolution actions.

No human-editable “mark paid” control is permitted.

### 12.16 Refund detail `/operations/finance/refunds/[refundId]`

Show authorised decision, exact allocation, provider submission, asynchronous state, failure/needs-attention reason, buyer communication, seller-ledger effect, approvals, and timeline.

### 12.17 Withdrawal and payout detail `/operations/finance/payouts/[payoutId]`

Show seller, verified/masked payout account, available-balance evidence, withdrawal request, maker-checker approvals, transfer attempts, provider events, final status, reversal/reconciliation, and audit.

Initiation must remain `PROCESSING`; only verified final provider status may produce `PAID`.

### 12.18 Trust and Safety workspace

Navigation:

```text
Priority Queue
Policy Cases
Counterfeit / Stolen Goods
Harassment / Threats
Identity Misuse
Bypass / Fraud
Enforcement
Appeals
```

The workspace must emphasise severity, immediate safeguards, evidence access, conflicts, policy basis, proportionality, review/expiry, and appeal.

### 12.19 Enforcement detail

Show:

- allegation and evidence;
- affected listings/orders/accounts;
- temporary safeguards;
- prior relevant history;
- permitted action options;
- approval requirement;
- financial/capability impact;
- customer continuity plan;
- appeal eligibility; and
- immutable timeline.

The page must not offer one generic “Ban user” button.

### 12.20 FBN workspace

Visible only after physical-site and feature activation.

Required areas:

- planned inbound shipments;
- receiving and discrepancy;
- putaway/bin assignment;
- inventory movement;
- reservations;
- pick/pack queue;
- rider handoff;
- returns/quarantine;
- cycle counts; and
- capacity/exception dashboard.

### 12.21 Incidents and recalls

Incident/recall pages must link product, offer, inventory unit/batch, orders, sellers, buyers, deliveries, cases, notifications, containment, owner, deadline, and resolution.

Manual coordination must remain visible in the system.

---

## 13. Restricted Administration information architecture

### 13.1 Admin purpose

`/admin` exists for high-impact platform and institution configuration. It is not the daily Operations workspace.

### 13.2 Admin navigation

```text
Overview
Institutions
Commerce Features
Categories & Policies
Seller Activation Controls
Access & Roles
Logistics Configuration
Payment/Payout Configuration
Notifications & Templates
Audit
Emergency Controls
System Configuration
```

Each entry appears only where the actor has explicit capability.

### 13.3 Admin route map

```text
/admin
├── institutions
│   └── [institutionId]
│       ├── verification
│       ├── locations
│       ├── commerce-features
│       ├── delivery
│       └── capacity
├── commerce-types
├── feature-flags
├── categories
├── policies
├── sellers
│   └── activation
├── access
│   ├── users
│   ├── roles
│   ├── grants
│   └── reviews
├── logistics
│   ├── carriers
│   ├── locations
│   ├── tiers
│   └── rules
├── finance
│   ├── thresholds
│   ├── payout-rules
│   └── provider-configuration
├── notifications
├── audit
├── emergency-controls
└── system
```

### 13.4 Admin overview `/admin`

Show:

- current institution/feature activation;
- privileged-access review items;
- configuration changes awaiting approval;
- emergency-control state;
- security/backup readiness summary where authorised; and
- links to exact configuration records.

Do not show ordinary order metrics as the primary purpose of Admin.

### 13.5 Institution configuration

The institution page must separate:

- identity/verification configuration;
- approved email domains and identifier rules;
- campus location graph;
- pickup/delivery points;
- seller and rider programmes;
- commerce-type activation;
- delivery tiers and operating windows;
- capacity limits;
- policy versions; and
- launch/expansion stage.

Exact Covenant domains or identifiers must be entered only after authorised confirmation and with audit.

### 13.6 Feature activation

Feature activation pages must show:

- feature;
- institution/category/seller/cohort scope;
- current state;
- prerequisites and evidence;
- capacity limit;
- activation/rollback owner;
- start/end or review date;
- approval; and
- audit history.

Examples include Food, External Vendor, FBN, Pre-Owned category, Priority, Saver, delegation, and web push.

### 13.7 Access and roles

Access pages must support scoped role grants, expiry/review, recent authentication, maker-checker where required, conflict detection, immediate revocation, and access reports.

They must not offer a single unrestricted `ADMIN` toggle.

### 13.8 Policy/category configuration

Show category rules, return classification, condition schema, warranty requirements, prohibited/restricted status, evidence requirements, and effective versions.

Changing policy must not silently rewrite existing order snapshots.

### 13.9 Logistics configuration

Show carriers, rider types, approved locations, zone prices, tier activation, capacity, assignment rules, batching settings, and exception handling. Predictive routing controls remain absent/deferred.

### 13.10 Finance configuration

Configuration may expose thresholds, approval rules, withdrawal limits, reserve settings where active, and provider connection status. Secrets must never be displayed in full.

The page must not permit direct editing of ledger balances or provider-confirmed status.

### 13.11 Audit `/admin/audit`

Audit search must support actor, action, resource, institution, time, result, correlation reference, and severity. Sensitive audit exports require reason, approval where configured, and separate audit evidence.

### 13.12 Emergency controls `/admin/emergency-controls`

Emergency controls may pause:

- checkout;
- a payment method;
- payouts;
- a seller;
- a category;
- a delivery tier;
- a carrier/rider programme;
- one institution; or
- a compromised privileged account.

Each control must show impact, current state, reason, actor, time, review/restart requirement, and affected journeys.

Restart must require a separate readiness check and must not be implied by resolving one technical error.

---

## 14. Common page anatomy

### 14.1 List/queue page anatomy

A list or queue should contain:

1. page title and scope;
2. active operational notice;
3. primary create/action only if authorised;
4. summary of current filtered result;
5. search and filters;
6. saved views where useful;
7. sortable table/cards appropriate to device;
8. row-level next action/status;
9. pagination; and
10. empty/error state.

### 14.2 Detail page anatomy

A material detail page should contain:

1. object identity and public/reference ID;
2. current truthful status;
3. next action/responsible party/deadline;
4. alert/exception/hold;
5. primary permitted action;
6. object-specific summary;
7. related sub-objects;
8. money/custody/evidence summary where relevant;
9. communication;
10. timeline;
11. audit/help/escalation; and
12. secondary destructive actions placed away from the primary flow.

### 14.3 Form/wizard anatomy

A long form should:

- divide tasks into understandable steps;
- save safe drafts;
- show progress;
- distinguish required from optional;
- validate near the field and again server-side;
- preserve entered data after recoverable failure;
- disclose why sensitive information is requested;
- preview material consequences; and
- provide explicit submit/review state.

### 14.4 Confirmation anatomy

Before a material action, show:

- exact object;
- consequence;
- money/custody/visibility effect;
- reversibility;
- reason requirement;
- second approval where applicable; and
- explicit confirmation language.

Generic “Are you sure?” is insufficient for refunds, payouts, seller suspension, role grants, custody transfer, or emergency pause.

### 14.5 Timeline anatomy

Timeline entries must show:

- event label;
- actor type: Buyer, Seller, Rider, Staff, System, Provider;
- confirmed time;
- safe description;
- related document/evidence where authorised;
- reversal/correction link; and
- whether the event is pending, confirmed, failed, or superseded.

### 14.6 Tabs and drawers

Tabs may organise related information, but must not hide urgent actions or split one required decision across several undiscoverable locations.

Drawers/modals may support quick review or confirmation. They must not be the only place to access long-lived order, case, payout, or enforcement records.

---

## 15. Content hierarchy and language rules

### 15.1 Priority order

Across Noma, content should generally follow:

```text
Urgent risk or required action
Current truthful status
Next step and deadline
Core item/order/job/case information
Money, delivery, or protection consequence
Supporting details
History and policy
```

### 15.2 User-facing versus internal terminology

Buyer language should prefer:

- Order;
- item;
- seller;
- delivery;
- refund;
- return;
- problem/case;
- awaiting confirmation;
- processing.

Internal terminology such as Parent Order, Vendor Order, Fulfilment Group, Payment Allocation, Reconciliation Exception, and Risk Reserve may appear in staff/seller contexts where needed, but should be explained.

### 15.3 Status presentation

Status labels must be accompanied by plain-language meaning. Colour alone is insufficient.

Example:

```text
Refund processing
Your refund was submitted to the payment provider on 30 July.
No action is required from you.
```

### 15.4 Promise language

Delivery promises must distinguish:

- estimated;
- scheduled;
- ready;
- assigned;
- arriving;
- attempted;
- completed.

Noma must not present an estimate as a guarantee unless the operational policy supports it.

### 15.5 Trust and verification language

The interface must distinguish:

- Covenant affiliation verified;
- seller approved;
- payout account verified;
- product inspected by Noma/partner;
- verified purchase review;
- Noma Trusted, if later earned.

No single “Verified” badge may imply all of them.

### 15.6 Financial language

Use distinct labels:

- Buyer payment confirmed;
- Seller earning pending;
- Seller earning available;
- withdrawal requested;
- payout processing;
- payout paid;
- refund approved;
- refund processing;
- refund completed.

### 15.7 Destructive and restrictive actions

Use action-specific labels:

- Cancel item;
- Pause seller;
- Remove listing;
- Hold affected earnings;
- Revoke role;
- Pause checkout.

Avoid ambiguous labels such as “Disable,” “Resolve,” or “Process” without consequence.

---

## 16. Empty, loading, error, and unavailable states

### 16.1 Empty states

An empty state must explain:

- what is empty;
- whether that is normal;
- what the actor can do;
- whether filters are hiding records; and
- who to contact if the absence is unexpected.

Examples:

- no orders yet: route Seller to listing/catalogue readiness;
- no available rider jobs: show shift/availability state;
- no search results: suggest correction/category, not fabricated products;
- no cases: explain that active order help remains available.

### 16.2 Loading states

Loading should preserve page structure and avoid causing destructive action misclicks. Critical status should not be replaced by a spinner indefinitely; timeouts must produce a safe retry or processing message.

### 16.3 Recoverable errors

Errors should distinguish:

- invalid input;
- unauthenticated;
- unauthorised/out of scope;
- feature unavailable;
- stale state/conflict;
- provider processing;
- capacity unavailable;
- temporary service failure;
- action already completed; and
- review required.

### 16.4 Financial uncertainty

When payment/refund/payout outcome is uncertain:

- preserve the attempt;
- show “checking/under reconciliation”;
- disable unsafe duplicate action;
- provide a stable reference;
- notify when resolved; and
- provide Support/Finance ownership.

### 16.5 Feature unavailable

A feature-gated route should show one of:

- not available at Covenant yet;
- available only to invited sellers/cohort;
- temporarily paused;
- capacity full;
- seller/category not eligible; or
- access not authorised.

Do not reveal internal enforcement or risk details to unauthorised users.

### 16.6 404 and forbidden behaviour

Public missing content may use a normal not-found page. Sensitive out-of-scope records should use a safe generic not-found/forbidden response according to security policy without confirming record existence.

---

## 17. Responsive and device-specific hierarchy

### 17.1 Marketplace mobile

- Search remains prominent.
- Product cards prioritise image, title, price, availability, delivery promise, and condition.
- Filters use an accessible drawer/sheet with active-filter count.
- Cart and primary action remain reachable without covering content.
- Checkout uses a focused step flow.

### 17.2 Seller mobile

Safe actions include stock/availability updates, order acceptance, preparation, ready status, messages, and evidence capture. Complex catalogue editing, Finance review, and bulk work should optimise for tablet/desktop while remaining readable on mobile.

### 17.3 Rider tablet/touch

- one dominant next action;
- large targets;
- scan-first input;
- minimal typing;
- persistent connectivity/custody state;
- safe outdoor contrast;
- no dense desktop tables.

### 17.4 Operations desktop/tablet

- persistent workspace navigation;
- dense but readable queue tables;
- filters and saved views;
- split-panel preview only where it does not hide authoritative detail;
- keyboard support;
- visible scope/institution;
- high-risk action separation.

### 17.5 Admin desktop/tablet

Admin must prioritise configuration accuracy, review history, comparison of before/after values, and approval—not speed through large numbers of records.

---

## 18. Accessibility requirements for information architecture

Every surface must support:

- meaningful page titles and headings;
- logical heading hierarchy;
- landmarks and skip links;
- keyboard navigation;
- visible focus;
- labels and instructions that do not rely on placeholders;
- status not conveyed by colour alone;
- accessible tables with responsive alternatives;
- screen-reader announcements for asynchronous material changes;
- adequate target sizes;
- error summaries linked to fields;
- preserved context after validation failure; and
- reauthentication that remains accessible.

Critical QR/PIN flows must have an accessible fallback that preserves security and auditability.

---

## 19. Feature-gated and deferred navigation

### 19.1 Progressive navigation rules

A progressive feature may appear only when:

- institution feature state permits it;
- actor capability permits it;
- seller/category/cohort eligibility permits it;
- capacity is available;
- required policy/operations gate passed; and
- route/API checks agree.

### 19.2 Progressive feature placements

| Feature | Buyer placement | Seller placement | Operations/Admin placement |
|---|---|---|---|
| Food | Marketplace category/outlet after activation | Food workspace for approved outlets | Food operational queue/configuration |
| External Vendor | Normal eligible product/offer with inbound promise | External Inbound for invited seller | External Inbound coordination |
| FBN | Fulfilment badge/source on eligible offer | FBN inbound/inventory | FBN warehouse workspace |
| Pre-Owned | Condition filter/product offer | Structured pre-owned listing form | Category/risk moderation |
| Priority | Checkout delivery tier | No special seller nav unless handling changes | Dispatch/configuration |
| Saver | Checkout delivery tier after batching gate | Pickup implications where relevant | Dispatch/batching/configuration |
| Delegation | Order detail/handoff | No general seller visibility | Delivery policy/case review |
| Web push | Notification preferences | Notification preferences | Template/configuration |

### 19.3 Deferred routes must not be scaffolded as live product

The following must not appear in ordinary navigation or be represented as functional empty pages during the pilot:

- Services;
- Rentals;
- Digital goods;
- Events/ticketing;
- customer wallet;
- cash-on-delivery;
- instant settlement;
- unrestricted phone/laptop resale;
- nationwide marketplace/location selector;
- seller advertising console;
- autonomous AI shopping agent;
- predictive fleet control centre; and
- native-app download prompts implying unavailable apps.

An internal enum or architectural boundary does not justify a public page.

---

## 20. Search and cross-linking architecture

### 20.1 Marketplace search targets

Search may return:

- canonical products;
- active categories;
- active collections;
- approved public store pages; and
- Food outlets only when active.

It must not return private orders, users, cases, enforcement, financial records, or inactive future types.

### 20.2 Seller search targets

Seller Centre search may return, within the active seller scope:

- offers/listings;
- inventory;
- Vendor Orders;
- cases;
- messages; and
- payout references where capability permits.

### 20.3 Operations search targets

Operations search must be capability-aware and may return authorised:

- Parent Orders/Vendor Orders;
- fulfilments/deliveries;
- sellers;
- products/offers;
- cases/returns;
- payments/refunds/payouts;
- incidents; and
- audit references.

Search results must label object type and workspace to prevent acting in the wrong context.

### 20.4 Required cross-links

At minimum:

- notification → exact object/action;
- Buyer item problem → order help → case;
- case → return/refund/replacement/enforcement;
- refund → source decision and affected order/item;
- Seller Vendor Order → pickup/fulfilment/case/earning;
- Delivery Job → fulfilment/order/incident;
- payment → checkout/order/provider events;
- payout → withdrawal/ledger/transfer attempts;
- seller → listings/orders/cases/performance/enforcement;
- recall → product/offers/inventory/orders/notifications; and
- audit event → authorised resource detail.

Cross-links must preserve scope and must not expose hidden data merely because related records exist.

---

## 21. Analytics and measurement points

The information architecture must expose measurable funnel and operational checkpoints without making analytics authoritative business truth.

Minimum page-level events include:

- homepage/category/search view;
- search query and zero-result;
- product and offer selection;
- add/remove/update cart;
- checkout step entry/completion;
- payment initiated/provider return/status resolved;
- order detail/tracking view;
- cancellation/help/case entry;
- Seller listing/order/ready action;
- Rider assignment/pickup/handoff action;
- Operations queue/detail/action;
- refund/payout processing; and
- feature-gate unavailable/capacity state.

Analytics payloads must exclude secrets, complete bank data, private message contents, identity evidence, and unnecessary sensitive case data.

---

## 22. Page inventory and pilot priority

### 22.1 Marketplace and Buyer

| Page family | Priority | Journey coverage |
|---|---:|---|
| Homepage/category/search | P0 | `J01`, `J03` |
| Product and offer comparison | P0 | `J03`, `J27` |
| Cart and checkout review | P0 | `J04`, `J10`, `J11` |
| Payment/status | P0 | `J05`, `J06` |
| Account/Covenant verification | P0 | `J01`, `J02`, `J30` |
| Buyer order detail/tracking | P0 | `J09`–`J15` |
| Messages/substitution | P1 | `J16` |
| Protection Case/return/refund | P0 | `J17`, `J18`, `J28` |
| Review | P2 | `J19` |
| Food discovery/outlet | P1 gated | `J24` |

### 22.2 Seller

| Page family | Priority | Journey coverage |
|---|---:|---|
| Seller onboarding/activation | P0 | `J07`, `J21`, `J23` |
| Listing/inventory | P0 | `J08`, `J27` |
| Vendor Orders/preparation/pickup | P0 | `J09`–`J12` |
| Messages/cases | P0/P1 | `J16`, `J17`, `J23` |
| Earnings/payout account/payout | P0 | `J20`, `J21` |
| Performance/enforcement/appeal | P0 | `J23` |
| Food operations | P1 gated | `J24` |
| External inbound | P1 gated | `J25` |
| FBN | P1 gated | `J26` |

### 22.3 Rider

| Page family | Priority | Journey coverage |
|---|---:|---|
| Onboarding/shift | P0 | `J22` |
| Assignment/job detail | P0 | `J12` |
| Pickup/custody | P0 | `J12` |
| Delivery/handoff/delegation | P0/P1 | `J13`, `J14` |
| Failed attempt/incident | P0 | `J15`, `J28`, `J29` |
| History/earnings | P2/P1 | `J20`, `J22` |

### 22.4 Operations and Admin

| Page family | Priority | Journey coverage |
|---|---:|---|
| Order/fulfilment workspace | P0 | `J05`, `J09`–`J18` |
| Dispatch board/job detail | P0 | `J12`–`J15`, `J22` |
| Support/Protection Case | P0 | `J17`, `J18`, `J28` |
| Catalogue/seller operations | P0 | `J07`, `J08`, `J23`, `J27` |
| Verification review | P0 | `J02`, `J07`, `J22`, `J30` |
| Finance/reconciliation/refund/payout | P0 | `J05`, `J06`, `J18`, `J20`, `J21` |
| Trust and Safety/enforcement/appeal | P0 | `J23`, `J27`, `J28`, `J30` |
| FBN/external inbound | P1 gated | `J25`, `J26` |
| Incident/recall/emergency pause | P0 | `J28`, `J29`, `J30` |
| Admin access/feature/config/audit | P0 | all protected journeys |

---

## 23. Journey-to-page traceability

| Journey | Required primary pages/workspaces |
|---|---|
| `J01` | Homepage, register/sign-in, account overview |
| `J02` | Covenant verification, Operations verification case |
| `J03` | Search/category, product detail, store page |
| `J04` | Cart, checkout review |
| `J05` | Checkout payment/status, Buyer order detail, Finance payment detail |
| `J06` | Checkout uncertain status, Buyer order/payment status, Finance reconciliation |
| `J07` | Seller onboarding, Operations seller workspace, Admin activation |
| `J08` | Seller listing/inventory, Catalogue moderation |
| `J09` | Seller Vendor Order, Buyer order detail, Operations order workspace |
| `J10` | Buyer order detail, Operations order workspace, refund detail |
| `J11` | Buyer cancellation, Seller order, Operations order, refund detail |
| `J12` | Dispatch board, Rider job/pickup, Seller fulfilment, Operations delivery detail |
| `J13` | Rider delivery, Buyer tracking, Operations delivery detail |
| `J14` | Buyer delegation, Rider delivery, Operations delivery detail |
| `J15` | Rider failed attempt, Buyer tracking, Operations delivery/incident |
| `J16` | Buyer/Seller messages, substitution action, order workspaces |
| `J17` | Buyer/Seller case, Support/Protection Case, return workspace |
| `J18` | Buyer refund, Seller earnings, Finance refund/reconciliation |
| `J19` | Buyer review creation, Product reviews, moderation queue |
| `J20` | Seller earnings/payout, Finance withdrawal/payout |
| `J21` | Seller payout account, Finance/security review |
| `J22` | Rider onboarding/shift, Operations rider/dispatch workspace |
| `J23` | Seller performance/case/appeal, Trust and Safety enforcement, Admin activation continuity |
| `J24` | Food discovery/outlet, Seller food operations, Operations order/dispatch |
| `J25` | Product/checkout promise, Seller external inbound, Operations external inbound |
| `J26` | Product fulfilment source, Seller FBN, Operations FBN |
| `J27` | Product condition/offer, Seller pre-owned listing, Catalogue/Trust review |
| `J28` | Buyer/Seller case, Operations incident/recall, Trust and Safety containment |
| `J29` | Operations incident, Admin emergency controls, system status/notice surfaces |
| `J30` | Account security/recovery, privileged session/access review, Security/Admin containment |

---

## 24. Prohibited information-architecture shortcuts

Codex, Design, and contributors must not:

1. Create one universal dashboard for all roles.
2. Put Support, Finance, Trust and Safety, and Super Admin actions behind one broad `Admin` menu.
3. Expose a route without server-side resource and capability checks.
4. Use the Buyer Parent Order page as the Seller's Vendor Order page.
5. Expose unrelated sellers or private Buyer information in multi-vendor orders.
6. Treat a browser payment callback as a success page without verification.
7. Display “Refunded” or “Paid” before provider-confirmed final state.
8. Allow a Rider to complete pickup/delivery from a generic status dropdown.
9. Hide failed handoff or uncertain custody inside notes.
10. Use free-form messages as cancellation, substitution, readiness, delivery, or refund authority.
11. Put direct WhatsApp, personal phone, or bank-transfer actions in transaction pages.
12. Display one generic “Verified” badge for affiliation, seller, payout, product inspection, and trust.
13. Create blank public pages for deferred Service, Rental, Digital, Event, wallet, ads, or nationwide features.
14. Expose future feature navigation merely because an enum or database table exists.
15. Replace queues with decorative metric cards.
16. Hide high-risk actions among ordinary actions or behind ambiguous labels.
17. Allow a staff page to edit immutable financial or custody truth.
18. Put sensitive identity evidence into general account, seller, or order pages.
19. Reveal internal risk/enforcement reasons to unauthorised users through errors or route names.
20. Build page-level logic that contradicts the state machine or permission contract.
21. Require a user to start a critical flow again after a recoverable network error.
22. Encourage duplicate payment/refund/payout action during uncertain provider state.
23. Use colour alone to represent status.
24. Remove timelines because they are visually dense.
25. Allow an expired affiliation or revoked role to retain surface access through stale navigation/session cache.

---

## 25. Rules for Codex and contributors

Before implementing a page or route, Codex must identify:

1. governing MVP requirement in `docs/01-mvp-scope.md`;
2. actor/capability/scope in `docs/02-user-roles.md`;
3. journey and exception path in `docs/03-user-journeys.md`;
4. page family and route responsibility in this document;
5. feature activation state;
6. authoritative source for each displayed status;
7. fields the actor may read/write;
8. loading, empty, error, stale, and unavailable states;
9. analytics/audit events; and
10. responsive/accessibility behaviour.

A page implementation report must state:

- routes added or changed;
- actors and scopes supported;
- journeys covered;
- fields deliberately hidden;
- progressive/deferred features deliberately absent;
- error/empty/loading states implemented;
- authorisation tests;
- accessibility checks; and
- screenshots or other evidence where requested.

Codex must not infer a missing page policy from a competitor or generic dashboard template. Ambiguity must be reported and resolved against the Build Pack hierarchy.

---

## 26. Definition of done for information architecture

The information-architecture foundation is complete for a page family only when:

- the route is assigned to the correct surface;
- navigation entry is correct for desktop/mobile/device context;
- actor, capability, scope, feature, and state rules are defined;
- page purpose and authoritative object are clear;
- primary action and next responsibility are clear;
- required content hierarchy is implemented;
- related objects are linked without overexposure;
- loading, empty, error, stale, processing, and unavailable states exist;
- deep links survive safe authentication and return;
- route identifiers do not leak sensitive data;
- direct API access is protected independently of UI;
- responsive behaviour preserves critical information;
- keyboard/screen-reader structure is valid;
- analytics and audit events are defined;
- P0 journey happy and exception paths are testable; and
- no deferred feature is exposed.

The Covenant pilot information architecture is not complete until a user or operator can complete the relevant journey from entry to honest outcome without relying on WhatsApp, spreadsheets as the sole system, hidden developer tools, or undocumented staff intervention.

---

## 27. Minimum IA validation scenarios

Design, Engineering, and QA must validate at least:

1. Guest discovers a product, adds to cart, and reaches Covenant verification gate without forced early registration.
2. Verified Buyer searches, compares offers, and sees a truthful delivery promise.
3. One stale offer is removed from a multi-vendor cart without losing unaffected items.
4. Payment outcome remains “verifying” until backend/provider confirmation.
5. One Vendor Order fails while the Buyer Parent Order preserves unaffected progress.
6. Buyer sees item-level cancellation and refund status separately.
7. Seller sees only its Vendor Order and approved handoff information.
8. Seller listing form changes fields by category/condition without exposing future commerce types.
9. Rider cannot see or act on an unassigned Delivery Job.
10. Rider failed attempt routes to controlled custody rather than “Delivered.”
11. Support sees case information but cannot perform a Finance-only refund approval.
12. Finance sees provider and ledger evidence but cannot edit payment truth.
13. Trust and Safety can apply a targeted safeguard without receiving unrelated platform authority.
14. Admin can pause checkout while ordinary Operations cannot silently restart it.
15. Revoked role disappears from navigation and fails on direct route/API access.
16. Food routes remain absent until feature activation.
17. FBN pages remain inaccessible until physical-site gate and capability pass.
18. Pre-owned product page shows actual-unit condition evidence and no false Noma Verified claim.
19. Refund page shows approved, submitted, processing, and completed as different states.
20. Payout page shows initiation as processing and provider-confirmed success as paid.
21. An uncertain payment/refund/payout prevents unsafe duplicate action.
22. Search zero-result state provides truthful recovery.
23. Sensitive record deep link does not confirm existence to an unauthorised actor.
24. Rider PWA shows cached versus confirmed state under weak connectivity.
25. Keyboard and screen-reader user can navigate critical Marketplace, checkout, Seller, Rider, case, and Admin flows.

---

## 28. Required design artefacts derived from this document

Before major frontend construction, Product/Design should produce and approve:

- global surface map;
- Marketplace desktop/mobile navigation;
- Buyer Account navigation;
- Seller Centre navigation;
- Rider PWA navigation and offline-state map;
- Operations workspace navigation;
- Admin navigation;
- homepage/category/search wireframes;
- product/offer comparison wireframe;
- cart and checkout flow;
- Buyer order/tracking/case flow;
- Seller listing/order/preparation flow;
- Rider pickup/delivery/failed-attempt flow;
- Operations order/dispatch/case/Finance workspaces;
- common detail-page anatomy;
- common queue/table anatomy;
- status/timeline patterns;
- empty/loading/error/unavailable patterns; and
- responsive/accessibility annotations.

These artefacts must reference route/page IDs from this document and journey IDs from `docs/03-user-journeys.md`.

---

## 29. Traceability to locked scope decisions

This information architecture implements the locked scope by:

1. exposing Product commerce and gating Food;
2. preserving invite-only External Vendor inbound workspaces;
3. preserving one-location FBN pages behind physical activation;
4. supporting structured Pre-Owned condition content without false verification;
5. excluding Service, Rental, Digital, and Event navigation;
6. presenting one Buyer Parent Order while preserving Seller/Operations substructures;
7. separating payment, earnings, refunds, withdrawals, and payouts into distinct pages;
8. providing Noma-controlled Dispatch and Rider custody surfaces;
9. separating Covenant verification from account, seller, payout, and trust pages;
10. preserving distinct Marketplace, Seller, Rider, Operations, and Admin surfaces;
11. keeping messaging in context and separate from formal actions;
12. providing structured Protection Case, remedy, enforcement, and appeal pages;
13. prioritising relevance-first search and controlled merchandising;
14. exposing security, audit, monitoring, recovery, and emergency-control responsibilities to the correct staff; and
15. keeping pilot activation, capacity, pause, rollback, and expansion visible and auditable.

---

## 30. Final information-architecture declaration

Noma's Covenant pilot will use one responsive web platform with distinct, capability-scoped Marketplace, Buyer Account, Seller Centre, Rider PWA, Operations, and Restricted Administration surfaces.

The Marketplace will prioritise search, categories, canonical products, seller offers, availability, condition, delivery promise, cart, and one multi-vendor checkout. Buyer Account will make order, delivery, cancellation, case, return, refund, review, verification, and security status understandable without exposing internal data.

Seller Centre will organise onboarding, offers, inventory, Vendor Orders, fulfilment, cases, earnings, payouts, performance, and settings around the active seller scope. Rider PWA will prioritise shift, assignment, pickup, custody, authenticated handoff, failed attempt, incident, and connectivity truth. Operations will use actionable queues and authoritative workspaces for orders, fulfilment, dispatch, Support, protection, catalogue, sellers, Finance, Trust and Safety, FBN, inbound, incidents, and recalls. Restricted Administration will control institutions, features, access, policies, configuration, audit, and emergency pause/restart.

Every critical page will show truthful status, next responsibility, deadline/promise, money or custody consequence, permitted action, evidence, timeline, and safe recovery. Progressive capabilities will remain hidden or cohort-gated until approved. Deferred commerce and automation will not appear as live product. Navigation will never substitute for server-side authorisation, and attractive presentation will never conceal unresolved financial, custody, protection, or security obligations.
