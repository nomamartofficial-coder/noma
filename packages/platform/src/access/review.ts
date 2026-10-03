/** The only review outcomes approved for IAM-009 by Issue #75. */
export const ACCESS_REVIEW_OUTCOMES = Object.freeze([
  'RETAIN_CONFIRMED',
  'REVOKE_REQUESTED',
  'NEEDS_FOLLOW_UP',
] as const);

export type AccessReviewOutcome = (typeof ACCESS_REVIEW_OUTCOMES)[number];

export function requireAccessReviewOutcome(value: unknown): AccessReviewOutcome {
  if (typeof value !== 'string' || !ACCESS_REVIEW_OUTCOMES.some((outcome) => outcome === value)) {
    throw new Error('Unknown Access review outcome');
  }
  return value as AccessReviewOutcome;
}

export function isFinalAccessReviewOutcome(outcome: AccessReviewOutcome): boolean {
  return outcome === 'RETAIN_CONFIRMED' || outcome === 'REVOKE_REQUESTED';
}

export function accessReviewNeedsRemediation(outcome: AccessReviewOutcome): boolean {
  return outcome === 'REVOKE_REQUESTED';
}
