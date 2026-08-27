# UI-006 image-size advisory exception

- Package: `image-size@2.0.2`
- Advisory: `GHSA-5p2g-fcmc-qvqq`
- Advisory: `GHSA-w3rx-r6r6-pgpr`
- Recorded: `2026-08-27`
- Review due: `2026-09-10`
- Scope: development-only Storybook image metadata processing
- Production audit: no known vulnerabilities
- Owner: Security with Web/Frontend Engineering

## Decision

No published patched release exists. The npm registry still identifies `2.0.2` as latest, while both advisories describe `2.0.3` as the patched floor. The upstream `image-size` repository is archived. Storybook reaches the package through `@storybook/nextjs-vite` → `vite-plugin-storybook-nextjs`; that parent declares `image-size ^2.0.0`, so a compatible patched release can replace this exception when one exists.

Noma accepts this time-bounded exception only for the private UI documentation toolchain. Storybook is a development dependency, its static output is ignored and never deployed, browser stories use repository-owned synthetic fixtures, external requests are blocked, and no production route or runtime imports this package. `pnpm audit --prod --audit-level moderate` reports no known vulnerabilities.

## Stop-lines

- The allowlist contains exactly these two GHSA identifiers. Any other Moderate, High, or Critical advisory fails review.
- The audit floor remains Moderate.
- Storybook must remain private, development-only, synthetic, and network-isolated.
- Security must re-check npm and the maintained Storybook adapter by 10 September 2026. The deterministic dependency validator fails after that date.
- If a compatible patched release appears, remove both ignores, regenerate the lockfile, rerun UI/browser/security verification, and obtain independent review.
- Do not publish Storybook, activate infrastructure, or begin IAM work under this exception.
