import { defineProtectedSurfaceMetadata, ProtectedPlaceholder } from '../../../../shells/protected/protected-placeholder';

export const generateMetadata = defineProtectedSurfaceMetadata('seller', { title: 'Seller messages' });

export default function Page() {
  return (
    <ProtectedPlaceholder
      surface="seller"
      breadcrumbs={[{ href: '/seller', label: 'Seller' }, { label: 'Seller messages' }]}
      context="Seller Centre"
      description="Seller messaging will appear only after scoped conversation and privacy controls are implemented."
      returnHref="/seller"
      returnLabel="Return to Seller overview"
      title="Seller messages"
    />
  );
}
