import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import AccountError from '../../apps/web/src/app/(buyer)/account/error';
import AccountLoading from '../../apps/web/src/app/(buyer)/account/loading';
import { ActiveNavigation } from '../../apps/web/src/shells/active-navigation';
import { CompactAccountNavigation } from '../../apps/web/src/shells/compact-account-navigation';
import { ConsumerHeader } from '../../apps/web/src/shells/consumer-header';
import { MarketplaceSearch } from '../../apps/web/src/shells/marketplace-search';
import { accountDestinations, mobileDestinations } from '../../apps/web/src/shells/navigation';
import { SurfaceSwitcher } from '../../apps/web/src/shells/surface-switcher';
import { expectNoAxeViolations } from './axe-helper';

const navigationState = vi.hoisted(() => ({ pathname: '/' }));
vi.mock('next/navigation', () => ({ usePathname: () => navigationState.pathname }));

describe('UI-004 Marketplace and Buyer shells', () => {
  test('renders an accessible native GET search and conservative consumer header', async () => {
    navigationState.pathname = '/';
    const { container } = render(<ConsumerHeader />);
    const form = screen.getByRole('search');
    expect(form).toHaveAttribute('method', 'get');
    expect(form).toHaveAttribute('action', '/search');
    expect(screen.getByRole('searchbox', { name: 'Search the Noma Marketplace' })).toHaveAttribute('name', 'q');
    expect(screen.getByRole('button', { name: 'Search' })).toHaveAttribute('type', 'submit');
    expect(screen.getByRole('link', { name: 'Categories' })).toHaveAttribute('href', '/categories');
    expect(screen.getByRole('link', { name: 'Cart' })).toHaveAttribute('href', '/cart');
    expect(screen.queryByText(/Cart\s+\d+/)).not.toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  test('renders exactly five mobile destinations and the pathname-derived current item', async () => {
    navigationState.pathname = '/account/orders/NM-ORDER';
    const { container } = render(<ActiveNavigation destinations={mobileDestinations} label="Primary mobile" mobile pathnameOverride="/account/orders/NM-ORDER" />);
    const navigation = screen.getByRole('navigation', { name: 'Primary mobile' });
    expect(within(navigation).getAllByRole('link').map((link) => link.textContent)).toEqual(['Home', 'Categories', 'Search', 'Orders', 'Cart']);
    expect(within(navigation).getByRole('link', { name: 'Orders' })).toHaveAttribute('aria-current', 'page');
    expect(within(navigation).queryByRole('link', { name: 'Account' })).not.toBeInTheDocument();
    await expectNoAxeViolations(container);
  });

  test('shows supplied surface destinations only and keeps privileged fixtures synthetic', async () => {
    const user = userEvent.setup();
    const syntheticDestinations = [
      { id: 'shop' as const, label: 'Shop on Noma', href: '/' },
      { id: 'seller' as const, label: 'Seller Centre — Synthetic Store', href: '/seller' },
      { id: 'rider' as const, label: 'Rider — Covenant', href: '/rider' },
      { id: 'operations' as const, label: 'Operations — Synthetic Support', href: '/operations' },
      { id: 'admin' as const, label: 'Admin', href: '/admin' },
    ];
    render(<SurfaceSwitcher destinations={syntheticDestinations} label="Available surfaces" />);
    await user.click(screen.getByRole('button', { name: /Available surfaces/i }));
    expect(await screen.findByRole('menuitem', { name: 'Shop on Noma' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('menuitem', { name: 'Seller Centre — Synthetic Store' })).toHaveAttribute('href', '/seller');
    expect(screen.getByRole('menuitem', { name: 'Admin' })).toHaveAttribute('href', '/admin');
    expect(screen.queryByRole('menuitem', { name: 'My account' })).not.toBeInTheDocument();
  });

  test('exposes all account sections in desktop and keyboard-operable compact navigation', async () => {
    navigationState.pathname = '/account/cases';
    const user = userEvent.setup();
    const { rerender } = render(<ActiveNavigation destinations={accountDestinations} label="Account sections" pathnameOverride="/account/cases" />);
    const rail = screen.getByRole('navigation', { name: 'Account sections' });
    expect(within(rail).getAllByRole('link')).toHaveLength(9);
    expect(within(rail).getByRole('link', { name: 'Returns & Cases' })).toHaveAttribute('aria-current', 'page');
    rerender(<CompactAccountNavigation pathnameOverride="/account/cases" />);
    const trigger = screen.getByRole('button', { name: /Returns & Cases/i });
    trigger.focus();
    await user.keyboard('{Enter}');
    expect(await screen.findByRole('menuitem', { name: 'Profile & Security' })).toHaveAttribute('href', '/account/profile');
  });

  test('keeps loading geometry textual and its skeletons non-semantic', async () => {
    const { container } = render(<AccountLoading />);
    expect(screen.getByRole('heading', { level: 1, name: 'Loading your account…' })).toBeVisible();
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2);
    await expectNoAxeViolations(container);
  });

  test('redacts raw errors and retries only through the supplied boundary reset', async () => {
    const user = userEvent.setup();
    const reset = vi.fn();
    const unsafe = new Error('postgres://secret@internal-host/private stack');
    const { container } = render(<AccountError error={unsafe} reset={reset} />);
    expect(screen.getByRole('heading', { name: 'We couldn’t load this account section' })).toBeVisible();
    expect(screen.queryByText(/postgres|secret|internal-host|stack/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/access denied|unauthori[sz]ed/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(reset).toHaveBeenCalledOnce();
    expect(screen.getByRole('link', { name: 'Back to account overview' })).toHaveAttribute('href', '/account');
    await expectNoAxeViolations(container);
  });

  test('allows dedicated search compositions without changing the action contract', () => {
    render(<MarketplaceSearch id="test-marketplace-search" />);
    expect(screen.getByRole('searchbox')).toHaveAttribute('id', 'test-marketplace-search');
    expect(screen.getByRole('search')).toHaveAttribute('action', '/search');
  });
});
