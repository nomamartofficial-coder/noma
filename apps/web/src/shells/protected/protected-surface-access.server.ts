import { notFound } from 'next/navigation';

export type ProtectedSurface = 'seller' | 'rider' | 'operations' | 'admin';

export async function requireProtectedSurfaceAccess(surface: ProtectedSurface): Promise<never> {
  void surface;
  notFound();
}
