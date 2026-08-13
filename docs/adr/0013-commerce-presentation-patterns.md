# ADR-0013: Commerce presentation patterns

- Status: Accepted for UI-003 review
- Date: 2026-08-12
- Task: `UI-003`
- Issue: `#36`
- Authority: `docs/05-design-system.md`, `REQ-UI-003`, `DEC-SCOPE-010`, `DEC-REPO-001`

## Context

Noma needs reusable status, money, history, evidence, and confirmation patterns before feature surfaces are built. Those patterns must preserve materially different requested, processing, final, failed, and uncertain outcomes without turning a browser package into a domain state machine or financial authority.

Money is authoritative integer minor units with explicit currency. Material history is append-only and exact-time-based. Evidence access and authentication assurance remain server-owned. UI-001 and UI-002 already provide semantic/component tokens and accessible primitives.

## Decision

Add a presentation-only `CommercePhase` with five fixed semantic mappings. Feature/domain adapters supply labels, responsibility, deadline state, and completion truth; `@noma/ui` performs no backend-state mapping.

Accept money as `bigint` or canonical integer string only. Format exact scientific decimal strings through platform `Intl.NumberFormat`, using resolved currency fraction metadata and no floating-point conversion. `MoneyBreakdown` presents caller-calculated values and a supplied total under one currency.

Render Timeline in caller order as an immutable ordered list. EvidenceCard receives safe metadata and an authorised action slot, never storage access. HighRiskConfirmation composes UI-002 primitives, focuses the safe action, gathers an optional required reason, and presents approval/assurance requirements without claiming authentication or authorization.

Add `commerce-tokens.ts` over existing token authority and deterministically generate `commerce.css`. Keep static patterns server-compatible and isolate the high-risk dialog behind one client module. Add no dependency.

## Consequences

- Feature code must create explicit human presentation models at its own boundary.
- Requested, processing, and uncertain work cannot receive final-success styling from the shared phase API.
- Large monetary values retain exact digits and currencies with 0, 2, or 3 fraction digits remain standards-based.
- History and evidence APIs cannot silently mutate or expose private storage.
- Confirmation improves deliberateness but never replaces server controls.
- Automated accessibility evidence remains incomplete without human browser/assistive-technology review.

## Rejected alternatives

- Import domain enums and centralize every status mapper in UI: rejected because state-machine and provider truth belong to owning features.
- Accept JavaScript numbers or divide minor units by 100: rejected because it weakens exact financial representation.
- Add a money/date package: rejected because platform Intl supports the required exact formatting.
- Sort timelines inside the component: rejected because UI must not disguise upstream chronology defects.
- Accept evidence URLs directly: rejected because authorization and short-lived access are security-layer responsibilities.
- Name the dialog Reauthentication: rejected because confirmation does not establish assurance.

## Rollback

Revert UI-003 source, generated CSS/export, Web imports, tests, validators, command catalog, documentation, and traceability through normal review. UI-001/UI-002 remain intact; no external data or infrastructure rollback exists.
