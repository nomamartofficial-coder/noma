import type { ShellDestination } from '../../navigation';

export const riderDestinations = Object.freeze([
  { id: 'current', label: 'Current', href: '/rider', exact: true },
  { id: 'jobs', label: 'Available / Assigned Jobs', href: '/rider/jobs' },
  { id: 'history', label: 'History', href: '/rider/history' },
  { id: 'earnings', label: 'Earnings', href: '/rider/earnings' },
  { id: 'profile-shift', label: 'Profile / Shift', href: '/rider/shift', activePrefixes: ['/rider/shift', '/rider/profile'] },
] as const satisfies readonly ShellDestination[]);
