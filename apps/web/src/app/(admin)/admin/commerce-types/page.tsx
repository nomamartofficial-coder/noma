import { defineProtectedSurfaceMetadata, ProtectedPlaceholder } from '../../../../shells/protected/protected-placeholder';

export const generateMetadata = defineProtectedSurfaceMetadata('admin', { title: 'Commerce features' });

export default function Page() {
  return (
    <ProtectedPlaceholder
      surface="admin"
      breadcrumbs={[{ href: '/admin', label: 'Administration' }, { label: 'Commerce features' }]}
      context="Restricted administration"
      description="Commerce feature configuration will appear only after activation evidence and approval controls are implemented."
      returnHref="/admin"
      returnLabel="Return to Administration overview"
      title="Commerce features"
    />
  );
}
