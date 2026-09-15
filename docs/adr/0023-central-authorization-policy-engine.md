# ADR-0023 — Central authorization policy engine

- Status: Proposed for independent review
- Date: 2026-09-15
- Task: IAM-006

## Context

IAM-005 persists exact, scoped grants but intentionally does not answer whether an actor may perform an application operation now. The answer also depends on current Identity/session evidence, exact resource relationships, business state, feature state, restrictions, emergency controls, and sometimes approval. Combining flattened roles/capabilities/scopes, trusting client flags, or relying on route visibility would create horizontal and vertical escalation paths.

## Decision

Use an in-process PEP/PDP/PIP architecture. Policies are immutable TypeScript definitions in a closed source-controlled registry. Policy ID and capability are distinct. The PDP is pure, deterministic, binary, and receives one injected instant. Required facts are typed tri-state values with provenance; missing and unknown deny.

An allow proof is assignment-atomic. One IAM-005 fact must independently satisfy subject, exact capability, exact scope or authoritative relationship, assignment validity, and template assurance. Human assurance reuses IAM-004 and action requirements may only tighten it. Machine policies are explicit and never synthesize human evidence.

Protected mutations resolve and evaluate current facts inside the local-effect transaction, using the established Access-before-Identity lock order. Reads use the weakest consistent transaction sufficient for their fact set, not universal repeatable read. Internal denial metadata is mapped to a generic public unavailable response where resource existence is sensitive.

No current API becomes IAM-006 protected, and protected Web surfaces remain generic fail-closed. Approval evidence is readable but no replay-sensitive approval-backed administrative command is activated before a command-consumption invariant exists.

## Consequences

Future owning modules must register exact reviewed policies and authoritative PIP adapters. They cannot delegate final decisions to controllers, Redis, browser state, role names, wildcard grants, or navigation caches. The foundation adds no schema, dependency, external service, or production activation. Reversal is a reviewed source revert.
