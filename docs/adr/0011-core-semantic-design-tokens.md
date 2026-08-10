# ADR-0011: Core and semantic design tokens

- Status: Accepted for UI-001 review
- Date: 2026-08-10
- Task: `UI-001`
- Issue: `#32`
- Authority: `docs/05-design-system.md`, `REQ-UI-001`, `DEC-SCOPE-010`, `DEC-REPO-001`

## Context

Noma needs one browser-safe design authority before primitive components and commerce surfaces are built. TypeScript consumers require inspectable alias identities and literal readonly values, while CSS consumers require static prefixed custom properties. Independently maintained TypeScript and CSS registries would permit silent drift. A runtime token compiler would add browser cost and unnecessary dependency risk.

The pilot requires light mode, operating-system forced-colour compatibility, reduced motion, and WCAG 2.2 contrast evidence. Dark mode, component tokens, components, Tailwind, Storybook, final brand assets, and role-surface composition are later decisions.

## Decision

Use `packages/ui/src/tokens.ts` as the single canonical value and semantic-alias registry. Runtime-deep-freeze the registry, preserve literal TypeScript types, and derive `dist/tokens.css` and `dist/foundations.css` deterministically after TypeScript compilation. Alias CSS values reference core custom properties with `var()` rather than repeating literals.

Publish browser-safe exports at `@noma/ui`, `@noma/ui/tokens`, `@noma/ui/tokens.css`, and `@noma/ui/foundations.css`. Mark only `./dist/*.css` as package side effects. The Web root imports the external foundation stylesheet through the supported Next.js App Router mechanism.

Keep breakpoint thresholds canonical in TypeScript because ordinary CSS custom properties cannot be used as media-query conditions. Generate custom properties for inspection/property consumption without treating them as the media-query implementation.

Enforce exact contracts through real relative-luminance tests, registry/CSS parity, brand-remapping proof, source-boundary scans, and deterministic negative self-tests. Keep policy validation offline, platform-independent, and inside the existing five CI gates.

## Consequences

- Core or brand changes have one reviewed source.
- Semantic meaning remains inspectable and independently remappable.
- Static CSS requires no browser compiler.
- Component authors must use semantic tokens and wait for UI-002 component-state contracts.
- The generated CSS exists only after the package build; workspace build ordering remains authoritative.
- Human Design/Web/Accessibility review remains necessary because token tests do not constitute full visual or WCAG conformance.

## Rejected alternatives

- Two hand-maintained TypeScript/CSS registries: rejected because parity could drift.
- Style Dictionary or another token engine: rejected as unnecessary dependency and build complexity for the bounded task.
- Tailwind configuration as token authority: rejected because UI-001 is framework-neutral and Tailwind is not an approved dependency.
- Runtime CSS generation: rejected for avoidable browser work and bundle weight.
- Partial dark variables: rejected because the pilot requires a complete light mode and explicitly defers dark mode.

## Rollback

Revert the UI-001 source, package exports, Web imports, validation, documentation, and traceability in a reviewed correction. Restore the previous placeholder `@noma/ui` output and temporary Web foundation. No external state or data rollback exists.
