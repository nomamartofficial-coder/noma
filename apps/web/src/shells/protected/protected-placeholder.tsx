import { Link } from '@noma/ui';
import type { Metadata } from 'next';
import type { ProtectedSurface } from './protected-surface-access.server';
import { requireProtectedSurfaceAccess } from './protected-surface-access.server';
import type { ShellBreadcrumbItem } from './shell-breadcrumbs';
import { ShellBreadcrumbs } from './shell-breadcrumbs';
import styles from './protected-shells.module.css';

export function defineProtectedSurfaceMetadata(surface: ProtectedSurface, metadata: Metadata): () => Promise<Metadata> {
  return async function generateProtectedSurfaceMetadata() {
    await requireProtectedSurfaceAccess(surface);
    return metadata;
  };
}

export async function ProtectedPlaceholder({
  breadcrumbs,
  context,
  description,
  returnHref,
  returnLabel,
  surface,
  title,
}: Readonly<{
  breadcrumbs?: readonly ShellBreadcrumbItem[];
  context: string;
  description: string;
  returnHref: string;
  returnLabel: string;
  surface: ProtectedSurface;
  title: string;
}>) {
  await requireProtectedSurfaceAccess(surface);
  return (
    <section className={styles.placeholder}>
      {breadcrumbs && <ShellBreadcrumbs items={breadcrumbs} />}
      <p className={styles.eyebrow}>{context}</p>
      <h1>{title}</h1>
      <p>{description}</p>
      <Link href={returnHref} standalone>{returnLabel}</Link>
    </section>
  );
}
