import { defineProtectedSurfaceMetadata, ProtectedPlaceholder } from '../../../shells/protected/protected-placeholder';

export const generateMetadata = defineProtectedSurfaceMetadata('rider', { title: 'Current rider work' });

export default function Page() {
  return (
    <ProtectedPlaceholder
      surface="rider"
      context="Rider workspace"
      description="Current work will appear only after assignment-scoped IAM and delivery workflows are implemented."
      returnHref="/rider"
      returnLabel="Return to current work"
      title="Current rider work"
    />
  );
}
