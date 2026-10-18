# Dependency security policy

> **Task:** `SEC-005`, corrected by `SEC-006`, `SEC-007`, the bounded Next.js 16.3.3 security correction, the IAM-002 pre-publication audit correction, and PR #77's bounded Next.js 16.3.8 update
> **Risk:** `P0-RECOVERY`  
> **Status:** Next.js 16.3.8 merged; Issue #78 Group A correction pending independent Security review; Security readiness HOLD; infrastructure activation remains blocked

## Purpose

Noma treats the committed manifests and `pnpm-lock.yaml` as reviewed supply-chain inputs. A frozen install proves reproducibility, but it does not prove that resolved versions meet the approved security floor. SEC-005 therefore combines an offline lockfile policy with GitHub dependency review and a separately recorded live registry audit. SEC-006 raises the reviewed `nanoid` floor after the live audit began classifying `3.3.17` as vulnerable. SEC-007 resolves GHSA-ggr8-5vv4-36mx after Prisma's current configuration package began resolving the affected `deepmerge-ts` line.

This policy does not deploy, provision infrastructure, contact a business provider, or activate a marketplace capability. UI-006 removes the vulnerable Next.js-specific Storybook adapter from the private documentation toolchain rather than weakening the dependency gate. The bounded Next.js correction raises the Web runtime from `16.3.0` to Active-LTS `16.3.3` for GHSA-2xp9-vwfh-vxw4 and GHSA-p293-qw3h-jr36 without beginning IAM-002 or changing application behavior.

The reviewed `16.3.3` lockfile update also advances Next's own `@next/env` and platform SWC packages to `16.3.3`, advances `@swc/helpers` to `0.5.23`, and consolidates `baseline-browser-mapping` and `caniuse-lite` onto versions already present elsewhere in the workspace graph. It introduces no unrelated package or direct dependency; React and the remaining application and test-tool pins are unchanged.

## Reviewed resolutions

PR #77 now targets exactly `next@16.3.8`, superseding its initial `16.3.6` proposal. The [upstream 16.3.8 security release](https://github.com/vercel/next.js/releases/tag/v16.3.8) addresses additional image-optimization, metadata-image, and cache-isolation advisories beyond [GHSA-vcvr-r3jv-pc5j](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j). The lockfile correction is limited to Next and its version-coupled `@next/env`/platform SWC entries relative to Dependabot's existing commit; React, application code, Storybook configuration, visual baselines, CI topology, and other reviewed pins remain unchanged. The earlier `16.3.3` paragraphs above are historical context, not the current approved Next resolution.

This package-level remediation does not establish that Noma exposes an exploitable advisory path, nor does it clear unrelated registry findings. Remaining Moderate, High, or Critical findings require separate triage and bounded remediation; no audit ignore or CI allowance is introduced. Security readiness stays **HOLD**, Admin-actor UAT remains outstanding, and this PR authorizes neither merge, deployment, production Admin activation, nor IAM-010 advancement.

| Package | Approved resolution | Reason |
|---|---:|---|
| `next` | `16.3.8` | Exact reviewed security-release target, retaining the existing PostCSS and Sharp graph; unrelated audit findings remain unresolved |
| `postcss` | `8.5.23`, `8.5.25` | Covers the four open PostCSS advisories while retaining Vite's already-safe graph |
| `sharp` | `0.35.4` | Patched libheif-bearing release selected through Next's supported optional range |
| `fast-uri` | `3.1.7` | Current patched compatible convergence override for Ajv's declared range |
| `mysql2` | `3.23.1` | Minimum release fixing credential downgrade and compressed-protocol decompression advisories in Prisma's unused optional MySQL tooling path |
| `multer` | `2.3.0` | Patched multipart parser forced through the current Nest platform dependency |
| `qs` | `6.16.0` | Patched query-string parser selected through Express's supported range |
| `nanoid` | `3.3.18` | Current patched floor for GHSA-2v37-7h3g-55p8 within PostCSS's declared range |
| `proxy-addr` | `2.0.8` | Group A exact patched target for GHSA-jqcg-44mw-7w3h / CVE-2026-90711 within Express's declared range |
| `deepmerge-ts` | `8.0.2` | Current patched release for GHSA-ggr8-5vv4-36mx in Prisma's configuration-only graph |
| `vitest`, `@vitest/coverage-v8`, `@vitest/browser-playwright` | `4.1.11` | Same-major patched test-tool family for the mock redirect path-traversal advisory |

The `fast-uri@` and `nanoid@` keys in `pnpm-workspace.yaml` intentionally use pnpm's convergence-only override form. They apply only where the declaring dependency already accepts the selected version. The forced `mysql2`, `multer`, `qs`, `sharp`, and `deepmerge-ts` overrides are narrow advisory responses for transitive parents; none becomes an application-owned direct dependency. The exact `deepmerge-ts` `minimumReleaseAgeExclude` entry remains the sole reviewed cooling-period exception. Prisma schema validation, generation, migration, Nest runtime checks, Next production build, and the complete Vitest/Storybook browser suites must prove compatibility before review.

## Issue #78 — Group A only

[Approved scope](https://github.com/nomamartofficial-coder/noma/issues/78#issuecomment-6115029888) permits only `proxy-addr@2.0.7` → exact `2.0.8` for [GHSA-jqcg-44mw-7w3h / CVE-2026-90711](https://github.com/advisories/GHSA-jqcg-44mw-7w3h). The production dependency paths are `apps/api → @nestjs/platform-express → express → proxy-addr` and the peer-resolved `apps/api|apps/worker → @nestjs/core → @nestjs/platform-express → express → proxy-addr`. Express remains `5.2.1`; its `^2.0.7` range accepts `2.0.8`. The added `'proxy-addr@': 2.0.8` convergence-only override does not force incompatible parents or introduce a direct application dependency. `forwarded@0.2.0`, `ipaddr.js@1.9.1`, MIT licensing, and the package's Node engine requirement remain unchanged; no new install script is introduced.

The advisory concerns short IPv4-mapped IPv6 / generic-zero IPv6 subnets incorrectly trusting unrelated IPv4 peers. Synthetic tests exercise single/multiple subnet paths and equivalent mapped spellings, legitimate IPv4/mapped/IPv6 CIDRs, forwarding-chain stopping, and Express's default disabled proxy trust. Authentication tests exercise the real controller's socket-derived network signal despite forged forwarding headers and `ip`/`ips`, including a missing-socket fallback; real API authentication regressions retain their credential, session, CSRF, and privacy assertions with forged headers. Noma does not enable Express trusted proxies or use forwarding headers as authentication authority; the installed vulnerable library is not proof of an exploitable Noma authentication path. Neither topology nor authentication semantics are changed.

The offline policy requires the sole exact override, package, registry integrity, snapshot with unchanged children, and every Express edge. Negative fixtures reject vulnerable, missing, ranged, conflicting, aliased/quoted/inline extra graph representations, duplicate entries, and advisory suppression without relaxing any existing dependency invariant.

Fresh registry audits on 18 October 2026 changed from **23 full / 19 production (one Critical each)** to **22 full / 18 production (zero Critical)**. The targeted advisory is absent; Moderate-floor audits still fail on unrelated findings. Undici, Sharp, Multer, brace-expansion, gRPC, fast-uri, and source-map-js findings remain outside this patch; their inventory and verification limits are indexed in [Group A evidence](evidence/security/group-a-proxy-addr.md). Groups B–F still require separate approval. IAM-009 remains `IN_REVIEW`, IAM-010 remains `NOT_STARTED`; Admin-actor UAT and independent human Security review remain outstanding.

Recovery is a separately reviewed forward fix if compatibility fails. Stop activation and preserve evidence; do not silently restore vulnerable `2.0.7`, change proxy trust/authentication, weaken an exact pin or CI gate, or suppress an advisory. This Group A Draft PR is not merge/deployment/activation authority and does not close Issue #78.

## Commands

```bash
pnpm security:dependencies:validate
pnpm security:dependencies:self-test
pnpm security:dependencies:verify
pnpm audit --audit-level moderate
pnpm audit --prod --audit-level moderate
```

The first three commands are deterministic and network-free. They validate exact manifest pins, reviewed overrides, lockfile package sets, and relevant parent-to-transitive resolutions. The self-test mutates every protected boundary in memory and proves the validator rejects vulnerable or weaker fixtures. Both dependency and runtime validators reject older, ranged, and otherwise unapproved Next pins; dependency fixtures also reject mismatched importers, missing/extra packages, and missing, stale, duplicate, lookalike, or prerelease Next snapshots.

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
