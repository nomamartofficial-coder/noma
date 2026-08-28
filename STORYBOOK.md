# Noma Storybook

> **Task:** `UI-006`  
> **Issue:** `#46`  
> **Pull request:** `#47`
> **Status:** implemented for review; private development and CI tooling only

## Purpose and boundary

Storybook is the living presentation catalogue for Noma's reviewed foundations, `@noma/ui` components, commerce patterns, consumer shells, and the Seller, Rider, Operations, and Admin presentation components. It does not expose a production route, grant protected access, fetch business data, or simulate identity or authorization.

All configuration, stories, fixtures, browser tests, and output live outside `apps/web/src`. Next.js production compilation therefore excludes the documentation harness. Static output is ignored and must never be deployed or published.

## Deterministic environment

- Locale: `en-NG`
- Time zone: `Africa/Lagos`
- Fixed instant: `2026-01-15T09:00:00+01:00`
- Viewports: 320×800, 390×844, 480×900, 768×1024, 1024×768, and 1440×900
- Theme: Noma light
- CSS order: foundations, components, commerce, Web globals, Storybook-only presentation CSS
- Browser-test retries: zero

## Reviewed dependency inventory

Registry metadata was rechecked on 22 August 2026 before publication. Storybook `10.5.10` and Playwright `1.62.1` were the current stable releases. Vite `8.2.2` and Vitest `4.1.11` had newer patch releases, but UI-006 deliberately retains the approved exact Vite `8.2.0` and Vitest `4.1.10` family as specified by the task; ranges and unreviewed drift are rejected.

| Direct development dependency | Exact version | License |
| --- | ---: | --- |
| `storybook`, `@storybook/react-vite`, `@storybook/addon-docs`, `@storybook/addon-a11y`, `@storybook/addon-vitest` | `10.5.10` | MIT |
| `vite` | `8.2.0` | MIT |
| `vitest`, `@vitest/browser-playwright` | `4.1.10` | MIT |
| `@playwright/test` | `1.62.1` | Apache-2.0 |
| `mockdate` | `3.0.5` | MIT |

`pnpm peers check` passes. The sole reviewed peer convergence allows `tsconfck@3.1.6` to consume the repository's locked TypeScript `6.0.3`; dependency policy validation rejects its removal or broadening. No lifecycle-script permission was added.

The 27 August 2026 live audit disclosed two High advisories in the Next.js-specific Storybook adapter's `image-size@2.0.2` edge. UI-006 removes that adapter rather than accepting an advisory exception. Storybook uses the reviewed React/Vite framework and an isolated deterministic `next/navigation` pathname mock outside production source. Dependency policy rejects the removed adapter, its vulnerable transitive packages, audit ignores, and GitHub Dependency Review allowances.

Stories use immutable synthetic values. They may not read environment credentials, contact a network, import `@noma/testing`, use production records, or introduce alternate product behavior. Protected role routes remain fail closed; their stories render presentation components directly with clearly synthetic inputs.

## Inventory and states

`apps/web/stories/contracts.ts` is the internal registry for story classification, public UI coverage, the six named viewports, universal presentation-state applicability, and the 31 reviewed visual entries. The UI-006 validator cross-checks that registry against CSF source and the built Storybook index.

The catalogue includes all seven Rider connectivity presentations and current truthful loading, no-results, error, pending, disabled, unavailable, uncertainty, failure, and superseded presentations where the existing UI supports them. A state marked `NOT_APPLICABLE` requires an explicit rationale; it is never silently omitted.

## Commands

```bash
pnpm storybook
pnpm storybook:build
pnpm ui:storybook:validate
pnpm ui:storybook:self-test
pnpm ui:storybook:test
pnpm ui:storybook:verify
```

Install the pinned Chromium runtime once on a new machine:

```bash
pnpm --filter @noma/web exec playwright install chromium
```

Linux CI uses `--with-deps`. The browser suite runs eligible CSF stories through the Storybook Vitest addon in real headless Chromium. Global axe policy is `error`; story-level disabling, `todo`, manual-only accessibility settings, and broad contrast suppression are prohibited.

## Accessibility and review limitations

Automated tests cover semantic rendering, representative interactions, keyboard-operable component behavior, and axe rules available in Chromium. The visual suite fixes reduced motion and removes animation/caret noise. Automation is not evidence of complete screen-reader, operating-system high-contrast, 200% zoom, touch, language, or intended-actor usability conformance. Those checks require dated human QA evidence; unavailable evidence must remain recorded as a limitation.

## Rollback

Rollback is a reviewed source-only revert of the Storybook dependencies, configuration, stories, validators, tests, baselines, CI wiring, documentation, and traceability. It requires no database, provider, deployment, or infrastructure action.
