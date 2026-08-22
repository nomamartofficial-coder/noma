import { defineProtectedSurfaceMetadata, ProtectedPlaceholder } from '../../../../shells/protected/protected-placeholder';

export const generateMetadata = defineProtectedSurfaceMetadata('admin', { title: 'Categories and policies' });

export default function Page() {
  return (
    <ProtectedPlaceholder
      surface="admin"
      breadcrumbs={[{ href: '/admin', label: 'Administration' }, { label: 'Categories and policies' }]}
      context="Restricted administration"
      description="Category and policy configuration will appear only after governed change and review controls are implemented."
      returnHref="/admin"
      returnLabel="Return to Administration overview"
      title="Categories and policies"
    />
  );
}
