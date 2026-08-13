import type { Metadata } from 'next';
import { PlaceholderPage } from '../../../shells/placeholder-page';

export const metadata: Metadata = { title: 'Cart' };

export default function CartPage() {
  return <PlaceholderPage context="Marketplace" description="Cart functionality is not active in this shell task." title="Cart" />;
}
