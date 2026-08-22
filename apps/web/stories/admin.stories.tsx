import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { AdminReviewFrame, AdminShell } from '../src/shells/protected/admin/admin-shell';
import { adminDestinations } from '../src/shells/protected/admin/navigation';

const presentation = Object.freeze({
  title: 'Review a proposed presentation change',
  scope: 'Synthetic Covenant pilot scope',
  currentValue: 'Current supplied value',
  proposedValue: 'Proposed supplied value',
  consequence: 'The owning future workflow determines whether this can change.',
  approval: 'Independent approval would be required by that workflow.',
  reason: 'Synthetic documentation fixture.',
});

function AdminFixture({ reviewOnly = false }: Readonly<{ reviewOnly?: boolean }>) {
  if (reviewOnly) return <section className="noma-story-section"><AdminReviewFrame presentation={presentation} /></section>;
  return <AdminShell destinations={adminDestinations.slice(0, 5)} scopeLabel="Explicit synthetic scope"><AdminReviewFrame presentation={presentation} /></AdminShell>;
}

const meta = {
  id: 'protected-admin',
  title: 'Protected surfaces/Admin',
  component: AdminFixture,
  parameters: { layout: 'fullscreen', nextjs: { appDirectory: true, navigation: { pathname: '/admin' } } },
} satisfies Meta<typeof AdminFixture>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Review: Story = { args: { reviewOnly: true } };
export const Shell: Story = {};
