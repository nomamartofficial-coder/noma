import { defineProtectedSurfaceMetadata, ProtectedPlaceholder } from '../../../../shells/protected/protected-placeholder';

export const generateMetadata = defineProtectedSurfaceMetadata('admin', { title: 'System configuration' });

export default function Page() {
  return (
    <ProtectedPlaceholder
      surface="admin"
      breadcrumbs={[{ href: '/admin', label: 'Administration' }, { label: 'System configuration' }]}
      context="Restricted administration"
      description="System configuration will appear only after privileged scope, review, and rollback controls are implemented."
      returnHref="/admin"
      returnLabel="Return to Administration overview"
      title="System configuration"
    />
  );
}
