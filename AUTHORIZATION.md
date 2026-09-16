# Noma central authorization policy

> **Task:** IAM-006
> **Risk:** P0-AUTHORITY
> **Status:** implemented for independent review; no protected API or Web surface is active

## Non-negotiable rules

Noma authorization is deny by default. Policy is not capability, role is not a decision, MFA is not authorization, and UI visibility is not authority. Capability plus the wrong scope denies. Facts from separate assignments never cross-combine. A missing or unknown required fact denies. Step-up produces fresher authentication evidence; it never executes a deferred command. Redis, browser state, navigation, and cached role labels are never authorization truth.

IAM-006 is not IAM-007, IAM-008, or IAM-009. It does not add field projections, audit workflows, Access administration, business entities, protected routes, or production activation.

## PEP, PDP, and PIP

- The application policy-enforcement point (PEP) selects an exact source-controlled policy, resolves authoritative facts, invokes the decision point, maps denial to a generic public result, and performs protected work only after `ALLOW`.
- The pure policy-decision point (PDP) has no database, cache, network, logging, or host-clock dependency. It accepts a single injected instant and returns exactly `ALLOW` or `DENY`.
- Policy-information points (PIPs) load Identity session/account evidence, one IAM-005 assignment fact, exact resource relationships, typed business/feature/restriction/emergency facts, and bounded approval evidence from their owning authorities.

Policy IDs identify exact application operations and are deliberately distinct from capability codes. The immutable registry is closed: unknown, malformed, wildcard, duplicate, or default policies fail closed. Initial policies cover only bounded Access proof; no Access Admin endpoint is exposed.

## Assignment-atomic proof

One `ActiveAuthorityFact` must independently prove the actor, exact capability, scope/relationship, validity, and template assurance baseline. A capability from assignment A cannot combine with scope from assignment B. Exact scopes do not inherit: an `INSTITUTION` scope does not automatically authorize its Sellers, Orders, Cases, Assignments, or queues.

Contextual relationships require one authoritative owning-module fact with explicit provenance. Required business facts use `SATISFIED | NOT_SATISFIED | UNKNOWN`; feature, restriction, and emergency dimensions use their own closed tri-state vocabularies. Every dimension is explicitly `REQUIRED` or `NOT_APPLICABLE`.

## Identity and assurance

Human policy evaluation reuses the authoritative IAM-002–004 session and `evaluateAuthenticationAssurance()`. It checks account eligibility, session status/revocation/expiry, current `securityVersion`, verified contact, persisted password/MFA proof, and active-factor binding. Template and action assurance compose monotonically: contact requirements use OR and proof maximum ages use the strictest minimum.

An `ASSURANCE_REQUIRED` denial may carry the effective requirement internally. The caller can request IAM-004 step-up, then must retry the original operation with every fact freshly resolved. Internal reason codes are never automatically serialized to HTTP.

Service principals require an explicit machine policy, authenticated workload identity, matching environment, non-revoked principal, and one exact active assignment. They do not use passwords, browser sessions, cookies, MFA, or human step-up. Production workload authentication remains deferred.

## Read and mutation consistency

Simple reads use one ordinary database transaction/snapshot. IAM-006 does not blanket-force repeatable read. A read that consumes approval, reserves capacity, reveals controlled material, changes custody/security state, or creates an external effect is a mutation.

Protected mutations execute authorization inside the same transaction as the local effect. The owning module locks its resource first, then IAM-005 locks/revalidates the selected assignment, then Identity locks/revalidates User and Session using the established Access-before-Identity order. The only revoke/use outcomes are: the authorized effect commits before revocation, or revocation commits first and the effect is denied.

The approval seam validates exact operation, subject, template, scope, validity, state, expiry, independence, current approver account/security version, and factor binding. IAM-006 does not activate replay-sensitive approval-backed writes because IAM-005 has no universal command-consumption binding.

## API and Web status

Every current API route is registered as `PUBLIC` or `AUTHENTICATED_SELF`; there are currently no `IAM006_PROTECTED` or provider operations. Identity-owned self-security endpoints are not wrapped in Access capabilities. Future protected use cases must use the application PEP; a controller guard alone is insufficient.

Seller, Rider, Operations, and Admin production routes continue to call the stable server-side `notFound()` boundary before rendering. No cookie, header, query, environment flag, local storage value, or Storybook fixture can open them.

## Verification and rollback

```bash
pnpm iam006:validate
pnpm iam006:self-test
pnpm iam006:test
pnpm iam006:integration-test
pnpm iam006:verify
```

Rollback is a reviewed source-only revert. IAM-006 adds no dependency, migration, production configuration, data repair, or infrastructure action.
