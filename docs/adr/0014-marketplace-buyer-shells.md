# ADR-0014: Marketplace and Buyer Account application shells

- Status: Accepted for UI-004 review
- Date: 2026-08-13
- Task: `UI-004`
- Issue: `#38`
- Authority: `docs/04-information-architecture.md`, `docs/05-design-system.md`, `docs/06-technical-architecture.md` §15, `REQ-UI-004`, `DEC-SCOPE-010`, `DEC-REPO-001`

## Context

Noma requires stable public Marketplace and Buyer Account navigation before downstream catalogue, identity, cart, order, and protection features exist. The merged Web runtime has one root layout and health handlers but no role-surface routing. Implementing shells must not fabricate business data, treat navigation as authorization, or force every future feature page into UI-004.

## Decision

Keep one document-level root layout and introduce invisible `(marketplace)` and `(buyer)` App Router route groups. Application shells and their responsive CSS live in `apps/web`, while `@noma/ui` remains responsible for reusable tokens and accessible primitives.

Shell layouts own the single main landmark. Pages and layouts remain Server Components by default; pathname-aware navigation, Menu composition, and the error boundary are narrow client leaves. Navigation accepts explicit readonly destinations from application context and provides presentation-only current-location matching. It never derives roles, memberships, or authority from the browser.

Create only the minimal truthful pages needed for coherent enabled navigation. Those pages explain that their owning capability is not connected and never claim empty business state. Health routes stay outside consumer groups.

## Consequences

- Marketplace and Buyer routes can evolve without full-document transitions or a universal dashboard.
- UI-005 can add distinct staff and delivery surfaces without changing the consumer shell boundary.
- Future IAM and feature work must replace presentation inputs and placeholders with server-authorized data; UI-004 supplies no shortcut.
- Enabled internal links are deterministic and collision-free, while unavailable footer concepts remain non-links.
- Responsive and accessibility behavior belongs to application composition and does not expand the shared primitive API.

## Rejected alternatives

- Put every shell in `@noma/ui`: rejected because routes, navigation content, and responsive surface composition are application concerns.
- Wrap all routes in the root consumer layout: rejected because health and future distinct surfaces must not inherit Marketplace UI.
- Infer membership from pathname or browser storage: rejected because presentation is not server authority.
- Scaffold the complete information architecture: rejected because it would pull downstream business tasks forward and create misleading empty pages.
- Add a new navigation framework or icon dependency: rejected because Next.js, CSS Modules, and UI-002 Menu cover the bounded requirement.

## Rollback

Revert UI-004 route groups, Web shell components/styles, tests, validator and command wiring, documentation, evidence, and traceability through normal review. UI-001 through UI-003 and health routes remain intact; no data or infrastructure rollback exists.
