import type { Metadata } from 'next';
import { PlaceholderPage } from '../../../../shells/placeholder-page';

export const metadata: Metadata = { title: 'Orders' };
export default function OrdersPage() {
  return <PlaceholderPage context="My account" description="Order history will appear here when Buyer order functionality is implemented." returnHref="/account" returnLabel="Back to account overview" title="Orders" />;
}
