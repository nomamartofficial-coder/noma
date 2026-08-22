import { defineProtectedSurfaceMetadata, ProtectedPlaceholder } from '../../../../shells/protected/protected-placeholder';

export const generateMetadata = defineProtectedSurfaceMetadata('admin', { title: 'Seller activation controls' });

export default function Page() {
  return (
    <ProtectedPlaceholder
      surface="admin"
      breadcrumbs={[{ href: '/admin', label: 'Administration' }, { label: 'Seller activation controls' }]}
      context="Restricted administration"
      description="Seller activation controls will appear only after approval separation and audit workflows are implemented."
      returnHref="/admin"
      returnLabel="Return to Administration overview"
      title="Seller activation controls"
    />
  );
}
