import type { Metadata } from 'next';
import { PlaceholderPage } from '../../../../shells/placeholder-page';

export const metadata: Metadata = { title: 'Profile and security' };
export default function ProfilePage() {
  return <PlaceholderPage context="My account" description="Profile and security entry points will appear here when Identity and Account Security are implemented." returnHref="/account" returnLabel="Back to account overview" title="Profile & Security" />;
}
