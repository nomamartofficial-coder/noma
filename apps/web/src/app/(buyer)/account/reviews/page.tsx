import type { Metadata } from 'next';
import { PlaceholderPage } from '../../../../shells/placeholder-page';

export const metadata: Metadata = { title: 'Reviews' };
export default function ReviewsPage() {
  return <PlaceholderPage context="My account" description="Verified review eligibility and history will appear here when Reviews is implemented." returnHref="/account" returnLabel="Back to account overview" title="Reviews" />;
}
