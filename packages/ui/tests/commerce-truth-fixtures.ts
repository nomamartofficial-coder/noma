import type { CommercePhase } from '../dist/index.js';

export interface CommerceTruthFixture {
  readonly id: string;
  readonly phase: CommercePhase;
  readonly label: string;
  readonly meaning: string;
  readonly mustNotClaim: readonly string[];
}

/** Synthetic presentation fixtures only; these are not runtime domain-state mappers. */
export const commerceTruthFixtures: readonly CommerceTruthFixture[] = Object.freeze([
  { id: 'refund-approved', phase: 'requested', label: 'Refund approved', meaning: 'Approval permits later submission.', mustNotClaim: ['Refunded', 'Refund completed'] },
  { id: 'refund-processing', phase: 'processing', label: 'Refund processing', meaning: 'Provider completion is not established.', mustNotClaim: ['Refunded', 'Completed'] },
  { id: 'refund-uncertain', phase: 'uncertain', label: 'Refund outcome under reconciliation', meaning: 'The outcome is unknown.', mustNotClaim: ['Failed', 'Refunded'] },
  { id: 'refund-processed', phase: 'final', label: 'Refund processed', meaning: 'The caller established provider-final completion.', mustNotClaim: [] },
  { id: 'refund-failed', phase: 'failed', label: 'Refund failed', meaning: 'The caller established definitive failure.', mustNotClaim: ['Refunded'] },
  { id: 'withdrawal-approved', phase: 'requested', label: 'Withdrawal approved', meaning: 'Transfer has not completed.', mustNotClaim: ['Paid'] },
  { id: 'transfer-processing', phase: 'processing', label: 'Transfer processing', meaning: 'Provider finality is pending.', mustNotClaim: ['Paid'] },
  { id: 'transfer-uncertain', phase: 'uncertain', label: 'Transfer under reconciliation', meaning: 'Do not retry blindly.', mustNotClaim: ['Paid', 'Failed'] },
  { id: 'payout-confirmed', phase: 'final', label: 'Payout paid', meaning: 'The caller established provider-final completion.', mustNotClaim: [] },
  { id: 'payment-verifying', phase: 'uncertain', label: 'Payment being verified', meaning: 'The buyer must not pay again.', mustNotClaim: ['Paid'] },
  { id: 'ready-for-pickup', phase: 'requested', label: 'Ready for pickup', meaning: 'Custody has not transferred.', mustNotClaim: ['Picked up', 'Delivered'] },
  { id: 'rider-arrived', phase: 'processing', label: 'Rider arrived', meaning: 'Recipient handoff is not confirmed.', mustNotClaim: ['Delivered'] },
  { id: 'delivery-attempted', phase: 'failed', label: 'Delivery attempted', meaning: 'Current custody and next action remain explicit.', mustNotClaim: ['Delivered'] },
  { id: 'delivery-confirmed', phase: 'final', label: 'Delivery confirmed', meaning: 'The caller established authenticated handoff.', mustNotClaim: [] },
  { id: 'seller-approved', phase: 'requested', label: 'Seller approved', meaning: 'Activation is a separate authoritative state.', mustNotClaim: ['Seller active'] },
  { id: 'temporary-restriction', phase: 'processing', label: 'Temporary safeguard active', meaning: 'This is not a guilt finding.', mustNotClaim: ['Final finding', 'Guilty'] },
]);
