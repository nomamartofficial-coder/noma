import { defineProtectedSurfaceMetadata, ProtectedPlaceholder } from '../../../../shells/protected/protected-placeholder';

export const generateMetadata = defineProtectedSurfaceMetadata('rider', { title: 'Rider shift' });

export default function Page() {
  return (
    <ProtectedPlaceholder
      surface="rider"
      context="Rider workspace"
      description="Shift controls will appear only after rider membership, capacity, and operating controls are implemented."
      returnHref="/rider"
      returnLabel="Return to current work"
      title="Rider shift"
    />
  );
}
