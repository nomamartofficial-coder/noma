import { describe, expect, test } from 'vitest';
import { accessReviewQueueProjection, decodeAccessReviewCursor, encodeAccessReviewCursor } from '../src/authorization/access-review-disclosure.js';

const AT = new Date('2026-10-02T12:00:00.000Z');
const ITEM = '10000000-0000-4000-8000-000000000001';
const source = Object.freeze({
  reviewItemId: ITEM, cycleId: '10000000-0000-4000-8000-000000000002',
  subjectReference: 'NOMA-SYNTHETIC', roleTemplateCode: 'access.synthetic', roleTemplateVersion: 1,
  scopeType: 'INSTITUTION', dueAt: AT, opensAt: new Date(AT.getTime() - 60_000),
  cadence: 'MONTHLY', outcome: null, completedAt: null, revocationPending: false,
  stale: false, observedAt: AT,
} as const);

describe('IAM-009 review queue disclosure', () => {
  test('follows due, overdue, follow-up, final and stale state semantics', () => {
    expect(accessReviewQueueProjection.map(source).state).toBe('DUE');
    expect(accessReviewQueueProjection.map({ ...source, observedAt: new Date(AT.getTime() + 1), outcome: 'NEEDS_FOLLOW_UP' }).state).toBe('OVERDUE');
    expect(accessReviewQueueProjection.map({ ...source, completedAt: AT, outcome: 'REVOKE_REQUESTED', revocationPending: true }).state).toBe('COMPLETED');
    expect(accessReviewQueueProjection.map({ ...source, completedAt: AT, stale: true }).state).toBe('STALE');
  });

  test('uses a closed, lossless due-time plus immutable-ID keyset cursor', () => {
    const value = encodeAccessReviewCursor({ dueAt: AT, id: ITEM });
    expect(decodeAccessReviewCursor(value)).toEqual({ dueAt: AT, id: ITEM });
    for (const bad of ['', 'not-base64', Buffer.from(JSON.stringify({ v: 1, dueAt: AT.toISOString(), id: ITEM, extra: true })).toString('base64url')]) {
      expect(() => decodeAccessReviewCursor(bad)).toThrow('protected operation is unavailable');
    }
  });
});
