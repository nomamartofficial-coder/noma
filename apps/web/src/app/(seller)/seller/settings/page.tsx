import { defineProtectedSurfaceMetadata, ProtectedPlaceholder } from '../../../../shells/protected/protected-placeholder';

export const generateMetadata = defineProtectedSurfaceMetadata('seller', { title: 'Store settings' });

export default function Page() {
  return (
    <ProtectedPlaceholder
      surface="seller"
      breadcrumbs={[{ href: '/seller', label: 'Seller' }, { label: 'Store settings' }]}
      context="Seller Centre"
      description="Store settings will appear only after seller membership and configuration authority are implemented."
      returnHref="/seller"
      returnLabel="Return to Seller overview"
      title="Store settings"
    />
  );
}
