import { defineProtectedSurfaceMetadata, ProtectedPlaceholder } from '../../../../shells/protected/protected-placeholder';

export const generateMetadata = defineProtectedSurfaceMetadata('seller', { title: 'Seller fulfilment' });

export default function Page() {
  return (
    <ProtectedPlaceholder
      surface="seller"
      breadcrumbs={[{ href: '/seller', label: 'Seller' }, { label: 'Seller fulfilment' }]}
      context="Seller Centre"
      description="Fulfilment work will appear only after order, inventory, and handoff controls are implemented."
      returnHref="/seller"
      returnLabel="Return to Seller overview"
      title="Seller fulfilment"
    />
  );
}
