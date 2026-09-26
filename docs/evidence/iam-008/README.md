# IAM-008 evidence

This directory records synthetic, non-production evidence for the append-only audit service and internal privileged-action timeline.

- Tracking issue: [#73](https://github.com/nomamartofficial-coder/noma/issues/73)
- Branch: `iam-008-append-only-audit-privileged-action-timeline`
- Approved base: `fb3be1afd6aefff31cb730857d6f63a633077eb0`
- Exact implementation head: recorded in the draft PR after the final verified push
- Migration: `20260925000100_iam_008_append_only_audit`
- Draft PR and required gate run IDs: assigned after publication

## Implemented catalogue

The closed registry contains the approved 21 action codes: six Identity/Security, fourteen Access, and `audit.event.read`. It deliberately excludes `access.assignment.read` and has no wildcard. Current transaction wiring covers the six real Identity/MFA authoritative effects and one read event per successful governed audit query. The Access definitions are ready for their future owning commands, but current repository/setup persistence seams do not emit fabricated production events.

## Verification

The required command family is exactly:

```text
pnpm iam008:validate
pnpm iam008:self-test
pnpm iam008:test
pnpm iam008:integration-test
pnpm iam008:verify
```

The focused proof covers the closed registry and sentinel rejection; additive migration and checksum; database-enforced event/link immutability; restrictive relationships; operation idempotency and concurrency; mutation/audit/outbox atomicity; Redis-independent durability; IAM-006 exact-scope authority; IAM-007 exact select and fixed projection; single-event non-recursive audit reads; accessible viewer states; and the unchanged protected-route boundary. CI registers IAM-008 only inside the five stable Noma gates. Exact final command results and the pushed SHA are recorded in the draft PR evidence after the clean verification run.

## Residual risk and deliberately deferred scope

No current Access production command boundary exists with trusted actor and authority context, so Access setup helpers are not made to masquerade as privileged production activity. Severity, retention execution, legal-hold workflow, export, cryptographic chaining/notarization, historical backfill, broad auditor roles, and `/admin/audit` activation remain deferred. No production data, secrets, private evidence, dependency change, visual-baseline acceptance, or new CI gate is included.

Recovery is source rollback plus a reviewed forward-fix migration. Applied history is not deleted or rewritten; an incorrect event is corrected with a new governed event.
