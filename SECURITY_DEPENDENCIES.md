# Dependency security policy

> **Task:** `SEC-005`  
> **Risk:** `P0-RECOVERY`  
> **Status:** implemented for review; infrastructure activation remains blocked

## Purpose

Noma treats the committed manifests and `pnpm-lock.yaml` as reviewed supply-chain inputs. A frozen install proves reproducibility, but it does not prove that resolved versions meet the approved security floor. SEC-005 therefore combines an offline lockfile policy with GitHub dependency review and a separately recorded live registry audit.

This policy does not deploy, provision infrastructure, contact a business provider, or activate a marketplace capability.

## Reviewed resolutions

| Package | Approved resolution | Reason |
|---|---:|---|
| `next` | `16.3.0` | Stable parent release resolving patched PostCSS and Sharp versions |
| `postcss` | `8.5.23`, `8.5.25` | Covers the four open PostCSS advisories while retaining Vite's already-safe graph |
| `sharp` | `0.35.3` | Exceeds the `0.35.0` patched minimum through Next's supported optional range |
| `fast-uri` | `3.1.5` | Compatible convergence override for Ajv's `^3.0.1` range |
| `nanoid` | `3.3.17` | Compatible convergence override for PostCSS's declared range |

The `fast-uri@` and `nanoid@` keys in `pnpm-workspace.yaml` intentionally use pnpm's convergence-only override form. They apply only where the declaring dependency already accepts the selected version. PostCSS and Sharp are not added as direct Web dependencies; their ownership remains with Next.js.

## Commands

```bash
pnpm security:dependencies:validate
pnpm security:dependencies:self-test
pnpm security:dependencies:verify
pnpm audit --audit-level moderate
```

The first three commands are deterministic and network-free. They validate exact manifest pins, reviewed overrides, lockfile package sets, and the Next→PostCSS/Sharp, Ajv→fast-uri, and PostCSS→nanoid edges. The self-test mutates each protected boundary in memory and proves the validator rejects weaker fixtures.

The live `pnpm audit` command is required review evidence but is not embedded in a stable required CI gate because registry availability is external and time-varying. GitHub's pinned Dependency Review action independently rejects newly introduced vulnerabilities at `moderate` severity or above.

## Update and recovery

1. Review an upstream supported parent release before adding a transitive override.
2. Use an override only when the parent range accepts the patched version and record why direct ownership is inappropriate.
3. Regenerate the lockfile with Node `24.18.0` and pnpm `11.17.0`.
4. Inspect dependency paths, native optional packages, licences, install scripts, build output, and the complete lockfile diff.
5. Run the offline verifier, live audit, affected runtime/database tests, and all five required GitHub gates.
6. Remove an override only after the resolved parent graph remains patched and the negative fixtures are updated through review.

If a supported upgrade causes an incompatible regression, revert the SEC-005 commits through a reviewed pull request and keep infrastructure activation blocked. Do not restore a vulnerable floor, weaken the Security Gate, or use a preview framework as a workaround.

## Activation stop-line

Closing a pull-request audit is not the final activation oracle. After a human merge, Security must confirm the default branch has no open Moderate, High, or Critical dependency advisory, including delayed Dependabot synchronization, before infrastructure activation can proceed. Evidence records the commit, audit time, command result, Dependabot state, reviewer, and any residual limitation without tokens or private administrator details.
