'use client';

import { Menu } from '@noma/ui';
import { usePathname } from 'next/navigation';
import { accountDestinations, isDestinationCurrent } from './navigation';
import styles from './shells.module.css';

export function CompactAccountNavigation({ pathnameOverride }: Readonly<{ pathnameOverride?: string }>) {
  const pathname = pathnameOverride ?? usePathname() ?? '/account';
  const current = accountDestinations.find((destination) => isDestinationCurrent(pathname, destination));
  return (
    <div className={styles.compactAccountNavigation}>
      <span className={styles.compactAccountLabel}>Account sections</span>
      <Menu
        className={styles.compactAccountMenu ?? ''}
        items={accountDestinations.map(({ href, id, label }) => ({ href, id, label }))}
        label={current?.label ?? 'Choose a section'}
      />
    </div>
  );
}
