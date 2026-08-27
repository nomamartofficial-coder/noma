# ADR-0016: Private Storybook with browser accessibility and reviewed Linux pixels

- Status: Accepted for UI-006 review
- Date: 2026-08-22
- Task: `UI-006`
- Issue: `#46`
- Authority: `docs/05-design-system.md`, `docs/06-technical-architecture.md`, `docs/11-testing-strategy.md`, `REQ-UI-006`, `DEC-SCOPE-010`, `DEC-REPO-001`

## Context

Noma's token, primitive, commerce, consumer-shell, and protected-surface presentation layers need one deterministic review catalogue. Static examples alone do not prove interaction or accessibility behavior, while browser screenshots created on different operating systems are not stable enough for a zero-tolerance required gate. Publishing Storybook would also create an unnecessary surface and could encourage fake protected access.

## Decision

Keep Storybook, stories, fixtures, and browser tests under `apps/web` but outside production source. Catalogue real production components using immutable synthetic inputs, fixed Nigerian locale and Lagos time, a fixed instant, and six explicit viewports. Maintain an internal inventory and state-applicability registry that is checked against source stories and the built index.

Run every eligible story in real Chromium through Storybook's Vitest integration, with axe violations treated as failures and retries disabled. Test the loopback-only static build separately with Playwright. Ubuntu 24.04 with the pinned Chromium version owns strict pixel baselines; Windows runs equivalent browser smoke without comparing pixels. CI cannot update baselines.

Protected routes remain fail closed. Protected presentation stories call no access resolver and create no role, session, cookie, header, query, or environment bypass. Storybook has no deployment configuration and no production data or provider access.

## Consequences

- Component documentation, interactions, accessibility checks, state coverage, and visual review share one deterministic inventory.
- Baseline diffs are meaningful only on the canonical Linux image and require human inspection.
- The five stable required gate names remain unchanged; the Quality Gate gains a mandatory Storybook/visual job and Windows gains browser smoke.
- Automated axe and screenshots complement rather than replace keyboard, screen-reader, zoom, forced-colour, and intended-actor review.
- A real accessibility defect found in the existing account shell is corrected independently by retaining one banner landmark and labelling the account-context section.
- Two newly disclosed `image-size@2.0.2` denial-of-service advisories have no published fix. They are isolated to private, development-only Storybook image metadata processing; a two-ID exception expires on 10 September 2026, while the production dependency audit remains clean.

## Rejected alternatives

- Hosted visual services or Chromatic: rejected because UI-006 requires repository-owned, reviewed evidence without another external surface.
- Cross-platform pixel baselines: rejected because rendering engines and fonts create false changes.
- Storybook production deployment: rejected because documentation is development and CI tooling, not a product route.
- Browser stories backed by `@noma/testing`, network calls, or production data: rejected because fixtures must remain browser-safe, deterministic, and synthetic.
- Protected-route demo bypass: rejected because presentation documentation cannot create authority.

## Rollback

Revert the UI-006 dependency, configuration, stories, browser tests, reviewed baselines, validators, command/CI wiring, documentation, evidence, and traceability through normal review. No runtime route, database, provider, deployment, or infrastructure rollback is required.
