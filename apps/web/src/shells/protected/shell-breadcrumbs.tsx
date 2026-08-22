import { Link } from '@noma/ui';
import styles from './protected-shells.module.css';

export interface ShellBreadcrumbItem {
  readonly href?: string;
  readonly label: string;
}

export function ShellBreadcrumbs({ items, label = 'Breadcrumbs' }: Readonly<{
  items: readonly ShellBreadcrumbItem[];
  label?: string;
}>) {
  return (
    <nav aria-label={label} className={styles.breadcrumbs}>
      <ol>
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`}>
            {item.href ? <Link href={item.href}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
