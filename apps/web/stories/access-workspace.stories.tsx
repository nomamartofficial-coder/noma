import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import { AccessWorkspace, type ApprovalPage, type AssignmentPage, type ExportApprovalPage, type ReviewPage } from '../src/admin/access-workspace';

const scopeId = '11111111-1111-4111-8111-111111111111';
const authorityAssignmentId = '22222222-2222-4222-8222-222222222222';
const emptyAssignments: AssignmentPage = { rows: [], nextCursor: null };
const emptyApprovals: ApprovalPage = { rows: [], nextCursor: null };
const emptyExports: ExportApprovalPage = { rows: [], nextCursor: null };
const dueReviews: ReviewPage = {
  rows: [{
    reviewItemId: '33333333-3333-4333-8333-333333333333',
    cycleId: '44444444-4444-4444-8444-444444444444',
    itemVersion: 0,
    subjectReference: 'SYNTHETIC-REVIEWER-001',
    roleTemplateCode: 'ACCESS_REVIEWER',
    roleTemplateVersion: 1,
    scopeType: 'INSTITUTION',
    dueAt: '2026-10-01T12:00:00.000Z',
    cadence: 'QUARTERLY',
    state: 'DUE',
    outcome: null,
    completedAt: null,
    revocationPending: false,
  }],
  nextCursor: null,
};

const meta = {
  id: 'access-admin-workspace',
  title: 'Protected surfaces/Access Admin workspace',
  component: AccessWorkspace,
  parameters: { layout: 'fullscreen' },
  args: {
    scopeId, authorityAssignmentId,
    assignments: emptyAssignments,
    approvals: emptyApprovals,
    reviews: { rows: [], nextCursor: null },
    exportApprovals: emptyExports,
    initialError: null,
  },
} satisfies Meta<typeof AccessWorkspace>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EmptyExactScope: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Access and roles' })).toBeVisible();
    await expect(canvas.getByText('No assignments match this scope and filter.')).toBeVisible();
    await expect(canvas.getByText('No review items match this scope and filter.')).toBeVisible();
    await expect(canvas.getByText(/Approval alone never changes access/)).toBeVisible();
  },
};

export const DueReviewRequiresExplicitOutcome: Story = {
  args: { reviews: dueReviews },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText(/DUE · SYNTHETIC-REVIEWER-001/));
    await expect(canvas.getByRole('combobox', { name: 'Review outcome' })).toBeVisible();
    await expect(canvas.getByRole('option', { name: 'Retain confirmed' })).toBeInTheDocument();
    await expect(canvas.getByRole('option', { name: 'Revoke requested' })).toBeInTheDocument();
    await expect(canvas.getByRole('option', { name: 'Needs follow-up' })).toBeInTheDocument();
    await expect(canvas.getByText(/Follow-up is not a completed review/)).toBeVisible();
  },
};
