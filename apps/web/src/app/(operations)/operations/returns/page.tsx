import { defineProtectedSurfaceMetadata, ProtectedPlaceholder } from '../../../../shells/protected/protected-placeholder';

export const generateMetadata = defineProtectedSurfaceMetadata('operations', { title: 'Returns' });

export default function Page() {
  return (
    <ProtectedPlaceholder
      surface="operations"
      breadcrumbs={[{ href: '/operations', label: 'Operations' }, { label: 'Returns' }]}
      context="Operations workspace"
      description="Return work will appear only after return, custody, and consumer-rights workflows are implemented."
      returnHref="/operations"
      returnLabel="Return to Operations overview"
      title="Returns"
    />
  );
}
