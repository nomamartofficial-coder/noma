import { describe, expect, test } from 'vitest';
import { nextAccessReviewDueAt } from '../src/authorization/access-review-schedule.js';

describe('IAM-009 approved review cadence', () => {
  test('high privilege uses calendar-month due dates, including end-of-month', () => {
    expect(nextAccessReviewDueAt(new Date('2026-01-31T12:34:56.000Z'), 'PRIVILEGED').toISOString())
      .toBe('2026-02-28T12:34:56.000Z');
  });
  test('broader access uses calendar-quarter due dates', () => {
    expect(nextAccessReviewDueAt(new Date('2026-10-31T12:00:00.000Z'), 'ORDINARY').toISOString())
      .toBe('2027-01-31T12:00:00.000Z');
  });
});
