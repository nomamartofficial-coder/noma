import { defineProtectedSurfaceMetadata, ProtectedPlaceholder } from '../../../../shells/protected/protected-placeholder';

export const generateMetadata = defineProtectedSurfaceMetadata('operations', { title: 'Support' });

export default function Page() {
  return (
    <ProtectedPlaceholder
      surface="operations"
      breadcrumbs={[{ href: '/operations', label: 'Operations' }, { label: 'Support' }]}
      context="Operations workspace"
      description="Support work will appear only after scoped case and customer-data controls are implemented."
      returnHref="/operations"
      returnLabel="Return to Operations overview"
      title="Support"
    />
  );
}
