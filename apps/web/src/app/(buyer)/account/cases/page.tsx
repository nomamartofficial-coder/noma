import type { Metadata } from 'next';
import { PlaceholderPage } from '../../../../shells/placeholder-page';

export const metadata: Metadata = { title: 'Returns and cases' };
export default function CasesPage() {
  return <PlaceholderPage context="My account" description="Return and protection-case tools will appear here when their authoritative workflows are implemented." returnHref="/account" returnLabel="Back to account overview" title="Returns & Cases" />;
}
