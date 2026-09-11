import assert from 'node:assert/strict';

import { test } from 'vitest';

import { deriveIdentityDeliveryAttemptId } from '../dist/identity-email-handler.js';

test('delivery identity remains stable within a BullMQ attempt and advances only after a definite retry', () => {
  const jobId = '68d67e45-1f07-4e8a-99d7-514113ee743e';
  const firstDelivery = deriveIdentityDeliveryAttemptId(jobId, 0);

  assert.equal(deriveIdentityDeliveryAttemptId(jobId, 0), firstDelivery);
  assert.notEqual(deriveIdentityDeliveryAttemptId(jobId, 1), firstDelivery);
  assert.match(firstDelivery, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.throws(() => deriveIdentityDeliveryAttemptId(jobId, -1), /non-negative safe integer/);
});
