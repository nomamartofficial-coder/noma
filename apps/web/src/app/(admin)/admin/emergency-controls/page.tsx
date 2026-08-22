import { defineProtectedSurfaceMetadata, ProtectedPlaceholder } from '../../../../shells/protected/protected-placeholder';

export const generateMetadata = defineProtectedSurfaceMetadata('admin', { title: 'Emergency controls' });

export default function Page() {
  return (
    <ProtectedPlaceholder
      surface="admin"
      breadcrumbs={[{ href: '/admin', label: 'Administration' }, { label: 'Emergency controls' }]}
      context="Restricted administration"
      description="Emergency controls will appear only after high-assurance approval, containment, and restart authority are implemented."
      returnHref="/admin"
      returnLabel="Return to Administration overview"
      title="Emergency controls"
    />
  );
}
