import { defineProtectedSurfaceMetadata, ProtectedPlaceholder } from '../../../../shells/protected/protected-placeholder';

export const generateMetadata = defineProtectedSurfaceMetadata('seller', { title: 'Seller payouts' });

export default function Page() {
  return (
    <ProtectedPlaceholder
      surface="seller"
      breadcrumbs={[{ href: '/seller', label: 'Seller' }, { label: 'Seller payouts' }]}
      context="Seller Centre"
      description="Payout information will appear only after payout, verification, and financial authority controls are implemented."
      returnHref="/seller"
      returnLabel="Return to Seller overview"
      title="Seller payouts"
    />
  );
}
