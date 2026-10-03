# IAM-009 implementation evidence

- Task and issue: IAM-009, [#75](https://github.com/nomamartofficial-coder/noma/issues/75)
- Approved base and starting branch head: `5702539f64b74ae640f73eb591deb646f81f764d`
- Existing branch: `iam-009-access-admin-workflows-access-review-export`
- Review handoff: the exact pushed implementation SHA and Draft PR URL are recorded in the pull-request description, not embedded in a self-referential commit
- Migration: `20261002000100_iam_009_access_review_workflows`; SHA-256 `3791b644873f6429e1efd7038e5fdb51a6ae8193d3b11a3f6c576e1042bec5b0`
- Human outcome decision: Issue #75 comment `5909751561`; closed outcomes are `RETAIN_CONFIRMED`, `REVOKE_REQUESTED`, `NEEDS_FOLLOW_UP`

## Scope and authority

The migration adds approval revocation targets and single-use effects, versioned review cycles/items with immutable attestations, and approved export request/decision/effect evidence. It seeds `access.review.read`, `access.review.attest`, and `access.review.export` without role-template grants. Seventeen exact protected API operations are registered against source-owned IAM-006 policies. Only `/admin/access`, `/admin/access/start`, and the exact same-origin Web transport are opened; unrelated Admin pages and `/admin/audit` remain closed. The transport uses a host-bound HTTP-only cookie, origin and CSRF checks, and an operation allowlist, never browser bearer storage.

Grant, revoke, and temporary-access effects require a separate approver and exact current authority. The target/version and single-consumption constraints prevent stale or duplicate effects. Review attestations are immutable: follow-up remains unresolved, retention is final without an access mutation, and revocation request is only a separately approved pending change. The audit service records the authorized mutation in the same transaction.

Export binds an independent approval to exact scope, filter, fixed `access.review.export.row.v1` projection, purpose, expiry, and row ceiling. Execution requires current MFA, caps at 500 rows, neutralizes spreadsheet formulas, returns no-store attachment headers, and emits only metadata in `access.review.export` audit history. Raw authentication, MFA, private reasons, and CSV content are absent from the exported projection and audit summaries. `access.assignment.read` does not grant export.

## Verification record

The exact IAM-009 command family is `pnpm iam009:validate`, `pnpm iam009:self-test`, `pnpm iam009:test`, `pnpm iam009:integration-test`, and `pnpm iam009:verify`. Focused tests cover the closed outcome vocabulary, scheduling, exact projections, CSV safety, same-origin forwarding, PostgreSQL approval/review/export constraints, single-use effects, and audit rollback. Synthetic Access Admin Storybook stories exercise the session and workspace in real Chromium with the existing accessibility enforcement. The canonical repository check and five existing CI gates are not renamed or weakened. Final local results, migration verification, and the five GitHub gate states must be reported against the exact pushed head in the draft PR; this file does not claim remote CI success before GitHub reports it.

All fixtures are synthetic. Cross-module event-driven cycle producers, live first-admin provisioning, and production activation remain deferred; the schema and queue merely support event-driven cycle records. Before any Preview Access Admin smoke test, Vercel's non-secret server-only mode and exact Web/API origins must be configured as specified in [DEPLOYMENT.md](../../../DEPLOYMENT.md); the code fails closed on a public/server environment mismatch. No production data, credentials, first-admin grant, production deployment, visual-baseline acceptance, or IAM-010 work is included. Deployment remains a separate approval. Recovery is a source rollback with a reviewed forward-fix migration; applied history and immutable audit/review evidence are preserved.
