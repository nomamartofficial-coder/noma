import { defineProtectedSurfaceMetadata, ProtectedPlaceholder } from '../../../../shells/protected/protected-placeholder';

export const generateMetadata = defineProtectedSurfaceMetadata('seller', { title: 'Seller listings' });

export default function Page() {
  return (
    <ProtectedPlaceholder
      surface="seller"
      breadcrumbs={[{ href: '/seller', label: 'Seller' }, { label: 'Seller listings' }]}
      context="Seller Centre"
      description="Listing tools will appear only after catalogue contracts and seller-scoped authority are implemented."
      returnHref="/seller"
      returnLabel="Return to Seller overview"
      title="Seller listings"
    />
  );
}
