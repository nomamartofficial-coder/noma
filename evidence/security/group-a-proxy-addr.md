# Issue #78 — Group A verification index

## Identity and authority

- Requirement/task: Part 10 §64 supply-chain controls, Part 11 verification; Issue #78 Group A only. No new task or traceability transition.
- Risk/readiness: `P0-SECURITY`; existing Security gate, not a new readiness approval. **HOLD**.
- Scope authority: [human approval](https://github.com/nomamartofficial-coder/noma/issues/78#issuecomment-6115029888).
- Exact reviewed base: `d5fb9fe5717a193f8595a6f00d45797f18f59758`; branch `security/proxy-addr-2.0.8`. Final candidate SHA and exact-head gate links belong to the Draft PR handoff; this pre-commit index does not assert release PASS.
- Release/provider environment: no release or deployment; Windows local synthetic tests, isolated PostgreSQL/Redis, no business-provider credentials. Node `24.18.0`, pnpm `11.17.0`, Docker Desktop engine `29.8.0`.
- Owner: Group A implementer. Independent verifier: human Security reviewer `ayoguvicky30-uniserve`, requested by the user; review pending. Architecture approval and agent review are not Security sign-off.
- Performed: 18 October 2026. Revalidate after any relevant source/lock/runtime change and before review or activation; not reusable as production/UAT clearance.
- Retention/redaction: sanitized engineering metadata; CI artifacts follow the existing 90-day retention. Only reserved synthetic addresses/credentials in tests; no production secrets, personal data, tokens, or raw request logs retained here.
- Supersession: initial Group A record; does not supersede other Issue #78 findings, Admin-actor UAT, or readiness evidence.

## Boundary and compatibility

`@nestjs/platform-express@11.1.28 → express@5.2.1 → proxy-addr@2.0.7` becomes the same path ending in exact `2.0.8`. API/Worker Nest core peer paths converge on that Express snapshot. Express's `^2.0.7` accepts the patch. The generated lock changes only the convergence override, proxy package/integrity, snapshot identity and Express edge. Forwarded `0.2.0`, ipaddr.js `1.9.1`, MIT license and Node engine remain unchanged, with no added install scripts.

The upstream Critical finding is [GHSA-jqcg-44mw-7w3h / CVE-2026-90711](https://github.com/advisories/GHSA-jqcg-44mw-7w3h). Four malicious subnet regressions fail on installed `2.0.7` for the intended trust-classification reason; three legitimate controls pass. After the patch, the two focused test files pass **13/13**, and real PostgreSQL/Redis/API authentication passes **8/8**. The new dedicated subnet test is needed to exercise the actual Nest→Express transitive library; existing authentication tests otherwise cover cookie behavior rather than CIDR parsing.

Current Noma authentication uses the socket peer, not forwarding headers. Controller tests preserve that signal with forged `X-Forwarded-For`, `Forwarded`, `X-Real-IP`, `ip`/`ips`, mapped peer and missing-socket cases. Real API tests preserve existing credential, session, CSRF and privacy assertions with forged headers. Proxy trust configuration and authentication implementation are unchanged. Dependency presence is not proof of an exploitable Noma authentication path.

## Verification receipts

| Check | Local result |
|---|---|
| `pnpm install --frozen-lockfile` | PASS, exact pinned toolchain |
| `pnpm security:dependencies:validate`, `:self-test`, `:verify` | PASS; exact policy and deterministic weakened fixtures |
| `pnpm exec vitest run --project unit apps/api/tests/dependency-security.test.ts apps/api/tests/authentication.test.ts` | PASS, 13 tests |
| `pnpm auth:test` | PASS, 21 tests; the existing cookie test file is unchanged from main and has no pre-build compiled-controller dependency |
| `pnpm exec vitest run --project integration packages/testing/tests/authentication.integration.test.ts` | PASS, 8 tests on isolated real infrastructure |
| `pnpm build` | PASS, 14 workspace tasks |
| `python scripts/validate_traceability.py`, `--self-test`, IAM-009/IAM-010 lookups | PASS; IAM-009 `IN_REVIEW`, IAM-010 `NOT_STARTED` |
| `pnpm ci:validate`, `pnpm ci:self-test`, `git diff --check` | PASS, five unchanged stable gates |
| `pnpm check` | PASS, including 332 unit/component tests, lint, types and builds |
| `pnpm ci:verify` | PASS: Quality 83/83, Integration 19/19, Security 21/21 commands; includes 67 real-infrastructure tests. Completed before relocating the same three controller assertions into the dedicated post-build test file for clean Windows ordering; final-layout checks are recorded in the review handoff |
| `pnpm ci:windows` | PASS on final test layout, 48/48 command steps, including 48 browser/a11y tests and 31 Windows manifest smoke cases (not Linux pixel comparison) |
| Full/prod JSON and Moderate-floor audits | Exit 1 on residual findings; target proxy advisory absent |

Fresh 18 October audits: baseline full **23** (1 Critical, 9 High, 9 Moderate, 4 Low), production **19** (1 Critical, 6 High, 8 Moderate, 4 Low). Patched full **22** (0 Critical, 9 High, 9 Moderate, 4 Low), production **18** (0 Critical, 6 High, 8 Moderate, 4 Low), captured around 19:19 UTC. These are registry audit entries, including separate affected brace-expansion version lines, not a claim of 22 distinct advisory IDs. Moderate-floor audits are **not clean**.

Final-layout focused tests, authentication unit tests and full `pnpm check` were rerun successfully. A repeat check initially scanned ignored generated Storybook JavaScript as application source; the generated directory was preserved under ignored `.artifacts/` and the rerun passed without a source/validator change. Local receipts identify a staged pre-commit worktree, not an immutable final commit; the Draft PR handoff must supply the exact pushed SHA and GitHub gate receipts.

## Residual audit inventory — not remediated

| Package/version | Severity and advisory IDs | Membership |
|---|---|---|
| undici `8.9.0` | High: `GHSA-rfgv-xxqx-mfg5`, `GHSA-w293-vg96-wgc3`; Moderate: `GHSA-3wwx-pv8p-q78v`, `GHSA-pmjh-fq2x-6v4x`, `GHSA-3xpg-4rpp-hhhm`, `GHSA-2jfj-6hjv-fm6j`, `GHSA-rx4f-c7p8-82vq`; Low: `GHSA-r53p-7pc4-xj5r`, `GHSA-2gqq-gqf2-x968`, `GHSA-8436-99hf-9mmv` | Full/prod registry graph, including testcontainers; graph membership is not production feature reachability |
| multer `2.3.0` | Moderate: `GHSA-3pph-fpjx-jg34` | Full/prod, Nest adapter |
| fast-uri `3.1.7` | Moderate: `GHSA-hrr3-gc8f-f4qj` | Full/prod, Prisma tooling→Ajv |
| brace-expansion `2.1.4` / `5.0.9` | High: `GHSA-qhr7-859c-m2p7`, `GHSA-6j4f-fj2g-mc7p`; Moderate: `GHSA-q2hr-2g5m-vwhr` (each version line) | `2.1.4` full/prod via testcontainers; `5.0.9` full-only Storybook tooling |
| @grpc/grpc-js `1.14.4` | High: `GHSA-m9gg-hp2v-232j`; Low: `GHSA-f596-whhp-79r4` | Full/prod, OpenTelemetry and testcontainers |
| source-map-js `1.2.1` | High: `GHSA-68fv-2mgg-jv7q` | Full-only, test/Storybook tooling |
| sharp `0.35.4` | High: `GHSA-wq5f-xc86-pv6w` | Full/prod optional Next image dependency |

## Review and recovery stop-line

The five exact-head GitHub gates and independent human Security review remain mandatory; local Windows evidence is not the canonical Ubuntu visual comparison. No baseline is accepted or regenerated. Groups B–F, deployment, production Admin activation, IAM-010 and traceability advancement remain excluded. Issue #78 must remain open.

On a compatibility/security regression, stop activation, preserve sanitized evidence and seek a bounded human-reviewed forward fix. Never silently restore vulnerable `2.0.7`, weaken validators/CI or suppress advisories. **Security HOLD; IAM-009 IN_REVIEW; IAM-010 NOT_STARTED.**
