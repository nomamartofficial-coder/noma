import {
  createDatabaseClient,
  createOutboxEvent,
  createOutboxEventEnvelope,
  runInDatabaseTransaction,
} from '../../packages/database/dist/index.js';
import { createProbeContract } from './dev005-probe-contract.mjs';

const databaseUrl = process.env.DEV005_DATABASE_URL;
const probeId = process.env.DEV005_PROBE_ID;
const eventId = process.env.DEV005_EVENT_ID;
if (!databaseUrl || !probeId || !eventId) throw new Error('DEV-005 crash fixture configuration is incomplete');

const database = createDatabaseClient({ databaseUrl, applicationName: 'noma_api_crash_probe' });
const contract = createProbeContract();
await runInDatabaseTransaction(database, async (transaction) => {
  await transaction.$executeRaw`
    INSERT INTO "dev005_probe_state" ("id", "value", "last_version")
    VALUES (${probeId}, 0, 0)
  `;
  const event = createOutboxEventEnvelope({
    eventId,
    eventType: 'foundation.probe-requested',
    eventVersion: 1,
    aggregateType: 'foundation.probe',
    aggregateId: probeId,
    aggregateVersion: 1,
    payload: { probeId, version: '1', delta: 1 },
    privacyClassification: 'audit',
    servicePrincipal: 'noma_api',
    correlationId: `crash-${eventId}`,
  });
  await createOutboxEvent(transaction, { event, contract });
});

// Intentional abrupt API-side exit after PostgreSQL confirms the commit.
process.exit(73);
