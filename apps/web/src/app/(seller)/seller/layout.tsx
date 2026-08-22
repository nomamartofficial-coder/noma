import type { ReactNode } from 'react';
import { requireProtectedSurfaceAccess } from '../../../shells/protected/protected-surface-access.server';
import { SellerShell } from '../../../shells/protected/seller/seller-shell';

export const dynamic = 'force-dynamic';

export default async function SellerLayout({ children }: Readonly<{ children: ReactNode }>) {
  await requireProtectedSurfaceAccess('seller');
  return <SellerShell>{children}</SellerShell>;
}
