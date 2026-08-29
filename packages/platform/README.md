# @noma/platform

Domain/application public interfaces and declared ports.

Only public exports may be imported. Deep imports are prohibited.

`@noma/platform/providers` defines the DEV-007 provider-neutral configuration, operation identity, result/finality, event, money, payment/refund/transfer, storage, communications, diagnostics, analytics, telemetry, hosting/DNS, and deferred-capability ports. It contains no vendor SDK type or simulator implementation. See [`PROVIDERS.md`](../../PROVIDERS.md).

`@noma/platform/identity` defines the IAM-001 Prisma-free identity persistence records, bounded repository port, authoritative account/session/token vocabularies, and conservative email normalization. It grants no authentication or authorization authority. See [`IDENTITY_PERSISTENCE.md`](../../IDENTITY_PERSISTENCE.md).
