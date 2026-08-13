import type { Metadata } from 'next';
import { PlaceholderPage } from '../../../../../shells/placeholder-page';

export const metadata: Metadata = { title: 'Verification' };
export default function VerificationPage() {
  return <PlaceholderPage context="My account" description="Covenant verification information will appear here when Identity and Institution verification are connected." returnHref="/account" returnLabel="Back to account overview" title="Verification" />;
}
