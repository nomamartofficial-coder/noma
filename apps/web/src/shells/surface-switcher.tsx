'use client';

import { Menu } from '@noma/ui';
import type { SurfaceDestination } from './navigation';
import styles from './shells.module.css';

export interface SurfaceSwitcherProps {
  readonly destinations: readonly SurfaceDestination[];
  readonly label?: string;
}

export function SurfaceSwitcher({ destinations, label = 'Noma surfaces' }: SurfaceSwitcherProps) {
  if (destinations.length === 0) throw new Error('SurfaceSwitcher requires at least one supplied destination');
  const seen = new Set<string>();
  const items = destinations.map((destination) => {
    if (!destination.label.trim() || !destination.href.startsWith('/') || destination.href.startsWith('//')) {
      throw new Error('SurfaceSwitcher destinations require a readable label and application-relative path');
    }
    if (seen.has(destination.id)) throw new Error(`Duplicate surface destination: ${destination.id}`);
    seen.add(destination.id);
    return { id: destination.id, label: destination.label, href: destination.href } as const;
  });
  return <Menu className={styles.surfaceSwitcher ?? ''} items={items} label={label} />;
}
