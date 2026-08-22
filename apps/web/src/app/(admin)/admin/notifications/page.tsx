import { defineProtectedSurfaceMetadata, ProtectedPlaceholder } from '../../../../shells/protected/protected-placeholder';

export const generateMetadata = defineProtectedSurfaceMetadata('admin', { title: 'Notifications and templates' });

export default function Page() {
  return (
    <ProtectedPlaceholder
      surface="admin"
      breadcrumbs={[{ href: '/admin', label: 'Administration' }, { label: 'Notifications and templates' }]}
      context="Restricted administration"
      description="Notification configuration will appear only after approved templates and privacy controls are implemented."
      returnHref="/admin"
      returnLabel="Return to Administration overview"
      title="Notifications and templates"
    />
  );
}
