import type { Metadata } from 'next';
import { StatusChip } from '@noma/ui';
import { MarketplaceSearch } from '../../shells/marketplace-search';
import { PlaceholderPage } from '../../shells/placeholder-page';
import styles from '../../shells/shells.module.css';

export const metadata: Metadata = { title: 'Marketplace' };

export default function MarketplacePage() {
  return (
    <PlaceholderPage
      context="Noma · Covenant University"
      description="Search and category discovery begin here. Eligible catalogue listings will appear only when the Marketplace and Search capabilities are connected."
      returnHref="/categories"
      returnLabel="Browse the category entry"
      title="Marketplace"
    >
      <div className={styles.contextStatus}><StatusChip tone="info">Covenant University pilot</StatusChip></div>
      <div className={styles.pageSearch}><MarketplaceSearch id="marketplace-page-search" /></div>
    </PlaceholderPage>
  );
}
