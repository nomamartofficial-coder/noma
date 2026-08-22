import { defineProtectedSurfaceMetadata, ProtectedPlaceholder } from '../../../../shells/protected/protected-placeholder';

export const generateMetadata = defineProtectedSurfaceMetadata('admin', { title: 'Institutions' });

export default function Page() {
  return (
    <ProtectedPlaceholder
      surface="admin"
      breadcrumbs={[{ href: '/admin', label: 'Administration' }, { label: 'Institutions' }]}
      context="Restricted administration"
      description="Institution configuration will appear only after scoped administration and review controls are implemented."
      returnHref="/admin"
      returnLabel="Return to Administration overview"
      title="Institutions"
    />
  );
}
