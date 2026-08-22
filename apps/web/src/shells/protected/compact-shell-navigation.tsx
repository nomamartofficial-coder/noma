'use client';

import { Menu } from '@noma/ui';
import { usePathname } from 'next/navigation';
import type { ShellDestination } from '../navigation';
import { isDestinationCurrent } from '../navigation';
import styles from './protected-shells.module.css';

interface CompactShellNavigationProps {
  readonly destinations: readonly ShellDestination[];
  readonly label: string;
  readonly pathnameOverride?: string;
}

export function CompactShellNavigation({ destinations, label, pathnameOverride }: CompactShellNavigationProps) {
  const pathname = pathnameOverride ?? usePathname() ?? '/';
  const current = destinations.find((destination) => isDestinationCurrent(pathname, destination));
  return (
    <div className={styles.compactNavigation}>
      <span className={styles.compactLabel}>{label}</span>
      <Menu
        className={styles.compactMenu ?? ''}
        items={destinations.map(({ href, id, label: itemLabel }) => ({ href, id, label: itemLabel }))}
        label={current?.label ?? 'Choose a section'}
      />
    </div>
  );
}
