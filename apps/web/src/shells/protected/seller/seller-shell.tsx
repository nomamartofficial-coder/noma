import type { ReactNode } from 'react';
import { ActiveNavigation } from '../../active-navigation';
import { CompactShellNavigation } from '../compact-shell-navigation';
import sharedStyles from '../protected-shells.module.css';
import { sellerDestinations } from './navigation';
import styles from './seller.module.css';

export interface SellerContextPresentation {
  readonly sellerLabel: string;
  readonly scopeLabel: string;
}

export function SellerShell({ children, context }: Readonly<{
  children: ReactNode;
  context?: SellerContextPresentation;
}>) {
  return (
    <div className={styles.shell} data-noma-protected-shell="seller">
      <a className={sharedStyles.skipLink} href="#main-content">Skip to main content</a>
      <header className={styles.header}>
        <div>
          <p className={styles.brand}>Noma</p>
          <p className={styles.surface}>Seller Centre</p>
        </div>
        {context && (
          <div className={styles.context} aria-label="Seller context">
            <strong>{context.sellerLabel}</strong>
            <span>{context.scopeLabel}</span>
          </div>
        )}
        <CompactShellNavigation destinations={sellerDestinations} label="Seller sections" />
      </header>
      <div className={styles.layout}>
        <aside className={styles.rail}>
          <ActiveNavigation
            className={styles.navigation}
            destinations={sellerDestinations}
            label="Seller sections"
            linkClassName={styles.navigationLink}
            listClassName={styles.navigationList}
          />
        </aside>
        <main className={styles.main} id="main-content">{children}</main>
      </div>
    </div>
  );
}
