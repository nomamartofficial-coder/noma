# Noma Integrations and Provider Operations

> **Repository path:** `docs/09-integrations.md`  
> **Status:** Binding Covenant pilot provider and integration contract  
> **Version:** 1.0  
> **Effective date:** 30 July 2026  
> **Applies to:** Noma's two-month Covenant University pilot build  
> **Primary audience:** Founders, Product, Engineering, Codex, Quality Assurance, DevOps, Security, Operations, Finance, Support, Trust and Safety, Data, and future contributors

---

## 1. Purpose

This document defines the external providers Noma will use for the Covenant University pilot, the adapters through which Noma communicates with them, the environments and credentials used for each stage, the webhook and callback boundaries, the failure and retry rules, reconciliation procedures, operational ownership, provider-exit requirements, and the evidence required before an integration can handle real users or money.

It translates:

- the locked scope in `docs/01-mvp-scope.md`;
- the actor, capability, scope, assurance, and separation-of-duty rules in `docs/02-user-roles.md`;
- the end-to-end journeys in `docs/03-user-journeys.md`;
- the product surfaces and truthful user-facing states in `docs/04-information-architecture.md` and `docs/05-design-system.md`;
- the runtime, module, provider-port, outbox, queue, observability, environment, and recovery boundaries in `docs/06-technical-architecture.md`;
- the provider, attempt, event, reconciliation, file, notification, and projection records in `docs/07-domain-model.md`; and
- the provider-final, uncertain, retry, reversal, and reconciliation lifecycles in `docs/08-state-machines.md`

into one implementation and operations contract.

The objective is to prevent Engineering, Codex, operators, and future contributors from independently inventing:

- a different provider inside a feature module;
- SDK-specific business logic;
- webhook trust rules;
- retry behaviour that duplicates money or messages;
- environment credentials;
- callback-based payment truth;
- permanent public file URLs;
- analytics containing sensitive data;
- provider statuses exposed directly as Noma states;
- integrations with no reconciliation or exit path;
- production use of test credentials; or
- launch dependencies for features that remain deferred.

An integration is not complete because an SDK call returns `200`. It is complete only when provider selection, adapter contract, authentication, idempotency, webhook verification, timeout behaviour, status mapping, reconciliation, observability, operational ownership, data handling, test evidence, outage behaviour, and provider exit are defined together.

---

## 2. Authority and document hierarchy

1. `docs/01-mvp-scope.md` controls whether a provider-backed capability is active, progressive, manual, prohibited, or deferred.
2. `docs/02-user-roles.md` controls who may configure, invoke, approve, reconcile, retry, export, or view integration data.
3. `docs/03-user-journeys.md` controls required end-to-end outcomes and exception handling.
4. `docs/04-information-architecture.md` and `docs/05-design-system.md` control truthful presentation of provider states and uncertainty.
5. `docs/06-technical-architecture.md` controls provider ports, runtime boundaries, transactions, queues, outbox events, secrets, observability, and deployment topology.
6. `docs/07-domain-model.md` controls provider records, identifiers, constraints, append-only history, financial records, and authoritative persistence.
7. `docs/08-state-machines.md` controls final Noma states, transitions, provider uncertainty, deadlines, retries, reversals, and concurrency.
8. **This document controls provider selection, adapter contracts, provider environments, payload handling, webhook verification, failure classification, reconciliation, integration operations, and provider-exit rules.**
9. `docs/10-security-and-compliance.md` may strengthen encryption, legal, retention, transfer, access-review, and breach controls but must not weaken this contract.
10. `docs/11-testing-strategy.md` will turn these requirements into test suites, simulations, contract tests, chaos tests, and launch evidence.
11. `docs/13-covenant-pilot-readiness.md` will decide whether the selected providers and accounts are operationally ready for real orders.

A provider dashboard setting, SDK default, browser callback, provider marketing claim, Codex-generated client, or convenience retry must not override Noma's internal state, authorization, financial, custody, privacy, or audit rules.

---

## 3. Source-derived requirements and provider decisions

### 3.1 Source-locked requirements

The supplied Noma documents and completed Build Pack contracts require:

- Paystack as the primary payment and transfer provider;
- server-side payment initialisation and verification;
- HMAC webhook verification and raw event preservation;
- exact amount, currency, internal reference, and provider-reference validation;
- duplicate-event and duplicate-fulfilment protection;
- full and partial refunds;
- resolved payout accounts, transfer recipients, transfer attempts, and provider-final payout states;
- a separate Web runtime, API runtime, Worker runtime, PostgreSQL database, and Redis-compatible queue store;
- S3-compatible private file storage and short-lived signed access;
- transactional email for verification, security, orders, refunds, and payouts;
- in-app notifications and progressive web push;
- optional later SMS rather than an SMS launch dependency;
- error monitoring, product analytics, structured logs, metrics, traces, alerts, and health checks;
- GitHub Actions and protected deployment environments;
- PostgreSQL search for the pilot rather than an external search provider;
- a manually operated CU Express boundary until a real partner API exists;
- no Covenant SSO or university-directory assumption until formal cooperation exists;
- provider adapters that keep domain/application logic independent of vendor SDKs;
- no network calls inside authoritative database transactions;
- idempotent outbox-driven asynchronous work;
- first-class reconciliation for uncertain provider outcomes; and
- production launch gates for payments, refunds, payouts, notifications, monitoring, backups, and provider outage runbooks.

### 3.2 Provider decisions locked by this document

| Capability | Pilot decision | Activation | Authoritative role |
|---|---|---:|---|
| Buyer payments | **Paystack** | Required before paid pilot | Provider confirms movement; PostgreSQL records Noma workflow and ledger truth |
| Refund submission | **Paystack Refund API** | Required before paid pilot | Provider confirms refund state; Noma controls approval and allocation |
| Seller bank resolution | **Paystack Verification API** | Required before seller payout | Provider returns resolved name; seller confirms; Noma controls account status |
| Seller payouts | **Paystack Transfers** | Required before seller withdrawal | Provider confirms transfer outcome; Noma ledger controls entitlement |
| Web hosting | **Vercel** | Required | Deployment host only; no financial/business authority |
| API and Worker hosting | **Render, Frankfurt** | Required | Compute host only |
| PostgreSQL | **Render Postgres, Frankfurt** | Required | Authoritative Noma transactional store |
| Queue/cache store | **Render Key Value, Frankfurt** | Required | Delivery/cache mechanism; never authoritative business truth |
| Object storage | **Amazon S3, `eu-central-1`** | Required | Authoritative file bytes; PostgreSQL owns metadata and access policy |
| Transactional email | **Postmark** | Required | Delivery provider; Noma owns notification intent and user-visible state |
| Web push | **Standards-based Web Push with VAPID** | Progressive | Delivery channel only |
| SMS | **No production provider selected** | Deferred/critical-only later | Adapter boundary only |
| Error tracking | **Sentry** | Required | Diagnostic system; not business truth |
| Product analytics | **PostHog EU Cloud** | Required with minimised events | Analytics only; not business truth |
| OTLP metrics/traces/logs | **Grafana Cloud EU** | Required for backend operational telemetry before closed pilot | Observability only |
| DNS and DNSSEC | **Cloudflare DNS** | Required | Authoritative DNS; not application identity or data authority |
| CDN for Web | **Vercel CDN** | Required automatically with Web deployment | Delivery only |
| Search | **PostgreSQL FTS + `pg_trgm`** | Required | PostgreSQL search projection; no external search provider |
| Maps/routes | **No launch dependency; Google Maps-compatible adapter reserved** | Deferred/progressive | Approved Noma location graph remains authoritative |
| Customer support SaaS | **None for pilot** | Not required | Noma Protection Cases and internal work queues remain authoritative |
| CU Express API | **None assumed** | Manual dispatcher workflow | Noma Delivery Job remains authoritative |
| Covenant SSO/directory | **None assumed** | Deferred | Noma hybrid verification remains authoritative |
| Image transformation | **Next.js Image + controlled Worker processing** | Required | Derived media only; originals retained where required |
| CI and repository automation | **GitHub Actions** | Required | Build/deployment evidence only |

### 3.3 Selection caveat

A selected provider may be replaced before production only when:

- the provider cannot onboard or legally support Noma;
- required live features are unavailable to the approved Noma business account;
- a launch-blocking security, privacy, reliability, region, pricing, or support issue is discovered;
- the replacement satisfies the same adapter contract and test evidence;
- migration and rollback are documented; and
- the change is recorded in the Integration Decision Register and approved by Engineering, Finance or Product as applicable.

The existence of a fallback does not permit runtime dual-writing of money or custody without a separately approved migration plan.

---

## 4. Normative language

- **MUST / MUST NOT:** mandatory for the applicable pilot stage.
- **SHOULD / SHOULD NOT:** expected unless an approved, documented reason exists.
- **MAY:** optional within the locked boundary.
- **PROVIDER:** external system operated outside Noma's database and runtime authority.
- **ADAPTER:** Noma infrastructure implementation of a provider-neutral application port.
- **PROVIDER EVENT:** callback/webhook or retrieved provider fact preserved as received.
- **PROVIDER ATTEMPT:** one Noma request to a provider using a stable operation identity.
- **FINAL PROVIDER STATE:** provider-supported conclusive outcome after verification.
- **UNCERTAIN STATE:** Noma cannot prove whether an external effect completed.
- **RECONCILIATION:** controlled process comparing provider truth with Noma records and resolving exceptions.
- **DELIVERY CHANNEL:** mechanism for sending a message; not proof the user saw or acted on it.
- **SANDBOX:** provider test environment that must never move or represent real customer value.
- **LIVE:** provider environment capable of real external effects.
- **FAIL CLOSED:** deny new value movement or sensitive action when safety cannot be established.
- **DEGRADED MODE:** limited operation that preserves accepted obligations without creating unsafe new ones.

---

# Part A — Global integration architecture

## 5. Integration principles

Every integration MUST follow these principles:

1. **Provider replaceability:** feature modules import ports, never provider SDKs.
2. **Internal authority:** Noma owns product, order, allocation, ledger, custody, case, and permission truth.
3. **Provider finality where applicable:** only verified provider evidence can establish external money movement.
4. **No external calls in transactions:** Noma commits intent and outbox work first.
5. **Idempotent value movement:** stable references, event deduplication, and result replay prevent duplicates.
6. **Uncertainty is explicit:** timeouts or network failures do not imply failure or success.
7. **Reconciliation is designed, not improvised:** every money provider has retrieval and exception workflows.
8. **Minimum data:** send only fields required for the provider operation.
9. **Environment isolation:** test, staging, and production credentials and endpoints are separate.
10. **Operational ownership:** every provider has an owner, alert, runbook, status page, and escalation route.
11. **Honest user states:** queued, submitted, processing, delivered, failed, and completed remain distinct.
12. **Exitability:** Noma can export identifiers, templates, files, logs, and configuration required to migrate.
13. **Progressive activation:** adapter existence does not activate the feature.
14. **No provider fan-out from request handlers:** non-critical effects use outbox jobs.
15. **Privacy by default:** message bodies, evidence, identity documents, and bank details do not enter analytics or logs.

## 6. Integration package boundaries

Recommended repository layout:

```text
packages/platform/modules/<module>/application/ports/
packages/integrations/
├── paystack/
├── render/
├── s3/
├── postmark/
├── web-push/
├── sentry/
├── posthog/
├── grafana-otel/
├── cloudflare/
├── maps/
├── sms/
└── partner-logistics/
```

`packages/platform` MUST define ports and provider-neutral values. `packages/integrations` MAY import vendor SDKs and map vendor payloads. Provider adapters MUST NOT write another module's tables directly.

## 7. Common provider configuration

Every provider configuration MUST include:

```ts
interface ProviderConfiguration {
  provider: string;
  environment: "local" | "test" | "staging" | "production";
  enabled: boolean;
  baseUrl?: string;
  accountId?: string;
  region?: string;
  credentialSecretRef: string;
  webhookSecretRef?: string;
  connectTimeoutMs: number;
  requestTimeoutMs: number;
  maxAttempts: number;
  circuitBreakerPolicy: string;
  dataClassification: string[];
  ownerTeam: string;
  statusPageUrlRef?: string;
  runbookPath: string;
}
```

Secret values MUST NOT appear in this record, source control, logs, analytics, screenshots, issue descriptions, or documentation examples.

## 8. Common outbound operation record

Every material provider call SHOULD create or update a provider-attempt record containing:

```text
provider
operation_type
internal_operation_id
provider_reference if known
idempotency/reference key
request payload hash
sanitised request summary
attempt number
started_at / completed_at
timeout and retry classification
HTTP result class
provider result class
finality
correlation/trace id
error code and safe message
raw response object reference where justified
```

Raw responses containing sensitive data MUST be encrypted or minimised and access-scoped.

## 9. Common provider result

Adapters SHOULD return a provider-neutral result:

```ts
type ProviderCallResult<T> =
  | { kind: "accepted"; providerReference: string; data: T }
  | { kind: "final_success"; providerReference: string; data: T }
  | { kind: "final_failure"; providerReference?: string; code: string; retryable: boolean }
  | { kind: "uncertain"; providerReference?: string; code: string }
  | { kind: "rejected"; code: string; safeMessage: string };
```

`accepted` means the provider accepted work, not that the business effect completed.

## 10. Provider SDK policy

- SDKs MAY be used inside adapters when they are maintained, support the required runtime, and expose the underlying provider reference and error response.
- Direct HTTPS calls MAY be preferred where an SDK hides needed status, idempotency, timeout, or raw-response information.
- SDK versions MUST be pinned through the repository lockfile.
- Preview/beta SDK features MUST NOT enter production without review.
- SDK objects MUST NOT cross the adapter boundary into domain or API contracts.
- Provider API versions and material dashboard settings MUST be recorded in the Integration Register.

## 11. Network-call boundary

Authoritative transition transaction:

```text
validate → lock/version-check → write domain records → audit → outbox → commit
```

Worker/provider phase:

```text
claim outbox/job → record attempt → call provider → persist result/event → execute guarded command → notify/alert
```

No provider request, DNS lookup, SMTP call, object upload, analytics call, or map request may occur inside a PostgreSQL transaction that holds business locks.

## 12. Timeout policy

Each adapter MUST define separate:

- connection timeout;
- response timeout;
- whole-operation deadline;
- asynchronous finality deadline; and
- reconciliation deadline.

A network timeout is `uncertain` when the provider may have received the request. Money-moving operations MUST NOT be repeated with a new reference until the prior attempt is conclusively resolved.

## 13. Retry classes

| Failure class | Example | Automatic retry |
|---|---|---|
| Safe transient | DNS failure before connection, provider `503`, rate limit with retry guidance | Bounded retry with same operation identity |
| Ambiguous | Timeout after request may have reached provider | Reconcile first; no blind new operation |
| Permanent validation | Invalid email, invalid bank code, unsupported file type | No automatic retry until input changes |
| Authentication/configuration | Revoked key, wrong environment, webhook secret mismatch | Fail closed; page owner immediately |
| Business rejection | Insufficient provider balance, recipient blocked, refund exceeds charge | Work queue; human/config correction |
| Provider final failure | Verified failed payment/transfer/refund | Apply state-machine failure transition |
| Internal conflict | Stale aggregate version, duplicate idempotency fingerprint mismatch | Do not call provider; resolve Noma state |

## 14. Backoff and retry budget

- Retries MUST use exponential backoff with jitter.
- Provider-specific `Retry-After` guidance SHOULD be respected.
- Money movement MUST use the same provider reference where the provider supports idempotent reuse.
- Each job MUST have a finite attempt budget.
- Exhausted retries MUST enter an exception queue or reconciliation state.
- Dead-letter records MUST include owner, severity, next action, and evidence.
- A human “Retry” action MUST invoke the same guarded application command, not call an SDK directly.

## 15. Circuit breaking and bulkheading

Each provider adapter SHOULD expose health metrics and MAY open a circuit when sustained transient failure occurs.

Circuit behaviour:

- new non-critical work may queue;
- new money initialisation may be paused;
- provider webhooks and status retrieval remain available if the path works;
- accepted orders and custody obligations remain visible;
- one failed provider must not exhaust every Worker thread;
- per-provider concurrency limits MUST be configured; and
- Operations receives a clear degraded-mode banner and runbook link.

## 16. Rate-limit handling

Noma MUST:

- identify provider rate-limit responses separately from generic failures;
- throttle worker concurrency;
- avoid synchronized retries;
- cache low-risk reference data where permitted;
- preserve required provider responses for reconciliation;
- alert when rate limits threaten checkout, refunds, payouts, or security email; and
- never bypass limits by secretly opening unapproved provider accounts.

## 17. Provider status mapping

Provider statuses MUST map through an explicit adapter table. Unknown statuses MUST map to `REQUIRES_RECONCILIATION` or a non-final safe state, never to success.

Example:

```ts
function mapProviderStatus(raw: string): InternalProviderState {
  switch (raw) {
    case "success": return "FINAL_SUCCESS";
    case "failed": return "FINAL_FAILURE";
    case "pending": return "PENDING";
    default: return "UNKNOWN_RECONCILE";
  }
}
```

Mappings MUST be contract-tested against provider fixtures and reviewed when provider documentation changes.

---

# Part B — Webhook and callback contract

## 18. Webhook endpoint design

Provider webhooks use dedicated endpoints:

```text
POST /integrations/paystack/webhook
POST /integrations/postmark/webhook
POST /integrations/posthog/webhook        # only if later required
POST /integrations/partner-logistics/...  # only after approved contract
```

Endpoints MUST:

- be public only where required;
- preserve the raw request bytes before JSON mutation where signature verification needs them;
- enforce a strict body-size limit;
- verify provider origin/authentication before business processing;
- assign a correlation id;
- persist the provider event durably;
- deduplicate the event;
- acknowledge promptly after durable receipt; and
- process business transitions asynchronously.

## 19. Webhook receipt transaction

Within one short transaction Noma MUST:

1. write the provider-event envelope;
2. store raw payload or an encrypted object reference as policy permits;
3. store provider/event identifiers and payload hash;
4. record verification outcome;
5. enforce uniqueness/deduplication;
6. create an outbox/job for event processing; and
7. commit before acknowledging success.

Business order, refund, payout, email, or case effects SHOULD be processed by the Worker after acknowledgement.

## 20. Webhook verification

Verification varies by provider:

- Paystack: HMAC SHA-512 over the raw event payload using the live/test secret key for the matching environment; optional IP allow-listing is defence in depth, not a replacement for signature verification.
- Postmark: unique webhook URL, Basic HTTP authentication and documented provider IP controls; payload/event identifiers still require deduplication.
- Future providers: signed secret or asymmetric signature preferred; unsupported unsigned callbacks require explicit security review.

A verification failure MUST:

- return a non-success response where safe;
- create a security metric with no sensitive payload;
- avoid business processing;
- retain only the evidence permitted by security policy; and
- alert on repeated failures.

## 21. Webhook event identity

Preferred deduplication order:

1. documented provider event id;
2. provider object id + event type + event timestamp/version;
3. stable provider reference + final status;
4. payload hash as a last-resort duplicate signal.

The database MUST enforce an appropriate unique key. A duplicate verified event returns success after confirming the original receipt exists.

## 22. Webhook acknowledgement

- Acknowledge only after durable receipt.
- Do not wait for email sending, order confirmation, ledger work, or other external calls.
- A temporary database failure SHOULD return a retryable provider response.
- A permanently malformed/unauthenticated event SHOULD not be repeatedly accepted.
- Provider-specific retry behaviour MUST be documented in the runbook.

## 23. Callback and browser return policy

Browser callbacks are navigation aids only.

They MAY:

- carry a provider reference;
- return the user to a payment-processing page;
- trigger a server-side verification request; and
- display the latest safe Noma state.

They MUST NOT:

- mark payment successful;
- create orders directly;
- release stock without server verification;
- expose provider secret material;
- accept amount/currency from the browser as truth; or
- represent an unresolved result as failed merely because the user closed the browser.

## 24. Webhook replay

Authorised staff or a service principal MAY request replay of a durably stored event when:

- the event is verified;
- the original processing failed or is incomplete;
- the event processor is idempotent;
- the current aggregate state still permits the transition; and
- the replay is audited.

Replay MUST NOT create a new provider event identity or rewrite the raw event.

## 25. Provider event retention

Money, payout, refund, account-resolution, and security-critical provider events MUST be retained according to the financial/audit retention policy in Part 10. Lower-risk email delivery events MAY have shorter retention. Payloads SHOULD be minimised or detached from long-term metadata when the raw personal data is no longer necessary.

---

# Part C — Environment and credential model

## 26. Environment matrix

| Noma environment | External effects | Provider environment | Real recipients/money |
|---|---|---|---|
| Local | Simulators/fixtures by default | Test/sandbox only | Prohibited |
| CI | Deterministic mocks + contract fixtures | No live credentials | Prohibited |
| Preview | Non-production datasets | Test/sandbox; email sandbox | Prohibited |
| Staging | Production-like isolated data | Test/sandbox; controlled test recipients | Prohibited |
| Production simulation | Live infrastructure, real Noma staff only | Test mode unless controlled live drill approved | Restricted |
| Closed pilot | Real approved operations | Live | Permitted within launch gates |

No production credential may be available to preview deployments or pull requests.

## 27. Credential separation

Every provider MUST use distinct test and live credentials where supported. Required controls:

- production credentials exist only in production hosting/secret scopes;
- staging and preview use independent accounts/servers/projects where feasible;
- webhook URLs are environment-specific;
- provider references include an environment-safe prefix where permitted;
- environment mismatch is a hard failure;
- staff dashboards clearly show test versus live;
- credentials are rotated after exposure or staff departure; and
- a credential inventory records owner, purpose, scope, creation date, last rotation, and revocation procedure.

## 28. Secret locations

| Secret type | Approved location |
|---|---|
| Vercel Web secrets | Vercel environment variables scoped by environment |
| Render API/Worker/database secrets | Render environment groups/service secrets |
| CI deployment credentials | GitHub environment secrets with required reviewers |
| Local development | ignored local secret file or approved secret CLI; never committed |
| Provider webhook secrets | API/Worker production secret scope only |
| Public DSNs/keys | explicitly classified public values only; still environment-scoped |

A dedicated external secrets manager MAY be introduced later. Provider-native encrypted environment storage is acceptable for the controlled pilot when access is least-privileged and audited.

## 29. Secret rotation

Rotation runbooks MUST cover:

- creating a replacement credential;
- overlapping old/new keys where provider support allows;
- updating the correct environment;
- testing with a controlled request;
- revoking the prior key;
- verifying no old runtime still uses it;
- recording the change; and
- incident response where compromise is suspected.

Paystack key rotation requires particular care because webhook signature verification and outbound API authentication depend on the environment secret.

## 30. Local provider simulation

Local and CI tests MUST use deterministic simulators for:

- successful, pending, failed, abandoned, reversed, and mismatched payments;
- duplicate and out-of-order webhooks;
- refund processing, failure, and needs-attention states;
- transfer pending, OTP, success, failure, reversal, and uncertainty;
- bank-account resolution success and mismatch;
- email accepted, delivered, bounced, complained, and suppressed;
- S3 upload complete, wrong content type, oversized, missing, and malware-rejected;
- queue outage and delayed delivery;
- analytics unavailable; and
- map/SMS provider disabled.

Simulators MUST implement the same application ports as production adapters.

---

# Part D — Paystack payment, refund, account, and transfer integration

## 31. Paystack selection

Paystack is selected because the locked product decisions require Nigerian naira payments, server verification, refunds, bank-account resolution, transfer recipients, and seller transfers through one primary provider.

Noma MUST NOT use Paystack split settlement as a substitute for its internal seller-earnings ledger and protected-release rules during the Covenant pilot.

## 32. Paystack adapters

```ts
interface PaymentProvider {
  initialisePayment(input: InitialisePaymentInput): Promise<InitialisePaymentResult>;
  verifyPayment(reference: string): Promise<VerifiedPaymentResult>;
}

interface RefundProvider {
  submitRefund(input: SubmitRefundInput): Promise<SubmitRefundResult>;
  retrieveRefund(providerRefundId: string): Promise<VerifiedRefundResult>;
}

interface BankAccountProvider {
  listBanks(country: "nigeria", currency: "NGN"): Promise<Bank[]>;
  resolveAccount(bankCode: string, accountNumber: string): Promise<ResolvedAccount>;
}

interface TransferProvider {
  createRecipient(input: RecipientInput): Promise<RecipientResult>;
  initiateTransfer(input: TransferInput): Promise<TransferResult>;
  verifyTransfer(reference: string): Promise<VerifiedTransferResult>;
  finaliseOtp?(transferCode: string, otp: string): Promise<TransferResult>;
}
```

## 33. Payment initialisation

Only the API/Worker may initialise payment.

Required input is derived from a persisted Checkout Session:

```text
internal checkout id
unique Noma payment reference
verified expected amount in kobo
currency = NGN
buyer email required by provider
safe callback URL
minimal metadata: internal opaque ids and environment
```

The adapter MUST NOT accept price, seller allocation, delivery fee, or currency from the browser as authoritative.

## 34. Paystack reference format

Provider references MUST be:

- generated server-side;
- unique across the integration;
- stable for the same attempt;
- limited to provider-supported characters;
- non-secret;
- environment-identifiable without exposing personal data; and
- linked to exactly one Noma Payment Attempt.

Example:

```text
noma_prod_pay_01K...
noma_test_pay_01K...
noma_prod_trf_01K...
```

## 35. Payment verification

Before `Payment.SUCCEEDED`, Noma MUST verify server-side:

- provider transaction status is final success;
- provider reference equals the expected reference;
- provider amount equals the frozen expected amount in kobo;
- provider currency is `NGN`;
- provider environment/domain matches Noma environment;
- the event/reference has not already confirmed another payment;
- the checkout is not already confirmed incompatibly; and
- the same value has not been fulfilled twice.

A provider API envelope success is not the transaction status; the adapter must read the provider transaction status field.

## 36. Payment webhook handling

Relevant payment events are mapped through the verified event pipeline. `charge.success` triggers a server-side verification command rather than directly creating an order from raw webhook fields.

Webhook and browser verification may race. Both MUST converge on one idempotent `confirmVerifiedPayment` command and one unique Checkout-to-Order relation.

## 37. Payment uncertainty

Uncertainty includes:

- initialisation timeout after request transmission;
- callback received but verification unavailable;
- webhook and retrieval disagree;
- amount or currency mismatch;
- reference collision;
- success event with no matching Checkout;
- provider success after local expiry;
- paid Checkout whose order-confirmation transaction failed; or
- provider incident preventing final retrieval.

Required action:

```text
freeze unsafe fulfilment
protect reservation where policy permits
create Reconciliation Exception
show “Payment confirmation in progress”
do not request another payment blindly
retrieve provider truth
execute one guarded resolution
```

## 38. Payment reconciliation

Automated reconciliation runs for:

- payments in non-final state beyond threshold;
- verified success without confirmed order;
- order marked paid without provider verification;
- amount/currency mismatch;
- duplicate provider references;
- provider events not processed;
- callback-only records; and
- provider/Noma daily total differences.

Finance sees exception age, amount, provider reference, Noma reference, last retrieval, likely action, owner, and full audit history.

## 39. Refund submission

Refund approval and provider submission are separate.

Before submission:

- Remedy/Refund is approved by authorised Noma actor;
- exact refundable amount is calculated from item/payment allocations;
- cumulative processed/submitted amount cannot exceed the captured payment;
- seller earning/holds/ledger consequences are committed;
- refund reference and idempotency identity are stable; and
- outbox work is created.

The Worker calls Paystack using the original transaction id/reference and the approved amount for full or partial refund.

## 40. Refund statuses

Provider statuses map to Noma states such as:

| Provider meaning | Noma provider-attempt state | Refund state |
|---|---|---|
| request accepted/pending | `ACCEPTED` | `PROCESSING` |
| processing | `PROCESSING` | `PROCESSING` |
| processed/final success | `FINAL_SUCCESS` | `PROCESSED` |
| failed | `FINAL_FAILURE` | `FAILED` |
| needs attention/unknown | `UNCERTAIN` | `REQUIRES_RECONCILIATION` |

The UI MUST not say “Refund completed” until provider-final success is verified.

## 41. Refund reconciliation

Reconciliation checks:

- provider refund id/reference;
- original payment;
- submitted and processed amounts;
- currency;
- current provider status;
- duplicate submissions;
- provider event history;
- Noma ledger entries;
- customer-visible state; and
- whether a manual provider action occurred outside Noma.

Manual Paystack-dashboard refunds are prohibited except emergency runbook use. If one occurs, it MUST be imported and reconciled before the case can close.

## 42. Bank list and account resolution

Noma uses Paystack bank listing and account-resolution endpoints server-side.

Controls:

- cache the provider bank list with timestamp and safe refresh;
- never trust a client-supplied account name;
- resolve bank code + account number server-side;
- display the resolved name for explicit seller confirmation;
- store the full account number encrypted and a masked display value separately;
- create/change payout-account state through the approved state machine;
- do not create a transfer recipient until the payout account is approved for use; and
- rate-limit resolution to prevent abuse.

Resolved name is evidence, not proof of seller ownership or authorization by itself.

## 43. Transfer recipient creation

For Nigerian bank payouts Noma creates a Paystack `nuban` recipient after:

- payout account approval;
- seller confirmation of resolved name;
- required cooling period or risk review;
- encrypted account details are available to the server; and
- duplicate active-recipient checks pass.

Provider recipient code is stored as a token. Account changes create a new recipient relation rather than mutating historical payout attempts.

## 44. Transfer initiation

Before transfer initiation:

- Withdrawal is approved;
- amount remains reserved from `AVAILABLE` earnings;
- payout account and recipient are active;
- seller and institution payout controls permit it;
- provider balance/operational controls pass;
- maker-checker threshold is satisfied;
- stable transfer reference exists; and
- a Transfer Attempt is created.

The initial API response may be accepted, pending, OTP-required, blocked, or otherwise non-final. It MUST NOT mark the Payout paid.

## 45. Transfer approval and OTP

Paystack transfer controls may require OTP or server approval depending on account configuration.

Noma's pilot preference is:

1. Finance approval inside Noma;
2. Paystack server-approval validation where available;
3. provider OTP handled only by authorised Finance owner where required; and
4. webhook/retrieval confirmation of final outcome.

The provider approval endpoint MUST validate reference, amount, currency, recipient, internal approval state, and current attempt before returning approval. It MUST perform no long-running work.

## 46. Transfer finality

Provider states are interpreted conservatively:

- `pending`, `otp`, and `received` are non-final;
- `success` is provider-final success for Noma's attempt, while Finance may still handle bank-credit complaints separately;
- `failed`, `reversed`, `abandoned`, `blocked`, and `rejected` are conclusive provider outcomes according to documented semantics; and
- unknown states require reconciliation.

A retry uses the same reference until a conclusive outcome is proven. A new attempt/reference is created only after the prior attempt is conclusively failed/reversed/abandoned and Noma's state machine permits another attempt.

## 47. Transfer webhooks

Noma processes at least:

```text
transfer.success
transfer.failed
transfer.reversed
```

Each event is signature-verified, deduplicated, persisted, matched to the expected transfer reference/recipient/amount/currency, and processed through the transfer state machine.

A reversal after a previously recorded success creates explicit reversal ledger entries and changes the payout workflow; history is not overwritten.

## 48. Paystack live-readiness gate

Before real money:

- Noma business account is fully approved for required products;
- live payment, refund, account-resolution, recipient, and transfer capabilities are enabled;
- live and test keys are separated;
- webhook and transfer-approval endpoints use production domains;
- transfer balance funding/monitoring is understood;
- controlled live payment, refund, and transfer drills pass;
- duplicate webhook and timeout simulations pass;
- provider dashboard access uses MFA and least privilege;
- Finance and Security own incident contacts; and
- reconciliation reports match provider totals.

---

# Part E — Hosting, database, queue, and deployment providers

## 49. Web hosting: Vercel

Vercel hosts `apps/web` because it provides first-class Next.js deployment, isolated Preview and Production environments, generated preview URLs, environment-scoped configuration, deployment inspection, promotion, and rollback.

Vercel MUST NOT host authoritative Worker jobs or replace the NestJS API for protected business commands.

## 50. Vercel deployment model

```text
feature branch / PR → Preview deployment
main candidate → staging/production-like verification
approved commit → Production promotion
incident → rollback to prior known deployment
```

Controls:

- Preview deployments use non-production API endpoints and credentials;
- preview access SHOULD be protected;
- production promotion follows CI and required review;
- source maps are uploaded to Sentry without being publicly exposed;
- deployment id and Git commit are attached to telemetry;
- production rollback does not roll back database migrations automatically; and
- server-rendered pages never become payment or authorization authority.

## 51. Backend hosting: Render Frankfurt

Render hosts:

- one public NestJS API Web Service;
- one continuously running NestJS/BullMQ Background Worker;
- optional controlled cron/scheduled process only where normal Worker scheduling is insufficient;
- Render Postgres; and
- Render Key Value.

API, Worker, Postgres, and Key Value MUST use the same Frankfurt region and private networking where supported.

## 52. Render service boundaries

| Service | Public ingress | Outbound provider access | Scaling rule |
|---|---:|---:|---|
| API | Yes | Limited synchronous retrieval/initialisation where required | Scale on request latency/CPU/connections |
| Worker | No public business ingress | Yes | Scale on queue depth/job age/provider concurrency |
| Postgres | Private/restricted | N/A | Scale on storage, CPU, connections, locks |
| Key Value | Private/restricted | N/A | Scale on memory, connection, persistence, queue backlog |

Webhooks terminate at API and enqueue processing. Long-running reconciliation and notifications run in Worker.

## 53. Render health and deployment

API health:

```text
/live     process alive
/ready    database/config/provider-critical readiness
/health/dependencies  restricted diagnostic summary
```

Worker health is determined by heartbeat, last successful job, queue lag, outbox lag, and provider-specific job age.

Deployments MUST support:

- health-check failure prevention;
- release version tagging;
- migration step before incompatible application use;
- rolling or controlled restart;
- rapid rollback of application code; and
- separate emergency pause of business capability.

## 54. Render Postgres

Render Postgres is the pilot's authoritative database.

Required configuration:

- paid production plan;
- Frankfurt region;
- connection encryption;
- separate staging database;
- PITR enabled through the provider plan;
- connection pool limits sized for API + Worker + migrations;
- alerts for CPU, storage, connections, replication/recovery conditions;
- no public access unless narrowly required and restricted;
- scheduled logical exports to S3 as independent recovery evidence; and
- a successful isolated restoration drill before paid launch.

## 55. Database backup layering

Noma uses:

1. Render provider-managed continuous backups/PITR;
2. scheduled encrypted logical backups exported to a restricted S3 backup bucket;
3. version-controlled migrations and seed/fixture definitions; and
4. documented restoration verification.

A provider snapshot existing in a dashboard is not sufficient launch evidence. A restoration must be tested.

## 56. Render Key Value

Render Key Value provides a Redis-compatible/Valkey-compatible store for BullMQ and limited cache use.

Required controls:

- paid persistent production instance;
- same Frankfurt region as API/Worker;
- private connection;
- queue-specific prefixes/namespaces;
- memory and eviction policy reviewed for queue safety;
- business jobs recoverable from PostgreSQL outbox/authoritative records;
- no session, payment, ledger, custody, or case truth exists only in Key Value;
- queue lag and failed-job alerts; and
- cache loss must degrade performance, not corrupt business state.

## 57. Queue recovery

If Key Value is lost or unavailable:

- API continues only for flows whose outbox writes can commit safely;
- provider webhooks are durably received where database remains available;
- outbox publication pauses;
- new high-risk work may be paused by capability;
- Worker resumes from PostgreSQL outbox and due records after recovery;
- idempotency prevents duplicate effects; and
- Operations receives backlog/age visibility.

## 58. Infrastructure provider outage modes

| Failure | New checkout | Existing money/custody | Required response |
|---|---|---|---|
| Vercel unavailable | unavailable/degraded | API/Worker continue internally | status page; no false completion |
| API unavailable | stop protected commands | Worker/webhooks may continue | restore/rollback; reconcile callbacks |
| Worker unavailable | API commits outbox only if backlog safe | no new async completion | pause risky features if age threshold exceeded |
| Postgres unavailable | fail closed | no authoritative mutation | incident; restore/failover |
| Key Value unavailable | limit/queue via outbox | preserve DB truth | recover queue and replay outbox |
| Region-wide Render outage | pause commerce | provider events may queue/retry externally | incident and recovery plan; no duplicate re-initiation |

---

# Part F — File and media integration

## 59. Object storage: Amazon S3

Amazon S3 in `eu-central-1` stores:

- public-approved product/media derivatives;
- private original product images where required;
- identity/verification evidence;
- case and return evidence;
- custody and incident evidence;
- exports;
- encrypted logical backups; and
- optional tamper-resistant audit exports.

PostgreSQL owns File metadata, classification, owner, access policy, retention, scan state, and business links.

## 60. Bucket separation

Recommended production buckets:

```text
noma-prod-public-media
noma-prod-private-evidence
noma-prod-backups
noma-prod-audit-archive   # only if Object Lock is activated
```

Staging uses completely separate buckets and credentials.

Public media MUST contain only approved derivative objects. Identity, bank, case, private message, security, and sensitive evidence objects MUST never be placed in a public bucket.

## 61. Object key policy

Keys MUST be generated and non-guessable enough to avoid personal identifiers:

```text
<environment>/<classification>/<yyyy>/<mm>/<uuid>/<variant>
```

Keys MUST NOT contain:

- email addresses;
- matric numbers;
- phone numbers;
- bank-account numbers;
- buyer/seller names;
- case allegations; or
- secret tokens.

## 62. Presigned upload flow

```text
client requests upload intent
→ API authorises actor/resource/type/size
→ File record = PENDING_UPLOAD
→ API creates short-lived presigned PUT/POST
→ client uploads directly to S3
→ client/API reports completion
→ Worker HEADs/verifies object metadata
→ scan/process job
→ File = AVAILABLE or QUARANTINED/REJECTED
```

The presigned request MUST constrain key, expiry, expected content type where reliable, and maximum size where supported. A URL is a bearer capability and must be short-lived.

## 63. Upload verification

After upload Noma MUST verify:

- expected object key exists;
- size is within limit;
- content signature matches allow-listed type;
- image can be decoded where applicable;
- declared and detected MIME types are compatible;
- upload belongs to the current File record;
- object was not replaced after verification;
- malware/security scan result is acceptable where required; and
- original/derivative relation is recorded.

A browser-provided filename or MIME type is not sufficient evidence.

## 64. Download/access flow

Private access requires:

- authenticated/authorised request;
- resource and field-level scope;
- current retention/hold policy;
- short-lived presigned GET or server-mediated stream;
- access audit for sensitive classes; and
- no permanent link copied into chat, analytics, or email.

## 65. Encryption, versioning, lifecycle, and Object Lock

- S3 server-side encryption is required.
- Bucket public access is blocked by default.
- Versioning SHOULD be enabled for private evidence and backups.
- Lifecycle policies MAY transition or expire objects only according to Noma retention rules.
- Object Lock MAY be enabled for a dedicated audit/archive bucket, not casually on ordinary media buckets.
- KMS keys MAY be introduced where Part 10 requires stronger separation.
- Losing metadata access must not make retained evidence silently public.

## 66. Image derivatives

Worker processing MAY create:

- thumbnail;
- listing-card image;
- product-detail image;
- safe compressed format; and
- blur placeholder.

Rules:

- pre-owned originals remain preserved;
- transformations must not remove defects or alter evidence;
- derivatives are linked to the original;
- Next.js Image may optimise delivery but does not own the original;
- reprocessing is idempotent; and
- processing failure leaves the original private and visible to Operations.

## 67. S3 outage behaviour

- New evidence-requiring actions fail safely or create an incomplete draft without final submission.
- Existing orders do not become completed because evidence is unavailable.
- Public product images may show accessible placeholders.
- Private evidence download failure creates a retryable operational state.
- Upload intents expire and may be reissued without duplicating File identity.
- Backups and exports alert on missed schedule.

---

# Part G — Transactional communication

## 68. Transactional email: Postmark

Postmark is selected for verification and transactional email because it provides dedicated transactional message streams, delivery/bounce/complaint webhooks, sandbox operation, templates, and inbound-email capability.

Postmark stores service data outside Nigeria; Part 10 MUST document the processor assessment, DPA, cross-border transfer basis, retention configuration, and minimum-content policy before production.

## 69. Email adapter

```ts
interface EmailProvider {
  send(message: TransactionalEmail): Promise<EmailSubmissionResult>;
}

interface TransactionalEmail {
  notificationId: string;
  templateKey: string;
  templateVersion: string;
  recipient: string;
  locale: string;
  variables: Record<string, string | number | boolean>;
  metadata: Record<string, string>;
  replyTo?: string;
}
```

Provider template ids remain infrastructure configuration. Domain/application code uses Noma template keys.

## 70. Email streams and domains

At minimum, separate Postmark servers/streams or equivalent isolation SHOULD exist for:

```text
production-transactional
staging-transactional
security-critical
inbound-support (only if activated)
```

Sending domains/subdomains MUST configure SPF, DKIM, and DMARC through Cloudflare DNS. Marketing/broadcast email is not a launch requirement and MUST NOT share transactional consent logic.

## 71. Email categories

Required transactional categories include:

- email verification;
- password reset and recovery;
- security alerts;
- Covenant verification outcome;
- seller/rider approval;
- order/payment confirmation;
- preparation, pickup, delivery, and exception alerts;
- cancellation/refund updates;
- case and appeal deadlines;
- payout-account change;
- withdrawal and payout status; and
- recall/safety notices.

Email content MUST avoid unnecessary sensitive details and must direct the user to authenticated Noma pages for full case, bank, or security information.

## 72. Email idempotency

Noma Notification identity prevents duplicate logical email. Provider retry/replay uses the same Notification and records multiple attempts without creating a second business event.

A message accepted by Postmark means `SUBMITTED`, not `DELIVERED` or `READ`.

## 73. Email webhooks

Relevant events MAY include:

- delivery;
- bounce;
- spam complaint;
- subscription change where applicable; and
- inbound message if support ingestion activates.

These events are authenticated, deduplicated, stored with minimised payloads, and mapped to Notification Delivery state. They do not change order/payment/refund/payout truth.

## 74. Bounce and suppression handling

- Hard bounce/complaint suppresses repeated non-security delivery as policy defines.
- Critical security or legal notice failure creates an alternative-contact work item.
- Buyer/seller email change requires verification rather than deleting provider history.
- Operations can see safe delivery status, not full private message content by default.
- Open and click tracking SHOULD be disabled for sensitive transactional streams unless a documented need and privacy basis exists.

## 75. Email sandbox and staging

Staging MUST use Postmark sandbox mode or a controlled recipient allow-list. It must not email arbitrary users from copied production-like data.

## 76. Inbound support email

Inbound Postmark parsing is **not required for launch**. If activated later:

- one inbound stream posts to a verified endpoint;
- sender identity is not assumed merely from the From header;
- message is linked to an existing Support/Protection Case using a signed reply token or authenticated follow-up;
- attachments enter the normal secure File pipeline;
- auto-replies cannot execute protected commands; and
- abuse/spam controls apply.

## 77. Email outage behaviour

- The authoritative transition still commits with a pending Notification/outbox record.
- Worker retries safely.
- In-app notification remains authoritative for logged-in users.
- Security-critical undelivered messages alert Support/Security.
- Order, refund, payout, or custody state never rolls back because email failed.

---

## 78. Web Push

Noma uses standards-based Web Push with VAPID after opt-in.

Required records:

- subscription endpoint and public keys encrypted/minimised;
- user/device ownership;
- consent/permission state;
- expiration/revocation;
- last success/failure; and
- notification preference category.

Push payloads MUST be minimal and privacy-safe. A push message is not final business evidence.

## 79. SMS

No SMS provider is a closed-pilot launch dependency.

The reserved adapter is:

```ts
interface SmsProvider {
  send(input: { notificationId: string; toE164: string; body: string }): Promise<SmsResult>;
}
```

Before selection, Noma must compare Nigerian delivery, sender-id registration, DND handling, delivery receipts, pricing, support, data processing, webhook authentication, and export. SMS may be activated only for critical security or operational use after consent/policy review.

---

# Part H — Observability, analytics, and operational providers

## 80. Sentry error monitoring

Sentry is required for:

- Web, API, and Worker unhandled errors;
- release and deployment association;
- source maps;
- performance traces where useful;
- queue/provider error context; and
- alerting on regressions.

Sentry is diagnostic only. It must not store complete provider payloads, passwords, OTPs, session tokens, bank-account numbers, identity evidence, private messages, or case files.

## 81. Sentry projects and environments

Recommended projects:

```text
noma-web
noma-api
noma-worker
```

Every event MUST include safe tags:

```text
environment
release/git sha
service name
institution id only where non-sensitive and justified
operation type
provider name
correlation id
```

User PII collection is disabled/minimised by default. `beforeSend` or equivalent scrubbing MUST remove sensitive fields.

## 82. Sentry release process

CI/deployment MUST:

- create/associate release version;
- upload source maps privately;
- avoid publishing source maps to the public Web bundle;
- identify environment and deployment;
- record suspect commits where supported; and
- verify a deliberate test error before launch.

## 83. PostHog product analytics

PostHog EU Cloud is selected for privacy-minimised product and journey analytics.

Required event families come from the Build Pack:

```text
search_submitted
product_viewed
offer_selected
cart_updated
checkout_started
payment_state_viewed
order_confirmed
seller_order_actioned
delivery_state_viewed
case_started
refund_state_viewed
review_submitted
```

Events measure behaviour; they do not establish money, order, custody, or enforcement truth.

## 84. Analytics identity and privacy

- Guests use a random anonymous id.
- Signed-in users use a Noma analytics subject id that is not email, matric number, or phone.
- Seller/institution dimensions use opaque ids.
- Sensitive staff/security surfaces SHOULD emit minimal aggregate events.
- Private message text, search containing sensitive terms, bank data, evidence, and provider payloads are prohibited.
- IP/location capture and retention are configured to the minimum necessary.
- Session replay is disabled for the closed pilot unless Part 10 and readiness explicitly approve masked use.
- Autocapture SHOULD be limited; critical commerce events are explicit and versioned.

## 85. Analytics event contract

```ts
interface AnalyticsEvent {
  eventName: string;
  schemaVersion: number;
  occurredAt: string;
  anonymousOrSubjectId: string;
  sessionId?: string;
  institutionId?: string;
  properties: Record<string, string | number | boolean | null>;
}
```

Every event is documented with owner, purpose, property definitions, privacy classification, retention, and dashboard use.

## 86. Grafana Cloud and OpenTelemetry

Grafana Cloud EU is selected as the OTLP backend for backend operational metrics, logs, and traces.

The API and Worker use OpenTelemetry-compatible instrumentation with service metadata:

```text
service.name = noma-api | noma-worker
service.namespace = noma
deployment.environment
service.version
service.instance.id
```

The pilot MAY export directly to the Grafana Cloud OTLP endpoint. A Collector/Grafana Alloy service SHOULD be introduced when batching, redaction, routing, or transport reliability requires it.

## 87. Required telemetry

Technical:

- request rate, error rate, latency;
- database pool/latency/lock conflicts;
- queue depth, age, failures, retries;
- outbox unpublished age;
- provider call rate, latency, status, uncertainty;
- webhook receipt/verification/processing;
- file upload/scan/processing;
- Worker heartbeat; and
- deployment/version health.

Business-operational:

- paid-but-unconfirmed age;
- order-confirmation failures;
- refund/payout reconciliation age;
- ready-but-unassigned deliveries;
- custody exceptions;
- notification backlog; and
- emergency-pause state.

Metrics MUST avoid high-cardinality personal identifiers.

## 88. Alert routing

| Alert class | Primary owner | Examples |
|---|---|---|
| Payment/refund/payout | Finance + Engineering | mismatch, uncertainty, transfer reversal |
| Queue/outbox | Engineering/Operations | old unpublished events, dead jobs |
| Security | Security owner | webhook signature failures, credential misuse |
| Delivery/custody | Operations | stuck pickup, lost/damaged incident |
| Email/security notice | Support/Security | bounce on recovery/security message |
| Infrastructure | Engineering | database, API, Worker, storage outage |

Every alert has severity, threshold, owner, acknowledgement target, runbook, and closure evidence.

## 89. Analytics and observability outages

Sentry, PostHog, or Grafana failure MUST NOT block ordinary commerce when core safety is preserved.

- events MAY queue with bounded storage;
- telemetry loss is reported;
- business transitions continue without waiting for analytics;
- sensitive payloads are never used as fallback logs; and
- if lack of monitoring makes money/custody unsafe, the affected capability is paused by policy rather than pretending monitoring is optional.

---

# Part I — DNS, domains, CDN, and public endpoints

## 90. Cloudflare DNS

Cloudflare is the authoritative DNS provider.

Required controls:

- registrar/account MFA;
- least-privileged team access;
- DNSSEC;
- documented records for Web, API, email, verification, and provider callbacks;
- change audit and export;
- emergency account recovery; and
- no ad-hoc DNS changes from personal accounts.

## 91. Domain layout

Provisional production layout:

```text
noma.ng or approved primary domain        → Vercel Web
www.<domain>                              → canonical redirect
api.<domain>                              → Render API
status.<domain>                           → external or static status page
mail.<domain> / transactional subdomain   → Postmark sending records
```

Final primary domain belongs to the Product/Brand and legal process. Environment hostnames MUST be distinct.

## 92. CDN and proxy policy

- Vercel's CDN serves the Web application and static assets.
- Cloudflare is initially authoritative DNS; proxying Vercel/Render traffic is disabled unless tested and approved.
- API responses containing private data MUST NOT be cached publicly.
- S3 private evidence is never exposed through a public CDN.
- Public media MAY later use a controlled CDN path with immutable derivative keys and correct cache headers.
- Cache invalidation is not a substitute for versioned data or authorization.

## 93. TLS and public endpoints

All public endpoints require HTTPS. Provider callbacks must use stable production HTTPS hostnames. TLS termination/provider certificates are monitored for expiry and misconfiguration.

---

# Part J — Search, maps, support, institution, and logistics boundaries

## 94. Search integration

No external search provider is selected for the pilot.

The Search port is implemented by PostgreSQL full-text search and `pg_trgm`. A future external adapter may be introduced only after measurable scale/relevance need.

Search indexing is outbox-driven and rebuildable. Checkout revalidates authoritative offer, stock, price, eligibility, and promise data.

## 95. Maps and routing

Noma's approved Institution Location Graph, zones, pickup points, delivery points, and operating rules remain authoritative.

The pilot does not require continuous GPS or route optimisation. A Google Maps-compatible adapter MAY later provide:

- admin geocoding assistance;
- map display;
- approximate distance/time; and
- advanced route services after operational data exists.

Provider coordinates or routes never override approved campus access or handoff policy.

## 96. Customer-support tooling

No external Zendesk/Intercom-style platform is required for the pilot.

Noma's own:

- Protection Cases;
- conversations;
- work queues;
- evidence;
- deadlines;
- decisions;
- remedies; and
- audit timelines

remain authoritative.

A shared support mailbox MAY route into Postmark inbound later, but email cannot execute protected actions.

## 97. Covenant University integration

No public Covenant SSO, directory, or student-status API is assumed.

The active adapter is `EMAIL_AND_IDENTIFIER + ADMIN_REVIEW`. Future ports MAY include:

```ts
interface InstitutionIdentityProvider {
  verifyAffiliation(input: InstitutionAssertionRequest): Promise<InstitutionAssertion>;
}
```

No production university integration may be built without written authority, exact data contract, privacy review, test environment, revocation behaviour, and institution-owned support route.

## 98. CU Express integration

No CU Express API is assumed for the Covenant pilot.

The active boundary is:

- Noma creates and owns Delivery Jobs;
- authorised Noma Operations assigns CU Express as carrier;
- CU Express dispatcher/rider uses a scoped Noma surface or receives controlled instructions;
- pickup and handoff evidence returns through Noma workflows; and
- partner reconciliation uses Noma Delivery/assignment records.

A future partner adapter may support assignment offers, status webhooks, rider identity, and proof retrieval, but partner status cannot overwrite Noma custody without required evidence.

## 99. External vendor/carrier integration

External carrier integrations stop at the approved Noma inbound boundary. They do not become campus last-mile authority. Manual inbound coordination remains system-recorded and audited during the pilot.

---

# Part K — Reconciliation and provider operations

## 100. Reconciliation principles

Reconciliation compares independent records. It does not merely rerun the same local query.

For money:

```text
provider transactions/refunds/transfers
↔ provider events and attempts
↔ Noma Payment/Refund/Payout states
↔ allocations
↔ balanced ledger
↔ Order/Case outcomes
```

For messages/files:

```text
Noma notification/file intent
↔ provider accepted/delivery/object record
↔ Noma attempt state
↔ operational exception
```

## 101. Reconciliation schedules

| Area | Near-real-time | Scheduled review |
|---|---|---|
| Payment uncertainty | event-driven + short polling/retrieval | daily total/control report |
| Refunds | event/retrieval until final | daily ageing and amount report |
| Payouts | webhook/retrieval until conclusive | daily transfer and balance report |
| Provider events | continuous backlog processing | daily unprocessed/duplicate report |
| Email | webhook delivery/bounce | daily critical-notice failures |
| S3 | completion verification | daily orphan/missing-object check |
| Outbox/queues | continuous | hourly/daily age and dead-letter review |
| Analytics/telemetry | continuous | daily ingestion-gap review during pilot |
| Backups | scheduled | every-run success; periodic restore drill |

Exact thresholds belong to readiness configuration.

## 102. Reconciliation exception model

Every exception MUST contain:

```text
type and severity
provider and environment
internal and provider references
amount/currency where applicable
expected versus observed state
first/last observed time
last retrieval/attempt
owner and queue
blocked business action
recommended next safe action
resolution and evidence
audit trail
```

Exceptions are never “resolved” by changing a status directly.

## 103. Manual provider-dashboard actions

Provider-dashboard actions affecting production are restricted.

Allowed only under documented runbook and authorised role:

- emergency credential rotation;
- provider-supported refund/transfer investigation;
- account/product configuration;
- webhook URL/key management;
- balance funding;
- suppression or domain repair; and
- provider support escalation.

Any dashboard action that changes money or delivery state MUST be imported/reconciled into Noma immediately and audited with actor, reason, screenshots/reference, amount, and provider record.

## 104. Daily provider operations checklist

During the closed pilot, responsible owners review:

- Paystack dashboard incidents and balance;
- unprocessed/failed webhook events;
- payment/refund/payout reconciliation exceptions;
- old provider attempts;
- email bounces for critical messages;
- S3 upload/scan/backup failures;
- API/Worker/Postgres/Key Value health;
- Sentry regressions;
- Grafana alerts and queue/outbox age;
- PostHog ingestion health; and
- DNS/certificate warnings.

## 105. Provider status and incident correlation

Noma SHOULD preserve references to provider status incidents without using them as sole evidence. An outage may explain uncertainty but does not prove whether one specific payment or transfer completed.

## 106. Provider support escalation packet

A support request SHOULD include only necessary data:

- merchant/account identifier;
- environment;
- provider reference/object id;
- timestamps and timezone;
- endpoint/operation;
- sanitised error/request id;
- expected versus observed result;
- previous retrieval attempts; and
- severity/business impact.

Passwords, secret keys, raw card data, OTPs, full bank details, identity evidence, or unrelated customer data MUST NOT be sent.

---

# Part L — Data protection and provider governance

## 107. Provider data inventory

For every provider, the register MUST document:

- data categories sent;
- purpose;
- data subjects;
- region/storage location where known;
- retention controls;
- subprocessors/DPA availability;
- encryption and authentication;
- support access;
- export/deletion path;
- cross-border transfer requirement;
- security certifications/assurance; and
- incident notification route.

Part 10 owns final legal basis and compliance approval.

## 108. Minimum data by provider

| Provider | Permitted examples | Prohibited examples unless specifically required |
|---|---|---|
| Paystack | email, amount, NGN, reference, bank details for payout | case evidence, messages, matric number |
| Postmark | recipient, template variables, minimal order/security context | full bank details, private evidence, OTP values in logs |
| S3 | exact file bytes and metadata key | personal data in object key |
| Sentry | error, stack, release, safe ids | secrets, bodies with sensitive data |
| PostHog | anonymous/opaque subject id, journey events | provider payloads, private text, bank/identity data |
| Grafana | metrics/traces/logs with safe attributes | unbounded payloads and PII labels |
| Cloudflare | DNS/account data | application business records |

## 109. Provider access control

- Shared personal logins are prohibited.
- MFA is required for provider administrators where supported.
- Finance provider access is separate from ordinary Engineering access where possible.
- Production view versus mutate permissions are separated.
- Access is reviewed before closed pilot and after staff changes.
- Break-glass access is recorded, time-limited, and reviewed.
- API keys use minimum available scope.

## 110. Provider change notifications

Owners must monitor provider:

- API deprecations;
- SDK/security updates;
- webhook/event changes;
- pricing or plan limits;
- status incidents;
- subprocessor/data-location changes;
- feature availability; and
- account verification requirements.

A provider change that affects mapped statuses, signatures, finality, data handling, or retries requires a reviewed repository change and contract tests.

---

# Part M — Provider exit and fallback

## 111. General exit requirements

Before production, Noma MUST know how to:

- export provider identifiers and configuration;
- retrieve data needed for unresolved cases;
- rotate DNS and credentials;
- stop new operations safely;
- preserve pending provider work;
- migrate templates/files/events where necessary;
- reconcile final provider balances and objects;
- revoke old access; and
- update policies/processor lists.

## 112. Paystack exit

Paystack replacement is not a pilot feature. An exit would require:

- stopping new payment initialisation and payouts;
- continuing webhooks/reconciliation for in-flight records;
- resolving all refunds/transfers;
- exporting references and reports;
- proving ledger/provider agreement;
- implementing a new adapter and live drills; and
- explicitly activating the new provider.

No in-flight Payment/Refund/Payout may silently move providers.

## 113. Hosting exit

- Vercel Web can move because domain, Web code, contracts, and environment schema remain version-controlled.
- Render API/Worker can move through container/build commands and configuration inventory.
- Render Postgres migration requires tested logical/physical export, maintenance window, validation, and rollback.
- Key Value loss is recoverable from outbox/authoritative database, though active queue state must be assessed.

## 114. S3 exit

Noma retains object metadata and checksums, enabling copy to another S3-compatible provider. Migration must preserve:

- bytes/checksum;
- classification;
- owner/resource links;
- object versions where required;
- retention/legal hold;
- derivative/original relationship; and
- audit evidence.

## 115. Email/analytics/observability exit

Templates, event schemas, Noma Notification records, and OpenTelemetry instrumentation remain provider-neutral. Historic provider dashboards are not required to keep Noma business truth.

## 116. Fallback hierarchy

| Integration | Fallback during short outage |
|---|---|
| Paystack payment | pause new payments; reconcile in-flight |
| Paystack payout | pause new transfers; preserve available earnings |
| Email | in-app notification + retry; security work queue |
| Web push | in-app/email |
| S3 | preserve draft; retry; no evidence-based final action |
| Analytics | drop/queue bounded non-critical events |
| Sentry/Grafana | structured local/provider logs with strict redaction; restore alerts |
| Maps | approved location graph/manual operations |
| CU Express API | already manual/scoped Noma workflow |

Fallback never means personal bank transfer, WhatsApp commerce, rider cash collection, permanent public evidence links, or staff database edits.

---

# Part N — Integration testing and launch evidence

## 117. Adapter unit tests

Each adapter MUST test:

- request mapping;
- authentication headers/signature generation;
- timeout classification;
- known status mapping;
- unknown status mapping;
- sensitive-data redaction;
- idempotency/reference reuse;
- provider error mapping; and
- disabled/misconfigured environment failure.

## 118. Provider contract tests

Against sandbox/test where available:

- valid payment initialisation and verification;
- invalid/mismatched amount and currency;
- duplicate/out-of-order webhook;
- refund full/partial/failure/needs-attention;
- account resolution;
- recipient creation;
- transfer pending/OTP/success/failure/reversal;
- presigned upload/download and expiry;
- email submission/delivery/bounce;
- deployment environment separation; and
- telemetry/analytics ingestion with redaction.

## 119. Failure-injection scenarios

At minimum:

1. provider returns `500` before receiving request;
2. provider accepts request but Noma times out;
3. webhook arrives before outbound response is persisted;
4. duplicate webhook arrives ten times;
5. final events arrive out of order;
6. Worker dies after provider success but before local transition;
7. database commit fails after attempt record creation but before call;
8. queue is unavailable after outbox commit;
9. API restarts during callback;
10. payment succeeds after Checkout local expiry;
11. refund is accepted then remains uncertain;
12. transfer succeeds then is reversed;
13. email provider suppresses a security recipient;
14. S3 upload exists with wrong MIME/signature;
15. observability provider is unavailable; and
16. production key is accidentally configured in staging and must fail closed.

## 120. Controlled live drills

Before the closed pilot Noma MUST complete small-value, authorised live drills for:

- payment and order confirmation;
- partial or full refund;
- payout account resolution;
- transfer recipient creation;
- withdrawal approval and transfer;
- transfer webhook/final state;
- transactional email delivery;
- private file upload/access;
- monitoring alert; and
- database backup/restoration.

Live drill records must be identifiable, auditable, reconciled, and excluded from commercial metrics where appropriate.

## 121. Integration definition of done

An integration task is complete only when:

```text
□ provider-neutral port exists
□ concrete adapter is isolated
□ provider/environment selected
□ secrets are environment-scoped
□ dashboard settings are documented
□ request/reference/idempotency rules are implemented
□ timeout and failure mapping is explicit
□ webhook origin is verified
□ raw event/attempt is durably preserved as required
□ status mapping includes unknown/uncertain handling
□ retry and reconciliation paths exist
□ audit/outbox/metrics exist
□ sensitive data is redacted/minimised
□ local simulator and fixtures exist
□ sandbox contract tests pass
□ operational queue/runbook/owner exists
□ outage/degraded behaviour is implemented
□ provider exit is documented
□ user-facing states remain truthful
□ launch evidence is attached
```

---

# Part O — Integration Decision Register

## 122. IDR-001 — Paystack is the sole active money provider

**Decision:** Use Paystack for NGN buyer payments, refund submission, bank resolution, recipients, and controlled seller transfers during the Covenant pilot.

**Reason:** It satisfies the source-locked Nigerian payment and payout scope while avoiding multi-PSP complexity.

**Constraint:** Noma's ledger and protected earnings remain internal; no immediate seller split settlement.

## 123. IDR-002 — Vercel hosts Web only

**Decision:** Vercel hosts the Next.js Web surface and preview deployments.

**Constraint:** Protected business authority remains in the NestJS API and PostgreSQL.

## 124. IDR-003 — Render hosts API, Worker, Postgres, and Key Value in Frankfurt

**Decision:** Co-locate backend compute and data in Render Frankfurt for pilot simplicity and private-network latency.

**Constraint:** Production uses paid persistent services, monitored limits, and independent backup export.

## 125. IDR-004 — AWS S3 stores files

**Decision:** Use S3 `eu-central-1` with private-by-default buckets, presigned access, encryption, lifecycle, and optional dedicated Object Lock archive.

## 126. IDR-005 — Postmark sends transactional email

**Decision:** Use Postmark transactional streams, delivery/bounce events, and sandbox testing.

**Constraint:** Part 10 must approve data-processing and cross-border transfer controls.

## 127. IDR-006 — Sentry handles errors/releases

**Decision:** Use Sentry for Web/API/Worker exception monitoring and release-linked diagnostics with strict PII scrubbing.

## 128. IDR-007 — PostHog EU handles product analytics

**Decision:** Use explicit, versioned, privacy-minimised events. Session replay remains off unless later approved.

## 129. IDR-008 — Grafana Cloud EU receives OTLP telemetry

**Decision:** Use vendor-neutral OpenTelemetry instrumentation and Grafana Cloud for backend metrics/traces/logs.

## 130. IDR-009 — Cloudflare provides authoritative DNS

**Decision:** Use Cloudflare DNS and DNSSEC. Do not add a second proxy/cache layer in front of Vercel/Render without testing.

## 131. IDR-010 — No SMS launch dependency

**Decision:** Preserve an SMS adapter but do not select or activate a provider before need, consent, Nigeria delivery, DND, security, and pricing review.

## 132. IDR-011 — No external search provider

**Decision:** Use PostgreSQL FTS and `pg_trgm` for the pilot.

## 133. IDR-012 — No required maps provider

**Decision:** Use Noma's institution/location graph and manual approved points. Reserve a provider adapter for later mapping/routing.

## 134. IDR-013 — No external support SaaS

**Decision:** Noma cases, queues, messages, and audit remain the pilot Support system.

## 135. IDR-014 — No assumed Covenant or CU Express API

**Decision:** Operate through hybrid verification and scoped dispatcher workflows until formal external contracts exist.

## 136. IDR-015 — Reconciliation is mandatory for money providers

**Decision:** Payment, Refund, and Transfer integrations are incomplete without retrieval, exceptions, reports, and operational resolution.

## 137. IDR-016 — Provider events are append-only observations

**Decision:** Preserve verified raw/provider event history and correct Noma workflow through guarded successor transitions rather than editing events.

## 138. IDR-017 — Outbox precedes provider side effects

**Decision:** Authoritative transactions persist intent; Worker adapters execute external calls after commit.

## 139. IDR-018 — Provider failures do not erase accepted obligations

**Decision:** Degraded modes preserve paid orders, custody, cases, earnings, and customer communication while restricting unsafe new work.

---

# Part P — Traceability and final declaration

## 140. Journey traceability

| Journey group | Integration dependencies |
|---|---|
| Identity/verification | Postmark, optional Web Push, no Covenant API |
| Discovery/catalogue | PostgreSQL search, S3, Vercel |
| Cart/checkout/payment | Paystack, API/Worker, Postgres, Key Value |
| Seller/listing/inventory | S3, email, search projection |
| Multi-vendor failure/cancellation | Paystack refunds, notifications, reconciliation |
| Dispatch/custody | Noma location graph, Rider PWA, Web Push/email; no required maps/CU Express API |
| Messaging/substitution | in-app system, email/push notifications |
| Protection/refund | S3 evidence, Paystack refunds, Finance reconciliation |
| Reviews | PostgreSQL/PostHog aggregate measurement |
| Earnings/payout | Paystack account resolution, recipients, transfers, Finance controls |
| Enforcement/recall | email/push, S3 evidence, audit/observability |
| Progressive Food/External/FBN/Pre-Owned | existing adapters; no second payment/order system |
| Security/operations | Sentry, Grafana, Cloudflare, GitHub, provider audit and runbooks |

## 141. Prohibited integration shortcuts

The Covenant pilot MUST NOT:

1. import Paystack SDKs into domain/application modules;
2. trust a browser redirect as payment success;
3. use Paystack split settlement as Noma's seller ledger;
4. create a second payment provider without scope approval;
5. retry an uncertain transfer with a new reference;
6. mark a payout paid from an initiation response;
7. mark a refund complete from approval or submission;
8. ignore amount/currency/environment mismatch;
9. process unsigned/unverified money webhooks;
10. process provider business effects before durable event receipt;
11. acknowledge a webhook before durable receipt;
12. perform provider calls inside database transactions;
13. store production credentials in preview/CI;
14. use one credential for staging and production;
15. log secret keys, OTPs, full bank details, or raw sensitive payloads;
16. put identity/case/bank evidence in a public bucket;
17. use permanent public evidence URLs;
18. trust browser MIME types;
19. let S3 metadata replace PostgreSQL File policy;
20. let Redis/Key Value become authoritative;
21. represent queued email as delivered;
22. use email delivery as proof the user accepted a business action;
23. send private case details in push notifications;
24. enable session replay over sensitive surfaces without approval;
25. treat analytics as financial/order truth;
26. make maps/GPS a launch dependency;
27. invent a CU Express API;
28. scrape Covenant systems or collect unrelated academic data;
29. execute protected actions from inbound email;
30. allow provider-dashboard money actions without reconciliation;
31. hide unknown provider statuses as generic failure;
32. drop failed outbox jobs without an operational exception;
33. depend on a free/ephemeral production database or queue;
34. claim backups are ready without a restore drill;
35. expose provider dashboards through shared accounts;
36. configure DNS from a founder's personal uncontrolled account;
37. activate SMS merely because an SDK is easy to install;
38. add external search because the catalogue code is inconvenient;
39. dual-write provider migrations without a migration/reconciliation plan; or
40. bypass Noma state machines through an “admin sync” status dropdown.

## 142. Required implementation outputs

Engineering/Codex MUST produce:

```text
packages/platform/.../ports/*.ts
packages/integrations/<provider>/*
packages/contracts/provider-events/*
apps/api/src/integrations/* webhook controllers
apps/worker/src/jobs/* provider processors
provider simulators and fixtures
provider status mapping tests
integration environment schema
secrets/configuration inventory template
reconciliation queries and Operations queues
runbooks/integrations/*.md
provider launch-check evidence
```

## 143. Required follow-on documents

- `docs/10-security-and-compliance.md` will lock legal basis, processor assessments, encryption/key handling, retention, data-subject rights, access review, breach response, NDPA/FCCPC controls, and provider cross-border handling.
- `docs/11-testing-strategy.md` will define adapter, webhook, sandbox, failure-injection, performance, security, and live-drill suites.
- `docs/12-delivery-backlog.md` will sequence provider account creation, adapters, environments, runbooks, and launch tasks.
- `docs/13-covenant-pilot-readiness.md` will set concrete thresholds and collect provider readiness evidence.

## 144. Official research basis

Provider decisions were checked against official documentation available on 30 July 2026 for:

- Paystack payment verification, webhooks, test payments, refunds, account resolution, transfer recipients, single transfers, transfer status, retries, and server approval;
- Vercel environments, previews, production promotion, inspection, and rollback;
- Render Web Services, Background Workers, Postgres backups/PITR, Key Value persistence, private networking, and available regions;
- Amazon S3 presigned operations, encryption, lifecycle management, versioning, and Object Lock;
- Postmark transactional message streams, sandbox mode, delivery/bounce/inbound webhooks, security, and data processing;
- Sentry JavaScript/Next.js/NestJS/Node error, release, source-map, trace, Prisma, and cache instrumentation;
- PostHog Cloud product analytics, regions, privacy/security, and event capture;
- Grafana Cloud OTLP ingestion and OpenTelemetry architecture;
- Cloudflare authoritative DNS, DNSSEC, and cache behaviour; and
- PostgreSQL, GitHub Actions, Web Push, and the provider-neutral architecture defined in prior Build Pack documents.

Provider plans, limits, features, regions, and legal terms can change. Owners MUST re-verify them before account purchase and again before the closed pilot.

## 145. Final integration declaration

Noma's Covenant pilot will use a small, explicit provider estate. Paystack will handle real NGN buyer payments, refund submission, bank-account resolution, transfer recipients, and controlled seller transfers, while Noma's PostgreSQL records, allocations, balanced ledger, states, authorization, cases, and custody remain authoritative for the marketplace workflow.

Vercel will host the Next.js Web application. Render Frankfurt will host the NestJS API, BullMQ Worker, authoritative PostgreSQL database, and persistent Redis-compatible queue store. Amazon S3 will hold public derivatives, private evidence, and independent backups under short-lived, private-by-default access rules. Postmark will send transactional email; standards-based Web Push will activate progressively; SMS will not be a launch dependency.

Sentry will provide release-linked error diagnostics, PostHog EU will provide privacy-minimised product analytics, Grafana Cloud EU will receive OpenTelemetry metrics, traces, and logs, and Cloudflare will provide authoritative DNS and DNSSEC. PostgreSQL will provide search. Noma will not assume a Covenant SSO/API, CU Express API, external search engine, continuous maps/routing service, or external Support platform for launch.

Every integration will be isolated behind a provider-neutral adapter, use environment-scoped secrets, preserve provider attempts and verified events, acknowledge webhooks only after durable receipt, map unknown states to safe uncertainty, perform no network calls inside database transactions, and use outbox-driven idempotent Worker execution. Money-moving timeouts will reconcile before retry. Provider-dashboard changes affecting money will be imported and audited. External delivery or analytics channels will never become proof of payment, custody, refund, payout, or user consent.

Real Covenant commerce may begin only after provider accounts are approved, sandbox and failure-injection tests pass, controlled live payment/refund/transfer/file/email drills reconcile, monitoring and alerts are proven, operational runbooks and owners exist, backups restore successfully, and `docs/13-covenant-pilot-readiness.md` records the evidence.
