import { defineProtectedSurfaceMetadata, ProtectedPlaceholder } from '../../../../shells/protected/protected-placeholder';

export const generateMetadata = defineProtectedSurfaceMetadata('seller', { title: 'Seller inventory' });

export default function Page() {
  return (
    <ProtectedPlaceholder
      surface="seller"
      breadcrumbs={[{ href: '/seller', label: 'Seller' }, { label: 'Seller inventory' }]}
      context="Seller Centre"
      description="Inventory tools will appear only after authoritative inventory and seller-scoped controls are implemented."
      returnHref="/seller"
      returnLabel="Return to Seller overview"
      title="Seller inventory"
    />
  );
}
