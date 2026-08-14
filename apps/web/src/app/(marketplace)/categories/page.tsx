import type { Metadata } from 'next';
import { PlaceholderPage } from '../../../shells/placeholder-page';

export const metadata: Metadata = { title: 'Categories' };

export default function CategoriesPage() {
  return <PlaceholderPage context="Marketplace" description="Active catalogue categories will appear here when Catalogue and Search are connected." title="Categories" />;
}
