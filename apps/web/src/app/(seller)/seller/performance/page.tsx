import { defineProtectedSurfaceMetadata, ProtectedPlaceholder } from '../../../../shells/protected/protected-placeholder';

export const generateMetadata = defineProtectedSurfaceMetadata('seller', { title: 'Seller performance' });

export default function Page() {
  return (
    <ProtectedPlaceholder
      surface="seller"
      breadcrumbs={[{ href: '/seller', label: 'Seller' }, { label: 'Seller performance' }]}
      context="Seller Centre"
      description="Performance information will appear only after governed measures and seller-scoped review are implemented."
      returnHref="/seller"
      returnLabel="Return to Seller overview"
      title="Seller performance"
    />
  );
}
