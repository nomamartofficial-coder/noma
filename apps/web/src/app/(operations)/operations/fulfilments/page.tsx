import { defineProtectedSurfaceMetadata, ProtectedPlaceholder } from '../../../../shells/protected/protected-placeholder';

export const generateMetadata = defineProtectedSurfaceMetadata('operations', { title: 'Operations fulfilments' });

export default function Page() {
  return (
    <ProtectedPlaceholder
      surface="operations"
      breadcrumbs={[{ href: '/operations', label: 'Operations' }, { label: 'Operations fulfilments' }]}
      context="Operations workspace"
      description="Fulfilment queues will appear only after authoritative fulfilment workflows are implemented."
      returnHref="/operations"
      returnLabel="Return to Operations overview"
      title="Operations fulfilments"
    />
  );
}
