import { Button, CommerceStatus } from '@noma/ui';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { RiderActionMode, RiderShell } from '../src/shells/protected/rider/rider-shell';
import type { RiderConnectivityPresentation } from '../src/shells/protected/rider/rider-shell';

function RiderFixture({ connectivity, action = false }: Readonly<{ connectivity?: RiderConnectivityPresentation; action?: boolean }>) {
  return <RiderShell {...(connectivity ? { connectivity } : {})}>{action ? <RiderActionMode context={<><p>Current synthetic context</p><h1>Review the supplied assignment</h1></>} incidentHelp={<><strong>Incident or uncertainty?</strong><p>Contact Operations before claiming a custody outcome.</p></>} instructions={<p>Verify the supplied reference and wait for authoritative confirmation.</p>} nextAction={<Button size="action">Request server confirmation</Button>} status={<CommerceStatus label="Confirmation required" phase="uncertain" />} /> : <section className="noma-story-shell-content"><h1>Current assignment</h1><p>No live assignment, custody state, or rider identity is represented.</p></section>}</RiderShell>;
}

const meta = {
  id: 'protected-rider',
  title: 'Protected surfaces/Rider connectivity',
  component: RiderFixture,
  parameters: { layout: 'fullscreen', noma: { pathname: '/rider' } },
} satisfies Meta<typeof RiderFixture>;

export default meta;
type Story = StoryObj<typeof meta>;
export const ServerConfirmed: Story = { args: { connectivity: { state: 'SERVER_CONFIRMED' } } };
export const Cached: Story = { args: { connectivity: { state: 'CACHED', cachedAt: '2026-01-15T08:45:00+01:00' } } };
export const LocalDraft: Story = { args: { connectivity: { state: 'LOCAL_DRAFT' } } };
export const PendingSync: Story = { args: { connectivity: { state: 'PENDING_SYNC' } } };
export const SyncFailed: Story = { args: { connectivity: { state: 'SYNC_FAILED' } } };
export const Conflict: Story = { args: { connectivity: { state: 'CONFLICT' } } };
export const ConnectionRequired: Story = { args: { connectivity: { state: 'CONNECTION_REQUIRED' } } };
export const ActionMode: Story = { args: { action: true, connectivity: { state: 'CONNECTION_REQUIRED' } } };
