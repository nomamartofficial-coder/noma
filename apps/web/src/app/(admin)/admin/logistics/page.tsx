import { defineProtectedSurfaceMetadata, ProtectedPlaceholder } from '../../../../shells/protected/protected-placeholder';

export const generateMetadata = defineProtectedSurfaceMetadata('admin', { title: 'Logistics configuration' });

export default function Page() {
  return (
    <ProtectedPlaceholder
      surface="admin"
      breadcrumbs={[{ href: '/admin', label: 'Administration' }, { label: 'Logistics configuration' }]}
      context="Restricted administration"
      description="Logistics configuration will appear only after scoped configuration and change-review controls are implemented."
      returnHref="/admin"
      returnLabel="Return to Administration overview"
      title="Logistics configuration"
    />
  );
}
