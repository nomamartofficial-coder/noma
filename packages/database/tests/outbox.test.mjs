import assert from 'node:assert/strict';
import { test } from 'vitest';

import { createOutboxEventEnvelope } from '../dist/index.js';

test('outbox envelope creation uses UUID identities and bigint-safe versions', () => {
  const event = createOutboxEventEnvelope({
    eventType: 'foundation.probe-requested',
    eventVersion: 1,
    aggregateType: 'foundation.probe',
    aggregateId: 'probe-1',
    aggregateVersion: 9_007_199_254_740_993n,
    payload: { probeId: 'probe-1' },
    privacyClassification: 'audit',
    servicePrincipal: 'noma_api',
    correlationId: 'correlation-1',
    telemetry: {
      requestId: 'request_123',
      traceContext: { traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01' },
    },
    occurredAt: new Date('2026-08-01T00:00:00.000Z'),
  });

  assert.match(event.eventId, /^[0-9a-f-]{36}$/i);
  assert.equal(event.aggregate.version, '9007199254740993');
  assert.equal(event.availableAt, event.occurredAt);
  assert.equal(event.telemetry.requestId, 'request_123');
});

test('outbox envelope rejects unsafe service identities and negative versions', () => {
  assert.throws(
    () => createOutboxEventEnvelope({
      eventType: 'foundation.probe-requested',
      eventVersion: 1,
      aggregateType: 'foundation.probe',
      aggregateId: 'probe-1',
      aggregateVersion: -1,
      payload: {},
      privacyClassification: 'audit',
      servicePrincipal: 'unsafe identity',
      correlationId: 'correlation-1',
    }),
    /aggregate version|servicePrincipal/,
  );
});
