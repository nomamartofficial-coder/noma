import { defineProtectedSurfaceMetadata, ProtectedPlaceholder } from '../../../../shells/protected/protected-placeholder';

export const generateMetadata = defineProtectedSurfaceMetadata('operations', { title: 'Seller operations' });

export default function Page() {
  return (
    <ProtectedPlaceholder
      surface="operations"
      breadcrumbs={[{ href: '/operations', label: 'Operations' }, { label: 'Seller operations' }]}
      context="Operations workspace"
      description="Seller operations will appear only after seller review and scoped staff authority are implemented."
      returnHref="/operations"
      returnLabel="Return to Operations overview"
      title="Seller operations"
    />
  );
}
