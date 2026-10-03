# ADR-0026 — Bounded Access administration, review, and export

- Status: Proposed for IAM-009 independent review
- Date: 2026-10-03
- Task: IAM-009
- Issue: #75
- Requirement: REQ-IAM-009

## Context

IAM-005 through IAM-008 provide scoped Access persistence, deny-by-default policy, field-level disclosure, and append-only audit evidence. They do not authorize a general Admin role or a browser-held bearer token. IAM-009 needs a narrow human workflow for assignment changes, recurring Access review, and a privacy-minimized review export. Issue #75 records the architecture decisions; its approved review outcomes are `RETAIN_CONFIRMED`, `REVOKE_REQUESTED`, and `NEEDS_FOLLOW_UP` only.

## Decision

Activate only `/admin/access` and its scoped start page. The separate Web transport accepts an exact operation allowlist, checks same-origin and CSRF, forwards only the host-bound HTTP-only session cookie, and does not expose a generic API proxy. The API still enforces the exact registered IAM-006 policy inside the owning PostgreSQL transaction using current session, MFA, security-version, scope, and assignment facts. All other Admin modules, including `/admin/audit`, remain closed.

The forward-only `20261002000100_iam_009_access_review_workflows` migration adds approval effect and revocation-target evidence, review cycles/items/attestations, and review-export request/decision/effect records. Uniqueness, version checks, and immutable evidence constraints enforce one approved effect per request and reject stale writes. The migration seeds exactly three review capabilities without assigning them to any role template or user. No existing migration is rewritten.

Assignment grant, revoke, and temporary-access requests require a distinct human approver. Approval is a decision, not the effect. Execution rechecks current authority and target state, consumes the exact approved request once, and commits the effect and audit event atomically. Unknown role combinations and unsupported conflicts fail closed. Temporary grants have a bounded expiry; early revocation follows the same approved path. No universal PLATFORM administrator or first privileged user is provisioned.

New assignments and completed attestations create monthly high-privilege or quarterly broader-authority cycles. The schema and queue can represent event-driven cycles, but this slice does not invent cross-module event triggers for seller ownership, staff exit, or incident workflows. Each item is tied to an exact assignment version. `RETAIN_CONFIRMED` completes a review without changing access. `REVOKE_REQUESTED` completes the review determination and creates/links a separate pending approval-backed revocation request; it never revokes access directly. `NEEDS_FOLLOW_UP` requires a bounded reason, remains unresolved, and cannot discharge the cycle until a later final outcome. Attestations are append-only evidence; one item version cannot be attested twice.

Export requires an exact `access.review.export` authority and independent approval. The approval fixes scope, filter, projection, row ceiling, expiry, and purpose; execution rechecks current human MFA and approval evidence, consumes the request once, and audits the effect without putting the CSV in the audit payload. The fixed field-level projection is capped at 500 rows, uses stable bounded ordering, escapes CSV quotes and spreadsheet-formula prefixes, and returns no-store attachment headers. `access.assignment.read` is insufficient to export.

## Consequences and recovery

The application deliberately has no production first-admin bootstrap, broad Admin activation, service-principal access, audit viewer activation, or IAM-010 work. Preview/staging configuration and any production enablement remain separate human-controlled decisions. Current UI is a narrow operational surface, not a redesign of the other Admin pages. Revert application code if necessary, but preserve applied migration and historical evidence; schema correction must use a reviewed forward-fix migration. A completed `REVOKE_REQUESTED` review must never be described as an already-revoked assignment until the separately approved revocation effect commits.
