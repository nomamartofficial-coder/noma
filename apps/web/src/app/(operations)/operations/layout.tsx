import type { ReactNode } from 'react';
import { requireProtectedSurfaceAccess } from '../../../shells/protected/protected-surface-access.server';
import { OperationsShell } from '../../../shells/protected/operations/operations-shell';
import { operationsDestinations } from '../../../shells/protected/operations/navigation';

export const dynamic = 'force-dynamic';

export default async function OperationsLayout({ children }: Readonly<{ children: ReactNode }>) {
  await requireProtectedSurfaceAccess('operations');
  return <OperationsShell destinations={operationsDestinations} scopeLabel="Protected workspace">{children}</OperationsShell>;
}
