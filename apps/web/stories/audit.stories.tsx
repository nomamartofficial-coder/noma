import type { Meta, StoryObj } from '@storybook/react-vite';
import { AuditViewer, type AuditTimelineRowView } from '../src/audit/audit-viewer';

const rows = Object.freeze([
  Object.freeze({
    eventId: '10000000-0000-4000-8000-000000000001', sequence: '42', occurredAt: '2026-09-25T09:30:00.000Z',
    action: 'identity.mfa.factor.remove', actorType: 'HUMAN', actorReference: '10000000-0000-4000-8000-000000000002',
    targetType: 'MFA_FACTOR', targetReference: '10000000-0000-4000-8000-000000000003', outcome: 'SUCCEEDED',
    reasonCode: 'USER_REQUESTED_FACTOR_REMOVAL', correlationReference: 'iam008-synthetic-correlation-1',
    beforeSummary: 'factorState=ACTIVE', afterSummary: 'factorState=REVOKED; sessionsRevoked=true', correctsEventId: null,
  }),
  Object.freeze({
    eventId: '10000000-0000-4000-8000-000000000004', sequence: '41', occurredAt: '2026-09-25T09:20:00.000Z',
    action: 'access.approval.decide', actorType: 'HUMAN', actorReference: '10000000-0000-4000-8000-000000000005',
    targetType: 'APPROVAL_REQUEST', targetReference: '10000000-0000-4000-8000-000000000006', outcome: 'SUCCEEDED',
    reasonCode: 'INDEPENDENT_REVIEW_COMPLETED', correlationReference: 'iam008-synthetic-correlation-2',
    beforeSummary: 'state=PENDING', afterSummary: 'state=REJECTED; decision=REJECT', correctsEventId: '10000000-0000-4000-8000-000000000007',
  }),
] satisfies readonly AuditTimelineRowView[]);

const meta = {
  id: 'protected-audit',
  title: 'Protected surfaces/Audit viewer',
  component: AuditViewer,
  parameters: { layout: 'padded', noma: { pathname: '/admin/audit', productionRouteState: 'FAIL_CLOSED' } },
} satisfies Meta<typeof AuditViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loaded: Story = { args: { state: { kind: 'LOADED', rows, hasNextPage: true } } };
export const Loading: Story = { args: { state: { kind: 'LOADING' } } };
export const Empty: Story = { args: { state: { kind: 'EMPTY' } } };
export const FilteredEmpty: Story = { args: { state: { kind: 'FILTERED_EMPTY' } } };
export const Error: Story = { args: { state: { kind: 'ERROR' } } };
export const Denied: Story = { args: { state: { kind: 'DENIED' } } };
export const MalformedQuery: Story = { args: { state: { kind: 'MALFORMED_QUERY' } } };
export const PaginationLoading: Story = { args: { state: { kind: 'LOADED', rows, hasNextPage: true, loadingNextPage: true } } };
