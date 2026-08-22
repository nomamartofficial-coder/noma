import { defineProtectedSurfaceMetadata, ProtectedPlaceholder } from '../../../../shells/protected/protected-placeholder';

export const generateMetadata = defineProtectedSurfaceMetadata('admin', { title: 'Audit' });

export default function Page() {
  return (
    <ProtectedPlaceholder
      surface="admin"
      breadcrumbs={[{ href: '/admin', label: 'Administration' }, { label: 'Audit' }]}
      context="Restricted administration"
      description="Audit review will appear only after immutable event access and export policy are implemented."
      returnHref="/admin"
      returnLabel="Return to Administration overview"
      title="Audit"
    />
  );
}
