import type { Metadata } from 'next';
import { PlaceholderPage } from '../../../../shells/placeholder-page';

export const metadata: Metadata = { title: 'Refunds' };
export default function RefundsPage() {
  return <PlaceholderPage context="My account" description="Authoritative refund status will appear here when the Refund capability is connected." returnHref="/account" returnLabel="Back to account overview" title="Refunds" />;
}
