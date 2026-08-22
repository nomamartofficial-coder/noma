import { defineProtectedSurfaceMetadata, ProtectedPlaceholder } from '../../../../shells/protected/protected-placeholder';

export const generateMetadata = defineProtectedSurfaceMetadata('operations', { title: 'Finance operations' });

export default function Page() {
  return (
    <ProtectedPlaceholder
      surface="operations"
      breadcrumbs={[{ href: '/operations', label: 'Operations' }, { label: 'Finance operations' }]}
      context="Operations workspace"
      description="Finance work will appear only after financial separation of duty and provider-truth controls are implemented."
      returnHref="/operations"
      returnLabel="Return to Operations overview"
      title="Finance operations"
    />
  );
}
