import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { AuditViewer, type AuditTimelineRowView } from '../../apps/web/src/audit/audit-viewer.js';
import { expectNoAxeViolations } from './axe-helper.js';

const row: AuditTimelineRowView = Object.freeze({
  eventId: '10000000-0000-4000-8000-000000000001', sequence: '2', occurredAt: '2026-09-25T09:30:00.000Z',
  action: 'identity.mfa.factor.remove', actorType: 'HUMAN', actorReference: '10000000-0000-4000-8000-000000000002',
  targetType: 'MFA_FACTOR', targetReference: '10000000-0000-4000-8000-000000000003', outcome: 'SUCCEEDED',
  reasonCode: 'USER_REQUESTED_FACTOR_REMOVAL', correlationReference: 'iam008-synthetic-correlation',
  beforeSummary: 'factorState=ACTIVE', afterSummary: 'factorState=REVOKED; sessionsRevoked=true',
  correctsEventId: '10000000-0000-4000-8000-000000000004',
});

describe('IAM-008 internal audit viewer', () => {
  test.each([
    ['LOADING', 'Loading audit history'], ['EMPTY', 'No audit history'], ['FILTERED_EMPTY', 'No matching audit events'],
    ['ERROR', 'Audit history unavailable'], ['DENIED', 'Audit history unavailable'], ['MALFORMED_QUERY', 'Audit request unavailable'],
  ] as const)('renders the %s state accessibly', async (kind, title) => {
    const { container } = render(<AuditViewer state={{ kind } as never} />);
    expect(screen.getByRole(kind === 'LOADING' ? 'status' : 'region', { name: title })).toBeVisible();
    await expectNoAxeViolations(container);
  });

  test('renders safe rows, correction semantics, pagination and no mutation/export controls', async () => {
    const onLoadNextPage = vi.fn();
    const user = userEvent.setup();
    const { container } = render(<AuditViewer onLoadNextPage={onLoadNextPage} state={{ kind: 'LOADED', rows: [row], hasNextPage: true }} />);
    const timeline = screen.getByRole('list', { name: 'Privileged-action audit history' });
    expect(within(timeline).getByRole('listitem')).toHaveTextContent('identity.mfa.factor.remove');
    expect(within(timeline).getByRole('listitem')).toHaveTextContent(`Corrects event ${row.correctsEventId}`);
    expect(within(timeline).getByRole('listitem')).toHaveTextContent('sessionsRevoked=true');
    const button = screen.getByRole('button', { name: 'Load more audit events' });
    await user.tab();
    expect(button).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onLoadNextPage).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: /edit|delete|rewrite|export/i })).not.toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  test('presents pagination loading without accepting another command', async () => {
    const { container } = render(<AuditViewer state={{ kind: 'LOADED', rows: [row], hasNextPage: true, loadingNextPage: true }} />);
    expect(screen.getByRole('button', { name: 'Loading more audit events' })).toBeDisabled();
    await expectNoAxeViolations(container);
  });
});
