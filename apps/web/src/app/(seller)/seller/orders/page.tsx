import { defineProtectedSurfaceMetadata, ProtectedPlaceholder } from '../../../../shells/protected/protected-placeholder';

export const generateMetadata = defineProtectedSurfaceMetadata('seller', { title: 'Seller orders' });

export default function Page() {
  return (
    <ProtectedPlaceholder
      surface="seller"
      breadcrumbs={[{ href: '/seller', label: 'Seller' }, { label: 'Seller orders' }]}
      context="Seller Centre"
      description="Seller order work will appear only after seller scope, order authority, and the owning workflow are implemented."
      returnHref="/seller"
      returnLabel="Return to Seller overview"
      title="Seller orders"
    />
  );
}
