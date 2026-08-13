import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, test, vi } from 'vitest';
import {
  CommerceStatus,
  DeadlineBanner,
  EvidenceCard,
  HighRiskConfirmation,
  Link,
  Money,
  MoneyBreakdown,
  ResponsibilityBanner,
  StatusChip,
  Timeline,
  TimelineItem,
} from '../../packages/ui/dist/index.js';
import { expectNoAxeViolations } from './axe-helper.js';

const instant = '2026-07-30T13:30:00Z';

describe('commerce truth presentation', () => {
  test('renders five distinct phases, persistent ownership, and exact deadline semantics', async () => {
    const { container } = render(
      <main>
        <StatusChip tone="info">Requested</StatusChip>
        <CommerceStatus phase="requested" label="Refund approved" description="Approval exists; provider submission has not completed." />
        <CommerceStatus phase="processing" label="Refund processing" responsibility="No action is required from you." />
        <CommerceStatus phase="final" label="Refund processed" timestamp={instant} />
        <CommerceStatus phase="failed" label="Refund failed" />
        <CommerceStatus announce="polite" phase="uncertain" label="Refund outcome under reconciliation" />
        <ResponsibilityBanner actionLabel="Checking the payment provider" description="Do not submit another request." ownerLabel="Finance" tone="warning" />
        <DeadlineBanner deadline={instant} description="Upload the requested evidence before this exact time." label="Evidence due soon" state="due-soon" />
      </main>,
    );
    expect(screen.getByText('Refund approved').closest('section')).toHaveAttribute('data-phase', 'requested');
    expect(screen.getByText('Refund processing').closest('section')).toHaveAttribute('data-phase', 'processing');
    expect(screen.getByRole('status')).toHaveTextContent('Refund outcome under reconciliation');
    expect(screen.getByText('Finance')).toBeVisible();
    expect(screen.queryByRole('button', { name: /dismiss/i })).not.toBeInTheDocument();
    expect(screen.getAllByText(/30 July 2026 at 14:30 WAT/).length).toBeGreaterThan(0);
    expect(container.querySelector('time')).toHaveAttribute('datetime', instant);
    await expectNoAxeViolations(container);
  });

  test('renders caller-calculated exact money with accessible labels', async () => {
    const { container } = render(
      <section aria-label="Refund breakdown">
        <Money amountMinor="900719925474099312345" currency="NGN" fractionDisplay="always" />
        <MoneyBreakdown
          currency="NGN"
          fractionDisplay="always"
          items={[
            { id: 'item', label: 'Item subtotal', amountMinor: '1800000' },
            { id: 'delivery', label: 'Delivery', amountMinor: '150000' },
            { id: 'discount', label: 'Discount', amountMinor: '-100000', description: 'Promotion already calculated by Checkout' },
          ]}
          total={{ label: 'Total', amountMinor: '1850000' }}
        />
      </section>,
    );
    expect(screen.getByText('Item subtotal')).toBeVisible();
    expect(screen.getByText('Discount').parentElement).toHaveTextContent('Promotion already calculated by Checkout');
    expect(screen.getByText('Total').nextElementSibling).toHaveTextContent('₦18,500.00');
    expect(container.textContent?.replaceAll(/[^0-9]/g, '')).toContain('900719925474099312345');
    await expectNoAxeViolations(container);
  });

  test('keeps timeline caller-ordered, immutable, and correction-aware', async () => {
    const { container } = render(
      <Timeline label="Refund history">
        <TimelineItem actor="provider" correctionAction={<Link href="/correction">View correction</Link>} label="Later provider correction" recordedAt="2026-07-31T10:00:00Z" state="superseded" />
        <TimelineItem actor="staff" description="Approval permits submission; it is not provider completion." evidenceAction={<Link href="/evidence">View authorised evidence</Link>} label="Refund approved" recordedAt={instant} reference="NM-REF-100" state="pending" />
      </Timeline>,
    );
    const items = within(screen.getByRole('list', { name: 'Refund history' })).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Later provider correction');
    expect(items[1]).toHaveTextContent('Refund approved');
    expect(items[1]).toHaveTextContent('Staff');
    expect(container.querySelectorAll('time')[1]).toHaveAttribute('datetime', instant);
    expect(screen.queryByRole('button', { name: /edit|delete|reorder/i })).not.toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  test('evidence card exposes safe metadata and caller-authorised action only', async () => {
    const { container } = render(
      <EvidenceCard
        action={<Link href="/safe-application-route">View evidence</Link>}
        recordedAt={instant}
        recordedByLabel="Buyer"
        reference="NM-EVD-100"
        statusLabel="Available to authorised reviewers"
        statusTone="info"
        summary="Synthetic parcel-condition evidence metadata."
        title="Parcel condition photo"
        typeLabel="Image evidence"
      />,
    );
    expect(screen.getByRole('article')).toHaveTextContent('Buyer');
    expect(screen.getByRole('link', { name: 'View evidence' })).toHaveAttribute('href', '/safe-application-route');
    expect(container.querySelector('img')).not.toBeInTheDocument();
    await expectNoAxeViolations(container);
  });
});

function HighRiskHarness({ onConfirm = vi.fn() }: { readonly onConfirm?: (reason: string | undefined) => void }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  return (
    <HighRiskConfirmation
      approvalRequirement="Second Finance approval required"
      assuranceRequirement="Privileged MFA and recent authentication required"
      cancelLabel="Keep refund unchanged"
      confirmLabel="Approve refund"
      consequence="This requests approval of a refund against the selected order item."
      custodyEffect="The returned item remains in current custody."
      isPending={pending}
      moneyEffect={<Money amountMinor="125000" currency="NGN" fractionDisplay="always" />}
      objectLabel="Refund for order item NM-ITEM-100"
      objectReference="NM-REF-100"
      onConfirm={(reason) => { onConfirm(reason); setPending(true); }}
      onOpenChange={setOpen}
      open={open}
      pendingLabel="Requesting refund approval"
      reasonDescription="Finance records this reason with the command request."
      reasonLabel="Approval reason"
      reasonRequired
      reversibility="Approval can be superseded before submission; provider completion cannot be edited."
      title="Review refund approval"
      trigger="Review refund"
    />
  );
}

describe('high-risk confirmation', () => {
  test('focuses the safe action and blocks blank reasons', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const { container } = render(<HighRiskHarness onConfirm={onConfirm} />);
    const trigger = screen.getByRole('button', { name: 'Review refund' });
    await user.click(trigger);
    const cancel = await screen.findByRole('button', { name: 'Keep refund unchanged' });
    expect(cancel).toHaveFocus();
    expect(screen.getByRole('dialog')).toHaveTextContent('Second Finance approval required');
    expect(screen.getByRole('dialog')).toHaveTextContent('Privileged MFA and recent authentication required');
    await user.click(screen.getByRole('button', { name: 'Approve refund' }));
    expect(await screen.findByText('Enter a reason before requesting this action.')).toBeVisible();
    expect(onConfirm).not.toHaveBeenCalled();
    await user.type(screen.getByRole('textbox', { name: /approval reason/i }), '  Provider evidence checked  ');
    await user.click(screen.getByRole('button', { name: 'Approve refund' }));
    expect(onConfirm).toHaveBeenCalledWith('  Provider evidence checked  ');
    const pendingButton = screen.getByRole('button', { name: 'Requesting refund approval' });
    expect(pendingButton).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: 'Keep refund unchanged' })).toBeDisabled();
    await user.click(pendingButton);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await expectNoAxeViolations(container);
  });

  test('restores focus after cancellation', async () => {
    const user = userEvent.setup();
    render(<HighRiskHarness />);
    const trigger = screen.getByRole('button', { name: 'Review refund' });
    await user.click(trigger);
    await user.click(await screen.findByRole('button', { name: 'Keep refund unchanged' }));
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  test('rejects generic serious-action confirmation labels', () => {
    expect(() => render(
      <HighRiskConfirmation
        cancelLabel="Cancel"
        confirmLabel="Confirm"
        consequence="Material consequence"
        isPending={false}
        objectLabel="Exact object"
        onConfirm={() => undefined}
        onOpenChange={() => undefined}
        open={false}
        pendingLabel="Working"
        reversibility="Hard to reverse"
        title="Material action"
        trigger="Open"
      />,
    )).toThrow(/name the material action/);
  });
});
