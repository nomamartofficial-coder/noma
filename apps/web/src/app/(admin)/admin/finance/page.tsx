import { defineProtectedSurfaceMetadata, ProtectedPlaceholder } from '../../../../shells/protected/protected-placeholder';

export const generateMetadata = defineProtectedSurfaceMetadata('admin', { title: 'Payment and payout configuration' });

export default function Page() {
  return (
    <ProtectedPlaceholder
      surface="admin"
      breadcrumbs={[{ href: '/admin', label: 'Administration' }, { label: 'Payment and payout configuration' }]}
      context="Restricted administration"
      description="Financial configuration will appear only after privileged assurance and separation-of-duty controls are implemented."
      returnHref="/admin"
      returnLabel="Return to Administration overview"
      title="Payment and payout configuration"
    />
  );
}
