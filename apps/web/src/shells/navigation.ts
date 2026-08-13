export type SurfaceKind = 'shop' | 'account' | 'seller' | 'rider' | 'operations' | 'admin';

export interface SurfaceDestination {
  readonly id: SurfaceKind;
  readonly label: string;
  readonly href: string;
}

export interface ShellDestination {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  readonly exact?: boolean;
  readonly activePrefixes?: readonly string[];
}

export const productionSurfaceDestinations = Object.freeze([
  { id: 'shop', label: 'Shop on Noma', href: '/' },
  { id: 'account', label: 'My account', href: '/account' },
] as const satisfies readonly SurfaceDestination[]);

export const mobileDestinations = Object.freeze([
  { id: 'home', label: 'Home', href: '/', exact: true },
  { id: 'categories', label: 'Categories', href: '/categories' },
  { id: 'search', label: 'Search', href: '/search' },
  { id: 'orders', label: 'Orders', href: '/account/orders' },
  { id: 'cart', label: 'Cart', href: '/cart' },
] as const satisfies readonly ShellDestination[]);

export const accountDestinations = Object.freeze([
  { id: 'overview', label: 'Overview', href: '/account', exact: true },
  { id: 'orders', label: 'Orders', href: '/account/orders' },
  { id: 'messages', label: 'Messages', href: '/account/messages' },
  {
    id: 'returns-cases',
    label: 'Returns & Cases',
    href: '/account/cases',
    activePrefixes: ['/account/cases', '/account/returns'],
  },
  { id: 'refunds', label: 'Refunds', href: '/account/refunds' },
  { id: 'reviews', label: 'Reviews', href: '/account/reviews' },
  {
    id: 'verification',
    label: 'Verification',
    href: '/account/verification/covenant',
    activePrefixes: ['/account/verification'],
  },
  { id: 'notifications', label: 'Notifications', href: '/account/notifications' },
  {
    id: 'profile-security',
    label: 'Profile & Security',
    href: '/account/profile',
    activePrefixes: ['/account/profile', '/account/security'],
  },
] as const satisfies readonly ShellDestination[]);

export function isDestinationCurrent(pathname: string, destination: ShellDestination): boolean {
  const prefixes = destination.activePrefixes ?? [destination.href];
  return prefixes.some((prefix) => destination.exact
    ? pathname === prefix
    : pathname === prefix || pathname.startsWith(`${prefix}/`));
}
