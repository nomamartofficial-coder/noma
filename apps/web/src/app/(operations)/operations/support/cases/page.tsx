import { defineProtectedSurfaceMetadata, ProtectedPlaceholder } from '../../../../../shells/protected/protected-placeholder';

export const generateMetadata = defineProtectedSurfaceMetadata('operations', { title: 'Protection cases' });

export default function Page() {
  return (
    <ProtectedPlaceholder
      surface="operations"
      breadcrumbs={[{ href: '/operations', label: 'Operations' }, { label: 'Protection cases' }]}
      context="Operations workspace"
      description="Protection cases will appear only after case authority, evidence privacy, and audit controls are implemented."
      returnHref="/operations"
      returnLabel="Return to Operations overview"
      title="Protection cases"
    />
  );
}
