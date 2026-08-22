import { defineProtectedSurfaceMetadata, ProtectedPlaceholder } from '../../../../shells/protected/protected-placeholder';

export const generateMetadata = defineProtectedSurfaceMetadata('operations', { title: 'Verification operations' });

export default function Page() {
  return (
    <ProtectedPlaceholder
      surface="operations"
      breadcrumbs={[{ href: '/operations', label: 'Operations' }, { label: 'Verification operations' }]}
      context="Operations workspace"
      description="Verification work will appear only after evidence minimisation and reviewer authority are implemented."
      returnHref="/operations"
      returnLabel="Return to Operations overview"
      title="Verification operations"
    />
  );
}
