import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { CompactShellNavigation } from '../../apps/web/src/shells/protected/compact-shell-navigation';
import { AdminReviewFrame, AdminShell } from '../../apps/web/src/shells/protected/admin/admin-shell';
import { adminDestinations } from '../../apps/web/src/shells/protected/admin/navigation';
import { operationsDestinations } from '../../apps/web/src/shells/protected/operations/navigation';
import { OperationsQueueTable, OperationsShell } from '../../apps/web/src/shells/protected/operations/operations-shell';
import { riderDestinations } from '../../apps/web/src/shells/protected/rider/navigation';
import { RiderActionMode, RiderConnectivityBanner, RiderShell } from '../../apps/web/src/shells/protected/rider/rider-shell';
import { sellerDestinations } from '../../apps/web/src/shells/protected/seller/navigation';
import { SellerShell } from '../../apps/web/src/shells/protected/seller/seller-shell';
import { expectNoAxeViolations } from './axe-helper';

const navigationState = vi.hoisted(() => ({ pathname: '/seller' }));
vi.mock('next/navigation', () => ({ usePathname: () => navigationState.pathname }));

describe('UI-005 protected role-surface presentation', () => {
  test('renders a distinct Seller shell and labelled synthetic seller context', async () => {
    navigationState.pathname = '/seller/orders';
    const { container } = render(<SellerShell context={{ sellerLabel: 'Synthetic Store', scopeLabel: 'Synthetic UI-005 fixture' }}><h1>Seller orders review</h1></SellerShell>);
    expect(screen.getByText('Seller Centre')).toBeVisible();
    expect(screen.getByRole('main')).toContainElement(screen.getByRole('heading', { name: 'Seller orders review' }));
    expect(screen.getByLabelText('Seller context')).toHaveTextContent('Synthetic UI-005 fixture');
    expect(within(screen.getByRole('navigation', { name: 'Seller sections' })).getByRole('link', { name: 'Orders' })).toHaveAttribute('href', '/seller/orders');
    expect(screen.queryByText('Noma Operations')).not.toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  test('keeps the shared compact menu keyboard-operable and supplied-only', async () => {
    navigationState.pathname = '/operations/finance';
    const user = userEvent.setup();
    const supplied = operationsDestinations.filter(({ id }) => id === 'finance' || id === 'reports');
    render(<CompactShellNavigation destinations={supplied} label="Assigned workspaces" pathnameOverride="/operations/finance" />);
    const trigger = screen.getByRole('button', { name: /Finance/i });
    trigger.focus();
    await user.keyboard('{Enter}');
    expect(await screen.findByRole('menuitem', { name: 'Reports' })).toHaveAttribute('href', '/operations/reports');
    expect(screen.queryByRole('menuitem', { name: 'Dispatch' })).not.toBeInTheDocument();
  });

  test('separates Rider context, next action, instructions, and incident help', async () => {
    navigationState.pathname = '/rider';
    const { container } = render(<RiderShell connectivity={{ state: 'CONNECTION_REQUIRED' }}><RiderActionMode context={<h1>Synthetic current job</h1>} status={<p>Status supplied by fixture</p>} nextAction={<button type="button">Review next step</button>} instructions={<p>Follow the supplied handoff instructions.</p>} incidentHelp={<a href="/rider">Return for help</a>} /></RiderShell>);
    expect(screen.getByRole('button', { name: 'Review next step' })).toBeVisible();
    expect(screen.getByRole('complementary', { name: 'Incident and help' })).toHaveTextContent('Return for help');
    expect(screen.getByText('Completion cannot proceed until Noma confirms the action.')).toBeVisible();
    await expectNoAxeViolations(container);
  });

  test('renders every Rider connectivity state with selective announcements and no false finality', () => {
    const cases = [
      { state: 'SERVER_CONFIRMED' as const, title: 'Confirmed by Noma', live: null },
      { state: 'CACHED' as const, cachedAt: '2026-08-21T09:30:00+01:00', title: 'Cached information', live: null },
      { state: 'LOCAL_DRAFT' as const, title: 'Local draft only', live: null },
      { state: 'PENDING_SYNC' as const, title: 'Waiting to sync', live: 'polite' },
      { state: 'SYNC_FAILED' as const, title: 'Sync failed', live: 'assertive' },
      { state: 'CONFLICT' as const, title: 'Assignment changed', live: 'assertive' },
      { state: 'CONNECTION_REQUIRED' as const, title: 'Connection required', live: 'polite' },
    ];
    for (const item of cases) {
      const { unmount } = render(<RiderConnectivityBanner presentation={item.state === 'CACHED' ? { state: item.state, cachedAt: item.cachedAt } : { state: item.state }} />);
      const banner = screen.getByText(item.title).closest('section');
      expect(banner).toHaveAttribute('data-connectivity-state', item.state);
      if (item.live) expect(banner).toHaveAttribute('aria-live', item.live);
      else expect(banner).not.toHaveAttribute('aria-live');
      expect(banner).not.toHaveTextContent(/^Delivered$|^Pickup complete$/i);
      unmount();
    }
  });

  test('renders explicit Operations scope, supplied navigation, and a compact semantic queue', async () => {
    navigationState.pathname = '/operations/finance';
    const supplied = operationsDestinations.filter(({ id }) => id === 'finance' || id === 'reports');
    const shell = render(<OperationsShell destinations={supplied} scopeLabel="Synthetic Covenant scope"><h1>Finance workspace shell</h1></OperationsShell>);
    expect(screen.getByText('Synthetic Covenant scope')).toBeVisible();
    expect(screen.getByRole('navigation', { name: 'Operations workspaces' })).toHaveTextContent('Finance');
    expect(screen.queryByText('Dispatch')).not.toBeInTheDocument();
    shell.unmount();
    const { container } = render(<OperationsQueueTable caption="Synthetic attention queue" currentPage={1} pageHref={(page) => `/operations/finance?page=${page}`} rows={[{ ageOrDeadline: 'Due in 30 minutes', nextActionHref: '/operations/finance', nextActionLabel: 'Review evidence', owner: 'Synthetic Finance team', reference: 'SYNTHETIC-001', status: 'Needs review' }]} totalPages={2} />);
    const table = screen.getByRole('table', { name: 'Synthetic attention queue' });
    expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['Reference', 'Status', 'Age / deadline', 'Owner', 'Next action']);
    expect(within(table).getByRole('rowheader', { name: 'SYNTHETIC-001' })).toBeVisible();
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeVisible();
    await expectNoAxeViolations(container);
  });

  test('renders only supplied Admin destinations and a static review architecture', async () => {
    navigationState.pathname = '/admin/access';
    const supplied = adminDestinations.filter(({ id }) => id === 'access-roles' || id === 'audit');
    const shell = render(<AdminShell destinations={supplied} scopeLabel="Synthetic restricted scope"><h1>Access review shell</h1></AdminShell>);
    expect(screen.getByRole('navigation', { name: 'Administration sections' })).toHaveTextContent('Access & Roles');
    expect(screen.queryByText('Emergency Controls')).not.toBeInTheDocument();
    shell.unmount();
    const { container } = render(<AdminReviewFrame presentation={{ approval: 'Independent approval required', consequence: 'No command is issued by this presentation', currentValue: 'Synthetic current value', proposedValue: 'Synthetic proposed value', reason: 'Synthetic review reason', scope: 'Synthetic scope', title: 'Review configuration change' }} />);
    expect(screen.getByRole('heading', { name: 'Review configuration change' })).toBeVisible();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('No command is issued by this presentation')).toBeVisible();
    await expectNoAxeViolations(container);
  });

  test('keeps catalog definitions available for presentation fixtures without combining shells', () => {
    expect(sellerDestinations).toHaveLength(11);
    expect(riderDestinations).toHaveLength(5);
    expect(operationsDestinations).toHaveLength(14);
    expect(adminDestinations).toHaveLength(12);
  });
});
