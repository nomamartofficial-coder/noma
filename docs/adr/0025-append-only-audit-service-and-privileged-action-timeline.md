# ADR-0025 — Append-only audit service and privileged-action timeline

- Status: Proposed for IAM-008 independent review
- Date: 2026-09-25
- Task: IAM-008
- Issue: #73
- Requirement: REQ-IAM-008

## Context

Noma needs durable evidence for current material security and authority changes without confusing audit history with business truth, operational logs, traces, or asynchronous delivery. Business tables remain authoritative for current state. Logs and traces are diagnostic and retention-bounded. The DEV-005 outbox represents required publication obligations. Audit rows are a separate historical record of an authoritative effect and the evidence under which it committed.

IAM-008 must not create a generic event name plus arbitrary JSON seam, derive authority from role labels, depend on Redis, activate an Admin route, invent historical events, or fabricate an unapproved severity vocabulary.

## Decision

Add the forward-only migration `20260925000100_iam_008_append_only_audit` with `audit_events` and `audit_event_links`. PostgreSQL rejects every ordinary UPDATE and DELETE on both tables through `BEFORE UPDATE OR DELETE` triggers using SQLSTATE `55000`. Foreign keys use restrictive deletion; no cascade can erase audit history. Corrections are new events linked to the prior event. There is no backfill.

A source-controlled frozen registry defines exactly 21 version-1 event contracts. Each contract fixes the action, source module, actor kinds, resource type, reason rule, outcomes, authority/approval requirements, and shallow primitive-only before/after fields. Unknown actions, wildcard names, extra keys, nested values, arrays, unsupported values, and unsafe free text fail closed. Callers can persist only branded events returned by the registry builder. `access.assignment.read` is deliberately not an audit action; successful governed timeline queries emit `audit.event.read` instead.

The database records historical actor and authority snapshots rather than joining mutable authority rows for display. Stable `(source_module, action_code, operation_id)` uniqueness gives retries one logical representation while allowing genuinely repeated commands to use distinct operation identities. Optional event links provide indexed relationships without copying business entities or private evidence.

Current production-capable Identity/MFA command seams append audit history inside the same PostgreSQL transaction as their authoritative mutation and, where already required, their existing security-notice outbox obligation. The wired actions are password recovery completion, MFA activation/replacement/removal, recovery-code regeneration, and completed assurance step-up. The existing transition ID is the stable operation/event identity. An audit insert failure rolls the mutation back; an outbox failure rolls the mutation and audit back. Redis and Worker replay never create audit truth.

The 14 Access actions remain registered contracts, but the current Access persistence methods are repository/setup seams and there is no activated production command boundary capable of supplying trusted actor and authority snapshots. IAM-008 therefore does not mislabel fixtures as privileged production actions. A future owning Access command must authorize and append its registered event in one transaction before activation.

The internal timeline read model uses `audit.event.read.v1`, human interactive authority, the exact `audit.event.read` capability, privileged current assurance, and exact non-PLATFORM scope. The migration seeds the capability but no template assignment or broad reader. IAM-006 runs before the bounded keyset query. The query uses an exact minimized select and the fixed IAM-007 `audit.timeline.row.v1` projection; raw reason text, session/authority internals, and raw JSON are omitted. Each successful query appends exactly one read event in that transaction. The append primitive never invokes the viewer, so reads do not recurse. Denied or malformed requests disclose no rows and create no permanent attacker-amplifiable history.

The viewer component implements loading, loaded, empty, filtered-empty, generic error, denied/concealed, malformed-query, correction, and pagination-loading states with semantic native controls and existing Noma timeline primitives. `/admin/audit` remains behind the unchanged server-side `notFound()` boundary. IAM-009 owns production Admin activation. New Storybook stories receive browser accessibility coverage, but IAM-008 adds or accepts no visual baseline.

Severity is deferred because no approved source vocabulary exists. The schema remains compatible with an additive future field but stores no fabricated value. Retention tooling is also deferred: the append-only tables expose no delete API, and any future retention or legal-hold design requires separate authority and evidence. This design is database-enforced append-only with no cryptographic chain or external notarization; no hash-chain claim is made.

## Rejected alternatives

- Application-only immutability, because privileged database clients could rewrite history.
- A generic JSON audit logger, because it permits secret/PII leakage and schema drift.
- Auditing after commit or in the Worker, because audit failure would not roll back the authoritative effect.
- One outbox event per audit event, because no current consumer justifies duplicate payload delivery.
- A platform-wide auditor assignment, ADMIN-role bypass, or service-principal viewer, because exact current human authority is required.
- Updating or deleting rows to correct history, because corrections must preserve the original evidence.
- Hash chains in IAM-008, because key custody, anchoring, verification, and recovery policy are not approved.

## Consequences and recovery

The additive schema is compatible with the prior application while the new code rolls forward. Ordinary rollback is a source revert plus reviewed forward-fix migration; the audit tables are never destructively rolled back. Incorrect events are corrected by a new typed event. Existing history remains valid during Redis loss and Worker restart. Production retention, export, broader detail projection, severity, cryptographic attestation, historical backfill, broad auditor roles, and Admin activation remain deferred.
