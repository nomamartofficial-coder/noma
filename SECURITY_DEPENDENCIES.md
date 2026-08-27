# Dependency security policy

> **Task:** `SEC-005`, corrected by `SEC-006` and `SEC-007`
> **Risk:** `P0-RECOVERY`  
> **Status:** SEC-005 and SEC-006 complete; SEC-007 implemented for review; infrastructure activation remains blocked

## Purpose

Noma treats the committed manifests and `pnpm-lock.yaml` as reviewed supply-chain inputs. A frozen install proves reproducibility, but it does not prove that resolved versions meet the approved security floor. SEC-005 therefore combines an offline lockfile policy with GitHub dependency review and a separately recorded live registry audit. SEC-006 raises the reviewed `nanoid` floor after the live audit began classifying `3.3.17` as vulnerable. SEC-007 resolves GHSA-ggr8-5vv4-36mx after Prisma's current configuration package began resolving the affected `deepmerge-ts` line.

This policy does not deploy, provision infrastructure, contact a business provider, or activate a marketplace capability. UI-006 also records an expiring exception for two unfixable `image-size` advisories in private Storybook build tooling; the production dependency audit remains clean and the exception expires on 10 September 2026.

## Reviewed resolutions

| Package | Approved resolution | Reason |
|---|---:|---|
| `next` | `16.3.0` | Stable parent release resolving patched PostCSS and Sharp versions |
| `postcss` | `8.5.23`, `8.5.25` | Covers the four open PostCSS advisories while retaining Vite's already-safe graph |
| `sharp` | `0.35.3` | Exceeds the `0.35.0` patched minimum through Next's supported optional range |
| `fast-uri` | `3.1.5` | Compatible convergence override for Ajv's `^3.0.1` range |
| `nanoid` | `3.3.18` | Current patched floor for GHSA-2v37-7h3g-55p8 within PostCSS's declared range |
| `deepmerge-ts` | `8.0.2` | Current patched release for GHSA-ggr8-5vv4-36mx in Prisma's configuration-only graph |
| `image-size` | `2.0.2` (temporary exception) | No patched npm release exists for GHSA-5p2g-fcmc-qvqq or GHSA-w3rx-r6r6-pgpr; reachable only through development-only Storybook tooling |

The `fast-uri@` and `nanoid@` keys in `pnpm-workspace.yaml` intentionally use pnpm's convergence-only override form. They apply only where the declaring dependency already accepts the selected version. The forced `deepmerge-ts` override is a bounded exception because the current stable Prisma `7.9.1` parent pins the vulnerable line exactly and no supported parent upgrade exists. Its exact `minimumReleaseAgeExclude` entry records the reviewed advisory response required while the patched release is still inside the local supply-chain cooling period; it does not permit another package or version. Prisma schema validation, generation, migration, build, and runtime checks must therefore prove the patched major remains compatible before review. PostCSS, Sharp, and deepmerge-ts are not added as direct application dependencies; ownership remains with their parents.

## Commands

```bash
pnpm security:dependencies:validate
pnpm security:dependencies:self-test
pnpm security:dependencies:verify
pnpm audit --audit-level moderate
```

The first three commands are deterministic and network-free. They validate exact manifest pins, reviewed overrides, lockfile package sets, and the Next→PostCSS/Sharp, Ajv→fast-uri, and PostCSS→nanoid edges. The self-test mutates each protected boundary in memory and proves the validator rejects weaker fixtures.

The live `pnpm audit` command is required review evidence but is not embedded in a stable required CI gate because registry availability is external and time-varying. Its committed ignore list contains only the two `image-size` advisory IDs documented in `docs/security/ui-006-image-size-exception.md`; validation rejects any change to that set, a weaker audit floor, a changed dependency edge, or an expired review date. `pnpm audit --prod --audit-level moderate` must remain clean. GitHub's pinned Dependency Review action independently rejects newly introduced vulnerabilities at `moderate` severity or above.

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
