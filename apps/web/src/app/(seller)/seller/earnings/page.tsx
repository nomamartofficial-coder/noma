import { defineProtectedSurfaceMetadata, ProtectedPlaceholder } from '../../../../shells/protected/protected-placeholder';

export const generateMetadata = defineProtectedSurfaceMetadata('seller', { title: 'Seller earnings' });

export default function Page() {
  return (
    <ProtectedPlaceholder
      surface="seller"
      breadcrumbs={[{ href: '/seller', label: 'Seller' }, { label: 'Seller earnings' }]}
      context="Seller Centre"
      description="Earnings information will appear only after the ledger and seller financial-view controls are implemented."
      returnHref="/seller"
      returnLabel="Return to Seller overview"
      title="Seller earnings"
    />
  );
}
