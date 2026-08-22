import { readdir } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  accountDestinations,
  isDestinationCurrent,
  mobileDestinations,
  productionSurfaceDestinations,
} from '../src/shells/navigation';

const expectedRoutes = [
  '/',
  '/account',
  '/account/cases',
  '/account/messages',
  '/account/notifications',
  '/account/orders',
  '/account/profile',
  '/account/refunds',
  '/account/reviews',
  '/account/verification/covenant',
  '/cart',
  '/categories',
  '/search',
] as const;

async function pageRoutes(): Promise<string[]> {
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
    const segments = relative(appRoot, path).replaceAll('\\', '/').split('/').slice(0, -1)
      .filter((segment) => !/^\(.+\)$/.test(segment));
    return segments.length === 0 ? '/' : `/${segments.join('/')}`;
  }).filter((route) => !/^\/(?:seller|rider|operations|admin)(?:\/|$)/.test(route)).sort();
}

describe('UI-004 shell navigation contracts', () => {
  test('keeps the required mobile destinations exact, ordered, and immutable', () => {
    expect(mobileDestinations.map(({ href, label }) => ({ href, label }))).toEqual([
      { label: 'Home', href: '/' },
      { label: 'Categories', href: '/categories' },
      { label: 'Search', href: '/search' },
      { label: 'Orders', href: '/account/orders' },
      { label: 'Cart', href: '/cart' },
    ]);
    expect(Object.isFrozen(mobileDestinations)).toBe(true);
  });

  test('maps every approved account label to its canonical shell entry', () => {
    expect(accountDestinations.map(({ href, label }) => ({ href, label }))).toEqual([
      { label: 'Overview', href: '/account' },
      { label: 'Orders', href: '/account/orders' },
      { label: 'Messages', href: '/account/messages' },
      { label: 'Returns & Cases', href: '/account/cases' },
      { label: 'Refunds', href: '/account/refunds' },
      { label: 'Reviews', href: '/account/reviews' },
      { label: 'Verification', href: '/account/verification/covenant' },
      { label: 'Notifications', href: '/account/notifications' },
      { label: 'Profile & Security', href: '/account/profile' },
    ]);
  });

  test('uses exact and multi-prefix current-location semantics without granting authority', () => {
    const overview = accountDestinations[0];
    const returnsAndCases = accountDestinations[3];
    const profileAndSecurity = accountDestinations[8];
    expect(overview && isDestinationCurrent('/account', overview)).toBe(true);
    expect(overview && isDestinationCurrent('/account/orders', overview)).toBe(false);
    expect(returnsAndCases && isDestinationCurrent('/account/returns/NM-RETURN', returnsAndCases)).toBe(true);
    expect(profileAndSecurity && isDestinationCurrent('/account/security/sessions', profileAndSecurity)).toBe(true);
  });

  test('keeps production surfaces conservative while supporting the versioned surface kinds', () => {
    expect(productionSurfaceDestinations).toEqual([
      { id: 'shop', label: 'Shop on Noma', href: '/' },
      { id: 'account', label: 'My account', href: '/account' },
    ]);
    expect(Object.isFrozen(productionSurfaceDestinations)).toBe(true);
  });

  test('has one collision-free page for every enabled internal shell destination', async () => {
    const actualRoutes = await pageRoutes();
    expect(actualRoutes).toEqual([...expectedRoutes].sort());
    expect(new Set(actualRoutes).size).toBe(actualRoutes.length);
    const enabled = [
      ...mobileDestinations.map((item) => item.href),
      ...accountDestinations.map((item) => item.href),
      ...productionSurfaceDestinations.map((item) => item.href),
    ];
    for (const href of enabled) expect(actualRoutes).toContain(href);
    expect(enabled.every((href) => !href.includes('('))).toBe(true);
  });
});
