import type { Metadata } from 'next';
import { MarketplaceSearch } from '../../../shells/marketplace-search';
import { PlaceholderPage } from '../../../shells/placeholder-page';
import styles from '../../../shells/shells.module.css';

export const metadata: Metadata = { title: 'Search' };

export default function SearchPage() {
  return (
    <PlaceholderPage context="Marketplace" description="Marketplace search results will appear here when Search is connected." title="Search">
      <div className={styles.pageSearch}><MarketplaceSearch id="marketplace-results-search" /></div>
    </PlaceholderPage>
  );
}
