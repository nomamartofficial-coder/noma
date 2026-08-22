import type { ReactNode } from 'react';
import { requireProtectedSurfaceAccess } from '../../../shells/protected/protected-surface-access.server';
import { AdminShell } from '../../../shells/protected/admin/admin-shell';
import { adminDestinations } from '../../../shells/protected/admin/navigation';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  await requireProtectedSurfaceAccess('admin');
  return <AdminShell destinations={adminDestinations}>{children}</AdminShell>;
}
