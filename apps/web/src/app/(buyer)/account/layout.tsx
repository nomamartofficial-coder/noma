import type { ReactNode } from 'react';
import { ActiveNavigation } from '../../../shells/active-navigation';
import { CompactAccountNavigation } from '../../../shells/compact-account-navigation';
import { ConsumerHeader } from '../../../shells/consumer-header';
import { accountDestinations, mobileDestinations } from '../../../shells/navigation';
import styles from '../../../shells/shells.module.css';

export default function AccountLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className={styles.consumerShell}>
      <a className={styles.skipLink} href="#main-content">Skip to main content</a>
      <ConsumerHeader />
      <section aria-labelledby="account-surface-title" className={styles.accountHeader}>
        <p className={styles.accountContextLabel}>Consumer account</p>
        <p className={styles.accountContextTitle} id="account-surface-title">My account</p>
        <CompactAccountNavigation />
      </section>
      <div className={styles.accountGrid}>
        <aside className={styles.accountRail}>
          <ActiveNavigation destinations={accountDestinations} label="Account sections" />
        </aside>
        <main className={styles.accountMain} id="main-content">{children}</main>
      </div>
      <ActiveNavigation destinations={mobileDestinations} label="Primary mobile" mobile />
    </div>
  );
}
