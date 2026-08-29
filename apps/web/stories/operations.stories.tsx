import type { Meta, StoryObj } from '@storybook/react-vite';
import { operationsDestinations } from '../src/shells/protected/operations/navigation';
import { OperationsQueueFrame, OperationsQueueTable, OperationsShell } from '../src/shells/protected/operations/operations-shell';

function OperationsFixture() {
  const rows = Object.freeze([
    { reference: 'SYN-OPS-001', status: 'Needs review', ageOrDeadline: 'Due 15:00 WAT', owner: 'Operations', nextActionHref: '/operations/support/cases', nextActionLabel: 'Review presentation' },
    { reference: 'SYN-OPS-002', status: 'Waiting for evidence', ageOrDeadline: 'Recorded 18 minutes ago', owner: 'Support', nextActionHref: '/operations/support/cases', nextActionLabel: 'Review presentation' },
  ]);
  return <OperationsShell destinations={operationsDestinations.slice(0, 6)} scopeLabel="Synthetic Covenant pilot workspace"><OperationsQueueFrame filterContext={<p>Supplied filter context: open attention only</p>} notice={<p>No live queue or access decision is represented.</p>} resultContext={<p>Two synthetic presentation rows</p>} scope="Operations / Support" title="Attention queue"><OperationsQueueTable caption="Synthetic operational attention" currentPage={1} pageHref={(page) => `/operations/support?page=${page}`} rows={rows} totalPages={3} /></OperationsQueueFrame></OperationsShell>;
}

const meta = {
  id: 'protected-operations',
  title: 'Protected surfaces/Operations',
  component: OperationsFixture,
  parameters: { layout: 'fullscreen', noma: { pathname: '/operations/support' } },
} satisfies Meta<typeof OperationsFixture>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Queue: Story = {};
