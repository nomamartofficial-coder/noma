# IAM-006 evidence

This directory records synthetic, non-production evidence for the central authorization policy foundation.

- Tracking issue: [#68](https://github.com/nomamartofficial-coder/noma/issues/68)
- Draft PR: assigned after publication
- Exact implementation head: assigned after final push
- Required gate run IDs: assigned after the five stable gates complete

The deterministic unit suite covers binary deny-by-default decisions, closed policy registration, assignment atomicity, exact scope and relationships, IAM-004 assurance composition, explicit fact dimensions, approval validation, service-principal separation, IDOR-safe denial, and monotonic removal of proofs. The isolated PostgreSQL suite exercises the real committed migrations and proves both valid revoke/use linearization outcomes with database barriers and final database state.

No production data, protected route, external provider, infrastructure activation, or fabricated business entity is used. Independent Access/Security, Identity, Data/Database, QA, and applicable DevOps review remains required.
