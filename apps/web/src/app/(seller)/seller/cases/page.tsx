import { defineProtectedSurfaceMetadata, ProtectedPlaceholder } from '../../../../shells/protected/protected-placeholder';

export const generateMetadata = defineProtectedSurfaceMetadata('seller', { title: 'Seller cases' });

export default function Page() {
  return (
    <ProtectedPlaceholder
      surface="seller"
      breadcrumbs={[{ href: '/seller', label: 'Seller' }, { label: 'Seller cases' }]}
      context="Seller Centre"
      description="Case work will appear only after protection workflows and seller-scoped evidence access are implemented."
      returnHref="/seller"
      returnLabel="Return to Seller overview"
      title="Seller cases"
    />
  );
}
