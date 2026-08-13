import type { Metadata } from 'next';
import { PlaceholderPage } from '../../../shells/placeholder-page';

export const metadata: Metadata = { title: 'My account' };

export default function AccountPage() {
  return <PlaceholderPage context="My account" description="Active account obligations will appear here when Buyer services are connected. This shell does not query account data." title="Overview" />;
}
