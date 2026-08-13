import type { ReactNode } from 'react';
import { ActiveNavigation } from '../../shells/active-navigation';
import { ConsumerHeader } from '../../shells/consumer-header';
import { mobileDestinations } from '../../shells/navigation';
import { PublicFooter } from '../../shells/public-footer';
import styles from '../../shells/shells.module.css';

export default function MarketplaceLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className={styles.consumerShell}>
      <a className={styles.skipLink} href="#main-content">Skip to main content</a>
      <ConsumerHeader />
      <main className={styles.mainContent} id="main-content">{children}</main>
      <PublicFooter />
      <ActiveNavigation destinations={mobileDestinations} label="Primary mobile" mobile />
    </div>
  );
}
