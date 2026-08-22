import type { ReactNode } from 'react';
import { requireProtectedSurfaceAccess } from '../../../shells/protected/protected-surface-access.server';
import { RiderShell } from '../../../shells/protected/rider/rider-shell';

export const dynamic = 'force-dynamic';

export default async function RiderLayout({ children }: Readonly<{ children: ReactNode }>) {
  await requireProtectedSurfaceAccess('rider');
  return <RiderShell>{children}</RiderShell>;
}
