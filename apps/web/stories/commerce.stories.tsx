import {
  Button,
  CommerceStatus,
  DeadlineBanner,
  EvidenceCard,
  HighRiskConfirmation,
  Link,
  Money,
  MoneyBreakdown as MoneyBreakdownComponent,
  ResponsibilityBanner,
  Timeline,
  TimelineItem,
} from '@noma/ui';
import type { CommercePhase } from '@noma/ui';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { FIXED_STORY_INSTANT } from './contracts';

function CommerceCanvas({ children }: Readonly<{ children?: React.ReactNode }>) {
  return <section className="noma-story-section"><header><p>Noma commerce presentation</p><h1>Truthful status and evidence</h1></header>{children}</section>;
}

const phases: readonly Readonly<{ phase: CommercePhase; label: string; description: string }>[] = Object.freeze([
  { phase: 'requested', label: 'Refund requested', description: 'The request exists; no refund has completed.' },
  { phase: 'processing', label: 'Refund processing', description: 'Provider processing is not completion.' },
  { phase: 'final', label: 'Refund completed', description: 'Finality is supplied only by the owning workflow.' },
  { phase: 'failed', label: 'Refund failed', description: 'Recovery remains explicit.' },
  { phase: 'uncertain', label: 'Refund outcome uncertain', description: 'Do not submit a duplicate request.' },
]);

const meta = {
  id: 'commerce-noma',
  title: 'Commerce/Presentation patterns',
  component: CommerceCanvas,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof CommerceCanvas>;

export default meta;
type Story = StoryObj<typeof meta>;

export const StatusPhases: Story = {
  render: () => <CommerceCanvas><div className="noma-story-stack">{phases.map((item) => <CommerceStatus description={item.description} key={item.phase} label={item.label} phase={item.phase} reference={`SYN-${item.phase.toUpperCase()}`} responsibility="Noma presents the supplied state without inferring completion." timestamp={FIXED_STORY_INSTANT} />)}</div></CommerceCanvas>,
};

export const ResponsibilityDeadline: Story = {
  render: () => <CommerceCanvas><div className="noma-story-stack"><ResponsibilityBanner actionLabel="Review the supplied correction" description="Ownership is explicit presentation input." ownerLabel="Seller action required" tone="warning" /><DeadlineBanner deadline="2026-01-16T17:00:00+01:00" description="Urgency was supplied by the owning workflow." label="Correction deadline" state="due-soon" /><DeadlineBanner deadline="2026-01-14T17:00:00+01:00" label="Submission window expired" state="expired" /></div></CommerceCanvas>,
};

export const MoneyExtremes: Story = {
  render: () => <CommerceCanvas><div className="noma-story-grid"><article className="noma-story-card"><h2>One minor unit</h2><Money amountMinor="1" currency="NGN" fractionDisplay="always" /></article><article className="noma-story-card"><h2>Large exact amount</h2><Money amountMinor="900719925474099312345" currency="NGN" fractionDisplay="always" /></article><article className="noma-story-card"><h2>Negative adjustment</h2><Money amountMinor="-125050" currency="NGN" fractionDisplay="always" /></article><article className="noma-story-card"><h2>Kuwaiti dinar</h2><Money amountMinor="123456" currency="KWD" fractionDisplay="always" /></article></div></CommerceCanvas>,
};

export const MoneyBreakdown: Story = {
  name: 'Money breakdown',
  render: () => <CommerceCanvas><MoneyBreakdownComponent currency="NGN" fractionDisplay="always" items={[{ id: 'items', label: 'Items', amountMinor: '1250000', description: 'Caller-calculated subtotal' }, { id: 'delivery', label: 'Delivery', amountMinor: '150000' }]} total={{ label: 'Supplied total', amountMinor: '1400000' }} /></CommerceCanvas>,
};

export const TimelineCorrections: Story = {
  render: () => <CommerceCanvas><Timeline label="Synthetic order history"><TimelineItem actor="buyer" description="The request was recorded." label="Request submitted" recordedAt="2026-01-15T08:15:00+01:00" reference="SYN-HISTORY-001" state="confirmed" /><TimelineItem actor="provider" correctionAction={<Link href="/account/cases">Review correction</Link>} description="This event remains visible and is superseded by the correction below." label="Earlier provider response" recordedAt="2026-01-15T08:30:00+01:00" state="superseded" /><TimelineItem actor="staff" evidenceAction={<Link href="/account/cases">View authorised evidence metadata</Link>} label="Correction recorded" recordedAt={FIXED_STORY_INSTANT} reference="SYN-HISTORY-003" state="confirmed" /></Timeline></CommerceCanvas>,
};

export const EvidenceSafe: Story = {
  render: () => <CommerceCanvas><section aria-labelledby="evidence-story-heading"><h2 id="evidence-story-heading">Safe evidence presentation</h2><EvidenceCard action={<Link href="/account/cases">Review authorised action</Link>} recordedAt={FIXED_STORY_INSTANT} recordedByLabel="Synthetic reviewer" reference="SYN-EVIDENCE-001" statusLabel="Recorded" statusTone="info" summary="Safe metadata only. No storage location, signed URL, credential, or raw entity is exposed." title="Delivery note metadata" typeLabel="Document evidence" /></section></CommerceCanvas>,
};

export const HighRiskRequiredReason: Story = {
  render: () => <CommerceCanvas><HighRiskConfirmation approvalRequirement="Independent approval is required by the owning workflow." assuranceRequirement="This dialog does not represent authentication or MFA." cancelLabel="Keep current state" confirmLabel="Request irreversible release" consequence="Requesting release could make funds available before the case is resolved." isPending={false} moneyEffect="The owning workflow decides whether funds can move." objectLabel="Synthetic held payout" objectReference="SYN-PAYOUT-001" onConfirm={fn()} onOpenChange={fn()} open pendingLabel="Requesting release" reasonRequired reversibility="The request cannot be withdrawn after provider acceptance." title="Request payout release" trigger="Review payout release" /></CommerceCanvas>,
  play: async () => {
    const body = within(document.body);
    await userEvent.click(body.getByRole('button', { name: 'Request irreversible release' }));
    await expect(body.getByText('Enter a reason before requesting this action.')).toBeVisible();
  },
};
