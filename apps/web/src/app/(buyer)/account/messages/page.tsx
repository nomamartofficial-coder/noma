import type { Metadata } from 'next';
import { PlaceholderPage } from '../../../../shells/placeholder-page';

export const metadata: Metadata = { title: 'Messages' };
export default function MessagesPage() {
  return <PlaceholderPage context="My account" description="Protected order and support conversations will appear here when Messaging is connected." returnHref="/account" returnLabel="Back to account overview" title="Messages" />;
}
