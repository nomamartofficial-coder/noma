# ADR-0012: Accessible primitive component set

- Status: Accepted for UI-002 review
- Date: 2026-08-10
- Task: `UI-002`
- Issue: `#34`
- Authority: `docs/05-design-system.md`, `REQ-UI-002`, `DEC-SCOPE-010`, `DEC-REPO-001`

## Context

Noma needs a reusable primitive layer before commerce patterns or role surfaces are built. Native elements cover many semantics well, while select, modal overlays, composite navigation, menus, and announcements require coordinated focus, keyboard, and state behaviour. Publishing a third-party component API directly would make product code dependent on another library’s names and release contract. Hand-building every composite would duplicate difficult accessibility machinery.

The UI-001 registry already owns colour, type, spacing, target, focus, motion, and density meaning. UI-002 must add component decisions without creating a second raw colour authority, forcing the App Router into a broad client boundary, or pretending automated accessibility tests prove visual conformance.

## Decision

Use native HTML for links, text/password/textarea fields, forms, tables, and link-based pagination. Pin `@base-ui/react@1.7.0` inside `@noma/ui` for bounded interactive machinery: pending buttons, select, checkbox/radio, dialog/drawer semantics, tabs, menu, and toast. Pin `axe-core@4.13.0` as a root development dependency.

Expose only Noma-owned components and props. Keep third-party imports inside `packages/ui/src`, reject them in application source, and verify generated declarations contain no Base UI types. Keep static primitives Server Component compatible; add `use client` only to interactive modules and the error-summary focus helper.

Add `component-tokens.ts` over UI-001 semantic/core tokens and deterministically generate `components.css`. Component colour decisions reference semantic aliases. The Web root imports the stylesheet once, and production build verification proves token, foundation, and component CSS emission.

Use modal dialog semantics for ordinary drawers so focus containment, Escape, inertness, accessible title, and trigger-focus restoration share one contract. Tabs automatically activate already-available local panels on arrow focus. Menus remain action/command surfaces, tables remain native, and toasts remain non-authoritative transient feedback.

Run deterministic policy/self-tests plus Vitest/Testing Library/user-event/axe tests inside the existing five CI gates. Treat axe under JSDOM as a supported-rule check only; retain human keyboard, focus, forced-colour, motion, zoom, and visual review.

## Consequences

- Product code receives one stable Noma API and one component stylesheet.
- Composite accessibility fixes can follow Base UI releases without leaking its API.
- React remains a peer and resolves to the workspace’s single exact version.
- Interactive components add client JavaScript only when consumed; static consumers remain server-compatible.
- Component tests can prove semantics and interactions, but human review remains a release obligation.
- Business patterns, navigation shells, cards, and surface composition remain owned by UI-003 through UI-006.

## Rejected alternatives

- Publish Base UI parts directly: rejected because it leaks third-party types and naming into feature code.
- Build every composite from raw ARIA: rejected because it duplicates high-risk focus and keyboard machinery.
- Use one client-only package barrel: rejected because it broadens App Router client boundaries.
- Tailwind, CSS-in-JS, Storybook, or a second component library: rejected as unnecessary scope and dependency surface.
- ARIA grids for ordinary tables: rejected because native table reading semantics are correct and spreadsheet interaction is out of scope.
- Toasts as payment/custody truth: rejected because transient announcements cannot be authoritative evidence.

## Rollback

Revert UI-002 source, dependencies, generated-output configuration, Web imports/consumer proof, tests, documentation, CI catalog entries, and traceability in one reviewed correction. UI-001 tokens and the runtime scaffolds remain. No external state rollback exists.
