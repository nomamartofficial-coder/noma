import { defineProtectedSurfaceMetadata, ProtectedPlaceholder } from '../../../../shells/protected/protected-placeholder';

export const generateMetadata = defineProtectedSurfaceMetadata('admin', { title: 'Access and roles' });

export default function Page() {
  return (
    <ProtectedPlaceholder
      surface="admin"
      breadcrumbs={[{ href: '/admin', label: 'Administration' }, { label: 'Access and roles' }]}
      context="Restricted administration"
      description="Access administration will appear only after privileged MFA, maker-checker, and revocation controls are implemented."
      returnHref="/admin"
      returnLabel="Return to Administration overview"
      title="Access and roles"
    />
  );
}
