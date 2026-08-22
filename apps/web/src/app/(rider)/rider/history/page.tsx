import { defineProtectedSurfaceMetadata, ProtectedPlaceholder } from '../../../../shells/protected/protected-placeholder';

export const generateMetadata = defineProtectedSurfaceMetadata('rider', { title: 'Rider history' });

export default function Page() {
  return (
    <ProtectedPlaceholder
      surface="rider"
      context="Rider workspace"
      description="Rider history will appear only after assignment-scoped delivery records and privacy controls are implemented."
      returnHref="/rider"
      returnLabel="Return to current work"
      title="Rider history"
    />
  );
}
