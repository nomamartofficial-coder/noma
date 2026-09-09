# Dependency security policy

> **Task:** `SEC-005`, corrected by `SEC-006`, `SEC-007`, the bounded Next.js 16.3.3 security correction, and the IAM-002 pre-publication audit correction
> **Risk:** `P0-RECOVERY`  
> **Status:** prior corrections complete; IAM-002 audit correction implemented for review; infrastructure activation remains blocked

## Purpose

Noma treats the committed manifests and `pnpm-lock.yaml` as reviewed supply-chain inputs. A frozen install proves reproducibility, but it does not prove that resolved versions meet the approved security floor. SEC-005 therefore combines an offline lockfile policy with GitHub dependency review and a separately recorded live registry audit. SEC-006 raises the reviewed `nanoid` floor after the live audit began classifying `3.3.17` as vulnerable. SEC-007 resolves GHSA-ggr8-5vv4-36mx after Prisma's current configuration package began resolving the affected `deepmerge-ts` line.

This policy does not deploy, provision infrastructure, contact a business provider, or activate a marketplace capability. UI-006 removes the vulnerable Next.js-specific Storybook adapter from the private documentation toolchain rather than weakening the dependency gate. The bounded Next.js correction raises the Web runtime from `16.3.0` to Active-LTS `16.3.3` for GHSA-2xp9-vwfh-vxw4 and GHSA-p293-qw3h-jr36 without beginning IAM-002 or changing application behavior.

The reviewed `16.3.3` lockfile update also advances Next's own `@next/env` and platform SWC packages to `16.3.3`, advances `@swc/helpers` to `0.5.23`, and consolidates `baseline-browser-mapping` and `caniuse-lite` onto versions already present elsewhere in the workspace graph. It introduces no unrelated package or direct dependency; React and the remaining application and test-tool pins are unchanged.

## Reviewed resolutions

| Package | Approved resolution | Reason |
|---|---:|---|
| `next` | `16.3.3` | Active-LTS security release addressing two Critical vulnerabilities while retaining the reviewed PostCSS and Sharp graph |
| `postcss` | `8.5.23`, `8.5.25` | Covers the four open PostCSS advisories while retaining Vite's already-safe graph |
| `sharp` | `0.35.4` | Patched libheif-bearing release selected through Next's supported optional range |
| `fast-uri` | `3.1.7` | Current patched compatible convergence override for Ajv's declared range |
| `mysql2` | `3.23.1` | Minimum release fixing credential downgrade and compressed-protocol decompression advisories in Prisma's unused optional MySQL tooling path |
| `multer` | `2.3.0` | Patched multipart parser forced through the current Nest platform dependency |
| `qs` | `6.16.0` | Patched query-string parser selected through Express's supported range |
| `nanoid` | `3.3.18` | Current patched floor for GHSA-2v37-7h3g-55p8 within PostCSS's declared range |
| `deepmerge-ts` | `8.0.2` | Current patched release for GHSA-ggr8-5vv4-36mx in Prisma's configuration-only graph |
| `vitest`, `@vitest/coverage-v8`, `@vitest/browser-playwright` | `4.1.11` | Same-major patched test-tool family for the mock redirect path-traversal advisory |

The `fast-uri@` and `nanoid@` keys in `pnpm-workspace.yaml` intentionally use pnpm's convergence-only override form. They apply only where the declaring dependency already accepts the selected version. The forced `mysql2`, `multer`, `qs`, `sharp`, and `deepmerge-ts` overrides are narrow advisory responses for transitive parents; none becomes an application-owned direct dependency. The exact `deepmerge-ts` `minimumReleaseAgeExclude` entry remains the sole reviewed cooling-period exception. Prisma schema validation, generation, migration, Nest runtime checks, Next production build, and the complete Vitest/Storybook browser suites must prove compatibility before review.

## Commands

```bash
pnpm security:dependencies:validate
pnpm security:dependencies:self-test
pnpm security:dependencies:verify
pnpm audit --audit-level moderate
```

The first three commands are deterministic and network-free. They validate exact manifest pins, reviewed overrides, lockfile package sets, and relevant parent-to-transitive resolutions. The self-test mutates every protected boundary in memory and proves the validator rejects vulnerable or weaker fixtures.

The live `pnpm audit` command is required review evidence but is not embedded in a stable required CI gate because registry availability is external and time-varying. No advisory ignore is permitted. `pnpm audit --audit-level moderate` and `pnpm audit --prod --audit-level moderate` must remain clean. GitHub's pinned Dependency Review action independently rejects newly introduced vulnerabilities at `moderate` severity or above without advisory allowances.

## Update and recovery

1. Review an upstream supported parent release before adding a transitive override.
2. Use an override only when the parent range accepts the patched version and record why direct ownership is inappropriate.
3. Regenerate the lockfile with Node `24.18.0` and pnpm `11.17.0`.
4. Inspect dependency paths, native optional packages, licences, install scripts, build output, and the complete lockfile diff.
5. Run the offline verifier, live audit, affected runtime/database tests, and all five required GitHub gates.
6. Remove an override only after the resolved parent graph remains patched and the negative fixtures are updated through review.

If a supported upgrade causes an incompatible regression, revert the affected SEC-005, SEC-006, or SEC-007 commit through a reviewed pull request and keep infrastructure activation blocked. Do not restore a vulnerable floor, weaken the Security Gate, or use a preview framework as a workaround.

## Activation stop-line

Closing a pull-request audit is not the final activation oracle. After a human merge, Security must confirm the default branch has no open Moderate, High, or Critical dependency advisory, including delayed Dependabot synchronization, before infrastructure activation can proceed. Evidence records the commit, audit time, command result, Dependabot state, reviewer, and any residual limitation without tokens or private administrator details.
