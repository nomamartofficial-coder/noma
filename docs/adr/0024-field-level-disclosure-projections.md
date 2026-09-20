# ADR-0024 — Server-owned disclosure projections after authorization

- Status: Proposed for IAM-007 independent review
- Date: 2026-09-20
- Task: IAM-007
- Issue: #70
- Requirement: REQ-IAM-007

## Context

IAM-006 answers whether an exact operation is allowed; it does not grant full-record disclosure. The domain model's rebuildable read-model "projection" is different from the immediate response **disclosure projection** defined here. Selecting every ORM column and deleting sensitive keys afterward is not an acceptable default privacy boundary.

## Decision

Bind each server-owned operation to a distinct IAM-006 policy ID, versioned disclosure projection ID, and exact database read model. IAM-006 evaluates first. Only ALLOW may run the scoped minimum query; only that source may enter an explicit mapper; the mapper constructs the final DTO field by field. Unknown or malformed projection IDs fail closed. Client-provided projection IDs, field lists, expansions, and modes have no authority.

The closed registry records each field's existing PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED, or SECRET classification and one explicit OMIT, DERIVED, MASKED, or FULL outcome. SECRET is never a routine response field. FULL requires a named purpose in an exact reviewed use case and is never a default. Classification is review metadata, not authority. MASKED uses SEC-003 presentation masking with a reviewed field policy; masking is neither authorization nor a claim of cryptographic irreversibility. No current governed protected business endpoint needs FULL decryption, so no production decrypt adapter is added.

The internal `access.assignment.summary.v1` proof selects six non-secret Access columns after `access.assignment.read.v1` permits the exact assignment and scope. Grant/revocation reasons, user identifiers, role template, and grantor are not selected. The output includes only assignment reference, subject/scope kinds, and derived state. It is not exposed by a public route. Missing resources and denied reads map to the same generic unavailable response. A future HTTP binding must set `Cache-Control: no-store` for protected personalized disclosure.

## Consequences

The owning module must define its own real relationship facts, minimal source, field review, and response contract before activation. Future evidence/export use cases can consume these primitives but IAM-007 implements no file access, export, IAM-008 audit persistence, IAM-009 workflow, new role surface, migration, or dependency. Existing `GET /api/v1/auth/session` no-store behavior is separate pre-existing debt and is not silently changed here. Disclosure expansion requires a reviewable new contract/version rather than quietly adding a field to v1.
