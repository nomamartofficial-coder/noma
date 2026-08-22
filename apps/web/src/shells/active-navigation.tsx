'use client';

import { Link } from '@noma/ui';
import { usePathname } from 'next/navigation';
import type { ShellDestination } from './navigation';
import { isDestinationCurrent } from './navigation';
import styles from './shells.module.css';

interface ActiveNavigationProps {
  readonly className?: string | undefined;
  readonly destinations: readonly ShellDestination[];
  readonly label: string;
  readonly linkClassName?: string | undefined;
  readonly listClassName?: string | undefined;
  readonly mobile?: boolean;
  readonly pathnameOverride?: string;
}

export function ActiveNavigation({
  className,
  destinations,
  label,
  linkClassName,
  listClassName,
  mobile = false,
  pathnameOverride,
}: ActiveNavigationProps) {
  const pathname = pathnameOverride ?? usePathname() ?? '/';
  return (
    <nav aria-label={label} className={className ?? (mobile ? styles.mobileNavigation : styles.accountNavigation)}>
      <ul className={listClassName ?? (mobile ? styles.mobileNavigationList : styles.accountNavigationList)}>
        {destinations.map((destination) => (
          <li key={destination.id}>
            <Link
              aria-current={isDestinationCurrent(pathname, destination) ? 'page' : undefined}
              className={linkClassName ?? (mobile ? styles.mobileNavigationLink : styles.accountNavigationLink)}
              href={destination.href}
            >
              {destination.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
