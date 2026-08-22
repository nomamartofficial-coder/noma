import { readdir } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { productionSurfaceDestinations, isDestinationCurrent } from '../src/shells/navigation';
import { adminDestinations } from '../src/shells/protected/admin/navigation';
import { operationsDestinations } from '../src/shells/protected/operations/navigation';
import { riderDestinations } from '../src/shells/protected/rider/navigation';
import { RiderConnectivityBanner } from '../src/shells/protected/rider/rider-shell';
import { sellerDestinations } from '../src/shells/protected/seller/navigation';

const expectedProtectedRoutes = [
  '/seller', '/seller/orders', '/seller/listings', '/seller/inventory', '/seller/fulfilment', '/seller/messages', '/seller/cases', '/seller/earnings', '/seller/payouts', '/seller/performance', '/seller/settings',
  '/rider', '/rider/jobs', '/rider/history', '/rider/earnings', '/rider/shift', '/rider/profile',
  '/operations', '/operations/orders', '/operations/fulfilments', '/operations/dispatch', '/operations/support', '/operations/support/cases', '/operations/returns', '/operations/catalogue', '/operations/sellers', '/operations/verification', '/operations/finance', '/operations/trust-safety', '/operations/incidents', '/operations/reports',
  '/admin', '/admin/institutions', '/admin/commerce-types', '/admin/categories', '/admin/sellers', '/admin/access', '/admin/logistics', '/admin/finance', '/admin/notifications', '/admin/audit', '/admin/emergency-controls', '/admin/system',
] as const;

async function protectedPageRoutes(): Promise<string[]> {
  const appRoot = resolve(import.meta.dirname, '../src/app');
  const pages: string[] = [];
  async function walk(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.name === 'page.tsx') pages.push(path);
    }
  }
  await walk(appRoot);
  return pages.map((path) => {
    const segments = relative(appRoot, path).replaceAll('\\', '/').split('/').slice(0, -1).filter((segment) => !/^\(.+\)$/.test(segment));
    return segments.length === 0 ? '/' : `/${segments.join('/')}`;
  }).filter((route) => /^\/(?:seller|rider|operations|admin)(?:\/|$)/.test(route)).sort();
}

describe('UI-005 protected role-shell contracts', () => {
  test('keeps the exact static protected route manifest collision-free', async () => {
    const routes = await protectedPageRoutes();
    expect(routes).toEqual([...expectedProtectedRoutes].sort());
    expect(new Set(routes).size).toBe(routes.length);
    expect(routes.some((route) => route.includes('(') || route.includes('['))).toBe(false);
  });

  test('keeps every surface navigation exact, ordered, and immutable', () => {
    expect(sellerDestinations.map(({ href, label }) => ({ href, label }))).toEqual([
      { href: '/seller', label: 'Overview' }, { href: '/seller/orders', label: 'Orders' }, { href: '/seller/listings', label: 'Listings' }, { href: '/seller/inventory', label: 'Inventory' }, { href: '/seller/fulfilment', label: 'Fulfilment' }, { href: '/seller/messages', label: 'Messages' }, { href: '/seller/cases', label: 'Cases' }, { href: '/seller/earnings', label: 'Earnings' }, { href: '/seller/payouts', label: 'Payouts' }, { href: '/seller/performance', label: 'Performance' }, { href: '/seller/settings', label: 'Store Settings' },
    ]);
    expect(riderDestinations.map(({ href, label }) => ({ href, label }))).toEqual([
      { href: '/rider', label: 'Current' }, { href: '/rider/jobs', label: 'Available / Assigned Jobs' }, { href: '/rider/history', label: 'History' }, { href: '/rider/earnings', label: 'Earnings' }, { href: '/rider/shift', label: 'Profile / Shift' },
    ]);
    expect(operationsDestinations).toHaveLength(14);
    expect(adminDestinations).toHaveLength(12);
    for (const destinations of [sellerDestinations, riderDestinations, operationsDestinations, adminDestinations]) expect(Object.isFrozen(destinations)).toBe(true);
  });

  test('uses exact and multi-prefix presentation matching without granting authority', () => {
    expect(isDestinationCurrent('/seller/orders/NM-SYNTHETIC', sellerDestinations[1])).toBe(true);
    expect(isDestinationCurrent('/seller/payout-account', sellerDestinations[8])).toBe(true);
    expect(isDestinationCurrent('/rider/profile', riderDestinations[4])).toBe(true);
    expect(isDestinationCurrent('/operations/recalls/NM-SYNTHETIC', operationsDestinations[12])).toBe(true);
    expect(isDestinationCurrent('/admin/feature-flags', adminDestinations[2])).toBe(true);
    expect(isDestinationCurrent('/admin/access', adminDestinations[0])).toBe(false);
  });

  test('keeps the production surface switcher conservative', () => {
    expect(productionSurfaceDestinations).toEqual([
      { id: 'shop', label: 'Shop on Noma', href: '/' },
      { id: 'account', label: 'My account', href: '/account' },
    ]);
  });

  test('requires a valid material timestamp for cached rider truth', () => {
    expect(() => RiderConnectivityBanner({ presentation: { state: 'CACHED', cachedAt: '2026-08-21T09:30:00+01:00' } })).not.toThrow();
    expect(() => RiderConnectivityBanner({ presentation: { state: 'CACHED', cachedAt: 'today' } })).toThrow(/RFC 3339/);
  });
});
