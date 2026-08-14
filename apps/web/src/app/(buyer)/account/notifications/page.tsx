import type { Metadata } from 'next';
import { PlaceholderPage } from '../../../../shells/placeholder-page';

export const metadata: Metadata = { title: 'Notifications' };
export default function NotificationsPage() {
  return <PlaceholderPage context="My account" description="Account notifications will appear here when the Notification capability is connected." returnHref="/account" returnLabel="Back to account overview" title="Notifications" />;
}
