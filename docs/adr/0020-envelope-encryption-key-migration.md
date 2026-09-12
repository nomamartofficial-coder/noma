# ADR-0020: Managed envelope encryption and resumable key migration

- Status: Proposed for SEC-003 review
- Date: 2026-09-12
- Task: `SEC-003`
- Issue: `#60`
- Draft PR: pending

## Decision

Use AWS KMS customer-managed symmetric keys in `eu-central-1`, separately for staging and production, with Render workload OIDC roles rather than static credentials. This matches Render's managed AWS web-identity path, allows a future governed Vercel federation, aligns with the planned Frankfurt object-storage boundary, and supplies native `GenerateDataKey`, `Decrypt`, and `ReEncrypt` with less integration/control-plane complexity than an additional key service. The decision selects a provider; it does not provision or activate one.

Each value is protected with a fresh KMS-generated 256-bit DEK and Node AES-256-GCM, a random 96-bit nonce, a 128-bit tag, strict versioned envelope, and canonical application AAD. KMS context excludes personal identifiers. API and migration capabilities are purpose- and environment-scoped; Worker, browser, and production test-provider use are denied. Key unavailability fails closed. Best-effort buffer wiping is not a guarantee of JavaScript memory erasure.

The forward-only migration creates only `encryption_migration_runs`. Future consumers own encrypted fields and CAS predicates. Short transactions join record CAS to checkpoint advancement, while KMS work occurs outside transactions. Reconciliation checks authoritative remaining records and target-policy writes before completion. KEK rewrap is distinct from full content re-encryption.

## Consequences

IAM-004 may later consume this foundation for a synthetic-compatible `noma:mfa-seed` envelope, but SEC-003 adds no factor, TOTP, recovery-code, or protected-surface behavior. Staging/production keys, OIDC trust, privacy review, audit monitoring, rotation runbook, and break-glass ownership remain separate activation gates. Before activation, rollback is a reviewed source revert plus forward-only migration handling; do not roll back a schema containing migration-run evidence by destructive SQL.
