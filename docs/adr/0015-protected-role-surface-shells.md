# ADR-0015: Fail-closed protected role-surface shells before IAM

- Status: Accepted for UI-005 review
- Date: 2026-08-21
- Task: `UI-005`
- Issue: `#42`
- Authority: `docs/02-user-roles.md`, `docs/04-information-architecture.md`, `docs/05-design-system.md`, `docs/06-technical-architecture.md`, `docs/10-security-and-compliance.md`, `REQ-UI-005`, `DEC-SCOPE-010`, `DEC-REPO-001`

## Context

Noma needs distinct Seller, Rider, Operations, and Admin presentation architecture before the IAM tasks and business workspaces are implemented. Making placeholder routes reachable through invented roles, sessions, headers, cookies, or development exceptions would create an authorization shortcut and expose a misleading protected surface. Combining the roles into a universal dashboard would also erase the scope, density, task, custody, and review differences locked in the information architecture.

## Decision

Keep the four shells in `apps/web` as separate high-level Server Component compositions. Shared code is limited to low-level current-navigation presentation, a compact Menu leaf, breadcrumbs, and truthful placeholder structure. Navigation catalogs remain in their surface folders so public consumer client code does not import protected catalogs.

Each protected route group calls a `.server.ts` resolver before returning shell markup. Until IAM supplies a trustworthy decision, that resolver has no allow branch and invokes stable Next.js `notFound()`. A neutral root not-found page avoids revealing whether a role surface or resource exists. Experimental authentication interrupts and client redirect guards are not used.

Operations and Admin receive explicit destination subsets. Seller context is presentation-only. Rider connectivity uses fixed truthful states and an RFC 3339 timestamp for cached information; it never establishes assignment, pickup, delivery, or custody truth. Synthetic component and browser fixtures are clearly labelled and cannot make production routes accessible.

## Consequences

- Direct protected links fail closed without JavaScript and ignore query, cookie, and header bypass attempts.
- Seller, Rider, Operations, and Restricted Administration remain visually and structurally distinct.
- IAM can replace one narrow resolver without inheriting a browser-side policy engine.
- Presentation tests can cover accessibility and responsive behavior without fake production identity or business data.
- UI-005 does not activate any seller, rider, staff, financial, custody, emergency-control, or administrative workflow.

## Rejected alternatives

- Client-side role redirects: rejected because protected content could render or be bundled before denial.
- Development/demo access flags: rejected because they create an unreviewed allow path.
- One universal dashboard with role conditionals: rejected because it collapses locked authority and task boundaries.
- Experimental framework authentication interrupts: rejected because stable `notFound()` supplies the required fail-closed, non-enumerating behavior.
- Add a grid, authorization, PWA, or Storybook dependency: rejected because existing primitives and the bounded task are sufficient; UI-006 and later IAM/Rider tasks own those capabilities.

## Rollback

Revert UI-005 routes, Web-owned shell components and styles, tests, validators, command wiring, documentation, evidence, and traceability through normal review. UI-001 through UI-004, health routes, data, providers, and infrastructure remain unchanged.
