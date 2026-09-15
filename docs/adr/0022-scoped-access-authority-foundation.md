# ADR-0022: Exact-scope Access authority facts

- Status: Proposed for IAM-005 independent review
- Date: 2026-09-15
- Task: IAM-005
- Issue: #66
- Draft PR: #67
- Requirement: REQ-IAM-005

## Decision

Represent granted authority as a `RoleAssignment` from exactly one human or service principal to one immutable role-template version and one typed, exact `AccessScope`. Keep capabilities atomic and scope-independent inside the template version. Reject wildcard, inheritance, scope-array, JSON-authority, and implicit-parent semantics.

Use PostgreSQL `btree_gist` exclusion constraints over half-open validity ranges for authoritative overlap protection. Keep privileged human authority changes atomic with Identity-owned session containment. Preserve maker-checker proof as append-only approval decisions bound to current IAM-004 session evidence. Expose active authority facts and a transaction-bound row-lock primitive, but no final allow/deny policy.

## Consequences

Template publication cannot expand existing assignments, revoked/expired facts stop resolving immediately, and future protected commands can serialize use against revocation. Access scopes remain non-authoritative anchors; future business modules still own membership, resource existence, assignment, and state. Service principals are environment-bound metadata without interactive credentials.

Seller, Rider, Operations, and Admin routes remain fail closed. IAM-006 must combine these facts with authoritative business context and current assurance before any protected action or surface can be allowed. Rollback uses forward correction rather than destructive migration reversal.
