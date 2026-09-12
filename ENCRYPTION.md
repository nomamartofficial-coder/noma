# SEC-003 envelope encryption and key migration

SEC-003 supplies source-only primitives. No business field is encrypted by this change, no AWS resource is provisioned, and no production encryption is activated. The first proposed consumer is IAM-004 after its separate review and merge.

## Threat boundary and envelope

The protected assets are high-risk values that future consumers may persist. A database dump or accidental record copy must not reveal their plaintext. An envelope alone is insufficient to decrypt: the caller also needs an approved-purpose API or migration capability, the correct environment, a matching key provider, and the exact application associated data (AAD). KMS outage, denied access, wrong keys, malformed fields, and authentication failures stop the operation; there is no plaintext or local-key fallback.

`EncryptedEnvelopeV1` contains `format`, `version`, `contentAlgorithm=A256GCM`, provider/key reference, optional stable key-material ID, context version, unpadded base64url wrapped DEK, 96-bit nonce, 128-bit authentication tag, and ciphertext. Parsing is strict about fields, encoding, and lengths. Every value receives a fresh random 256-bit DEK from KMS and a fresh random nonce. Node AES-256-GCM authenticates ciphertext against canonical AAD. Transient key buffers are overwritten best-effort; JavaScript and SDK memory copies prevent a claim of perfect zeroisation.

AAD starts with `noma:aad:v1`, then length-prefixed, NFC-normalised UTF-8 environment and purpose, followed by lexically sorted unique binding names and their values. A future MFA seed can bind `noma:mfa-seed`, environment, `userId`, `factorId`, and `factorType=TOTP` without adding an MFA model here. The AWS KMS EncryptionContext is deliberately smaller: only application `noma`, environment, purpose, and context version. Personal identifiers and secret values must never be sent as KMS context.

## Provider and authority

AWS KMS in `eu-central-1` is the selected production managed-key provider. Staging and production require separate customer-managed symmetric keys and distinct OIDC workload roles/trust policies. Render-to-AWS uses short-lived web identity; no static AWS access keys or raw KEKs belong in Noma configuration. `@aws-sdk/client-kms` is exact-pinned to `3.1131.0`, with no AWS type in provider-neutral contracts. `GenerateDataKey` creates an envelope, `Decrypt` unwraps only under approved purpose/context, and `ReEncrypt` changes the wrapped DEK when the content-level policy is unchanged.

`loadEncryptionEnvironment` is an opt-in server configuration contract. It defaults to `disabled`, denies Worker/Web key authority, rejects test-only keys in remote environments, rejects static/alternate AWS credential sources, and accepts AWS mode only for staging/production API or migration runtimes with a Frankfurt key ARN and managed role/token-file inputs. It does not wire any current runtime to KMS. Application composition must issue narrow capabilities; future consumers must not derive them from a request, envelope, role label, or browser input. CI uses only the deterministic test provider, which is exported from the test-only integration entry and cannot be selected remotely.

The reusable mask primitive requires an explicit reviewed prefix/suffix, mask character, and minimum hidden code-point count. It handles Unicode by code point and rejects a policy that reveals an entire value. Bank, identity, or other domain-specific masking rules remain future consumer decisions.

## Migration and recovery

The sole SEC-003 migration adds `encryption_migration_runs`, a technical lease/checkpoint/reconciliation record. It does not add a generic encrypted-values table, MFA factor, bank, or payout field. Each future consumer owns its table, stable cursor, policy classification, and authoritative record-level compare-and-swap (CAS). A batch reads at most 50 records; crypto/KMS work occurs outside a short transaction. The consumer CAS and durable checkpoint commit together. A competing newer write makes CAS fail and rolls back the checkpoint. Lease/version checks prevent stale owners from advancing. Blocked runs retain safe failure classification and require deliberate resume. A completed run requires an authoritative count of zero old-policy records, zero unresolved failures, and evidence that new writes already enforce the target policy; counters alone are insufficient.

KEK rewrap changes only key reference/metadata and the wrapped DEK, preserving content ciphertext, nonce, tag, and AAD. Full re-encryption decrypts transiently and creates a new DEK and nonce only for a changed content cipher, AAD, envelope, provider, or DEK policy. Neither operation is automatically scheduled. A future migration runbook must document owner, source/destination keys, read compatibility, checkpoint and reconciliation probes, rollback/disable response, and safe pause/resume before activation.

## Operational stop gates

Remote activation remains blocked pending a Render Pro-or-higher workspace, organization-controlled AWS account/billing, separate staging/production KMS keys and OIDC roles, Security/Data ownership, EU/privacy/vendor-register review, CloudTrail monitoring, key-disable/recovery procedure, key-administration and break-glass ownership, and approved rotation/re-encryption runbook. Vercel-to-AWS federation may be wired only when a governed server-side consumer needs it. No real AWS contract test occurs in ordinary CI; one requires separately approved staging provisioning.

Verification: `pnpm security:encryption:verify` runs policy validation, negative fixtures, crypto/KMS/config unit tests, and isolated PostgreSQL migration/concurrency tests. The five existing CI gates incorporate these checks without adding a gate. This source-only work requires independent Security/Cryptography, Data/Database, Platform/Integrations, QA/Security, and DevOps/Infrastructure review before merge.
