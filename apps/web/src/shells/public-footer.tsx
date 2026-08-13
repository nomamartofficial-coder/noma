import { Link } from '@noma/ui';
import styles from './shells.module.css';

export function PublicFooter() {
  return (
    <footer className={styles.publicFooter}>
      <div>
        <p className={styles.footerBrand}>Noma</p>
        <p className={styles.footerCopy}>Controlled Covenant University marketplace pilot.</p>
      </div>
      <nav aria-label="Footer" className={styles.footerNavigation}>
        <div>
          <p className={styles.footerHeading}>Shop</p>
          <Link href="/categories">Categories</Link>
        </div>
        <div>
          <p className={styles.footerHeading}>Help</p>
          <span>Buyer protection</span>
          <span>Returns and refunds</span>
        </div>
        <div>
          <p className={styles.footerHeading}>Legal</p>
          <span>Policies</span>
        </div>
      </nav>
    </footer>
  );
}
