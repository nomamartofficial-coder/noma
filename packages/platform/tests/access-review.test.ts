import { describe, expect, test } from 'vitest';
import {
  ACCESS_REVIEW_OUTCOMES,
  accessReviewNeedsRemediation,
  isFinalAccessReviewOutcome,
  requireAccessReviewOutcome,
} from '../src/access/index.js';

describe('IAM-009 closed review outcomes', () => {
  test('contains exactly the human-approved vocabulary', () => {
    expect(ACCESS_REVIEW_OUTCOMES).toEqual(['RETAIN_CONFIRMED', 'REVOKE_REQUESTED', 'NEEDS_FOLLOW_UP']);
  });

  test.each(['APPROVED', 'DENIED', 'KEEP', 'REMOVE', 'SKIP', 'NO_ACTION', '', 'REVOKE_REQUESTED '])(
    'rejects an unapproved outcome %j', (value) => {
      expect(() => requireAccessReviewOutcome(value)).toThrow('Unknown Access review outcome');
    },
  );

  test('does not count follow-up as completed review or revocation', () => {
    expect(isFinalAccessReviewOutcome('NEEDS_FOLLOW_UP')).toBe(false);
    expect(accessReviewNeedsRemediation('NEEDS_FOLLOW_UP')).toBe(false);
    expect(isFinalAccessReviewOutcome('RETAIN_CONFIRMED')).toBe(true);
    expect(accessReviewNeedsRemediation('RETAIN_CONFIRMED')).toBe(false);
    expect(isFinalAccessReviewOutcome('REVOKE_REQUESTED')).toBe(true);
    expect(accessReviewNeedsRemediation('REVOKE_REQUESTED')).toBe(true);
  });
});
