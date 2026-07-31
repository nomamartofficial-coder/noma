# Noma Users, Roles, Capabilities, and Permission Boundaries

> **Repository path:** `docs/02-user-roles.md`  
> **Status:** Binding Covenant pilot authorization contract  
> **Version:** 1.0  
> **Effective date:** 30 July 2026  
> **Applies to:** Noma's two-month Covenant University pilot build  
> **Primary audience:** Founders, Product, Design, Engineering, Codex, Operations, Support, Finance, Trust and Safety, Security, and future contributors

---

## 1. Purpose

This document defines the human and machine actors that may interact with Noma, the authority each actor may receive, the resources that authority applies to, and the actions that must remain prohibited or independently approved.

It is the binding authorization contract for the Covenant pilot. It must be used to design:

- authentication and session controls;
- role and capability models;
- seller, rider, partner, staff, and administrator memberships;
- API guards and policy checks;
- route and surface access;
- field-level data visibility;
- approval workflows;
- audit events;
- permission tests; and
- production access reviews.

The objective is to prevent Codex or any contributor from implementing authorization as a single broad role check such as:

```ts
if (user.role === "ADMIN") {
  allowEverything();
}
```

Noma must instead answer all of the following before permitting a protected action:

1. **Who is acting?**
2. **Which capability has been granted?**
3. **For which institution, seller, order, case, delivery, or other resource?**
4. **Does the actor own or have authority over that resource?**
5. **Is the resource in a state where the action is valid?**
6. **Does the action require stronger authentication or a second approver?**
7. **Is the relevant product, institution, seller, or feature currently active?**

---

## 2. Authority and relationship to other Build Pack documents

The following hierarchy applies:

1. `docs/01-mvp-scope.md` controls what is built, active, progressive, manual, prohibited, or deferred.
2. This document controls the Covenant pilot's user, role, capability, and permission boundaries.
3. Later journey, architecture, domain-model, state-machine, integration, security, testing, backlog, and readiness documents may add implementation detail but must not silently broaden authority defined here.
4. The Noma Product Decisions Blueprint remains the source of long-term product intent.
5. A UI design, database enum, API route, Codex prompt, issue, pull request, or implementation convenience must not override this document.

This document derives from:

- `docs/01-mvp-scope.md`;
- `NOMA PRODUCT DECISIONS-BLUE PRINT.docx`;
- `NOMA BUILD PACK.docx`;
- `NOMA BUILD PACK SCOPE DECISIONS PART 1.docx`;
- `THE ACTUAL FIRST STEP- NOMA IMPLEMENTATION PACK.docx`; and
- `NOMA TWO-MONTH CONSTRUCTION PLAN.docx`.

Where the source material describes a future role or workflow but `docs/01-mvp-scope.md` defers activation, this document may preserve the boundary without activating the full workflow.

---

## 3. Normative language

- **MUST / MUST NOT:** mandatory for the applicable pilot stage.
- **SHOULD / SHOULD NOT:** expected unless an approved, documented reason exists.
- **MAY:** optional within the locked scope.
- **ROLE TEMPLATE:** a named bundle of capabilities that may be assigned under a defined scope.
- **CAPABILITY:** permission to perform a specific class of action.
- **SCOPE:** the institution, seller, order, case, delivery, queue, or platform boundary within which a capability is valid.
- **CONDITION:** a business-state, verification, feature, risk, or authentication requirement that must also pass.
- **SYSTEM-ONLY:** an action no human role may perform directly.
- **PRIVILEGED ROLE:** a role that can access non-public records, affect another person's rights, move or restrict money, alter platform configuration, or impose enforcement.
- **SEPARATION OF DUTIES:** a rule requiring different actors or capabilities to prepare, approve, or execute a sensitive action.

Illustrative capability and entity names express required responsibility. Exact code names will be finalised in the technical architecture and domain model.

---

## 4. Core authorization principles

### 4.1 One human identity, multiple memberships

A person must have one underlying Noma user account. The same account may hold several independently approved memberships or capabilities.

Example:

```text
User: Victor
├── Noma account: ACTIVE
├── Covenant membership: VERIFIED_STUDENT
├── Buyer capability: ELIGIBLE
├── Seller membership: OWNER of Seller S-104
├── Rider membership: NOMA_FLEX_RIDER at Covenant
├── Payout verification: VERIFIED for Seller S-104
├── Seller trust status: NOT_YET_EARNED
└── Staff/admin authority: NONE
```

Noma must not require separate buyer, seller, and rider accounts for the same person.

### 4.2 Roles are not identity or trust claims

The following are **not interchangeable**:

- Noma account status;
- email or phone verification;
- Covenant affiliation;
- student or staff affiliation;
- buyer eligibility;
- seller approval;
- seller activation;
- payout-account verification;
- rider approval;
- seller standing or trust;
- staff authority; and
- administrator authority.

For example:

```text
Covenant Student Verified
≠ Seller Approved
≠ Seller Activated
≠ Payout Verified
≠ Trusted Seller
≠ Noma Staff
```

### 4.3 Seller type is an entity classification, not a global user role

Noma supports these seller types:

- `CAMPUS_STORE`
- `STUDENT_VENDOR`
- `EXTERNAL_VENDOR`

A human acts for a seller through a scoped `SellerMembership`. The seller type determines onboarding and operational rules; it does not grant a person platform-wide access.

### 4.4 Staff role names are capability bundles, not universal authority

`SUPPORT`, `OPERATIONS`, `FINANCE`, `TRUST_AND_SAFETY`, `ADMIN`, and `SUPER_ADMIN` must not be implemented as unrestricted shortcuts.

A role assignment must identify:

- granted capability bundle;
- institution scope;
- seller/resource scope where applicable;
- activation and expiry;
- granting actor;
- reason; and
- required assurance level.

### 4.5 Deny by default

Any protected action not explicitly permitted by capability, scope, condition, and current state must be denied.

### 4.6 Server-side enforcement is authoritative

Hiding a page, menu item, field, or button is not authorization. Every protected API, background action, file access, export, and state transition must enforce the same policy server-side.

### 4.7 Least privilege and minimum data exposure

Actors receive only the actions and fields required to perform their current responsibility. Assignment to a case, seller, delivery, or institution must not expose unrelated records.

### 4.8 Business state is part of authorization

Possessing a capability does not make every transition valid.

Examples:

- a seller may mark an order ready only after the required preparation state;
- a rider may confirm pickup only for a current assignment and valid parcel credential;
- Support may approve only a configured low-risk remedy;
- Finance may submit a provider refund only after an approved refund decision;
- an administrator may activate food only after the required activation gate passes.

### 4.9 Provider truth and immutable records cannot be overridden by role

No human role, including Super Administrator, may directly:

- mark an unverified customer payment as successful;
- mark a refund completed before provider-confirmed completion;
- mark a payout paid before provider-confirmed success;
- edit or delete historical financial-ledger entries;
- edit or delete privileged audit events; or
- bypass custody proof by changing a delivery status field.

Corrections must use explicit reversal, adjustment, reconciliation, exception, or authorised override workflows.

---

## 5. Conceptual authorization model

The authorization decision is conceptually:

```text
ALLOW =
  authenticated actor
  + active account
  + required capability
  + valid role assignment
  + matching institution scope
  + matching resource scope
  + valid resource ownership/assignment
  + valid business state
  + active feature/policy
  + required authentication assurance
  + required approval(s)
  - active suspension/restriction
```

The authorization foundation must be capable of representing:

```text
User
AccountStatus
InstitutionMembership
Seller
SellerMembership
RiderProfile
RiderMembership
PartnerMembership
StaffMembership
RoleTemplate
Capability
RoleCapability
RoleAssignment
ApprovalRequest
TemporaryAccessGrant
ServicePrincipal
AuditEvent
```

This is a responsibility map, not the final database schema. `docs/07-domain-model.md` will define persistence details.

---

## 6. Actor taxonomy

### 6.1 Guest

A Guest is an unauthenticated visitor.

A Guest may:

- browse public products, categories, offers, sellers, policies, and fulfilment promises;
- search and filter public catalogue content;
- create and manage a temporary cart; and
- proceed far enough into checkout to understand eligibility, price, and delivery requirements.

A Guest must not:

- complete protected Covenant checkout;
- view private account, order, seller, rider, case, payment, or operational records;
- message sellers;
- submit reviews, disputes, returns, seller applications, or rider applications; or
- access non-public files.

### 6.2 Noma Account Holder

A Noma Account Holder is an authenticated person with an active general account.

They may manage their own:

- profile;
- security settings and sessions;
- verification applications;
- saved preferences;
- notifications;
- cart;
- eligible orders and cases; and
- role or membership applications.

A normal account alone does not grant Covenant checkout, seller, rider, partner, staff, or admin authority.

### 6.3 Institution-Verified User

An Institution-Verified User has a verified membership linked to an institution.

For the founding pilot, supported affiliation types are:

- `STUDENT`
- `STAFF`

A verified Covenant membership may unlock:

- Covenant-specific checkout and delivery;
- institution-only offers;
- approved campus handoff points;
- student-vendor application eligibility for verified students; and
- institution-specific account experiences.

Covenant Staff affiliation does not automatically make a person Noma staff or an administrator.

### 6.4 Buyer

Buyer is an account capability set, not an exclusive identity.

A Covenant pilot buyer must have:

- an active Noma account;
- the required Covenant affiliation for campus checkout;
- no active restriction blocking purchase; and
- eligibility for the product, value, location, and pilot cohort.

The buyer acts only on their own cart, Parent Orders, item allocations, handoffs, messages, cases, and verified reviews.

### 6.5 Seller applicant

A Seller Applicant may submit or complete an eligible seller application. Application access does not grant selling authority.

The applicant may:

- provide the required identity, organisation, category, agreement, and payout information;
- respond to information requests;
- view their application status; and
- appeal or reapply where policy permits.

They must not publish offers, receive Vendor Orders, view seller earnings, or request withdrawals until the seller is approved and activated.

### 6.6 Seller entity and seller representative

A Seller is a marketplace entity. A human accesses it through a Seller Membership.

The Covenant pilot must support at least:

- `SELLER_OWNER`
- `SELLER_OPERATOR`

`SELLER_OWNER` is the accountable representative for the seller and may manage sensitive seller settings, subject to verification and reauthentication.

`SELLER_OPERATOR` may manage day-to-day catalogue and order work but must not automatically receive payout-account, withdrawal, membership, or ownership-transfer authority.

More granular seller-team roles may be architected and activated progressively:

- `SELLER_CATALOGUE_MANAGER`
- `SELLER_ORDER_MANAGER`
- `SELLER_FINANCE_VIEWER`
- `SELLER_STAFF_ADMIN`

The pilot may begin with a small number of approved representatives per seller, but authorization must not assume every seller user is the owner.

### 6.7 Rider

A Rider is an approved person assigned to delivery work through a scoped rider membership.

Rider categories may include:

- `NOMA_CORE_RIDER`
- `NOMA_FLEX_RIDER`
- `CU_EXPRESS_RIDER`

Rider authority is limited by:

- institution;
- carrier;
- shift/availability;
- eligibility;
- current Delivery Job assignment;
- custody state; and
- device/session assurance where required.

### 6.8 CU Express Dispatcher

A CU Express Dispatcher is an approved partner user who coordinates CU Express capacity for Noma Delivery Jobs.

The dispatcher may, within the Covenant and CU Express scope:

- view jobs offered or assigned to CU Express;
- assign or recommend eligible CU Express riders;
- update permitted partner operational states;
- report partner capacity and incidents; and
- communicate with Noma Operations.

The dispatcher must not:

- view unrelated Noma Fleet jobs;
- change customer payment, refund, seller earning, or payout records;
- modify seller catalogue data;
- expose buyer private data beyond delivery necessity; or
- mark a handoff complete without the required proof.

### 6.9 Noma staff

Noma staff authority is granted through separate, privileged, scoped assignments. The Covenant pilot recognises these functional groups:

- Support;
- Operations;
- Dispatch Operations;
- FBN/Fulfilment Operations where activated;
- Catalogue Operations;
- Finance;
- Trust and Safety;
- Institution Administration;
- Platform Administration;
- Security/Access Administration; and
- Super Administration.

A person may hold more than one staff role only where the combination is explicitly allowed and separation-of-duty rules still pass.

### 6.10 Auditor or read-only reviewer

An Auditor role may be granted for approved internal review, financial review, security review, pilot readiness, or lawful oversight.

Auditor access must be:

- read-only;
- purpose-limited;
- scope-limited;
- time-bound where possible;
- masked where full fields are unnecessary; and
- fully audited.

An Auditor must not use read access to perform operational actions.

### 6.11 Service principal

A Service Principal is a non-human actor used by Noma-controlled services, workers, scheduled jobs, or verified provider integrations.

Examples include:

- API worker;
- payment webhook processor;
- notification worker;
- inventory reservation job;
- search indexer;
- reconciliation job; and
- approved provider webhook principal.

Service principals must receive narrowly scoped credentials and capabilities. They must not reuse human administrator sessions or credentials.

---

## 7. Statuses and classifications that must not be implemented as roles

The following must remain explicit statuses, classifications, or evidence states rather than broad authorization roles:

| Concept | What it means | What it must not imply |
|---|---|---|
| `ACCOUNT_ACTIVE` | General account may authenticate | Covenant, seller, rider, or staff authority |
| `EMAIL_VERIFIED` | Control of email was verified | Active Covenant affiliation |
| `PHONE_VERIFIED` | Phone ownership/contact was verified | Identity proof or seller trust |
| `COVENANT_STUDENT_VERIFIED` | Approved student affiliation | Seller approval or Noma staff access |
| `COVENANT_STAFF_VERIFIED` | Approved institutional staff affiliation | Noma Operations/Admin authority |
| `SELLER_APPROVED` | Seller application passed review | Seller is live at Covenant |
| `SELLER_ACTIVATED` | Seller may operate in specified institution/categories | Payout eligibility for every order |
| `PAYOUT_VERIFIED` | Seller payout account passed required checks | Seller trust or withdrawal approval |
| `TRUSTED_SELLER` | Public/internal standing earned under approved policy | Immunity from enforcement or unrestricted limits |
| `RIDER_APPROVED` | Rider passed onboarding | Assignment to any job at any time |
| `FBN_ENROLLED` | Specific SKU may use FBN | Seller-wide warehouse authority |
| `NOMA_VERIFIED_PRE_OWNED` | Exact unit passed approved inspection | Seller self-certification or permanent condition guarantee |

---

## 8. Scope model

Every protected capability must be evaluated against one or more scopes.

### 8.1 Supported scope types

- **SELF:** the actor's own account, application, cart, order, case, or settings.
- **SELLER:** one specific seller entity.
- **INSTITUTION:** one institution, initially Covenant University.
- **ORDER:** one Parent Order or Vendor Order.
- **CASE:** one Protection, policy, support, warranty, or appeal case.
- **ASSIGNMENT:** one Delivery Job or rider assignment.
- **FULFILMENT_LOCATION:** one approved FBN, inbound, pickup, or custody location.
- **QUEUE:** a configured operational work queue.
- **CARRIER:** one carrier or partner organisation.
- **PLATFORM:** Noma-wide authority; reserved for a very small number of capabilities.

### 8.2 Resource-scope examples

```text
SELLER_ORDER_VIEW
Scope: Seller S-104
Result: may view only Vendor Orders owned by S-104
```

```text
DELIVERY_PICKUP_CONFIRM
Scope: Assignment A-887
Condition: actor is current rider; parcel is ready; credential is valid
```

```text
CASE_REVIEW
Scope: Protection Case C-901
Condition: case is assigned to actor's queue and actor has required case type
```

```text
REFUND_APPROVE
Scope: Institution COVENANT + configured financial limit
Condition: refund decision exists; actor did not prepare prohibited same-person approval
```

### 8.3 Institution isolation

The architecture must be institution-aware from the beginning even though only Covenant is active.

A Covenant-scoped actor must not receive another institution's records merely because a future institution exists in the database.

---

## 9. Authentication assurance levels

Authorization must be combined with authentication assurance.

### 9.1 Standard authenticated session

Suitable for normal account and low-risk buyer actions.

### 9.2 Verified-contact session

Requires the relevant verified email or contact state for actions such as Covenant membership confirmation or account recovery.

### 9.3 Recent authentication

Required before sensitive self-service actions such as:

- changing password or recovery settings;
- adding or changing a seller payout account;
- changing seller ownership-sensitive settings;
- requesting a withdrawal where configured; and
- viewing or downloading highly sensitive personal records.

### 9.4 Privileged MFA session

Required for privileged staff roles before production access.

Also required for high-risk actions such as:

- approving material refunds;
- approving payout batches;
- preparing or approving manual ledger adjustments;
- assigning privileged roles;
- activating real payments or major commerce features;
- changing institution verification rules;
- exporting sensitive records;
- permanent seller removal;
- emergency platform controls; and
- use of break-glass access.

### 9.5 Reauthentication must not be replaced by UI confirmation

A modal asking “Are you sure?” is not reauthentication.

---

## 10. Capability design

### 10.1 Capability naming

Capabilities should follow a stable domain-resource-action convention, for example:

```text
account.profile.read.self
seller.offer.edit
order.vendor.prepare
fulfilment.dispatch.assign
finance.refund.approve
trust.seller.suspend.temporary
admin.role.assign
```

The exact separator is an implementation detail. The important requirement is that capabilities are specific and reviewable.

### 10.2 Roles are bundles; capabilities are authoritative

Code should not be spread across checks such as:

```ts
user.role === "OPERATIONS"
```

Instead, a role template grants a reviewed capability bundle, while the authorization layer evaluates the specific capability and scope.

### 10.3 System-only capabilities

The following classes of actions must be system-only or provider-event-driven:

- verify and finalise a provider payment event;
- create inventory reservations atomically;
- post automatic financial-ledger entries;
- mark provider refund completion;
- mark provider transfer success, failure, or reversal;
- consume one-time pickup or handoff credentials;
- create immutable checkout snapshots; and
- finalise idempotent webhook processing.

Human users may initiate, approve, reconcile, retry where safe, or resolve exceptions. They must not fabricate the final provider or custody result.

---

## 11. Core capability catalogue

This section defines the minimum capability families. Later domain documents may split them more finely but must not merge protected actions into broader authority.

### 11.1 Account and identity

- manage own profile;
- manage own password, MFA, sessions, and recovery;
- submit own Covenant verification;
- upload requested identity evidence;
- view own verification status;
- review institution verification cases;
- request additional evidence;
- approve, reject, revoke, or require revalidation of affiliation;
- view sensitive identity evidence; and
- export identity evidence under exceptional authorised procedure.

Viewing identity evidence must be separate from deciding a normal support case.

### 11.2 Buyer commerce

- browse public catalogue;
- manage own cart;
- create own checkout;
- initiate own payment session;
- view own Parent Order and item progress;
- cancel eligible own items/orders;
- approve or reject substitution;
- nominate an eligible delegate;
- complete own handoff credential flow;
- create own Protection Case;
- upload case evidence;
- message authorised order participants; and
- create or edit an eligible verified-purchase review.

### 11.3 Seller onboarding and membership

- submit seller application;
- view own application;
- request seller information;
- review seller application;
- approve or reject seller application;
- activate or deactivate seller at an institution;
- grant seller representative membership;
- revoke seller representative membership; and
- manage seller ownership-sensitive settings.

Seller application approval and seller activation must remain separate capabilities.

### 11.4 Catalogue and inventory

- create or propose canonical product;
- review/merge canonical product;
- create and edit seller offer;
- submit offer for publication;
- publish/activate eligible offer;
- pause own offer;
- moderate or restrict offer;
- manage own seller inventory;
- reconfirm inventory after out-of-stock cancellation;
- view FBN inventory;
- receive, put away, adjust, quarantine, count, pick, and pack Noma-held stock; and
- approve exceptional inventory adjustment.

A seller must not edit another seller's offer or inventory.

### 11.5 Vendor Orders and fulfilment

- view seller-scoped Vendor Order;
- accept or reject where the commerce type requires it;
- prepare order;
- mark ready;
- record seller cancellation reason;
- confirm seller-to-rider handoff;
- view Parent Order operationally;
- create or modify authorised Fulfilment Groups;
- perform operational cancellation/intervention;
- create replacement or corrective fulfilment; and
- return parcel to controlled custody.

### 11.6 Delivery and dispatch

- manage own rider availability;
- view eligible assignments;
- accept permitted assignment;
- assign or reassign Delivery Job;
- batch compatible jobs;
- view assigned job details;
- confirm pickup;
- confirm handoff;
- record failed attempt;
- report incident;
- approve exceptional custody transfer; and
- pause a carrier, rider, location, or delivery tier within scope.

### 11.7 Messaging and evidence

- send product question;
- send order-scoped message;
- use structured substitution action;
- report message;
- review reported message;
- apply temporary messaging restriction;
- request case evidence;
- view case evidence;
- download/export case evidence under approved reason; and
- preserve or restrict evidence in a serious case.

### 11.8 Protection, refunds, and remedies

- create case;
- triage case;
- assign case;
- request evidence;
- apply configured low-risk remedy;
- recommend refund;
- approve refund;
- submit provider refund;
- reconcile provider refund;
- create replacement/redelivery;
- place targeted order-specific hold;
- release targeted hold;
- decide ordinary case;
- decide serious/high-value case; and
- decide appeal.

Refund decision, provider refund submission, and provider-confirmed completion are different capabilities/events.

### 11.9 Seller earnings and payouts

- view own seller earnings;
- manage own payout account;
- request withdrawal;
- review withdrawal;
- create payout batch;
- approve payout batch;
- initiate transfer;
- reconcile transfer;
- retry a conclusively failed transfer;
- prepare manual ledger adjustment;
- approve manual ledger adjustment;
- place or release approved financial hold; and
- export approved financial records.

No human capability may directly mark a payout `PAID` without provider-confirmed success.

### 11.10 Trust, safety, and enforcement

- review prohibited product;
- investigate identity misuse, counterfeit, stolen goods, fraud, harassment, threats, or bypass;
- preserve evidence;
- place proportionate temporary safeguard;
- restrict listing/category/messaging/order capacity;
- temporarily suspend seller or account;
- recommend permanent removal;
- approve permanent removal;
- review appeal;
- restore privileges following successful appeal; and
- correct connected performance or financial consequences through approved reversal workflows.

### 11.11 Administration and emergency controls

- configure institution;
- configure approved domains and identifier rules;
- configure locations and operating windows;
- configure categories and product policy;
- manage feature activation;
- assign role/capability bundles;
- revoke sessions and privileged access;
- manage emergency pause controls;
- view privileged audit events;
- export audit evidence; and
- approve controlled pilot activation or expansion.

Feature configuration must not bypass the launch gates in `docs/01-mvp-scope.md`.

---

## 12. Role templates and Covenant pilot status

Role templates are defaults. A role assignment remains subject to scope, condition, assurance, and restrictions.

### 12.1 Public and customer roles

| Role/template | Pilot status | Primary scope | Core authority |
|---|---:|---|---|
| Guest | Active | Public | Browse, search, temporary cart |
| Account Holder | Active | Self | Own profile, security, verification applications |
| Covenant Verified Student | Active | Self + Covenant | Campus eligibility; student-vendor application eligibility |
| Covenant Verified Staff | Active | Self + Covenant | Campus eligibility; no Noma staff authority |
| Buyer | Active when eligible | Self | Own checkout, orders, handoff, cases, reviews |
| External Customer | Account foundation only | Self | General account; external commerce remains inactive for pilot |

### 12.2 Seller roles

| Role/template | Pilot status | Primary scope | Core authority |
|---|---:|---|---|
| Seller Applicant | Active | Own application | Submit and respond to onboarding |
| Seller Owner | Active | One seller | Full seller operations plus sensitive seller settings subject to controls |
| Seller Operator | Active | One seller | Catalogue, inventory, orders, cases; no default payout-account or membership authority |
| Seller Catalogue Manager | Progressive | One seller | Offers, images, attributes, inventory |
| Seller Order Manager | Progressive | One seller | Vendor Orders, preparation, handoff, case responses |
| Seller Finance Viewer | Progressive | One seller | Read earnings and payouts; no initiation/approval unless separately granted |
| Seller Staff Admin | Progressive | One seller | Manage seller-team memberships within allowed roles; cannot transfer ownership or grant platform roles |

Campus Store Representative, Student Vendor, and External Vendor Representative are represented by seller membership plus the seller entity's type and verification status.

### 12.3 Rider and partner roles

| Role/template | Pilot status | Primary scope | Core authority |
|---|---:|---|---|
| Noma Core Rider | Active after approval | Covenant + assigned jobs | Shift, pickup, custody, handoff, failed attempt, incident |
| Noma Flex Rider | Progressive/controlled | Covenant + assigned jobs | Same job actions under Flex capacity rules |
| CU Express Rider | Active through partner process | CU Express + assigned jobs | Assignment-scoped pickup and handoff |
| CU Express Dispatcher | Active when partner workflow is enabled | CU Express jobs at Covenant | Partner capacity and rider assignment; no financial/order-policy authority |

### 12.4 Noma operational roles

| Role/template | Pilot status | Primary scope | Core authority |
|---|---:|---|---|
| Support Agent | Active | Assigned/support queues at Covenant | Cases, evidence requests, communication, configured low-risk remedies |
| Support Lead | Active where needed | Covenant support queues | Escalations, quality review, higher configured support limit; no payout authority |
| Operations Agent | Active | Covenant operational resources | Parent Orders, fulfilments, exceptions, returns, custody |
| Dispatch Operator | Active | Covenant delivery network | Assignment, batching, reassignment, carrier/rider/location controls |
| FBN Operator | Feature-gated | Approved FBN location | Receive, store, pick, pack, quarantine, count |
| FBN Supervisor | Feature-gated | Approved FBN location | Approve exceptional inventory/custody adjustments within policy |
| Catalogue Operator | Active/limited | Covenant catalogue queue | Canonical products, offer moderation, category data; no seller finance authority |
| Institution Verification Reviewer | Active | Covenant verification queue | Review affiliation evidence and conflicts |

### 12.5 Finance roles

| Role/template | Pilot status | Primary scope | Core authority |
|---|---:|---|---|
| Finance Analyst | Active | Covenant financial operations | Reconciliation, exception preparation, refund/payout preparation |
| Finance Approver | Active | Covenant financial operations | Approve configured refunds, payout batches, and financial adjustments |
| Finance Administrator | Highly restricted | Defined financial configuration | Provider recipient/transfer administration and exceptional reconciliation; no self-approval |

Where the team is small, one person may hold Analyst and Approver role templates only for actions that do not require maker-checker separation. Sensitive actions must still enforce separate approval.

### 12.6 Trust and Safety roles

| Role/template | Pilot status | Primary scope | Core authority |
|---|---:|---|---|
| Trust and Safety Analyst | Active | Assigned policy/safety cases | Investigate, preserve evidence, apply temporary safeguards, recommend enforcement |
| Trust and Safety Lead | Active where needed | Covenant serious cases | Approve serious enforcement and appeals within policy |

Permanent removal, severe financial consequence, or exceptional identity action may require additional senior approval under the separation-of-duty rules.

### 12.7 Administrative roles

| Role/template | Pilot status | Primary scope | Core authority |
|---|---:|---|---|
| Institution Administrator | Active/limited | Covenant | Institution configuration, locations, affiliation rules, scoped activation controls |
| Access Administrator | Active/highly restricted | Defined staff scopes | Grant/revoke approved staff roles; cannot approve own access |
| Platform Administrator | Highly restricted | Platform configuration | Cross-domain configuration and incident containment; no automatic financial truth override |
| Security Administrator | Highly restricted | Security/access controls | Privileged session revocation, access containment, security configuration |
| Super Administrator | Exceptional only | Platform | Emergency or rare platform-level administration under MFA, recent auth, audit, and review |
| Auditor | As required | Approved read scope | Read-only review and approved export |

`SUPER_ADMIN` is not a universal bypass. The role remains subject to immutable records, provider truth, state-machine integrity, separation of duties, and audit.

---

## 13. Action authority matrix

Legend:

- **Own:** actor's own account/order/seller/resource only.
- **Assigned:** current assignment or case only.
- **Scoped:** capability applies only to granted institution/seller/queue/limit.
- **Recommend:** may prepare or recommend but not finalise.
- **Limited:** only configured low-risk or threshold-bounded action.
- **System:** only trusted system/provider workflow finalises the action.
- **No:** prohibited by default.

| Actor | View | Create/Edit | Approve | Cancel | Refund | Dispatch | Hold/Release | Suspend | Export |
|---|---|---|---|---|---|---|---|---|---|
| Guest | Public | Temporary cart | No | No | No | No | No | No | No |
| Buyer | Own | Own | Own substitution/delegate choices | Own eligible | Request/receive status | No | No | No | No bulk export |
| Seller Owner | Seller-scoped | Seller-scoped | Seller settings/actions | Vendor Order within state | Respond/recommend | No | No arbitrary hold | No platform suspension | Own approved reports only |
| Seller Operator | Seller-scoped | Operational seller data | Operational actions only | Vendor Order within state | Respond/recommend | No | No | No | No by default |
| Rider | Assigned | Assignment evidence | Pickup/handoff proof | No order cancellation | No | Assigned job action only | Custody only | No | No |
| CU Express Dispatcher | Carrier-scoped | Partner assignment data | CU rider assignment within scope | No | No | Carrier-scoped | No financial hold | Partner rider availability only | Limited operational report |
| Support Agent | Case/order scoped | Cases/messages | Limited low-risk remedy | Limited policy action | Recommend or limited configured | No | Request hold | No permanent action | No by default |
| Operations Agent | Covenant operational | Orders/fulfilments/returns | Operational intervention | Scoped operational | Recommend | Scoped | Custody/operational hold only | Pause scoped operations | Limited operational report |
| Dispatch Operator | Delivery scoped | Assignments/batches | Dispatch actions | Delivery job only | No | Scoped | Custody controls | Pause rider/carrier/location within scope | Limited operational report |
| Finance Analyst | Financial scoped | Prepare reconciliation/actions | Recommend | No commerce cancellation | Prepare/reconcile | No | Prepare financial hold/release | No | Scoped finance export |
| Finance Approver | Financial scoped | Approved finance actions | Scoped/threshold | No commerce cancellation | Approve/submit | No | Approve financial hold/release | No | Scoped finance export |
| Trust and Safety Analyst | Case scoped | Policy cases/evidence | Temporary safeguards | Recommend case action | Recommend | No | Request/apply approved targeted safeguard | Temporary scoped | Case export with reason |
| Trust and Safety Lead | Serious-case scoped | Enforcement/appeals | Serious enforcement | Scoped case action | Recommend financial consequence | No | Approve policy hold request | Scoped permanent action where authorised | Approved case export |
| Institution Admin | Covenant config | Institution config | Scoped activation/config | No customer order cancellation by default | No | No | No | Scoped feature/seller activation only | Approved config report |
| Access Admin | Staff access scope | Role assignments | Grant/revoke allowed roles | No | No | No | No | Revoke access | Access report |
| Platform Admin | Platform config | Config/containment | Restricted | Emergency platform controls | No direct financial completion | No routine dispatch | No arbitrary financial hold | Scoped containment | Approved audit/config export |
| Super Admin | Exceptional | Exceptional | Restricted + reviewed | Emergency only | No provider-truth override | No routine dispatch | No immutable-record override | Exceptional + reviewed | Approved and audited |
| Service Principal | Exact service scope | System action | System rules | System rules | Provider/system workflow | System workflow | System rules | No human enforcement | Machine output only |

The matrix is a summary. Specific capability, resource, state, and approval checks remain authoritative.

---

## 14. Resource and data boundaries

### 14.1 Buyer boundaries

A buyer may view their own customer-facing Parent Order and item/vendor progress. They must not receive:

- another buyer's records;
- seller payout or internal reserve data;
- internal fraud or risk notes;
- rider private information beyond what is required;
- internal carrier contracts; or
- unrelated operational case evidence.

### 14.2 Seller boundaries

A seller may view only:

- their seller profile and approved memberships;
- their offers and inventory;
- their Vendor Orders and fulfilment responsibilities;
- messages and cases connected to their products/orders;
- their seller performance; and
- their earnings, holds, reserves, withdrawals, and payout status.

A seller must not view:

- other sellers' order portions, offers not public to buyers, earnings, reserves, or disputes;
- the buyer's matric number;
- private room location;
- full buyer phone or email by default;
- other sellers in the same Parent Order except public product information; or
- internal Noma/Trust and Safety notes not required for a response.

### 14.3 Rider boundaries

A rider may view only information necessary for the current eligible or assigned job, including:

- pickup and approved handoff points;
- parcel identity;
- handling requirements;
- permitted recipient/delegate information;
- applicable contact workflow; and
- delivery credential state.

A rider must not view:

- seller earnings or buyer payment instrument;
- unrelated order items;
- buyer matric number or private room location;
- other riders' unassigned jobs unless a controlled offer pool permits it;
- full dispute history; or
- payout or refund details.

### 14.4 Support boundaries

Support may view the customer, seller, order, conversation, and case information necessary to resolve assigned matters. Support does not automatically receive:

- full bank-account details;
- raw identity documents;
- unrestricted audit logs;
- unrelated cases;
- secret Trust and Safety intelligence; or
- authority to approve material finance actions.

### 14.5 Operations boundaries

Operations may view complete operational order and fulfilment timelines within institution scope. Operations does not automatically receive:

- full payout credentials;
- authority to mark provider financial status;
- authority to assign platform roles;
- unrestricted identity evidence; or
- authority to permanently remove a seller without the required enforcement process.

### 14.6 Finance boundaries

Finance may view payment, allocation, seller earning, refund, payout-account, transfer, and reconciliation data necessary for its work.

Finance does not automatically receive:

- private identity documents unrelated to payout review;
- authority to edit catalogue or delivery evidence;
- authority to decide counterfeit, harassment, or safety cases; or
- authority to rewrite ledger history.

### 14.7 Trust and Safety boundaries

Trust and Safety may view case-scoped identity, messaging, listing, order, evidence, and risk information necessary for an authorised investigation.

Trust and Safety does not automatically receive:

- unrestricted access to every conversation;
- ability to directly transfer money;
- ability to mark a provider refund or payout successful; or
- authority to impose undisclosed financial deductions.

### 14.8 Administrator boundaries

Administration exists to control configuration and access—not to bypass all operational workflows.

An administrator must use the normal authorised workflow where one exists. A generic database editor or “change any status” screen is prohibited.

---

## 15. Sensitive-field visibility matrix

| Data | Buyer | Seller | Rider | Support | Operations | Finance | Trust & Safety | Admin/Auditor |
|---|---|---|---|---|---|---|---|---|
| Public profile/display name | Own/public | Necessary public | Necessary | Scoped | Scoped | Minimal | Scoped | Scoped |
| Matric/staff identifier | Own masked/full as needed | No | No | Masked unless verification case | No by default | No | Verification-case only | Restricted |
| Institutional email | Own | No by default | No | Masked/contact workflow | No by default | No | Case-scoped | Restricted |
| Phone number | Own | No by default | No direct by default | Masked/authorised | Operational contact workflow | Payout-contact need only | Case-scoped | Restricted |
| Private room/location | Own where stored | No | No | No by default | No; approved points only | No | Safety-case only | Restricted |
| Approved handoff point | Own | Order-scoped | Assignment-scoped | Case-scoped | Operational | No | Case-scoped | Scoped |
| Full bank-account number | No | Own masked; full only in secure change flow | No | No | No | Authorised finance only | No by default | Highly restricted |
| Identity evidence files | Own submission/status | Own seller submission/status | Own rider submission/status | No by default | No by default | Verification need only | Case-scoped | Highly restricted/audited |
| Payment provider details | Own customer status, not secrets | Earnings status only | No | Customer status | Operational status | Authorised | Case need only | Restricted |
| Seller ledger | No | Own seller | No | No by default | Limited operational exposure | Authorised | Case-linked exposure only | Restricted/audited |
| Internal risk notes | No | Outcome/reason where discloseable | No | Need-to-know | Need-to-know | Financial-risk need only | Authorised | Restricted |
| Audit events | Own security events where surfaced | Own relevant events where surfaced | Own relevant events | Case-relevant | Operational | Financial | Case/enforcement | Approved read/export |

Masking must not be treated as authorization. The underlying field must still be protected at query, API, cache, log, export, and file-access layers.

---

## 16. Separation of duties and approval rules

### 16.1 Financial maker-checker controls

The following actions must support separate preparation and approval when the configured risk threshold or circumstance requires it:

- material refund;
- payout batch;
- manual ledger adjustment;
- release of a significant financial hold;
- retry of an uncertain transfer outcome;
- exceptional negative-balance correction; and
- export of sensitive financial records.

The preparer must not approve the same sensitive action where separation is required.

### 16.2 Role and access administration

- An actor must not grant themselves a privileged role.
- An actor must not grant capabilities outside their authorised grant boundary.
- Privileged role assignment must record reason, scope, approver, start, expiry/review date, and audit evidence.
- Revocation must take effect across active sessions where required.
- A Super Administrator assignment must be exceptional and separately approved.

### 16.3 Seller enforcement

- A Trust and Safety Analyst may apply proportionate temporary safeguards under policy.
- Permanent removal should require Trust and Safety Lead or designated senior approval.
- Material seller-financial consequences must use approved Finance/ledger workflows.
- The same actor must not both invent an undisclosed financial penalty and post it directly.

### 16.4 Refund control

- Support may apply only configured low-risk remedies within policy and limit.
- Material or exceptional refunds require Finance approval.
- Provider submission must be traceable to an approved refund decision.
- Provider completion remains system/provider-confirmed.

### 16.5 Payout control

- Sellers may request withdrawal but cannot approve it.
- Finance may approve only eligible, available earnings.
- Approved amounts must be reserved to prevent duplicate withdrawal.
- Transfer initiation and final provider status must remain separate.
- An uncertain transfer must not be blindly retried.

### 16.6 Pilot activation and expansion

Activation of real payments, closed-pilot commerce, or a material expansion must follow the multi-owner readiness approval defined in `docs/01-mvp-scope.md`.

No single developer, administrator, founder, or feature flag operator may treat deployment as launch authority.

### 16.7 Emergency stop versus restart

An authorised actor may stop a dangerous capability quickly. Restoration should require:

- incident or reason record;
- confirmation that the blocking condition is resolved;
- appropriate owner approval; and
- audit evidence.

---

## 17. Role-combination rules

### 17.1 Allowed combinations

The same personal account may ordinarily combine:

- Buyer + Covenant Student;
- Buyer + Seller Owner/Operator;
- Buyer + approved Rider;
- Covenant Staff affiliation + Buyer; and
- Seller Owner + Seller Operator for the same small seller.

### 17.2 Restricted combinations

The following combinations require explicit review and technical enforcement:

- Seller representative + staff role capable of reviewing or enforcing that same seller;
- Rider + Dispatch Operator responsible for assigning their own paid jobs;
- Finance preparer + Finance approver for the same sensitive action;
- Trust and Safety investigator + final appeal approver for the same serious case;
- Access Administrator + recipient of the privileged role being granted;
- Seller + Catalogue Operator capable of moderating their own seller's offers; and
- Auditor + write-capable operational role during the same audit scope.

### 17.3 Conflict handling

Where a user holds conflicting memberships, the system must:

- prevent self-review or self-approval;
- route the action to an independent actor;
- record the conflict; and
- avoid resolving it through an undocumented manual bypass.

---

## 18. Role and membership lifecycle

A role or membership assignment should support:

```text
REQUESTED
PENDING_REVIEW
APPROVED
ACTIVE
SUSPENDED
REVALIDATION_REQUIRED
EXPIRED
REVOKED
REJECTED
```

Not every role uses every state.

Each active privileged assignment must record:

- user;
- role template/capabilities;
- scope;
- grant reason;
- granting actor;
- approving actor where required;
- activation time;
- expiry or review time where applicable;
- status; and
- suspension/revocation reason.

### 18.1 Immediate revocation triggers

Access must be capable of immediate suspension or revocation after:

- account compromise;
- staff departure or duty change;
- seller representative removal;
- rider ineligibility;
- partner access termination;
- serious policy incident;
- expired institution status; or
- security containment action.

### 18.2 Membership expiry must not delete history

Revoking a role or affiliation must not delete historical orders, assignments, decisions, or audit records.

---

## 19. Temporary and break-glass access

Break-glass access exists for exceptional containment or recovery, not convenience.

It must require:

- eligible emergency role;
- privileged MFA and recent authentication;
- explicit reason and incident/reference number;
- narrow requested scope;
- short expiry;
- real-time or prompt alert to designated reviewers;
- append-only audit trail; and
- post-use review.

Break-glass access must not permit:

- fabricating provider financial status;
- deleting ledger or audit history;
- self-approving a payout or role grant;
- silently downloading all identity evidence; or
- bypassing required legal or university approval.

---

## 20. Service-principal and background-worker boundaries

Every service principal must have:

- unique credentials;
- explicit environment;
- minimum capabilities;
- no interactive human login;
- secret rotation/revocation process;
- observable actions; and
- correlation identifiers for audit and incident review.

Examples:

### Payment webhook processor

May:

- verify provider signature;
- preserve event;
- deduplicate;
- verify amount/currency/reference;
- post approved system transitions; and
- create reconciliation exceptions.

Must not:

- use a browser callback as final truth;
- grant human roles;
- bypass order/ledger transaction rules; or
- process unsupported event types with broad admin authority.

### Notification worker

May read only the fields required to deliver the specific message. It must not receive general account, bank, identity-evidence, or case-export authority.

### Search indexer

May read indexable public/eligible product and offer fields. It must not index private seller, buyer, financial, identity, or enforcement data.

---

## 21. Surface access versus action authorization

Noma uses distinct surfaces:

```text
/                    Buyer marketplace
/account             Buyer account
/seller              Seller Centre
/rider               Rider PWA
/operations          Operations and staff queues
/admin               Restricted administration
```

Route access is only the first check.

Examples:

- access to `/seller` does not permit access to every seller;
- access to `/operations` does not permit Finance or Trust and Safety actions;
- access to `/admin` does not permit financial-history edits;
- access to `/rider` does not permit pickup of an unassigned parcel; and
- a hidden admin page must remain protected if called directly through the API.

---

## 22. API authorization requirements

Every protected endpoint or command must define:

1. required capability;
2. accepted scopes;
3. resource-ownership or assignment rule;
4. required resource state;
5. feature/institution activation rule;
6. required authentication assurance;
7. approval/threshold rule;
8. fields the actor may read;
9. fields the actor may write;
10. audit requirement; and
11. expected denial/error behaviour.

### 22.1 Mass-assignment protection

Clients must not be able to submit protected fields such as:

```text
role
capabilities
sellerId
institutionId
paymentStatus
payoutStatus
ledgerBalance
trustStatus
isAdmin
isVerified
assignedRiderId
caseDecision
```

unless the endpoint explicitly permits that field under the correct capability and workflow.

### 22.2 Error behaviour

The API should avoid exposing sensitive existence information.

Depending on context, an unauthorised request may return a generic forbidden or not-found response rather than confirming that another seller, buyer, case, or identity record exists.

---

## 23. Audit requirements

The system must create append-only audit evidence for at least:

- privileged login/MFA/security changes;
- role grant, change, suspension, expiry, and revocation;
- institution verification decision and sensitive-evidence access;
- seller approval and activation;
- catalogue moderation and prohibited-product action;
- order intervention and administrative cancellation;
- dispatch assignment, override, reassignment, and custody exception;
- refund preparation, approval, submission, and reconciliation;
- financial hold placement/release;
- payout-account change;
- withdrawal review and payout-batch approval;
- transfer initiation, retry, failure, reversal, and reconciliation;
- manual ledger adjustment preparation and approval;
- Trust and Safety safeguard, suspension, permanent removal, and appeal decision;
- sensitive export;
- feature activation and emergency stop; and
- break-glass access.

Each privileged audit event should record:

- actor and effective role;
- capability used;
- scope;
- target resource;
- previous relevant state;
- new relevant state;
- reason;
- approval reference where applicable;
- request/session correlation;
- timestamp;
- outcome; and
- system/provider references where relevant.

Audit access itself must be capability-controlled and audited.

---

## 24. Permission testing requirements

Before the closed pilot, automated and manual tests must cover:

### 24.1 Horizontal isolation

- Buyer A cannot view or modify Buyer B's order, case, review, or account.
- Seller A cannot view or modify Seller B's Vendor Order, inventory, earnings, or payout account.
- Rider A cannot access or complete Rider B's assignment.
- CU Express users cannot access Noma Fleet-only jobs.
- Covenant-scoped actors cannot access another institution.

### 24.2 Vertical isolation

- Buyer cannot call seller, rider, Support, Operations, Finance, Trust and Safety, or Admin actions.
- Seller cannot assign riders, approve refunds, post ledger changes, or grant roles.
- Rider cannot cancel orders, approve refunds, or view seller earnings.
- Support cannot approve payout batches or permanent suspensions.
- Operations cannot mark provider payment/payout success.
- Finance cannot edit catalogue, delivery proof, or policy evidence.
- Institution Admin cannot silently become Platform/Super Admin.
- Platform/Super Admin cannot bypass immutable provider or ledger truth.

### 24.3 State and condition checks

- seller action rejected when seller is inactive/suspended;
- checkout rejected when institution or commerce type is disabled;
- pickup rejected before parcel is ready or when assignment is stale;
- handoff rejected with expired/consumed credential;
- refund approval rejected outside configured role/limit;
- payout rejected when earnings are not available;
- role grant rejected when actor lacks grant authority or attempts self-grant;
- permanent enforcement rejected without required approval; and
- export rejected without scope, reason, and assurance.

### 24.4 Session and revocation tests

- revoked privileged role loses access promptly;
- suspended account cannot continue through an old session;
- sensitive action requires recent authentication;
- privileged route requires MFA assurance;
- service credentials cannot be used as interactive human sessions; and
- environment-specific credentials cannot cross into production.

Authorization tests are launch blockers, not optional unit-test improvements.

---

## 25. Minimum Covenant pilot staffing and access configuration

Before real orders, Noma must assign named, trained, non-shared accounts for the required functions:

- at least one Support owner for each open ordering period;
- Operations/dispatch coverage;
- Finance reconciliation and approval coverage;
- Trust and Safety escalation coverage;
- Institution/configuration ownership;
- Security/access containment ownership; and
- partner/rider accounts for active logistics capacity.

The exact team size may be small, but shared accounts such as:

```text
admin@noma
operations1
rider-tablet
```

must not replace attributable individual accounts for privileged or custody actions.

Approved managed-device kiosk or station sessions may be designed later for narrowly defined workflows, but every material action must remain attributable to a human or service principal.

---

## 26. Progressive and deferred role capabilities

The architecture may recognise, but the Covenant MVP does not need to broadly activate:

- large seller-team organisations and custom role builders;
- multi-institution administrators;
- external-vendor self-service logistics administrators;
- manufacturer warranty/repair partner roles;
- independent inspection-partner roles;
- advertising campaign managers;
- customer-wallet or lending operations;
- nationwide carrier administrators;
- advanced data-science/fraud-model operators;
- unrestricted delegated support impersonation; and
- public API developer roles.

A database enum or hidden interface for a future role must not grant live authority.

---

## 27. Rules for Codex and contributors

For every feature involving protected data or action, Codex must:

1. identify the actor and role template;
2. identify the exact capability;
3. identify scope and ownership rules;
4. identify required state and feature conditions;
5. identify field-level read/write boundaries;
6. identify assurance and approval requirements;
7. add server-side enforcement;
8. add negative permission tests;
9. add audit events where material;
10. avoid creating a broad `ADMIN` bypass;
11. avoid trusting route visibility or client-submitted role fields;
12. preserve system-only/provider-driven transitions; and
13. state which adjacent future roles or capabilities were intentionally not implemented.

When a permission is ambiguous, Codex must deny by default and report the ambiguity rather than inventing access.

---

## 28. Definition of done for the role and permission foundation

The Covenant role and permission foundation is not complete until:

- one human account can hold multiple scoped memberships without duplicate identities;
- Covenant affiliation, seller approval, seller activation, payout verification, rider approval, trust, and staff authority are separate;
- role templates map to explicit capabilities;
- capabilities are evaluated with resource and institution scope;
- backend guards enforce protected actions;
- field-level response shaping prevents unnecessary exposure;
- state and feature gates participate in decisions;
- privileged roles require MFA;
- sensitive actions support recent authentication;
- role grants and revocations are auditable;
- session/access revocation works;
- system-only financial and custody events cannot be fabricated by humans;
- maker-checker rules work for configured sensitive actions;
- negative authorization tests pass;
- privileged actions create audit events;
- no shared privileged production accounts are required; and
- the implementation does not activate deferred organisations or role systems.

---

## 29. Traceability to the locked product and scope decisions

This document implements these established Noma principles:

1. Public storefront with verified Covenant commerce.
2. Campus Store, Student Vendor, and External Vendor as seller entity types.
3. Risk-based seller verification and separate payout/business/trust states.
4. Hybrid Covenant verification with minimum necessary data and manual fallback.
5. One account with layered, additive capabilities.
6. One platform with distinct Buyer, Seller, Rider, Operations, and Admin surfaces.
7. Sellers see only their Vendor Orders and financial position.
8. Riders see only assignment-required data and cannot complete unassigned parcels.
9. Support, Operations, Finance, and Trust and Safety have different responsibilities.
10. Provider-confirmed payment, refund, and payout states cannot be manually fabricated.
11. Protection, holds, enforcement, and appeals are structured and auditable.
12. Serious decisions remain human-controlled with proportionate separation of duties.
13. Privileged access requires stronger authentication, auditing, and emergency controls.
14. Role and resource isolation tests are required before paid orders.
15. Pilot launch and expansion require named owners and formal approval.

---

## 30. Final permission declaration

Noma will use one underlying identity per person, with separate institution, seller, rider, partner, and staff memberships. Roles will be reviewed capability bundles, not universal labels. Every protected action will be evaluated against capability, institution, resource scope, ownership or assignment, business state, feature activation, authentication assurance, active restrictions, and required approval.

Guests may browse. Eligible Covenant users may buy. Approved seller representatives may operate only their seller. Riders and CU Express actors may access only assigned logistics work. Support, Operations, Finance, Trust and Safety, Institution Administration, Platform Administration, and Security will remain functionally separated. Sensitive data will be minimised and field-restricted. Financial truth, custody proof, ledgers, and audit history cannot be overridden by a broad administrator role.

No contributor may introduce a catch-all `ADMIN` bypass, shared privileged production account, client-controlled role field, unscoped seller/order access, self-approved sensitive action, or human-editable provider-success status during the Covenant pilot.
