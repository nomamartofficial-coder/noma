import type { ShellDestination } from '../../navigation';

export interface OperationsWorkspaceDestination extends ShellDestination {
  readonly id: 'overview' | 'orders' | 'fulfilments' | 'dispatch' | 'support' | 'protection-cases' | 'returns' | 'catalogue' | 'sellers' | 'verification' | 'finance' | 'trust-safety' | 'incidents' | 'reports';
}

export const operationsDestinations = Object.freeze([
  { id: 'overview', label: 'Overview', href: '/operations', exact: true },
  { id: 'orders', label: 'Orders', href: '/operations/orders' },
  { id: 'fulfilments', label: 'Fulfilments', href: '/operations/fulfilments' },
  { id: 'dispatch', label: 'Dispatch', href: '/operations/dispatch' },
  { id: 'support', label: 'Support', href: '/operations/support', exact: true },
  { id: 'protection-cases', label: 'Protection Cases', href: '/operations/support/cases' },
  { id: 'returns', label: 'Returns', href: '/operations/returns' },
  { id: 'catalogue', label: 'Catalogue', href: '/operations/catalogue' },
  { id: 'sellers', label: 'Sellers', href: '/operations/sellers' },
  { id: 'verification', label: 'Verification', href: '/operations/verification' },
  { id: 'finance', label: 'Finance', href: '/operations/finance' },
  { id: 'trust-safety', label: 'Trust & Safety', href: '/operations/trust-safety' },
  { id: 'incidents', label: 'Incidents', href: '/operations/incidents', activePrefixes: ['/operations/incidents', '/operations/recalls'] },
  { id: 'reports', label: 'Reports', href: '/operations/reports' },
] as const satisfies readonly OperationsWorkspaceDestination[]);
