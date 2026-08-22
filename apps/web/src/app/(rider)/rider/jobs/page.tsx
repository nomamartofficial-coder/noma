import { defineProtectedSurfaceMetadata, ProtectedPlaceholder } from '../../../../shells/protected/protected-placeholder';

export const generateMetadata = defineProtectedSurfaceMetadata('rider', { title: 'Available and assigned jobs' });

export default function Page() {
  return (
    <ProtectedPlaceholder
      surface="rider"
      context="Rider workspace"
      description="Job availability and assignment will appear only after dispatch authority and capacity controls are implemented."
      returnHref="/rider"
      returnLabel="Return to current work"
      title="Available and assigned jobs"
    />
  );
}
