import { Link } from '@noma/ui';
import { productionSurfaceDestinations } from './navigation';
import { MarketplaceSearch } from './marketplace-search';
import { SurfaceSwitcher } from './surface-switcher';
import styles from './shells.module.css';

export function ConsumerHeader() {
  return (
    <header className={styles.consumerHeader}>
      <div className={styles.headerIdentity}>
        <Link className={styles.brand} href="/">Noma</Link>
        <span className={styles.institution}>Covenant University</span>
      </div>
      <div className={styles.headerSearch}>
        <MarketplaceSearch />
      </div>
      <nav aria-label="Marketplace" className={styles.headerNavigation}>
        <Link className={styles.headerLink} href="/categories">Categories</Link>
        <Link className={styles.headerLink} href="/cart">Cart</Link>
      </nav>
      <SurfaceSwitcher destinations={productionSurfaceDestinations} />
    </header>
  );
}
