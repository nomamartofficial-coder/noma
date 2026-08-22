import { defineProtectedSurfaceMetadata, ProtectedPlaceholder } from '../../../../shells/protected/protected-placeholder';

export const generateMetadata = defineProtectedSurfaceMetadata('operations', { title: 'Dispatch' });

export default function Page() {
  return (
    <ProtectedPlaceholder
      surface="operations"
      breadcrumbs={[{ href: '/operations', label: 'Operations' }, { label: 'Dispatch' }]}
      context="Operations workspace"
      description="Dispatch work will appear only after assignment, capacity, concurrency, and audit controls are implemented."
      returnHref="/operations"
      returnLabel="Return to Operations overview"
      title="Dispatch"
    />
  );
}
