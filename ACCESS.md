# Noma Access authority foundation

> **Task:** IAM-005
> **Risk:** P0-AUTHORITY
> **Status:** IAM-005 merged; IAM-006 central policy is implemented for independent review; no protected surface is active

## Authority boundary

IAM-005 stores scoped authority facts. It does not make final authorization decisions.

- **Role template is not authority.** It is an immutable, versioned definition.
- **Role assignment is a granted authority fact.** It binds one human or service principal to one fixed template version and one exact scope.
- **Capability without scope is not authority.** Capabilities never use wildcard or inheritance semantics.
- **MFA is not authorization.** IAM-004 assurance is evaluated separately from assignment existence.
- **Expired or revoked assignment is not authority.** Validity is half-open: `validFrom <= now < validUntil`.
- **UI visibility is not authorization.** Seller, Rider, Operations, and Admin routes remain generic fail-closed 404s.
- **IAM-005 is not IAM-006.** Business membership, ownership, state, restrictions, emergency state, and action-specific policy remain deferred.

## Exact scopes and capabilities

`AccessScope` supports `SELF`, `SELLER`, `INSTITUTION`, `ORDER`, `CASE`, `ASSIGNMENT`, `FULFILMENT_LOCATION`, `QUEUE`, `CARRIER`, and singleton `PLATFORM`. A scope anchor is technical identity only: it does not prove that a future business resource exists, is active, is owned, or is eligible.

Future owning modules create their authoritative business record and bind its UUID to an Access scope in the same database transaction through the transaction-bound `createAccessScope` seam. IAM-005 exposes no public arbitrary-scope API and creates no Seller, Institution, Rider, Order, Case, Queue, or Carrier entity.

The IAM-005 migration seeds only the thirteen `access.*` capabilities needed to administer this foundation. IAM-008 separately seeds the exact `audit.event.read` capability without assigning it to any template or actor. Capability codes are exact, immutable, and retired rather than rewritten or deleted. No `seller.*`, `finance.*`, `support.*`, operational, or commerce capability is created.

## Templates and assignments

Templates are composed while `DRAFT`, then become immutable when activated. Assignments reference one `(code, version)` row, so publishing version N+1 cannot expand a version N assignment. Retirement prevents new assignments while retaining historical/current facts for review and governed expiry or revocation.

PostgreSQL `btree_gist` half-open exclusion constraints serialize overlapping grants for the same subject, template version, and scope. Separate constraints preserve real human and service-principal foreign keys. `validUntil = NULL` means unbounded future time; it does not mean global scope.

Privileged human grants and revocations coordinate the Access write with Identity-owned `securityVersion` advancement and session revocation in one transaction. Ordinary changes and natural expiry do not rewrite sessions. A transaction-bound `loadActiveAuthorityFactForUse` locks and revalidates one complete assignment-atomic fact for IAM-006. Protected mutations use that fact and the Identity-owned User/Session lock inside the same transaction as the local effect; see `AUTHORIZATION.md`.

## Maker-checker and temporary access

Approval requests name the exact Access operation, subject, template version, scope, requested validity, requestor, reason, expiry, idempotency key, and separation requirement. Decisions are append-only and capture the approving session, security version, and IAM-004 proof timestamps used at evaluation. Database guards reject maker self-approval and target self-approval for privileged grants.

Temporary access is metadata attached to a finite assignment. Expiry automatically removes authority through the assignment predicate. Privileged temporary access requires matching approved evidence, and temporary `PLATFORM` access is prohibited.

## Service principals

Service principals contain environment, stable code, purpose, human owner, credential-policy/rotation metadata, revocation evidence, and version. They have no password, MFA factor, browser session, or human cookie. Workload authentication and credential providers remain deferred.

## Commands

```bash
pnpm iam005:validate
pnpm iam005:self-test
pnpm iam005:test
pnpm iam005:integration-test
pnpm iam005:verify
```

The integration suite uses isolated PostgreSQL 18 and real transaction barriers. It covers template and scope immutability, temporal overlap concurrency, exact expiry, cross-scope isolation, maker-checker invariants, temporary grants, service principals, privileged session containment, and revoke/use ordering. Migration verification preserves the representative prior-schema row and the full IAM-001–004 schema.

## Deferred and rollback

IAM-006 owns deny-by-default contextual policy and the application enforcement seam. IAM-009 adds the exact human Access Admin workflow and review/export boundary described below. Business memberships, provider authentication, break-glass activation, unrelated protected surfaces, deployment, and production data remain out of scope.

IAM-008 registers typed audit contracts for future Access commands, but the present Access persistence API is also used for repository/setup fixtures and has no activated command seam that can supply trusted actor and authority evidence. Those helpers do not emit production audit events. A future owning command must authorize, mutate, and append the registered event in one transaction before it can activate.

Rollback is a reviewed source revert plus a forward database correction. The migration is additive and is not rolled back destructively.

## IAM-009 bounded Access administration

The only activated Admin surface is `/admin/access` (with `/admin/access/start` for sign-in, step-up, and exact-scope selection). Seventeen exact API operations handle scoped assignment request, independent approval, grant/revoke, temporary grant/revoke, review, and approved export. They all require current human exact-scope authority and IAM-004 assurance inside the owning PostgreSQL transaction. The browser reaches the API through a fixed same-origin Web transport; that transport never makes the authorization decision. No capability or privileged user is assigned by the migration.

The grant path accepts only templates whose currently representable capabilities are Access-owned or `audit.event.read`. It rejects overlapping same-scope authority, maker/target self-approval, stale or consumed approval, inactive subject/template/scope/capability, and temporary `PLATFORM` access. This is intentionally conservative: seller/staff, rider/dispatcher, Finance, Trust & Safety, seller/Catalogue, and auditor/operational conflicts requiring future business ownership maps are not claimed as implemented. Such unmapped grants fail closed; domain owners must later supply approved facts before those roles can be activated. Approval evidence is consumed once by a unique PostgreSQL effect row in the same transaction as the assignment mutation and audit append.

Each newly governed grant opens a monthly privileged or quarterly broader review cycle. A reviewer records only `RETAIN_CONFIRMED`, `REVOKE_REQUESTED`, or `NEEDS_FOLLOW_UP`. Follow-up is unresolved and cannot discharge the cycle. A revoke request is a final review determination, but access remains active until its separate approval-backed revoke commits. Review attestations are immutable evidence; review item state is the Access-owned business truth. Later approved event-driven triggers may open cycles, but external employment, cloud, GitHub, DNS, provider, and university event integrations are not fabricated here. Existing historical assignments are not backfilled.

Review export uses an independent approval, current MFA evidence, a fixed purpose-specific projection, a 500-row ceiling, CSV formula neutralization, and one-use effect evidence. `access.assignment.read` does not authorize export. See [ADR-0026](docs/adr/0026-access-admin-review-and-export.md) and [IAM-009 evidence](docs/evidence/iam-009/README.md).
