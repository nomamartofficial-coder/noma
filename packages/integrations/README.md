# @noma/integrations

Provider adapter boundary implementing platform ports.

Only public exports may be imported. Deep imports are prohibited.

The Redis/BullMQ adapter lives here. Producers are fail-fast, Worker connections are persistent, retry/dead-letter behaviour comes from shared job contracts, and finalized jobs are retained. Redis is delivery infrastructure only; authoritative recovery and idempotency remain in `@noma/database`.

IAM-002 adds the fail-fast Redis authentication limiter. It stores only HMAC-correlated action/identity/network/pair keys, uses high shared-network ceilings, and is never session authority. No IAM-002 queue job or Worker processor is added. See [`AUTHENTICATION.md`](../../AUTHENTICATION.md).

DEV-007's local provider simulators also live here, but are exported only from `@noma/integrations/testing`. Production application code must never import that entry point. The simulators implement `@noma/platform/providers`, perform no network or persistence operation, and expose inspection only to test composition in `@noma/testing/providers`. See [`SIMULATORS.md`](../../SIMULATORS.md).
