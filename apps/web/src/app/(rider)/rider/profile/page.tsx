import { defineProtectedSurfaceMetadata, ProtectedPlaceholder } from '../../../../shells/protected/protected-placeholder';

export const generateMetadata = defineProtectedSurfaceMetadata('rider', { title: 'Rider profile' });

export default function Page() {
  return (
    <ProtectedPlaceholder
      surface="rider"
      context="Rider workspace"
      description="Profile information will appear only after rider identity and field-level privacy controls are implemented."
      returnHref="/rider"
      returnLabel="Return to current work"
      title="Rider profile"
    />
  );
}
