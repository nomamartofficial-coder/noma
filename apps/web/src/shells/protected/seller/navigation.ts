import type { ShellDestination } from '../../navigation';

export const sellerDestinations = Object.freeze([
  { id: 'overview', label: 'Overview', href: '/seller', exact: true },
  { id: 'orders', label: 'Orders', href: '/seller/orders' },
  { id: 'listings', label: 'Listings', href: '/seller/listings' },
  { id: 'inventory', label: 'Inventory', href: '/seller/inventory' },
  { id: 'fulfilment', label: 'Fulfilment', href: '/seller/fulfilment' },
  { id: 'messages', label: 'Messages', href: '/seller/messages' },
  { id: 'cases', label: 'Cases', href: '/seller/cases' },
  { id: 'earnings', label: 'Earnings', href: '/seller/earnings' },
  { id: 'payouts', label: 'Payouts', href: '/seller/payouts', activePrefixes: ['/seller/payouts', '/seller/payout-account'] },
  { id: 'performance', label: 'Performance', href: '/seller/performance' },
  { id: 'settings', label: 'Store Settings', href: '/seller/settings', activePrefixes: ['/seller/settings'] },
] as const satisfies readonly ShellDestination[]);
