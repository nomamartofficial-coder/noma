# @noma/integrations

Provider adapter boundary implementing platform ports.

Only public exports may be imported. Deep imports are prohibited.

The Redis/BullMQ adapter lives here. Producers are fail-fast, Worker connections are persistent, retry/dead-letter behaviour comes from shared job contracts, and finalized jobs are retained. Redis is delivery infrastructure only; authoritative recovery and idempotency remain in `@noma/database`.
