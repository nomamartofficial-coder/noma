import type { ShellDestination } from '../../navigation';

export interface AdminDestination extends ShellDestination {
  readonly id: 'overview' | 'institutions' | 'commerce-features' | 'categories-policies' | 'seller-controls' | 'access-roles' | 'logistics' | 'finance' | 'notifications' | 'audit' | 'emergency-controls' | 'system';
}

export const adminDestinations = Object.freeze([
  { id: 'overview', label: 'Overview', href: '/admin', exact: true },
  { id: 'institutions', label: 'Institutions', href: '/admin/institutions' },
  { id: 'commerce-features', label: 'Commerce Features', href: '/admin/commerce-types', activePrefixes: ['/admin/commerce-types', '/admin/feature-flags'] },
  { id: 'categories-policies', label: 'Categories & Policies', href: '/admin/categories', activePrefixes: ['/admin/categories', '/admin/policies'] },
  { id: 'seller-controls', label: 'Seller Activation Controls', href: '/admin/sellers' },
  { id: 'access-roles', label: 'Access & Roles', href: '/admin/access' },
  { id: 'logistics', label: 'Logistics Configuration', href: '/admin/logistics' },
  { id: 'finance', label: 'Payment/Payout Configuration', href: '/admin/finance' },
  { id: 'notifications', label: 'Notifications & Templates', href: '/admin/notifications' },
  { id: 'audit', label: 'Audit', href: '/admin/audit' },
  { id: 'emergency-controls', label: 'Emergency Controls', href: '/admin/emergency-controls' },
  { id: 'system', label: 'System Configuration', href: '/admin/system' },
] as const satisfies readonly AdminDestination[]);
