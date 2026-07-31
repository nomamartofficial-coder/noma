# Noma Security and Compliance

> **Repository path:** `docs/10-security-and-compliance.md`  
> **Status:** Binding Covenant pilot security, privacy, and consumer-protection contract  
> **Version:** 1.0  
> **Effective date:** 30 July 2026  
> **Applies to:** Noma's two-month Covenant University pilot build  
> **Primary audience:** Founders, Product, Engineering, Codex, Security, Privacy, Legal, Operations, Finance, Support, Trust and Safety, DevOps, Quality Assurance, Data, and future contributors

---

## 1. Purpose

This document defines the security, privacy, data-protection, consumer-protection, cryptography, retention, access-governance, incident-response, and launch-gate requirements for Noma's controlled Covenant University marketplace pilot.

It translates the locked product scope, roles, journeys, product surfaces, design system, technical architecture, domain model, state machines, and provider contracts into one security and compliance implementation contract.

The objective is to prevent Engineering, Codex, staff, providers, and future contributors from independently inventing:

- authentication, password, session, MFA, and recovery rules;
- privileged-access exceptions or broad administrator bypasses;
- data collection without a documented purpose and lawful basis;
- security controls based only on hosting-provider defaults;
- public or permanently accessible identity, bank, case, message, or custody evidence;
- payment, refund, payout, or custody truth derived from the browser;
- retention periods based on convenience or unlimited storage;
- undocumented cross-border data transfers;
- unaudited staff access to sensitive records;
- automated serious decisions without human review;
- a breach-notification process that starts after the legal deadline has nearly expired; or
- a pilot launch while known flaws could permit account takeover, cross-tenant access, forged payment confirmation, unauthorised payouts, public exposure of private evidence, or unrecoverable material data loss.

Security is not a separate Week 8 task. It is part of the definition of every feature that handles identity, money, inventory, custody, communication, evidence, authority, or personal data.

## 2. Authority and document hierarchy

1. `docs/01-mvp-scope.md` controls what is active, progressive, manual, prohibited, or deferred.
2. `docs/02-user-roles.md` controls actors, capabilities, resource scope, assurance, maker-checker separation, exports, and sensitive-field visibility.
3. `docs/03-user-journeys.md` controls required outcomes, evidence, exception paths, and honest completion.
4. `docs/04-information-architecture.md` and `docs/05-design-system.md` control truthful, accessible, privacy-safe presentation.
5. `docs/06-technical-architecture.md` controls runtimes, module boundaries, authoritative storage, sessions, outbox, queues, infrastructure, and recovery.
6. `docs/07-domain-model.md` controls records, ownership, constraints, append-only history, privacy classifications, and retention fields.
7. `docs/08-state-machines.md` controls state transitions, actors, guards, deadlines, reversals, and concurrency.
8. `docs/09-integrations.md` controls provider selection, adapters, environments, webhook verification, data sent to providers, reconciliation, and provider operations.
9. **This document controls security requirements, threat treatment, authentication assurance, privacy/legal governance, cryptography, retention, access review, incident response, and security acceptance evidence.**
10. `docs/11-testing-strategy.md` will turn these controls into automated, manual, provider, accessibility, performance, and security test suites.
11. `docs/12-delivery-backlog.md` will sequence the implementation work and dependencies.
12. `docs/13-covenant-pilot-readiness.md` will collect the evidence and decide whether real transactions may launch.

This document may strengthen earlier controls but must not weaken the locked scope, authorization, financial, custody, audit, provider-finality, or recovery boundaries.

## 3. Source-derived requirements and new security decisions

### 3.1 Source-locked requirements

The supplied Noma documents and completed Build Pack contracts require:

- secure authentication, email verification, recovery, revocable sessions, privileged MFA, and recent-authentication checks;
- server-side role, capability, resource, institution, state, feature, and separation-of-duty authorization;
- one human identity with independent institution, seller, rider, partner, and staff memberships;
- no catch-all `ADMIN` bypass;
- server-side Paystack initialisation, signature verification, exact amount/currency checks, idempotency, provider finality, and reconciliation;
- protected seller earnings and controlled payouts separated from buyer payment;
- private file storage, short-lived access, scan states, and evidence audit;
- append-only financial, provider, custody, enforcement, and privileged-action history;
- environment, secret, provider-account, and deployment separation;
- rate limits and abuse controls appropriate to shared campus networks;
- security-conscious messaging, anti-bypass detection, and human review;
- no unrelated academic, biometric, health, or disciplinary data for ordinary campus checkout;
- privacy-minimised analytics and observability;
- automated backups, restoration testing, incident runbooks, emergency pauses, and controlled restart; and
- paid-launch blocking for material identity, authorization, payment, payout, private-file, or recovery weaknesses.

### 3.2 Security decisions introduced and locked here

This document additionally locks:

- a documented threat model and risk register as a living repository artefact;
- OWASP ASVS 5.0 Level 2 as the pilot application-security verification baseline, with selected Level 3 controls for money, privileged administration, identity evidence, and custody;
- NIST SP 800-63-4-informed authentication and identity-proofing practices without claiming formal NIST conformity;
- Argon2id password hashing with calibrated parameters and no reversible password storage;
- phishing-resistant MFA as the long-term target and TOTP as the minimum privileged pilot factor;
- application-level envelope encryption for high-impact fields, with a managed key-encryption service before live use;
- an explicit data inventory, record of processing activities, lawful-basis register, DPIA register, cross-border transfer register, and retention schedule;
- an adults-only closed pilot unless a child-data and legal-capacity flow is formally approved;
- a 30-day operational target for verified data-subject requests;
- a 72-hour regulator-notification clock for qualifying personal-data breaches and immediate high-risk data-subject communication;
- quarterly privileged-access review during the pilot and immediate event-driven review after role, employment, incident, or provider changes;
- conservative internal retention periods pending final Nigerian legal/DPCO review;
- a no-secrets-in-browser, no-card-data-in-Noma, private-by-default evidence model;
- external vulnerability scanning and independent penetration testing before broad paid expansion; and
- security exception records that expire and cannot silently become permanent architecture.

## 4. Legal and assurance caveat

This document is a product, engineering, and operational control contract. It is not a substitute for legal advice, regulatory filing, a licensed Data Protection Compliance Organisation assessment, tax/accounting advice, PCI validation, or Covenant University approval.

Before live payments, Noma MUST obtain a written review from qualified Nigerian counsel and/or a licensed DPCO covering at least:

- the Noma legal entity and controller/processor roles;
- Data Controller or Data Processor of Major Importance classification and registration;
- Data Protection Officer and Compliance Audit Return obligations;
- final privacy notices, terms, seller agreement, rider terms, and complaint channels;
- lawful bases and sensitive-data processing;
- minors and legal capacity;
- cross-border transfer instruments for every provider;
- retention periods for commercial, tax, financial, employment, and dispute records;
- payment/Payout provider and PCI scope;
- FCCPC duties, return/refund language, promotions, and product-safety obligations; and
- university approval and institutional data-sharing arrangements.

Where legal advice conflicts with this document, implementation must not silently change. The conflict must be recorded and resolved through the scope/document change process.

## 5. Normative language

- **MUST / MUST NOT:** mandatory for the applicable pilot stage.
- **SHOULD / SHOULD NOT:** expected unless an approved, documented reason exists.
- **MAY:** optional inside the locked boundary.
- **PERSONAL DATA:** information relating to an identified or identifiable individual.
- **SENSITIVE PERSONAL DATA:** data receiving enhanced protection under applicable law, including qualifying biometric, health, belief, race/ethnic, political, trade-union, sex-life, and other prescribed data.
- **CONTROLLER:** entity determining why and how personal data is processed.
- **PROCESSOR:** entity processing personal data on a controller's documented instructions.
- **DCPMI:** Data Controller or Data Processor of Major Importance under applicable NDPC rules.
- **DPIA:** Data Protection Impact Assessment for processing likely to create high risk.
- **SECURITY INCIDENT:** event threatening confidentiality, integrity, availability, authenticity, accountability, safety, money, or custody.
- **PERSONAL-DATA BREACH:** security breach leading or likely to lead to accidental or unlawful destruction, loss, alteration, unauthorised disclosure of, or access to personal data.
- **RECENT AUTHENTICATION:** successful reauthentication inside the approved time window for a sensitive action.
- **PRIVILEGED SESSION:** session with approved staff capability and required MFA assurance.
- **LEGAL HOLD:** controlled suspension of deletion for a specific investigation, dispute, legal, regulatory, or safety reason.
- **CRYPTOGRAPHIC ERASURE:** making encrypted data irrecoverable by destroying the controlling key material.
- **FAIL CLOSED:** deny a new protected action when identity, authority, state, provider, or data safety cannot be established.
- **BREAK GLASS:** exceptional, time-limited, audited access for containment or recovery, not convenience.

# Part A — Security and privacy governance

## 6. Security objectives

Noma's security programme protects:

1. **Confidentiality** — only authorised actors receive the minimum fields required.
2. **Integrity** — orders, money, inventory, custody, cases, permissions, and evidence cannot be altered outside authorised workflows.
3. **Availability** — accepted obligations remain supportable through provider and infrastructure failures.
4. **Authenticity** — actor, provider, message, event, and artefact origin is verified.
5. **Accountability** — material actions are attributable, reasoned, timestamped, and auditable.
6. **Privacy** — collection, use, sharing, retention, and deletion remain proportionate and transparent.
7. **Safety** — users, riders, sellers, and staff can report and contain unsafe products, threats, lost parcels, and compromised accounts.
8. **Consumer fairness** — product, price, promotion, fulfilment, refund, warranty, and status representations remain accurate.
9. **Financial integrity** — provider movement, Noma allocations, ledger postings, refunds, earnings, and payouts reconcile.
10. **Recoverability** — Noma can restore authoritative data, reconcile external effects, and resume safely.

## 7. Security and privacy ownership

| Responsibility | Primary owner | Required collaborators |
|---|---|---|
| Security programme and threat model | Security Lead / accountable founder | Engineering, DevOps, Privacy, Operations |
| Data-protection programme | DPO or designated Privacy Lead | Legal/DPCO, Security, Product, Data |
| Consumer-protection compliance | Product/Legal owner | Support, Operations, Trust and Safety, Finance |
| Application security | Engineering Lead | Security, QA, module owners |
| Infrastructure and secrets | DevOps/Engineering | Security, provider account owners |
| Payment and payout security | Finance + Engineering | Security, Operations, Paystack owner |
| Incident command | Named Incident Commander by severity | Security, Engineering, Privacy, Legal, Communications |
| Access governance | Security/Access Admin | People owner, module owners, provider owners |
| Retention and deletion | Privacy Lead | Legal, Engineering, Finance, Trust and Safety |
| Vendor risk | Privacy/Security | Engineering, Legal, Finance, Product |
| Security acceptance | Security + Engineering sign-off | QA, Privacy, Operations, Finance as applicable |

## 8. Controller and processor roles

For the pilot, Noma SHOULD treat itself as the controller for marketplace account, verification, catalogue, order, messaging, delivery, protection, seller, rider, security, analytics, and operational processing because it determines the purposes and essential means.

Provider roles MUST be assessed individually and documented. A provider may be:

- a processor acting on Noma's documented instructions;
- an independent controller for its own regulated obligations;
- a joint controller for a specifically agreed purpose; or
- a separate business recipient.

Noma MUST NOT label every provider a processor merely because it signed a DPA. Paystack's regulated payment obligations, Covenant's institutional role, and CU Express's operational role require written assessment.

Every processor agreement MUST cover scope, instructions, confidentiality, security, subprocessors, breach notification, rights assistance, deletion/return, audit information, international transfers, and termination.

## 9. DCPMI, registration, DPO, and compliance-return assessment

Before live launch, Noma MUST obtain a documented assessment of whether it falls within an NDPC Data Controller or Data Processor of Major Importance category under the NDP Act and GAID 2025.

The assessment records:

- legal entity;
- business sector and processing purposes;
- expected and actual Nigerian data-subject counts;
- categories, volume, sensitivity, and societal/economic significance of data;
- cross-border providers;
- whether Noma is controller, processor, or both;
- applicable registration tier;
- registration/renewal date;
- DPO requirement;
- Compliance Audit Return requirement and filing date;
- licensed DPCO used, where required; and
- evidence/approval.

Noma MUST designate an accountable Privacy Lead before founding-team production testing. If classified as a DCPMI, Noma MUST appoint/designate the required qualified DPO and complete registration/renewal and audit-return obligations before the relevant deadline.

## 10. Record of processing activities

Noma MUST maintain a version-controlled Record of Processing Activities (`compliance/ropa.yml` or equivalent) containing for each processing activity:

- identifier and owner;
- purpose;
- data subjects;
- data categories and sensitivity;
- source;
- lawful basis and legitimate-interest assessment where used;
- recipients/providers;
- country/region and cross-border mechanism;
- retention and deletion rule;
- security controls;
- data-subject rights handling;
- automated decision/profiling involvement;
- DPIA requirement/status;
- system/module/table/file bucket;
- incident contact; and
- last review and next review.

No new production data field, event property, provider payload, export, model feature, or file class may be introduced without updating the processing inventory.

## 11. Data Protection Impact Assessments

A DPIA MUST be completed and approved before activating processing likely to create high risk. The pilot DPIA programme includes at least:

- hybrid Covenant affiliation verification and evidence review;
- identity, account-recovery, duplicate-account, and fraud controls;
- staff access to private identity, case, bank, message, and safety evidence;
- in-app message moderation and anti-bypass detection;
- rider assignment, custody, handoff, failed-attempt, and any precise location processing;
- protection cases and serious enforcement;
- cross-border cloud, email, analytics, monitoring, and storage providers;
- pre-owned serial/IMEI and ownership evidence;
- any session replay, behavioural profiling, AI assistance, or automated risk score;
- FBN surveillance or access-control systems, if introduced; and
- any later Covenant SSO/directory integration.

Each DPIA documents necessity, proportionality, data flow, threats, affected rights, mitigations, residual risk, consultation, approval, and review trigger. Unaccepted high residual risk blocks activation and may require NDPC consultation or legal advice.

## 12. Lawful-basis register

| Processing activity | Primary proposed basis | Important limits |
|---|---|---|
| Account creation, authentication, order, delivery, Support | Contract / steps requested before contract | Collect only fields necessary to provide the service |
| Covenant affiliation verification | Contract and legitimate interests | Do not collect academic results, GPA, discipline, or biometrics for ordinary verification |
| Seller/rider onboarding and marketplace integrity | Contract, legitimate interests, legal obligation where applicable | Stronger evidence must be risk-based and disclosed |
| Payment, refund, payout, tax/accounting records | Contract and legal obligation | Noma must not collect raw card data; retain only necessary provider records |
| Security logging, fraud prevention, abuse controls | Legitimate interests and legal obligation where applicable | Complete legitimate-interest assessment; minimise and restrict access |
| Delivery/custody proof | Contract and legitimate interests | No continuous precise tracking by default; disclose evidence rules |
| Protection cases, safety, recalls | Contract, legal obligation, legitimate interests, vital interests where applicable | Human review for serious outcomes |
| Transactional email/push | Contract / legitimate interests | Content minimised; no marketing bundled |
| Marketing email/SMS | Consent | Separate, granular, revocable, no pre-ticked boxes |
| Non-essential analytics/cookies | Consent unless documented lawful basis and counsel approval | Operational security telemetry remains separate and minimised |
| Product recommendations | Legitimate interests or consent depending on scope | No personalised pricing; disclose meaningful profiling |
| Sensitive personal data | Applicable enhanced basis under law | Avoid by default; explicit review and safeguards required |

## 13. Privacy notices and just-in-time disclosures

Before collection, Noma MUST provide clear, concise, accessible information covering:

- Noma's identity, place of business, and contact details;
- DPO/Privacy contact;
- each purpose and lawful basis;
- data categories;
- recipients/categories of recipients;
- provider regions and cross-border transfers;
- retention period or criteria;
- data-subject rights and complaint route to the NDPC;
- automated decision-making or profiling, significance, expected consequences, and human-review rights;
- whether provision is contractual/mandatory and consequences of not providing it; and
- material policy version and effective date.

Contextual notices MUST appear at sensitive collection points such as verification evidence, payout accounts, rider evidence, case uploads, precise location, analytics consent, and account recovery. A hidden footer link alone is insufficient.

## 14. Consent management

Where consent is used, it MUST be:

- freely given, specific, informed, unambiguous, affirmative, and accessible;
- separated from Terms acceptance and unrelated purposes;
- recorded with subject, purpose, notice version, method, time, and withdrawal state;
- as easy to withdraw as to give;
- not based on silence, inactivity, pre-selected controls, or forced marketing; and
- re-obtained when the purpose materially changes.

Withdrawal stops future consent-based processing but does not erase processing already lawful or records Noma must retain under another basis. The system MUST distinguish consent withdrawal from account closure and from an objection to legitimate-interest processing.

## 15. Minors and legal capacity

Covenant students may include persons under 18. The NDP Act requires appropriate parental/legal-guardian consent and age/consent verification where consent is relied on for a child or person lacking legal capacity.

For the closed pilot:

- Noma MUST collect an age declaration before enabling checkout, selling, riding, or payout capability.
- The default pilot eligibility is **18 years or older**.
- An under-18 person MUST NOT transact, sell, ride, receive payouts, or submit high-risk evidence unless Nigerian counsel and the Privacy Lead approve a complete guardian-consent, contract-capacity, age-verification, safeguarding, withdrawal, and support workflow.
- Noma MUST NOT collect a government ID merely to prove age for every adult user.
- Age evidence, where exceptionally required, follows the identity-evidence retention rule and must not enter analytics or ordinary Support views.

This control may be revised only through documented legal and scope review.

## 16. Data-subject rights

Noma MUST support:

- information and transparency;
- access to personal data and processing information;
- rectification;
- erasure where no overriding basis requires retention;
- restriction;
- objection, including to qualifying legitimate-interest processing and direct marketing;
- data portability in a commonly used machine-readable format where applicable;
- withdrawal of consent;
- challenge and human intervention for solely automated decisions with material effect; and
- complaint to the NDPC.

A data-subject request cannot be refused merely because the requester did not use a specific form. Identity verification must be proportionate and must not collect more sensitive evidence than the request warrants.

## 17. Data-subject request workflow

The operational target is response within **30 calendar days** of a sufficiently verified request, unless applicable law and documented advice permits an extension.

Workflow:

```text
REQUEST RECEIVED
      ↓
acknowledge and create privacy case
      ↓
proportionately verify requester/authority
      ↓
identify systems, providers and legal holds
      ↓
collect, review, redact third-party data
      ↓
approve response or justified limitation
      ↓
securely deliver / execute action
      ↓
record evidence, retention and closure
```

The case records request type, received date, deadline, identity check, scope, searches, exemptions/limitations, approver, response, provider actions, completion proof, and complaint route. The requester must not receive secrets, fraud-detection logic, another person's data, or information that would compromise security or rights without review.

## 18. Automated decisions, AI, and profiling

During the pilot, AI and rule-based systems MAY assist with listing suggestions, search synonyms, duplicate detection, message-risk signals, fraud triage, evidence summaries, and queue prioritisation.

They MUST NOT autonomously:

- permanently suspend a seller or buyer;
- reject a serious consumer claim;
- confiscate earnings or approve a material refund;
- determine counterfeit authenticity;
- make a safety-recall decision;
- confirm identity solely by opaque scoring;
- personalise prices; or
- create a materially adverse decision with no meaningful human review.

Any material automated recommendation requires documented purpose, input categories, explainability appropriate to the decision, bias/error review, human authority, override, audit, and user challenge route.

## 19. Cross-border transfers

Noma uses providers that may process data outside Nigeria. Before production, every transfer MUST have a documented basis and adequacy assessment under applicable NDP Act/GAID requirements.

The transfer register includes:

- exporter/controller;
- importer/provider and role;
- countries/regions;
- data categories and data subjects;
- purpose and frequency;
- transfer mechanism or statutory condition;
- adequacy assessment;
- contractual safeguards/DPA;
- subprocessors and onward transfers;
- government-access considerations;
- technical safeguards, encryption, minimisation, and pseudonymisation;
- retention/deletion;
- data-subject notice;
- incident route; and
- owner/review date.

Convenience, provider popularity, or an EU region alone is not a transfer basis. Noma MUST record the basis for each transfer and preserve the evidence.

## 20. Provider privacy and security due diligence

Before production use, the owner MUST review and record:

- security and privacy documentation;
- contractual role and DPA;
- subprocessors;
- data locations;
- encryption;
- tenant isolation;
- access controls and MFA;
- breach-notification commitments;
- vulnerability and assurance reports;
- retention/deletion controls;
- rights-request assistance;
- export/exit capability;
- support-access controls;
- uptime/recovery commitments; and
- cross-border mechanism.

Provider assurance never removes Noma's responsibility to configure the service safely, minimise payloads, control accounts, monitor events, reconcile outcomes, and test recovery.

## 21. FCCPC consumer-protection baseline

Noma MUST implement consumer-facing controls consistent with Nigerian consumer-protection duties and FCCPC e-commerce guidance:

- clear, legible, concise Terms and privacy information;
- prominent disclosure before payment of product identity, seller, condition, price, promotion, availability, restrictions, warranty, delivery promise, and return/cancellation rules;
- no misleading availability, trust, verification, inspection, ranking, or promotional claim;
- no hidden buyer fee or unexplained checkout-price increase;
- accessible complaint and redress mechanism no more burdensome than purchasing;
- prompt, traceable repair, replacement, refund, or other remedy where applicable;
- timely delivery and truthful delay communication;
- reasonable and category-appropriate return windows;
- efficient refund processing with honest provider status;
- safety, recall, withdrawal, and consumer-notification capability;
- privacy-preserving disclosure of customer information; and
- preservation of the exact terms shown at checkout.

A pilot label does not waive consumer rights.

## 22. Terms, policies, and versioned acceptance

Noma MUST publish and version at least:

- Terms of Use;
- Buyer Protection Policy;
- Seller Agreement;
- Rider/Carrier Terms;
- Privacy Notice;
- Cookie/Analytics Notice;
- Returns, Refunds and Cancellation Policy;
- Prohibited and Restricted Products Policy;
- Messaging and Anti-Bypass Policy;
- Review and Moderation Policy;
- Seller Enforcement and Appeal Policy;
- Payout and Earnings Terms;
- Pre-Owned disclosures; and
- Warranty, recall, and product-safety notices.

Acceptance records store user, policy identifier/version, time, method, surface, and applicable institution/seller context. Material adverse changes require notice and, where legally/contractually necessary, renewed acceptance.

## 23. Complaints, regulatory requests, and law-enforcement requests

Noma MUST maintain separate controlled workflows for:

- ordinary consumer complaints;
- privacy/data-subject requests;
- regulator enquiries or notices;
- court orders and lawful government requests;
- urgent safety requests; and
- preservation/legal holds.

Staff MUST NOT disclose data because an email, phone call, badge image, or informal university request appears authoritative. Requests require identity, authority, scope, legal basis, minimisation, approval, secure delivery, and audit. Emergency disclosure requires documented necessity and retrospective review.

# Part B — Threat model

## 24. Threat-modelling method

Noma uses a combined approach:

- **STRIDE** for spoofing, tampering, repudiation, information disclosure, denial of service, and elevation of privilege;
- **privacy threat analysis** for linkability, excessive collection, secondary use, lack of transparency, and inability to exercise rights;
- **abuse-case analysis** for marketplace fraud, bypass, counterfeit, stolen goods, refund abuse, seller/rider collusion, and social engineering;
- **business-impact analysis** for money, inventory, custody, safety, regulatory, and university-operational harm; and
- **attack-path review** across Web, API, Worker, database, queue, storage, providers, staff, partner, rider, seller, and customer boundaries.

The threat model is reviewed before each progressive feature activation and after serious incidents, architecture changes, new providers, new institutions, or material data-use changes.

## 25. Protected assets

| Asset class | Examples | Primary harm |
|---|---|---|
| Identity and credentials | password hashes, MFA seeds, recovery tokens, sessions | account takeover and impersonation |
| Institution affiliation | email, identifier, evidence, verification decisions | privacy harm, fraudulent campus access |
| Seller/rider authority | memberships, capabilities, payout ownership, assignments | cross-tenant action and financial theft |
| Commercial truth | products, offers, prices, conditions, warranties, checkout snapshots | mis-selling and disputes |
| Inventory and reservations | stock, units, movements, reservations | overselling and fraud |
| Money | payments, allocations, ledger, refunds, earnings, payouts | financial loss and regulatory exposure |
| Custody | package IDs, QR/PIN, scans, handoff evidence | theft, false delivery, safety risk |
| Messages and cases | chat, evidence, reports, decisions, appeals | harassment, disclosure, false outcomes |
| Private files | identity, bank, dispute, pre-owned, safety evidence | identity theft and severe privacy harm |
| Audit and security data | events, access history, alerts, incident evidence | repudiation and detection failure |
| Infrastructure and secrets | keys, provider credentials, deployments, backups | system-wide compromise |
| Availability and operations | API, Worker, database, queue, provider access | unserviceable accepted obligations |

## 26. Threat actors

Threat actors include:

- unauthenticated internet attackers;
- credential-stuffing and phishing operators;
- malicious or compromised buyers;
- malicious or compromised sellers and seller employees;
- malicious or compromised riders/dispatchers;
- colluding buyer-seller-rider groups;
- current or former staff with excessive access;
- compromised service principals or CI/CD credentials;
- malicious dependencies or supply-chain actors;
- provider insiders or compromised provider accounts;
- opportunistic campus-network attackers;
- persons seeking stolen/counterfeit goods or off-platform payment;
- abusive users targeting another student;
- scrapers, bots, spammers, and denial-of-service actors; and
- accidental actors causing disclosure, deletion, misconfiguration, or incorrect financial actions.

## 27. Trust boundaries

Security review MUST treat these as explicit trust boundaries:

1. browser/PWA ↔ public Web;
2. Web ↔ API;
3. API/Worker ↔ PostgreSQL;
4. API/Worker ↔ Redis/queue;
5. API/Worker ↔ S3/KMS;
6. API/Worker ↔ Paystack and other providers;
7. provider webhook ↔ Noma ingress;
8. staff browser ↔ Operations/Admin;
9. seller ↔ seller-owned resources;
10. rider/partner ↔ assigned Delivery Jobs and packages;
11. institution configuration ↔ Covenant scope;
12. public product media ↔ private evidence storage;
13. production ↔ staging/preview/CI/local;
14. Noma ↔ CU Express/Covenant manual workflows; and
15. active data ↔ backups, exports, archives, and legal holds.

Network location or possession of an internal URL does not establish trust.

## 28. Priority threat register

| ID | Threat | Primary impact | Required treatment | Owner | Inherent severity |
|---|---|---|---|---|---|
| T-001 | Credential stuffing | Account takeover | Login throttling, breached-password blocklist, MFA, alerts | Identity/Security | High |
| T-002 | Phishing of staff or seller owner | Payout/account control theft | TOTP/passkeys, reauth, notifications, cooling periods | Security/Finance | High |
| T-003 | Session theft/fixation | Impersonation | Secure HttpOnly cookies, rotation, revocation, device context | Identity | High |
| T-004 | Password reset takeover | Account loss | Single-use hashed tokens, short TTL, notifications, session revocation | Identity | High |
| T-005 | Cross-seller IDOR | Private order/inventory exposure | Server policy engine, scoped queries, negative tests | Access | Critical |
| T-006 | Privilege escalation to staff/admin | Platform compromise | Deny by default, capabilities, MFA, maker-checker, audit | Access/Security | Critical |
| T-007 | Mass assignment of role/status/amount | Authority or money manipulation | DTO allowlists, command handlers, DB constraints | Engineering | Critical |
| T-008 | Forged Paystack webhook | False payment/refund/payout | Raw-body HMAC, exact reference/amount/environment, dedupe | Payments | Critical |
| T-009 | Webhook replay or duplicate job | Duplicate order/money movement | Idempotency records, guarded state transitions, unique references | Payments/Platform | Critical |
| T-010 | Blind retry after timeout | Duplicate refund/transfer | Uncertain state, retrieval, reconciliation before retry | Finance | Critical |
| T-011 | Provider dashboard action not imported | Ledger/provider mismatch | Restricted dashboards, immediate reconciliation, audit | Finance | High |
| T-012 | Payout-account substitution | Seller funds stolen | Encryption, server resolution, seller confirmation, reauth/MFA, cooling period | Payout | Critical |
| T-013 | Inventory race/oversell | Failed orders and refunds | Reservations, DB constraints/locks, idempotency | Inventory | High |
| T-014 | QR/PIN replay | False pickup/delivery | Hashed one-time credential, assignment/state binding, atomic consume | Delivery | Critical |
| T-015 | Rider claims unassigned package | Theft/custody falsification | Assignment scope, scan verification, audit | Delivery | Critical |
| T-016 | Offline PWA fabricates final handoff | False delivery | Offline drafts only; backend final validation | Delivery | High |
| T-017 | Public/private S3 key confusion | Identity/case data leak | Separate buckets/prefixes, class policy, signed access, tests | Files | Critical |
| T-018 | Malicious upload | Malware/XSS/resource exhaustion | Allowlist, signatures, scan/quarantine, limits, safe derivatives | Files | High |
| T-019 | Permanent evidence URL leakage | Long-term disclosure | Short-lived signed URLs, auth each access, no indexability | Files | High |
| T-020 | Message contact/payment bypass | Loss of protection/fraud | Detection, block/warn, reports, graduated enforcement | Trust/Safety | High |
| T-021 | Harassment or threat in messaging | Safety harm | Report/block, rapid containment, evidence preservation | Trust/Safety | High |
| T-022 | Seller changes listing after order | Misdescription dispute manipulation | Immutable checkout snapshot and actual-unit evidence | Catalogue/Order | High |
| T-023 | Review manipulation/retaliation | Marketplace trust harm | Verified purchase, private buyer reports, moderation audit | Review | Medium |
| T-024 | Staff browses private evidence without need | Insider privacy breach | Field/case scope, access reason, audit, review | Security/Privacy | High |
| T-025 | Sensitive export exfiltration | Bulk breach | Privileged MFA, approval, minimisation, watermark, expiry, audit | Security/Privacy | Critical |
| T-026 | Secret committed to Git | Provider/system compromise | Secret scanning, rotation, protected environments, history response | DevOps | Critical |
| T-027 | Malicious dependency/build action | Supply-chain compromise | Lockfiles, review, provenance, dependency scanning, least-token CI | DevOps | High |
| T-028 | Preview uses production credentials/data | Environment breach | Strict credential and database separation | DevOps | Critical |
| T-029 | SQL/NoSQL/command injection | Data theft/tampering | Parameterized ORM/query review, validation, no shell interpolation | Engineering | Critical |
| T-030 | XSS/HTML injection | Session/action compromise | Framework escaping, CSP, sanitization, no unsafe HTML | Web | High |
| T-031 | CSRF | Unauthorised browser action | SameSite cookie, origin/CSRF checks, no GET mutation | Identity/API | High |
| T-032 | SSRF through URLs/files | Cloud metadata/internal access | URL allowlists, network egress controls, parser limits | Platform | High |
| T-033 | CORS misconfiguration | Cross-origin data/action exposure | Explicit origin allowlist; credentials restrictions | API | High |
| T-034 | Rate-limit attack via campus NAT | Denial or unfair lockout | Multi-signal throttles, progressive challenge, no IP-only bans | Platform | Medium |
| T-035 | Database loss/corruption | Operational and financial loss | Automated backups, PITR, independent exports, restore drills | DevOps | Critical |
| T-036 | Queue/outbox stuck | Accepted obligations not executed | Age alerts, replay, DLQ, authoritative DB recovery | Platform | High |
| T-037 | Logging of secrets/PII | Secondary breach | Structured redaction, schema allowlists, scanning | Security | High |
| T-038 | Analytics/session replay captures sensitive data | Privacy breach | Minimised events, replay disabled, consent controls | Data/Privacy | High |
| T-039 | Cross-border transfer without basis | Regulatory breach | Transfer register, DPA/instrument, minimisation, review | Privacy/Legal | High |
| T-040 | Unlawful processing of minor data | Rights and contract harm | 18+ pilot gate or approved guardian flow | Privacy/Product | High |
| T-041 | Automated false fraud decision | Unfair suspension/financial harm | Human review, explainability, appeal, no autonomous serious action | Trust/Safety | High |
| T-042 | Fake support/social engineering | Account or payout takeover | Authenticated Support, no secret requests, scripts, alerts | Support/Security | High |
| T-043 | Shared provider/admin accounts | No accountability | Named accounts, MFA, least privilege, quarterly review | Security | High |
| T-044 | Unpatched internet-facing component | Remote compromise | Patch SLA, scanning, asset inventory, emergency release | DevOps | Critical |
| T-045 | DDoS/provider outage | Checkout/service unavailable | Cloud edge controls, capacity limits, pause/degraded mode | Platform/Operations | High |
| T-046 | Feature flag enables unready commerce | Unsafe operation | Separate deployment/activation, approvals, gates, emergency pause | Product/Operations | High |
| T-047 | Recall notice fails | Consumer safety harm | Multi-channel notice, delivery tracking, escalation, case records | Trust/Safety | Critical |
| T-048 | Backup contains data past deletion | Privacy non-compliance | Backup schedule, delayed erasure register, restore re-deletion | Privacy/DevOps | Medium |
| T-049 | Legal hold abused indefinitely | Over-retention/privacy harm | Scoped authority, reason, review/expiry, audit | Legal/Privacy | Medium |
| T-050 | Incident handled in private chat | Lost evidence/missed deadline | Incident system, clock, owner, runbook, audit | Security/Privacy | High |

## 29. Risk scoring and acceptance

Risks are scored using likelihood and impact across confidentiality, integrity, availability, financial loss, consumer harm, safety, regulatory exposure, university relationship, and recoverability.

- **Critical:** credible path to systemic money/custody compromise, broad private-data exposure, unauthorised privileged control, or unsafe operation. Must be eliminated or materially mitigated before paid launch.
- **High:** material single/multi-user harm or operational failure. Requires named owner, funded treatment, and acceptance by Security plus the affected business owner.
- **Medium:** bounded harm with viable detection/recovery. Requires planned treatment and review date.
- **Low:** limited impact; may be accepted with monitoring.

No founder, developer, or product owner may unilaterally accept a Critical risk. Acceptance records include evidence, residual risk, affected scope, compensating controls, owner, approvers, expiry, and review trigger.

# Part C — Identity, authentication, session, and access security

## 30. Account enrolment

Account creation MUST:

- use server-generated identifiers;
- normalise email safely without guessing identity equivalence;
- prevent duplicate active identity claims while supporting recovery/manual review;
- avoid account-enumeration responses;
- require email verification before protected capability activation;
- record Terms/Privacy versions;
- apply rate limits by account, IP/network, device/session, and outcome;
- reject client-supplied roles, verification status, institution status, seller/rider status, trust, or balances; and
- create auditable verification events without logging secrets.

## 31. Password policy

For password authentication:

- minimum length is **15 characters** for password-only accounts;
- maximum accepted length is at least **64 characters**;
- all printable Unicode characters and spaces are allowed after safe normalisation rules;
- no composition rule requiring arbitrary upper/lower/digit/symbol combinations;
- no periodic forced password change without compromise evidence;
- passwords are checked against a maintained breached/common-password blocklist;
- password hints and knowledge-based security questions are prohibited;
- paste and password managers are supported;
- strength guidance favours long passphrases; and
- the server must not truncate silently.

Where a user has an approved MFA authenticator, a lower minimum MAY be considered only through a documented Identity decision; the pilot default remains 15.

## 32. Password storage

Passwords MUST be hashed with **Argon2id** using a maintained implementation.

Baseline:

```text
algorithm: Argon2id
memory: at least 64 MiB where production latency permits
iterations: at least 3
parallelism: 1 or calibrated value
salt: unique cryptographically random value per password
pepper: optional, stored separately in managed secret/key service
```

Parameters MUST be load-tested and calibrated to impose meaningful attacker cost without creating a denial-of-service weakness. Hash metadata is versioned for rehash-on-login. Plaintext, reversible encryption, unsalted hashes, SHA-only password hashing, and password logging are prohibited.

## 33. Email verification and one-time codes

Verification and recovery tokens MUST be:

- generated from a cryptographically secure source;
- stored only as one-way hashes;
- scoped to subject, purpose, and intended action;
- single-use;
- short-lived;
- invalidated by successful use, replacement, account security change, or excessive attempts; and
- protected from enumeration and replay.

Default email verification link lifetime is 30 minutes. Default numeric OTP lifetime is 10 minutes with no more than five failed attempts before invalidation. Exact limits are configuration, tested, monitored, and not revealed in a way that helps attackers.

## 34. MFA and authenticator policy

Privileged staff, provider administrators, Finance approvers, Security administrators, Super Administrators, and break-glass users MUST use MFA.

Pilot minimum:

- password plus standards-compliant TOTP;
- encrypted MFA seed;
- single-use hashed recovery codes;
- reauthentication before enrolment/reset;
- notification of factor addition, reset, or removal;
- factor reset through a stronger recovery workflow than ordinary email-only reset; and
- immediate session review after MFA changes.

Phishing-resistant WebAuthn/passkeys are the preferred future factor and SHOULD be introduced first for privileged accounts. SMS is not an approved primary privileged factor. Email is not a second factor when it is also the recovery channel.

## 35. Authentication assurance levels

Noma uses internal assurance states:

```text
ANONYMOUS
AUTHENTICATED
CONTACT_VERIFIED
RECENTLY_AUTHENTICATED
MFA_VERIFIED
PRIVILEGED_MFA_RECENT
```

An assurance state does not grant a capability. Protected commands require both authority and the required assurance.

Examples:

- ordinary account settings: `AUTHENTICATED`;
- changing password/recovery/email: `RECENTLY_AUTHENTICATED`;
- seller payout-account change: `MFA_VERIFIED` plus recent authentication;
- Finance payout approval: `PRIVILEGED_MFA_RECENT` plus maker-checker authority;
- sensitive export or break glass: `PRIVILEGED_MFA_RECENT` plus separate approval and reason.

## 36. Session architecture and lifetime

Browser/PWA sessions use opaque random tokens stored in secure cookies. Only a one-way token hash is stored server-side.

Required cookie attributes in production:

```text
HttpOnly
Secure
SameSite=Lax by default
Path=/
Host-only where practical
```

Session policy:

| Session class | Idle timeout | Absolute lifetime | Additional rule |
|---|---:|---:|---|
| Buyer/general | 7 days | 30 days | sensitive actions reauthenticate |
| Seller owner/operator | 24 hours | 14 days | payout/security actions require MFA/recent auth |
| Rider/dispatcher | shift-aware, max 12 hours | 24 hours | assignment actions require active shift/session |
| Support/Operations | 30 minutes | 12 hours | MFA and managed-access expectations |
| Finance/Trust/Safety/Admin | 15 minutes | 8 hours | privileged MFA; reauth for high-risk actions |
| Break glass | 10 minutes | 60 minutes | incident-bound and continuously audited |

Exact values may be tightened through configuration. Privilege changes, recovery, password/MFA change, suspicious activity, suspension, offboarding, or incident containment trigger rotation or revocation.

## 37. CSRF, origin, and browser action security

State-changing browser requests MUST:

- use non-GET methods;
- require valid authenticated session;
- validate `Origin`/`Referer` where appropriate;
- use SameSite cookie protections;
- use an anti-CSRF token for flows where SameSite alone is insufficient;
- reject cross-origin credentialed requests outside the explicit allowlist;
- require idempotency keys for duplication-prone protected commands; and
- never accept a desired role, status, amount, seller ID, or institution scope solely from the browser.

## 38. Account recovery

Recovery is treated as a high-risk identity transition.

The workflow MUST:

- avoid revealing whether an account exists;
- use short-lived, single-use hashed recovery tokens;
- rate-limit requests and attempts;
- invalidate existing tokens when a new one is issued;
- rotate/revoke sessions on successful recovery;
- notify the previous and current verified contact where safe;
- require additional review for privileged, seller-owner, rider, or payout-enabled accounts when risk signals exist;
- prevent Support from directly setting a password or bypassing MFA; and
- record actor, method, evidence, reason, and outcome.

A lost institutional email with conflicting identity must enter manual account-recovery review, not create a second identity.

## 39. Email, phone, and recovery-channel changes

Changing a verified email, phone, or recovery channel requires:

- recent authentication;
- MFA for privileged or payout-enabled accounts;
- verification of the new channel;
- notification of the old channel where safe;
- security-event/audit record;
- optional cooling period for high-risk accounts;
- review when the old channel is unavailable or account risk is elevated; and
- session or capability restriction when compromise is suspected.

The new email must not automatically inherit Covenant affiliation unless institution rules explicitly validate it.

## 40. Payout-account change security

A payout-account change MUST combine:

- active approved seller-owner membership;
- recent authentication;
- MFA;
- server-side bank/account resolution;
- masked confirmation to the seller;
- encrypted storage of the full account number;
- new provider recipient creation rather than silent mutation of historical payout records;
- notification of old/new account change;
- risk assessment and configurable cooling period;
- cancellation/hold of incompatible pending withdrawals; and
- Finance/Security review for suspicious or high-exposure changes.

No Support agent, seller operator, browser script, or provider dashboard can silently replace the active payout account.

## 41. Authorization enforcement

Every protected command and query MUST evaluate:

```text
authenticated actor
+ session assurance
+ capability
+ resource ownership/scope
+ institution scope
+ seller/partner scope
+ current business state
+ feature activation
+ emergency pause
+ separation of duties
+ field-level projection
= decision
```

Authorization is server-side and deny-by-default. Frontend route hiding is usability only. The API must query through scoped repositories/application services and must not load a complete cross-tenant record then hide fields in the response.

## 42. Privileged access and separation of duties

Sensitive actions require the role combinations locked in `docs/02-user-roles.md`.

At minimum:

- payout preparation and approval are separated above the configured threshold;
- a user cannot prepare and approve the same sensitive payout/refund/ledger adjustment where maker-checker is required;
- Access Admin role grants do not automatically grant Finance or Super Admin;
- Support cannot mark provider money states final;
- Operations cannot edit ledger history;
- Security can contain access but cannot fabricate financial truth;
- Super Admin remains exceptional and cannot bypass provider/state/ledger/custody evidence; and
- every override carries reason, case/incident reference, previous/new state, actor, assurance, and audit.

## 43. Service principals and machine credentials

Service principals MUST:

- have a named owner and purpose;
- use non-human credentials;
- receive the minimum module/environment scope;
- be unable to create interactive browser sessions;
- use short-lived workload identity where supported;
- have rotation and revocation procedures;
- be separated by environment and service;
- emit attributable audit/telemetry identity; and
- never share a universal database, cloud, provider, or CI credential.

A Worker, deployment job, webhook processor, and backup job must not all reuse one master credential.

## 44. Break-glass access

Break-glass access exists only for incident containment or recovery when ordinary access is unavailable or too slow.

It requires:

- declared incident/reference;
- approved eligible operator;
- privileged MFA and recent authentication;
- narrowly scoped capability and resources;
- time limit;
- prominent notification to Security;
- complete access/action logging;
- no ability to fabricate provider, ledger, payment, payout, or custody truth; and
- next-business-day review and credential/session revocation.

Use for convenience, routine Support, debugging, analytics, or founder curiosity is prohibited.

## 45. Authentication and access monitoring

Security monitoring MUST cover:

- login success/failure and factor type;
- credential-stuffing patterns;
- password-reset and MFA-reset attempts;
- session creation, rotation, revocation, and unusual reuse;
- failed authorization and cross-scope attempts;
- privileged role/capability changes;
- sensitive-record access;
- payout-account and recovery changes;
- exports;
- break-glass use;
- provider-account login/configuration changes; and
- disabled/suspended identities attempting continued access.

Logs must identify safe actor/resource references without storing passwords, OTPs, session tokens, MFA seeds, complete bank details, or private evidence.

# Part D — Application, API, file, and platform security

## 46. Secure HTTP and browser headers

Public Web/API responses MUST use reviewed security headers appropriate to the surface:

- HSTS after HTTPS and subdomain readiness are proven;
- Content Security Policy with no broad `unsafe-eval`; nonce/hash-based scripts where needed;
- `frame-ancestors` or equivalent anti-clickjacking controls;
- `X-Content-Type-Options: nosniff`;
- restrictive `Referrer-Policy`;
- minimal `Permissions-Policy`;
- secure cache directives for authenticated/sensitive responses;
- COOP/related isolation where compatible; and
- no server/framework version disclosure.

CSP is monitored in report-only mode before strict enforcement and does not permit arbitrary third-party scripts on checkout, account, seller, rider, Operations, Finance, Trust/Safety, or Admin surfaces.

## 47. TLS and network communication

- TLS 1.2 is the minimum; TLS 1.3 is preferred.
- Plain HTTP redirects immediately to HTTPS and is never accepted for credentials or webhook production.
- Database, queue, object storage, provider, and telemetry connections use encrypted transport.
- Certificates and expiry are monitored.
- Internal credentials are not sent in URL query strings.
- Webhook endpoints use provider signatures even when TLS is present.
- Sensitive service-to-service interfaces should use additional authentication and network restrictions where supported.

## 48. CORS and public API exposure

The API MUST use an explicit environment-specific origin allowlist. Wildcard origins with credentials are prohibited.

CORS is not authorization. Every route still requires authentication and resource checks. Preflight responses do not expose unsupported methods/headers. Private APIs are not made public merely because obscurity is inconvenient; however, network restriction never replaces application authorization.

## 49. Input validation and business-rule validation

Every command validates:

- schema, type, length, format, allowed values, and nested object limits;
- actor-controlled IDs against server-resolved scope;
- state-machine guard;
- amount/currency/integer minor units;
- quantity and inventory constraints;
- date/time windows;
- file count/type/size;
- message and URL policy;
- feature and capacity gate; and
- idempotency identity where required.

Validation errors must be stable and useful without revealing sensitive record existence or internal stack details.

## 50. Injection and unsafe execution

Noma MUST:

- use Prisma parameterisation or reviewed parameterised SQL;
- prohibit string-built SQL from user input;
- prohibit shell command interpolation with user/provider data;
- sanitise or reject dangerous template expressions;
- parse JSON/XML/media with bounded, maintained libraries;
- avoid unsafe deserialisation;
- encode output by context;
- sanitise approved rich text with a strict allowlist; and
- prohibit dynamic code execution and `eval`-like behaviour.

Raw SQL requires code review, test coverage, scope predicates, and migration/index assessment.

## 51. XSS and content safety

User-generated titles, descriptions, messages, reviews, file names, and metadata are treated as untrusted.

- React/Next escaping remains enabled.
- `dangerouslySetInnerHTML` is prohibited unless a reviewed sanitiser and component contract exist.
- Markdown/rich text uses a strict allowlist with links rewritten safely.
- User HTML, scripts, SVG, and active documents are not accepted in ordinary uploads.
- Public images are served with correct content type, content disposition, and isolated storage/CDN behaviour.
- CSP and automated tests cover stored, reflected, and DOM XSS.

## 52. SSRF and outbound URL handling

The application MUST NOT fetch arbitrary seller/buyer URLs.

Where a URL fetch is necessary:

- scheme and destination are allowlisted;
- DNS/IP resolution blocks loopback, link-local, private, metadata, and internal ranges;
- redirects are bounded and revalidated;
- response size/time/type are limited;
- credentials are never forwarded;
- network egress is restricted where practical; and
- fetched content enters quarantine/validation before use.

## 53. Mass assignment and protected fields

Controllers accept explicit command DTOs. They MUST NOT spread request bodies into persistence models.

Client-writable data never includes:

- role/capability/scope;
- verification/trust/seller/rider status;
- provider status;
- payment/refund/payout success;
- ledger amounts or balances;
- seller earnings/holds/reserves;
- inventory movements not authorised by an inventory command;
- custody state;
- case/enforcement decision;
- audit actor/time;
- feature activation; or
- emergency pause state.

## 54. Rate limiting and abuse resistance

Controls are risk-based and multi-dimensional:

- account/user;
- IP and network range;
- device/session;
- endpoint/action;
- seller/partner/institution;
- recipient/contact target;
- payment reference;
- outcome and risk signal.

High-risk endpoints include login, recovery, verification, OTP, checkout, coupon, messaging, upload, case creation, reviews, payout changes, withdrawals, exports, and admin actions.

Shared campus NAT means IP-only bans are prohibited. Progressive delay, per-account limits, challenges, verification, temporary capability restriction, and manual review are preferred. Limits and overrides are observable and tested.

## 55. File upload pipeline

All uploads follow:

```text
request authorised and upload intent created
        ↓
short-lived presigned upload to private quarantine
        ↓
object completion verified by Worker
        ↓
magic-byte/type/size/dimension/count checks
        ↓
malware and content-safety scan where applicable
        ↓
metadata stripping and controlled derivative generation
        ↓
approved or rejected/quarantined state
        ↓
access only through policy-checked signed operation
```

Requirements:

- allowlisted formats;
- generated object keys and safe download names;
- no trust in extension or browser MIME;
- decompression and pixel limits;
- no executable, macro, HTML, script, or active SVG content;
- private evidence separate from approved public product derivatives;
- originals retained where evidence integrity requires;
- scan/version/access audit; and
- quarantine cannot be bypassed by a public URL.

## 56. Private file access

Private identity, bank, message, case, custody, pre-owned, incident, and security files require:

- authenticated actor or authorised service principal;
- capability and case/resource scope;
- current file status and retention/hold check;
- short-lived signed download/view operation;
- `Content-Disposition` appropriate to type;
- no search indexing or shared permanent link;
- safe preview processing; and
- access audit for sensitive classes.

The signed URL lifetime should normally be five minutes or less. Copying the URL into another browser must not create indefinite access.

## 57. Webhook security

Webhook handlers MUST:

1. receive the raw request body;
2. enforce method, size, and content constraints;
3. verify provider signature/secret before business processing;
4. persist the event durably with provider/environment/event identity;
5. acknowledge only after durable receipt;
6. process asynchronously and idempotently;
7. verify related provider object, reference, amount, currency, and environment where applicable;
8. map provider facts into permitted Noma state-machine commands;
9. preserve unknown/uncertain statuses for reconciliation; and
10. monitor failures, age, duplicates, and replay.

IP allowlisting MAY supplement but never replace cryptographic verification.

## 58. Idempotency and replay protection

Duplication boundaries include browser retries, PWA reconnects, provider webhooks, Worker retries, outbox replay, email delivery, payment verification, refund submission, transfer initiation, QR/PIN submission, and administrative actions.

Each protected operation uses:

- stable idempotency key/reference;
- request hash and actor/scope binding;
- uniqueness constraint;
- state/version guard;
- deterministic side-effect identity; and
- replayed prior result or safe conflict.

Idempotency records have documented retention long enough to cover provider retry and dispute windows.

## 59. Error handling and information disclosure

User-facing errors MUST:

- use stable safe codes;
- avoid stack traces, SQL, secret values, internal hostnames, provider payloads, and sensitive existence information;
- distinguish retryable, validation, permission, state conflict, provider uncertainty, and support-required outcomes honestly; and
- include correlation reference where Support can use it safely.

Detailed errors go to restricted telemetry after redaction. Production debug mode and verbose framework error pages are prohibited.

## 60. Secrets management

Noma MUST maintain a secrets inventory containing owner, purpose, provider, environment, storage location, consumers, created/rotated dates, rotation method, revocation method, and incident priority.

Secrets MUST NOT appear in source, Git history, frontend bundles, docs examples, tickets, chat, logs, analytics, screenshots, build artefacts, or shared spreadsheets.

Production secrets live only in approved provider secret stores/environment controls. Access is least privilege and environment-specific. Secret scanning runs in developer workflow and CI. A committed secret is treated as compromised: rotate/revoke first, then remediate history and investigate use.

## 61. Key management and envelope encryption

Before live use of high-impact encrypted fields, Noma MUST use a managed key-encryption service. The default implementation is AWS KMS in the approved EU region, unless replaced through an approved architecture/integration decision.

Model:

- purpose-specific data-encryption keys encrypt application fields with AES-256-GCM or a reviewed authenticated-encryption construction;
- KMS key-encryption keys wrap/unwrap data keys;
- ciphertext stores key version, algorithm, nonce, authentication tag, and context;
- encryption context binds records to purpose/tenant where supported;
- plaintext keys are held in memory only as briefly as necessary;
- key use is access-restricted and monitored;
- rotation creates new key versions and background re-encryption where required;
- key deletion requires legal/retention approval because it may perform cryptographic erasure; and
- production/staging keys are separate.

Home-grown cryptography is prohibited.

## 62. Fields requiring application-level encryption

At minimum, the following require application-level encryption or irreversible tokenisation where functionality permits:

- full bank-account number;
- sensitive payout-account verification data;
- institutional identifiers where exposure creates material risk;
- identity-document identifiers extracted for review;
- MFA seeds;
- private recovery/security attributes;
- sensitive provider recipient/account references where warranted;
- exact serial/IMEI values for controlled high-risk goods; and
- other fields classified `RESTRICTED` through the data inventory.

Routine interfaces receive masked or derived forms. Encryption does not replace authorization, minimisation, or retention.

## 63. Payment-card data and PCI boundary

Noma MUST use Paystack-hosted or provider-controlled payment collection so Noma systems do not store, process, or transmit raw card number, CVV, PIN, or equivalent authentication data.

- No card input field originates from Noma unless a later PCI-reviewed scope change approves it.
- Noma stores provider reference, amount, currency, status evidence, channel/category where safe, and masked provider-returned metadata only as necessary.
- Logs, analytics, Support tickets, and evidence uploads must detect/reject card secrets where practical.
- PCI SAQ eligibility and external scanning obligations MUST be confirmed with Paystack/acquirer and a qualified PCI professional before launch.
- Outsourcing payment does not remove Noma's duty to secure redirect/checkout pages, scripts, DNS, deployment, and accounts.

## 64. Dependency and software-supply-chain security

Required controls:

- lockfiles committed and reviewed;
- dependency provenance and maintainer assessment for critical packages;
- automated vulnerability and licence alerts;
- pull-request dependency review;
- no unpinned remote CI actions for protected workflows;
- minimal CI token permissions;
- protected branches/environments and required review;
- signed or attributable releases where available;
- SBOM generation for production releases;
- removal of unused packages;
- supported Node/PostgreSQL/framework versions; and
- emergency patch path.

A package is not added merely because Codex generated an import.

## 65. Environment and deployment security

Local, CI, preview, staging, and production are isolated by accounts/credentials/data.

- Production personal data is not copied to local or preview.
- Preview builds cannot reach production database, queue, storage, email, payments, analytics, or telemetry credentials.
- Test fixtures are synthetic or approved/anonymised.
- Production deployment requires reviewed commit, passing gates, protected environment approval, migration plan, and rollback path.
- Live feature activation remains separately authorised and audited.
- Deployment cannot bypass state machines, capacity, policy, or emergency controls.

# Part E — Data classification, privacy engineering, and retention

## 66. Data classification

Every table field, event property, file class, log field, export, and provider payload is classified:

| Class | Description | Examples | Default handling |
|---|---|---|---|
| `PUBLIC` | approved for public access | product title, approved public image | integrity controls; cache allowed |
| `INTERNAL` | non-public operational data | safe IDs, aggregate queue metrics | authenticated staff/service access |
| `CONFIDENTIAL` | personal/commercial data | order details, contact, messages | scoped access, encryption at rest, no public cache |
| `RESTRICTED` | high-impact identity/financial/security data | bank number, identity evidence, MFA seed, private case evidence | application encryption, explicit capability, audited access |
| `SECRET` | credentials/key material | passwords, tokens, API keys, encryption keys | dedicated secret/key stores; never business DB/log/analytics |

Data classification is part of schema/API/event review and cannot be left to frontend hiding.

## 67. Data minimisation by role and journey

Examples:

- seller receives buyer display name, order reference, item details, and approved handoff point—not matric number, full email, phone, private room, or payment data;
- rider receives assignment, package, safe contact/handoff instructions—not seller earnings or case history;
- Support receives case/order context—not full bank details or unrestricted identity evidence;
- Finance receives necessary payout/ledger fields—not private messages unless a scoped case requires them;
- Trust and Safety receives reported evidence—not unrelated user browsing/academic data;
- analytics receives pseudonymous safe IDs and documented properties—not names, email, phone, bank, message text, evidence, search free text with sensitive content, or provider payloads.

Every API projection is actor-specific.

## 68. Data accuracy and correction

Noma MUST provide controlled correction for inaccurate personal and commercial data while preserving historical truth:

- current profile/contact fields may be corrected with verification;
- checkout/order snapshots remain immutable but may have linked correction notes;
- financial/custody/audit records use reversals or compensating entries;
- incorrect verification decisions use successor decisions/appeals;
- provider facts are not rewritten;
- correction propagates to relevant processors/projections where required; and
- the data subject receives confirmation or reasoned limitation.

## 69. Pseudonymisation and tokenisation

Where direct identity is not required:

- analytics uses a pseudonymous analytics ID separate from public/user identifiers;
- monitoring uses safe correlation IDs;
- exports use masked values and limited columns;
- provider support packets use minimum references;
- research/testing uses synthetic or de-identified records;
- bank numbers are masked for display;
- handoff credentials are hashed and single-use; and
- deleted users may be replaced by tombstone identifiers where transaction integrity requires history.

Pseudonymised data remains personal data where re-identification is reasonably possible and must remain protected.

## 70. Logging and telemetry privacy

Logs and telemetry MUST use schema allowlists and redaction.

Prohibited:

- passwords, OTPs, MFA seeds, recovery tokens, session cookies;
- secret/API keys and authorization headers;
- full bank/card data;
- full institutional identifiers where not needed;
- identity documents and file contents;
- private messages, case narratives, or evidence;
- raw provider payloads with personal data;
- exact delivery-room/private location details; and
- unrestricted request/response bodies.

Security/audit logs record event type, safe actor/resource IDs, result, assurance, reason, network/device risk metadata, and correlation. Access to logs is restricted and reviewed.

## 71. Analytics and cookies

- Strictly necessary authentication, security, cart, and preference storage is documented separately from optional analytics/marketing.
- Non-essential analytics cookies or equivalent identifiers remain disabled until the applicable consent experience and legal review are approved.
- PostHog events are purpose-defined, minimised, versioned, and region-configured.
- Session replay is disabled for the closed pilot.
- Advertising pixels, third-party marketing tags, cross-site tracking, fingerprinting, and data brokerage are prohibited.
- Consent choices are respected before loading optional scripts and can be changed later.
- Aggregate metrics cannot be used to reconstruct sensitive individual behaviour.

## 72. Retention principles

Noma retains personal data only for a documented purpose, lawful basis, operational need, dispute/consumer-protection period, financial/legal obligation, security need, or legal hold.

The source documents do not supply a final statutory retention schedule for Noma. The periods below are conservative **internal pilot policies**, not assertions of Nigerian statutory minimums. Nigerian counsel, Finance, the Privacy Lead/DPO, and a licensed DPCO MUST confirm or amend them before live launch.

Retention rules distinguish:

- active operational use;
- restricted archive;
- legal hold;
- deletion/anonymisation;
- backup expiry; and
- retained tombstone/immutable financial history.

## 73. Pilot retention schedule

| Record/data class | Default retention | End action | Owner |
|---|---|---|---|
| Account profile and contact | Active account + 24 months after closure | Anonymise/delete unless linked obligations or hold | Privacy |
| Covenant affiliation result | Affiliation active + 24 months after expiry | Retain decision/minimum evidence metadata; delete raw evidence earlier | Privacy/Institution |
| Raw identity/verification evidence | Until decision + 90 days; absolute default max 180 days | Delete unless appeal, fraud, legal hold, or documented requirement | Privacy/Trust |
| Password hashes | While account active | Delete on account anonymisation; never archive plaintext | Identity |
| Expired/revoked session records | 30 days | Delete/anonymise security metadata unless incident hold | Identity/Security |
| OTP/recovery token secret material | Until expiry/use, maximum 24 hours | Delete hash; retain minimal event metadata | Identity |
| Authentication/security event metadata | 12 months online; up to 24 months restricted for high-risk events | Aggregate/anonymise or delete | Security |
| Orders, checkout snapshots, allocations | 7 years after financial closure (provisional) | Restricted archive; no destructive edit | Finance/Legal |
| Payments, refunds, ledger, earnings, payouts | 7 years after final outcome (provisional) | Append-only/minimised provider payload | Finance |
| Full inactive bank-account number | 2 years after deactivation or last payout, whichever later | Cryptographic erase/delete; retain masked record/provider references for 7 years | Finance/Privacy |
| Provider money event raw payload | 90 days encrypted | Retain normalised event/reference/outcome 7 years | Finance/Security |
| Inventory and custody events | 3 years after order close | 7 years if material dispute, high-value, safety, or legal hold | Operations |
| Handoff credential hashes | 90 days after completion/expiry | Retain usage event, not reusable secret | Delivery |
| Precise rider/location telemetry | 30 days | Incident-specific segment up to 1 year or case schedule | Operations/Privacy |
| Order-scoped messages | 24 months after order closure | Extend to case/legal schedule when relevant | Support/Privacy |
| Pre-purchase product questions | 12 months after last activity | Delete/anonymise unless policy case | Marketplace |
| Protection case and decision | 3 years after closure | 7 years for financial, safety, fraud, or legal matters | Trust/Legal |
| Case/return/dispute evidence | 3 years after closure | 7 years where material financial/safety/legal need; otherwise delete | Trust/Privacy |
| Review and moderation records | While review public + 24 months after removal | Retain minimal moderation history | Marketplace/Trust |
| Enforcement and appeal | 3 years after closure | 7 years for serious fraud/safety/permanent removal | Trust/Legal |
| Public product images | Listing lifetime + 90 days | Delete unused originals/derivatives per catalogue rules | Catalogue |
| Pre-owned actual-unit images sold item | 3 years after order close | Extend with case/legal hold | Catalogue/Trust |
| Transactional email delivery events | 90 days | Security, payout, refund, recall event metadata up to 1 year or linked record | Platform |
| General application logs | 30 days | Security logs follow separate rule | Platform |
| Sentry error events | 90 days or provider minimum practical setting | Delete/redact; no sensitive payload | Engineering |
| OTLP operational logs/traces | 30 days; security telemetry 90 days | Aggregate metrics may remain longer | DevOps |
| Product analytics raw events | 13 months | Aggregated anonymised metrics may be retained | Data/Privacy |
| Privileged/financial audit records | 7 years (provisional) | Append-only/restricted archive | Security/Finance |
| Incident and breach record | 7 years after closure (provisional) | Preserve notification, evidence, decisions, remediation | Security/Privacy |
| DPIA, ROPA, transfer and compliance records | Life of processing + 7 years | Versioned compliance archive | Privacy/Legal |
| Backups | Daily/PITR 35 days; monthly encrypted snapshots 12 months | Automatic expiry; legal hold only through separate approved archive | DevOps |
| Exports | Shortest practical; default 24 hours download + 30 days audit metadata | Auto-delete encrypted artefact | Security/Privacy |

## 74. Deletion, anonymisation, and account closure

Account closure MUST:

1. authenticate the requester and check active obligations;
2. explain what can be deleted and what must be retained;
3. revoke sessions and active capabilities;
4. stop optional marketing/analytics identity use;
5. preserve orders, ledger, payouts, custody, cases, and audit where required;
6. delete or anonymise profile/contact data when no longer necessary;
7. request processor deletion where applicable;
8. record completion and residual retained categories; and
9. prevent a deleted identity from being silently recreated to evade enforcement or financial obligations, using a minimised tombstone where justified.

Hard deletion must not break referential, financial, consumer-protection, safety, or legal history.

## 75. Legal holds

A legal hold requires:

- authorised Legal/Privacy/Trust/Safety owner;
- specific case/incident/regulatory reason;
- defined subjects, records, systems, and date range;
- start, review, and expiry dates;
- access restrictions;
- suspension of only the relevant deletion jobs;
- notification to custodians where appropriate; and
- explicit release.

“Keep everything just in case” is not a valid hold. Expired holds generate an alert and cannot continue silently.

## 76. Backup privacy and deletion

Backups are encrypted, access-restricted, automatically expired, and not used as an ordinary data archive.

When a subject's live data is deleted:

- Noma does not rewrite every immutable backup immediately;
- the deletion is recorded in a re-deletion register;
- any restored backup is isolated and the deletion/anonymisation log is replayed before normal operation;
- expired backups are destroyed automatically; and
- legal holds use a separate approved archive rather than disabling all backup expiry.

## 77. Exports and portability packages

Exports MUST:

- require explicit capability, scope, purpose, and recent/MFA assurance where sensitive;
- minimise fields and rows;
- redact secrets and third-party data;
- use encrypted/private temporary storage;
- expire automatically;
- be delivered through authenticated short-lived access;
- include watermark/reference where appropriate;
- record requester, approver, query/scope, file hash, time, download, and deletion; and
- never be emailed as an unencrypted attachment.

Data-subject portability exports are separated from staff analytical exports and use documented machine-readable formats.

# Part F — Staff, provider, and operational access governance

## 78. Joiner, mover, leaver controls

### Joiner

- named identity; no shared account;
- approved role template and scope;
- manager/module owner approval;
- MFA before production;
- security/privacy training;
- provider access only if needed; and
- recorded start/expiry.

### Mover

- remove old access before/with new access;
- re-evaluate conflicts and maker-checker separation;
- revoke stale sessions/tokens;
- review provider accounts and exports.

### Leaver

- revoke Noma, GitHub, cloud, provider, email, VPN, database, and device access immediately at effective time;
- rotate shared/known secrets;
- preserve work/audit records;
- transfer ownership;
- review recent privileged activity; and
- confirm completion with evidence.

## 79. Access review cadence

- **Monthly during closed pilot:** Super Admin, Security Admin, Access Admin, Finance approver, payout, production database, cloud, GitHub, DNS, Paystack, KMS, and break-glass access.
- **Quarterly:** all staff capabilities, seller-owner/operator memberships, partner dispatcher access, service principals, provider dashboards, sensitive-export capability, and data/analytics access.
- **Per shift/assignment:** rider active shift and Delivery Job scope.
- **Event-driven:** role change, seller ownership change, staff exit, provider change, incident, account compromise, prolonged inactivity, failed review, or university instruction.

Reviewers confirm business need, owner, scope, MFA, last use, conflicts, expiry, and removal. “Still works here” is not sufficient.

## 80. Sensitive access justification

Opening identity evidence, full bank details, private case evidence, security records, message content, precise custody/location, or bulk personal data requires:

- specific case/order/seller/incident context;
- capability and field projection;
- reason code or free-text justification where appropriate;
- audit event;
- no broad browsing/search by curiosity; and
- additional approval for bulk export or out-of-scope investigation.

The UI should not place sensitive values on general dashboards when a masked form is sufficient.

## 81. Provider account governance

Provider dashboards use:

- organisation-owned named accounts;
- MFA;
- least privilege;
- no founder's personal email as sole owner;
- at least two controlled recovery administrators for critical providers;
- emergency contact and account-recovery documentation;
- monthly privileged review;
- audit-log export/review where available;
- no shared passwords; and
- immediate reconciliation of any provider-dashboard action affecting money, delivery, messages, files, DNS, keys, or production.

## 82. Developer and database access

- Developers do not receive routine direct production database write access.
- Read access is time-limited, approved, audited, and uses masked views where possible.
- Production changes occur through reviewed migrations or authorised application commands.
- Emergency database actions require incident/change record, backup/rollback, two-person review where feasible, and post-action reconciliation.
- SQL consoles and data exports must not become shadow operational tools.
- Support and Product have no direct database access by default.

## 83. Training and acceptable use

Before production access, personnel complete role-appropriate training on:

- phishing and credential protection;
- personal-data handling;
- consumer complaints and truthful status communication;
- payment/payout finality;
- secure evidence and export handling;
- incident and breach escalation;
- messaging/safety reports;
- provider-dashboard restrictions;
- no production data in personal apps/devices; and
- disciplinary consequences for misuse.

Privileged and high-risk staff receive refreshers at least every six months during the pilot/expansion period and after relevant incidents.

# Part G — Security monitoring, incident response, and breach management

## 84. Security event taxonomy

Noma classifies:

- suspicious event;
- confirmed security incident;
- personal-data breach;
- financial-integrity incident;
- custody/safety incident;
- provider incident;
- availability/recovery incident;
- consumer-protection incident;
- regulatory/legal incident; and
- combined incident.

A security incident is not automatically a reportable personal-data breach. A privacy breach may occur through confidentiality, integrity, or availability failure and must be assessed promptly.

## 85. Incident severity

| Severity | Examples | Target mobilisation | Authority |
|---|---|---|---|
| SEV-0 Crisis | systemic unauthorised payouts, broad credentials/private evidence exposure, major safety threat, unrecoverable financial/data integrity | Immediate; executive/incident command now | Emergency pause; counsel/DPO/regulator assessment |
| SEV-1 Critical | confirmed privileged compromise, payment forgery path, material personal-data breach, major provider outage with accepted obligations | Within 15 minutes | Incident Commander + Security/Privacy/Finance as relevant |
| SEV-2 High | limited account takeover cluster, sensitive single-case disclosure, major queue/custody failure | Within 30 minutes | Security/Engineering/Operations owner |
| SEV-3 Medium | contained suspicious activity, low-impact vulnerability, recoverable operational incident | Within 4 hours | Module owner with Security oversight |
| SEV-4 Low | minor anomaly, policy improvement, no active harm | Next business day | Backlog/monitoring owner |

## 86. Incident lifecycle

```text
DETECTED
   ↓
TRIAGED AND CLOCK STARTED
   ↓
INCIDENT COMMAND / OWNERS ASSIGNED
   ↓
CONTAINMENT
   ↓
INVESTIGATION AND IMPACT ASSESSMENT
   ↓
NOTIFICATION / COMMUNICATION DECISIONS
   ↓
ERADICATION AND RECOVERY
   ↓
RECONCILIATION AND CONTROLLED RESTART
   ↓
POST-INCIDENT REVIEW
   ↓
CORRECTIVE ACTION TRACKING AND CLOSURE
```

Containment may revoke sessions, rotate secrets, pause checkout/payouts/features, restrict sellers/riders, quarantine files, stop deployments, or isolate systems. It must preserve evidence and accepted obligations.

## 87. Incident roles

Every material incident assigns:

- Incident Commander;
- Security Lead;
- Engineering/Infrastructure Lead;
- Privacy/DPO Lead;
- Finance Lead for money events;
- Operations/Support Lead for customers and fulfilment;
- Trust and Safety Lead for safety/fraud;
- Legal/Regulatory adviser;
- Communications owner; and
- Scribe/evidence owner.

One person may fill multiple roles in a small team, but notification approval, financial correction, and restart maker-checker requirements remain enforced where required.

## 88. Personal-data breach assessment

The Privacy Lead/DPO assesses:

- what happened and when Noma became aware;
- confidentiality, integrity, and availability impact;
- categories and approximate number of data subjects/records;
- sensitivity and ability to combine with other data;
- affected users, minors, staff, sellers, riders, or third parties;
- encryption/pseudonymisation effectiveness;
- likelihood and severity of identity theft, fraud, discrimination, safety, reputational, financial, or other harm;
- containment and mitigation;
- whether risk to rights and freedoms is likely;
- whether high risk is likely;
- NDPC and data-subject notification requirements; and
- phased information if investigation is incomplete.

Every personal-data breach is recorded even if not notified.

## 89. 72-hour NDPC notification clock

Where a personal-data breach is likely to result in risk to individuals' rights and freedoms, Noma MUST be capable of notifying the NDPC within **72 hours of awareness**.

Internal targets:

- `T+0`: awareness time recorded and Privacy/Security paged;
- `T+4h`: preliminary facts and risk triage;
- `T+12h`: counsel/DPO assessment and evidence gaps;
- `T+24h`: draft notification and affected-subject estimate;
- `T+48h`: approval/escalation and phased-notice decision;
- `T+60h`: submission readiness;
- before `T+72h`: submit qualifying notification, even if information must follow in phases.

Notification includes contact, nature/categories/approximate counts, likely consequences, measures taken/proposed, and mitigation. Delay or non-notification requires documented legal reasoning and approval.

## 90. Data-subject breach communication

Where a breach is likely to result in **high risk**, affected data subjects are informed immediately in plain, clear language.

The communication states:

- what happened and when;
- categories of information involved without exposing more data;
- likely consequences;
- what Noma has done;
- actions the person should take;
- how to obtain help;
- fraud/phishing warning and what Noma will never ask for;
- contact point; and
- updates to expect.

Communications must not minimise confirmed harm, speculate beyond evidence, blame the user, or state that data is safe merely because the system is back online.

## 91. Evidence preservation and forensics

Incident evidence MUST preserve chain of custody and include:

- alerts, logs, traces, audit and provider events;
- affected deployments/configuration;
- account/session/access history;
- hashes and copies of relevant files where lawful;
- timeline and decisions;
- containment commands;
- provider/support correspondence;
- financial/custody reconciliation; and
- notification evidence.

Collection must be proportionate and privacy-aware. Staff must not run destructive “cleanup” before evidence is preserved. Forensic access is restricted and subject to legal hold/retention.

## 92. Incident communications

- One approved source of truth and incident channel is used.
- Customer, seller, rider, staff, university, provider, regulator, and public communications are audience-specific.
- Sensitive facts are not posted in general Slack/WhatsApp groups.
- Support receives an approved script and status reference.
- The public status page communicates service impact without exposing attack details.
- Security notification emails never request passwords, OTPs, or payment to “secure” the account.
- Material statements receive Legal/Privacy review where time permits.

## 93. Recovery and controlled restart

Restart requires evidence that:

- attack path is contained;
- compromised credentials/keys/sessions are revoked or rotated;
- vulnerable code/configuration is fixed or isolated;
- authoritative data is restored/verified;
- payments, refunds, payouts, orders, inventory, custody, and outbox/provider events reconcile;
- monitoring detects recurrence;
- capacity and staff coverage are available;
- Security, Engineering, Operations, Finance, and Privacy approvals are collected as applicable; and
- progressive ramp/rollback plan exists.

Restoring availability without integrity and financial reconciliation is not recovery.

## 94. Post-incident review

Within five business days for SEV-0/1 and ten business days for SEV-2, Noma conducts a blameless but accountable review covering:

- timeline;
- root and contributing causes;
- detection/response effectiveness;
- access and data affected;
- legal/consumer obligations;
- financial/custody reconciliation;
- what worked/failed;
- corrective controls and owners;
- tests/runbooks/document changes;
- risk register and DPIA updates;
- deadline and verification; and
- lessons shared at the appropriate confidentiality level.

Closure requires corrective actions assigned; severe systemic actions remain tracked to completion.

## 95. Minimum incident runbooks

The repository MUST contain tested runbooks for:

1. compromised buyer/seller account;
2. compromised staff/Super Admin account;
3. leaked secret/API key;
4. payout-account takeover;
5. forged/duplicated payment event;
6. uncertain or duplicated refund/transfer;
7. cross-seller or cross-user access exposure;
8. public/private S3 evidence exposure;
9. malicious upload;
10. database outage/corruption/restore;
11. queue/outbox backlog;
12. provider outage;
13. DNS/domain/email takeover;
14. lost/stolen staff or rider device;
15. widespread phishing/social engineering;
16. personal-data breach and 72-hour notification;
17. product safety/recall;
18. lost/damaged package or custody fraud;
19. incorrect bulk email/push/export; and
20. emergency pause and controlled restart.

# Part H — Secure development, vulnerability management, and launch gates

## 96. Secure development lifecycle

Every production change MUST include the applicable:

- requirement and threat mapping;
- data classification and privacy review;
- authorization and state guard;
- secure API/DTO design;
- persistence constraints/migration review;
- secret/provider/environment review;
- misuse/failure cases;
- logging/redaction/monitoring;
- unit, integration, authorization, concurrency, and security tests;
- dependency review;
- accessible truthful UX; and
- human code review.

Security-critical modules require designated reviewer ownership and cannot rely solely on generated code review summaries.

## 97. Application-security verification baseline

The Covenant pilot targets **OWASP ASVS 5.0 Level 2** for the applicable Web/API application, with selected Level 3 controls for:

- privileged administration;
- identity/recovery/MFA;
- money movement and ledger-affecting commands;
- private identity/bank/case evidence;
- cryptographic key handling;
- custody/handoff proof;
- sensitive exports; and
- high-impact audit/security events.

Noma must maintain an applicability matrix mapping ASVS control, implementation, test/evidence, owner, status, and approved exception. This is an internal verification baseline, not a claim of OWASP certification.

## 98. Security testing programme

Before paid launch:

- SAST/linters and secret scanning in CI;
- dependency and container/runtime vulnerability scanning;
- DAST against staging;
- authorization/IDOR and mass-assignment tests;
- session/CSRF/CORS/header tests;
- webhook forgery/replay tests;
- payment/refund/payout idempotency and uncertainty tests;
- file upload and signed-access tests;
- rate-limit/abuse tests including shared-NAT behaviour;
- migration/backup/restore tests;
- manual security review of critical flows; and
- independent penetration test or qualified external review before broad paid expansion.

PCI/acquirer-required ASV scanning is completed if applicable to the selected Paystack flow.

## 99. Vulnerability severity and remediation SLA

| Severity | Example | Production target | Release rule |
|---|---|---|---|
| Critical | remote auth bypass, cross-tenant data, payout manipulation, exposed private evidence | Contain immediately; remediate before paid operation or within 24 hours during pilot | Launch blocker; emergency patch/pause |
| High | account takeover path, serious XSS, privileged CSRF, sensitive disclosure | Within 7 days; faster if exploited/exposed | Must have owner and compensating control |
| Medium | bounded weakness requiring preconditions | Within 30 days | May release only with documented risk |
| Low | hardening or limited impact | Within 90 days | Track and review |

## 100. Patch and asset management

Noma maintains inventory of:

- domains/subdomains;
- cloud/provider accounts;
- applications/runtimes;
- databases/queues/buckets;
- repositories/actions;
- dependencies/images;
- certificates/keys/secrets;
- endpoints/webhooks;
- staff/service accounts; and
- devices used for privileged operations.

Critical internet-facing patches are applied within one month at the absolute latest and faster according to the vulnerability SLA. Unsupported components are removed or isolated before production.

## 101. Security acceptance evidence

Every critical feature provides:

```text
scope/journey requirement
threats and abuse cases
security/privacy controls
role/scope/state checks
sensitive fields and retention
provider and secret behaviour
failure/degraded/recovery behaviour
audit and alerts
test commands and results
open risks/exceptions
reviewer approvals
```

A green unit test, a successful API response, or a provider dashboard screenshot alone is not security acceptance.

## 102. Paid-pilot security launch blockers

Real payments and orders MUST remain disabled while a known issue could permit:

1. account takeover through an unmitigated practical path;
2. cross-user, cross-seller, cross-institution, or cross-role access;
3. privileged access without MFA/revocation/audit;
4. forged or duplicate payment confirmation;
5. unauthorised refund, ledger adjustment, payout, or payout-account replacement;
6. false pickup/delivery credential reuse;
7. public or permanent access to identity, bank, message, case, or custody evidence;
8. raw card/credential/secret data entering Noma logs or storage;
9. production secrets in repository, preview, or frontend;
10. unencrypted high-impact fields without approved compensating control;
11. inability to detect material security/provider failures;
12. inability to pause checkout/payouts/features/accounts;
13. untested backup restoration or material unrecoverable data;
14. no accountable incident/breach process or 72-hour capability;
15. no approved privacy notice, lawful-basis/transfer/DCPMI assessment;
16. under-18 commerce without approved legal/guardian controls;
17. no complaint/refund/safety workflow for accepted orders; or
18. unresolved Critical vulnerability.

## 103. Pre-launch privacy and compliance gate

Before the closed paid pilot:

```text
□ legal entity and controller/processor roles confirmed
□ DCPMI/registration/DPO/CAR assessment completed
□ Privacy Lead/DPO and contacts published
□ ROPA and data inventory approved
□ lawful-basis and legitimate-interest assessments approved
□ high-risk DPIAs completed
□ provider DPAs/subprocessor/cross-border register approved
□ final privacy, cookie, Terms, seller, rider, refund, safety policies approved
□ adults-only or approved minor flow enforced
□ DSAR workflow and 30-day tracker tested
□ retention/deletion/legal-hold jobs and ownership configured
□ breach assessment and 72-hour notification drill passed
□ FCCPC complaint/redress and pricing disclosure checks passed
□ data minimisation and sensitive-field projections verified
□ analytics consent/minimisation configuration verified
```

## 104. Pre-launch technical security gate

```text
□ Argon2id password hashing and breach blocklist verified
□ email verification, recovery, token expiry, and enumeration tests pass
□ privileged MFA and recent-authentication controls pass
□ session rotation, revocation, timeout, cookie, CSRF, and CORS tests pass
□ server authorization and negative cross-scope tests pass
□ maker-checker and break-glass controls pass
□ security headers and CSP reviewed
□ rate limits and campus shared-NAT behaviour tested
□ webhook signature, replay, amount/currency/environment tests pass
□ payout-account change/cooling/notification controls pass
□ one-time pickup/delivery credential tests pass
□ private upload, quarantine, scanning, and signed access pass
□ secrets, dependency, SAST, DAST, and vulnerability scans pass
□ encryption/KMS/key rotation/recovery tests pass
□ audit/redaction/alert tests pass
□ production/staging/preview separation verified
□ backup restoration and re-deletion process tested
□ incident runbooks and emergency pauses tested
```

## 105. Ongoing security cadence

| Cadence | Required activity |
|---|---|
| Continuous | alerts, provider/webhook/queue health, secret scanning, dependency alerts, audit events |
| Daily during closed pilot | security exceptions, failed auth spikes, privileged changes, provider incidents, critical vulnerability review |
| Weekly | patch/dependency triage, stale accounts, incident/corrective actions, security backlog |
| Monthly | privileged/provider access review, external surface scan, backup evidence, key/secret inventory review |
| Quarterly | all access review, threat model/DPIA/ROPA/transfer review, restore and incident exercise, retention-job evidence |
| Six-monthly | privileged training, penetration/review plan, policy and business continuity review |
| Annually or required filing period | DCPMI registration/renewal, CAR/privacy audit, processor/DPA review, retention/legal review |
| Event-driven | new provider/institution/feature, serious incident, law/regulation change, architecture change |

## 106. Security and privacy metrics

Metrics include:

- account takeover and recovery abuse;
- MFA coverage by privileged role;
- stale/over-privileged accounts;
- failed authorization and cross-scope attempts;
- secrets detected and rotation time;
- vulnerability age by severity;
- patch SLA compliance;
- security-alert acknowledgement/containment/recovery time;
- personal-data incidents and 72-hour readiness;
- DSAR volume and completion time;
- retention/deletion job success;
- private-file access anomalies;
- webhook forgery/replay/duplicate detections;
- financial/custody security exceptions;
- backup restoration success;
- phishing/reporting performance; and
- unresolved risk exceptions.

Metrics must not incentivise hiding incidents or auto-closing cases.

## 107. Security exceptions

An exception requires:

- control and requirement;
- reason it cannot be met;
- affected systems/data/users;
- threat and risk rating;
- compensating controls;
- owner;
- Security/Privacy/Legal/Finance approval as applicable;
- start and expiry date;
- monitoring;
- remediation plan; and
- activation/launch impact.

Critical launch blockers cannot be waived by an ordinary exception. Expired exceptions automatically become non-compliant and trigger alert/review.

## 108. Prohibited security and compliance shortcuts

The Covenant pilot MUST NOT:

1. use one universal `ADMIN` role or bypass middleware;
2. trust client-supplied role, scope, status, amount, or provider result;
3. store plaintext or reversibly encrypted passwords;
4. use security questions for recovery;
5. use SMS as the only privileged MFA method;
6. allow email-only reset of privileged MFA without review;
7. issue long-lived browser bearer tokens without revocation truth;
8. disable CSRF/origin controls because the API is “internal”;
9. use wildcard credentialed CORS;
10. build SQL, commands, or templates from untrusted strings;
11. expose private files through public buckets or permanent URLs;
12. trust file extension/MIME or skip quarantine;
13. collect raw card data;
14. log passwords, OTPs, tokens, bank/card details, messages, evidence, or provider secrets;
15. put production secrets/data in preview, local, CI fixtures, tickets, or chat;
16. use one shared production/provider account;
17. allow direct production database edits as routine operations;
18. allow Support/Operations to mark payment/refund/payout delivered or successful;
19. blindly retry uncertain money movement;
20. permit one-time QR/PIN reuse or offline final custody truth;
21. activate session replay in the closed pilot;
22. add advertising trackers or data brokers;
23. collect GPA, academic results, discipline, biometrics, health, belief, or unrelated ID data for ordinary checkout;
24. process under-18 commerce without approved safeguards;
25. assume every provider is a processor or that an EU region alone resolves transfers;
26. retain all data indefinitely;
27. delete financial/custody/audit history to satisfy a request without legal review;
28. disable backup expiry for a vague legal hold;
29. make a serious fraud, enforcement, safety, or consumer decision solely by AI;
30. hide sponsored/promotional placement;
31. use “pilot” as a consumer-rights disclaimer;
32. announce breach safety before investigation supports it;
33. miss the 72-hour clock while waiting for perfect facts;
34. handle incidents only in private WhatsApp or personal email;
35. restore service without financial/custody integrity checks;
36. waive Critical vulnerabilities to meet a launch date;
37. treat provider certification as proof Noma configuration is secure;
38. claim compliance/certification that has not been independently established;
39. add a new data field/provider/event without inventory, basis, retention, and review; or
40. allow Codex-generated implementation to override this contract.

## 109. Required implementation outputs

Engineering, Security, Privacy, and Codex MUST produce or maintain:

```text
docs/10-security-and-compliance.md
security/threat-model.yml
security/risk-register.yml
security/asvs-matrix.yml
compliance/ropa.yml
compliance/lawful-basis-register.yml
compliance/dpia-register/
compliance/transfer-register.yml
compliance/provider-assessments/
compliance/retention-schedule.yml
compliance/legal-holds/
runbooks/security/
runbooks/privacy/
runbooks/consumer-protection/
packages/security/*
packages/access-policy/*
packages/crypto/*
apps/api authentication/authorization/security middleware
apps/worker retention/deletion/reconciliation jobs
security test suites and fixtures
security launch-gate evidence
access-review and provider-account review templates
incident and breach notification templates
```

The exact package names may follow the architecture conventions, but responsibilities may not disappear.

## 110. Handoff to Part 11 testing strategy

`docs/11-testing-strategy.md` MUST convert this document into:

- unit tests for authentication, crypto wrappers, policies, redaction, and validators;
- integration tests for sessions, CSRF, access, KMS, uploads, webhooks, retention, and provider uncertainty;
- authorization matrix and negative IDOR tests;
- property/concurrency tests for money, inventory, custody, idempotency, and one-time credentials;
- DAST/SAST/dependency/secret scans;
- manual abuse, phishing, recovery, privileged, export, and incident scenarios;
- accessibility/privacy testing of consent, rights, errors, and security flows;
- performance/DoS budgets;
- backup/restore/re-deletion tests;
- provider sandbox and controlled live drills; and
- evidence format for launch readiness.

## 111. Security decision records

The following decisions are accepted:

| ID | Decision |
|---|---|
| SDR-001 | OWASP ASVS 5.0 Level 2 is the pilot baseline with selected Level 3 controls. |
| SDR-002 | Opaque revocable server sessions remain the browser authentication model. |
| SDR-003 | Argon2id is the password hashing algorithm. |
| SDR-004 | Privileged roles require MFA; TOTP is pilot minimum and passkeys are the target. |
| SDR-005 | High-impact fields use application-level envelope encryption and managed KMS. |
| SDR-006 | Noma does not collect raw payment-card data. |
| SDR-007 | The closed pilot defaults to adults 18+ until an approved minor flow exists. |
| SDR-008 | Data processing requires inventory, purpose, lawful basis, retention, and owner. |
| SDR-009 | High-risk processing requires a DPIA before activation. |
| SDR-010 | Cross-border transfers require documented basis and safeguards. |
| SDR-011 | Optional analytics/marketing tracking requires approved consent/legal configuration. |
| SDR-012 | Session replay is disabled for the closed pilot. |
| SDR-013 | Privileged access is reviewed monthly during the closed pilot. |
| SDR-014 | Qualifying breaches use a 72-hour NDPC notification capability. |
| SDR-015 | Retention periods are conservative internal policy pending formal legal/DPCO approval. |
| SDR-016 | Money, custody, provider, enforcement, and audit history are corrected, not rewritten. |
| SDR-017 | Security exceptions expire and cannot waive Critical launch blockers. |
| SDR-018 | Security, privacy, consumer protection, and recovery gates are required before paid launch. |

## 112. Traceability to locked scope decisions

1. Food activation requires food safety, privacy, seller, cancellation, evidence, and incident controls.
2. External Vendors require cross-border/inbound data, partner access, and minimum-data review.
3. FBN requires physical access, custody, inventory, quarantine, worker/staff access, and safety procedures.
4. Pre-Owned requires actual-unit evidence, ownership/serial protection, restricted electronics, and no false verified claim.
5. Disabled commerce types cannot create data or routes merely because schema support exists.
6. Multi-vendor checkout requires item/vendor isolation and immutable financial allocations.
7. Payments, earnings, refunds, and payouts require provider finality, ledger integrity, MFA, maker-checker, and reconciliation.
8. Hybrid dispatch requires assignment scope, one-time custody credentials, evidence, device/session controls, and safe offline boundaries.
9. Covenant verification requires minimisation, lawful basis, evidence deletion, duplicates/recovery, and no unrelated academic data.
10. Distinct surfaces require server-side capability/field scope and privileged access controls.
11. Messaging requires privacy, anti-bypass, harassment, evidence, and staff-access controls.
12. Protection cases require secure evidence, human serious decisions, holds, appeals, and consumer redress.
13. Search, merchandising, and AI require transparency, minimum analytics, no personalised pricing, and human review.
14. Security, monitoring, backups, recovery, CI, and incident response are launch gates.
15. Pilot activation, capacity, restriction, emergency pause, and expansion require security/privacy evidence.

## 113. Official research basis reviewed 30 July 2026

This document was checked against current official or authoritative primary guidance available on 30 July 2026, including:

- Nigeria Data Protection Commission — Nigeria Data Protection Act 2023;
- Nigeria Data Protection Commission — NDP Act General Application and Implementation Directive 2025 materials, FAQs, registration, DPCO, privacy, rights, DSAR, DPIA, breach-reporting, and compliance-return guidance;
- Federal Competition and Consumer Protection Commission — FCCPA mandate, business obligations, e-commerce guidance, product-safety and sales-promotion guidance;
- OWASP — Application Security Verification Standard 5.0 and security cheat-sheet guidance;
- NIST — SP 800-63-4 Digital Identity Guidelines and SP 800-61 Revision 3 Incident Response guidance;
- PCI Security Standards Council — current SAQ A/SAQ A-EP e-commerce eligibility and scanning clarifications; and
- the official provider documentation already recorded in `docs/09-integrations.md`.

The legal/regulatory environment may change. The Privacy Lead and counsel MUST re-check applicable laws, NDPC directives/guidance, FCCPC requirements, provider terms, and filing obligations before live launch and at each formal compliance review.

## 114. Security and compliance definition of done

A feature or processing activity is complete only when the applicable items are satisfied:

1. scope and journey are identified;
2. threat/abuse cases are assessed;
3. data purpose, classification, lawful basis, owner, recipients, transfer, and retention are recorded;
4. DPIA/legitimate-interest/provider assessment is completed where required;
5. authentication assurance and recovery behaviour are correct;
6. server authorization, field projection, and separation of duty are tested;
7. input, output, upload, browser, API, and provider boundaries are secured;
8. secrets and keys use approved stores and rotation;
9. sensitive fields/files use approved encryption and access controls;
10. state, idempotency, concurrency, audit, and provider finality are preserved;
11. logs/analytics are minimised and redacted;
12. retention, deletion, legal hold, and rights behaviour exist;
13. monitoring, alerts, runbook, incident owner, and pause/recovery behaviour exist;
14. ASVS/applicable security tests and CI gates pass;
15. vulnerabilities/exceptions are resolved or validly approved;
16. customer policy/status representation is truthful and accessible;
17. production access and provider accounts are reviewed;
18. security/privacy/legal/finance/operations approvals are collected as applicable; and
19. no deferred capability or new data use is silently activated.

## 115. Final security and compliance declaration

Noma's Covenant University pilot will operate with defence in depth across identity, authorization, business state, money, inventory, custody, evidence, providers, infrastructure, staff access, and recovery.

One human identity will use revocable server-managed sessions, calibrated Argon2id password hashing, verified contact, privileged MFA, recent authentication, scoped capabilities, maker-checker approval, and audited break-glass containment. No broad administrator, browser callback, provider dashboard, queue, cache, analytics event, AI signal, or direct database edit may replace authoritative Noma state, provider-confirmed money movement, balanced ledger history, or custody evidence.

Noma will process only necessary personal data for documented purposes and lawful bases, provide clear notices and rights workflows, assess high-risk processing through DPIAs, document international transfers and providers, minimise analytics, keep private files private, encrypt high-impact fields, review access, enforce deletion/retention, and maintain a 72-hour qualifying breach-notification capability. The closed pilot defaults to adults unless a compliant minor flow is approved.

Consumer-facing product, price, promotion, condition, delivery, cancellation, refund, warranty, safety, and verification claims will remain accurate and versioned. Complaints and remedies will be accessible, traceable, and human-controlled where material.

Paid orders cannot launch until critical account, authorization, payment, payout, file, secret, encryption, monitoring, backup, recovery, privacy, consumer-protection, incident, and legal-readiness gates pass. Growth, launch dates, and provider convenience do not override safety, rights, financial integrity, or regulatory duties.
