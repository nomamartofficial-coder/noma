import type { ReactNode } from 'react';
import { ActiveNavigation } from '../../active-navigation';
import { CompactShellNavigation } from '../compact-shell-navigation';
import sharedStyles from '../protected-shells.module.css';
import type { AdminDestination } from './navigation';
import styles from './admin.module.css';

export interface AdminReviewPresentation {
  readonly approval: string;
  readonly consequence: string;
  readonly currentValue: string;
  readonly proposedValue: string;
  readonly reason: string;
  readonly scope: string;
  readonly title: string;
}

export function AdminReviewFrame({ presentation }: Readonly<{ presentation: AdminReviewPresentation }>) {
  return (
    <section className={styles.reviewFrame} aria-labelledby="admin-review-title">
      <header><p>Configuration review</p><h1 id="admin-review-title">{presentation.title}</h1></header>
      <dl><div><dt>Scope</dt><dd>{presentation.scope}</dd></div><div><dt>Current</dt><dd>{presentation.currentValue}</dd></div><div><dt>Proposed</dt><dd>{presentation.proposedValue}</dd></div><div><dt>Consequence</dt><dd>{presentation.consequence}</dd></div><div><dt>Approval</dt><dd>{presentation.approval}</dd></div><div><dt>Reason</dt><dd>{presentation.reason}</dd></div></dl>
    </section>
  );
}

export function AdminShell({ children, destinations, scopeLabel }: Readonly<{
  children: ReactNode;
  destinations: readonly AdminDestination[];
  scopeLabel?: string;
}>) {
  return (
    <div className={styles.shell} data-noma-protected-shell="admin">
      <a className={sharedStyles.skipLink} href="#main-content">Skip to main content</a>
      <header className={styles.header}><div><p className={styles.brand}>Noma Restricted Administration</p>{scopeLabel && <p className={styles.scope}>{scopeLabel}</p>}</div><CompactShellNavigation destinations={destinations} label="Administration sections" /></header>
      <div className={styles.layout}>
        <aside className={styles.rail}><ActiveNavigation className={styles.navigation} destinations={destinations} label="Administration sections" linkClassName={styles.navigationLink} listClassName={styles.navigationList} /></aside>
        <main className={styles.main} id="main-content">{children}</main>
      </div>
    </div>
  );
}
