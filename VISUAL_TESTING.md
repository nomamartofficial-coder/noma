# Noma visual regression testing

> **Task:** `UI-006`  
> **Canonical platform:** official Playwright Ubuntu 24.04 image `v1.62.1-noble`, pinned by digest

## Contract

The visual suite tests the loopback-only static Storybook `iframe.html` pages listed in `visualBaselineManifest`. It blocks external requests, fixes locale and time zone, uses the UI-006 viewports, waits for the explicit story-ready marker and `document.fonts.ready`, and disables animation, caret, service workers, and reduced-motion variance.

Canonical comparisons use strict zero-pixel tolerance. GitHub runs the pixel job inside the official `mcr.microsoft.com/playwright:v1.62.1-noble` image pinned to `sha256:dcc5531e97840b9b5e794f2814476b21571c5124a3fca2267d73041f56e7580e`; this fixes the browser, system fonts, and rasterization environment together. Expected PNGs are reviewed source evidence beside `apps/web/stories/visual/ui-006.visual.spec.ts`. Actual, diff, report, and trace output remains ignored under `apps/web/test-results` and `apps/web/playwright-report`.

Windows and other non-Linux systems run all 31 pages as browser smoke checks but do not compare pixels. Browser engines, fonts, rasterization, and operating-system rendering make cross-platform pixels non-authoritative.

## Commands

```bash
pnpm ui:visual:test
pnpm ui:visual:update
```

`ui:visual:update` refuses CI and non-Linux execution. It is not present in any GitHub Actions command graph. Baseline updates must run in the same digest-pinned official image with Node `24.18.0` and pnpm `11.17.0`, be visually reviewed, and be committed with an explanation of the intended UI change.

## Baseline review

Review every changed image for:

- the intended component and presentation state;
- correct 320–1440 px layout and bounded overflow;
- visible focus and forced-colour evidence where named;
- truthful pending, uncertainty, failure, and superseded language;
- no private URL, credential, real person, production record, or provider payload;
- no protected-route access or fake authorization; and
- no unexpected typography, token, spacing, clipping, or landmark change.

Never approve a bulk update solely because the command completed. A difference without an explained source change is a failure to investigate, not a baseline to accept.

## Failure handling

Inspect the first diff and trace in the ignored results directory. Reproduce with the exact Storybook ID and viewport, determine whether the source or baseline is wrong, and change only the owning source or reviewed PNG. Retries remain zero. Storybook is never deployed to make visual tests available.
