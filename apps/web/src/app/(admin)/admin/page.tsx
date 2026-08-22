import { defineProtectedSurfaceMetadata, ProtectedPlaceholder } from '../../../shells/protected/protected-placeholder';

export const generateMetadata = defineProtectedSurfaceMetadata('admin', { title: 'Administration overview' });

export default function Page() {
  return (
    <ProtectedPlaceholder
      surface="admin"
      context="Restricted administration"
      description="Restricted configuration areas will appear only after privileged IAM supplies an explicit scoped access decision."
      returnHref="/admin"
      returnLabel="Return to Administration overview"
      title="Administration overview"
    />
  );
}
