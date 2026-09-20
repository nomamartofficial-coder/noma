# IAM-007 evidence

This directory records synthetic, non-production evidence for field-level disclosure minimization.

- Tracking issue: [#70](https://github.com/nomamartofficial-coder/noma/issues/70)
- Draft PR: assigned after publication
- Exact implementation head: assigned after final push
- Required gate run IDs: assigned after the five stable gates complete

`pnpm iam007:verify` checks closed/versioned projection definitions, exact Access columns and scope, IAM-006 DENY-before-read composition, generic missing/denied response, SEC-003 masking behavior, synthetic sentinel leakage, negative policy fixtures, PostgreSQL read-model behavior, and protected-route regression. CI registers these under the existing five gates; no sixth gate is added.

No production data, public protected route, broad decrypt adapter, migration, future business record, audit store, evidence delivery, or export artifact is added. Independent Access/Privacy, Identity/Security, Data/Database, QA, and applicable DevOps review remains required.
