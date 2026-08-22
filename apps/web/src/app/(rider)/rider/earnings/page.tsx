import { defineProtectedSurfaceMetadata, ProtectedPlaceholder } from '../../../../shells/protected/protected-placeholder';

export const generateMetadata = defineProtectedSurfaceMetadata('rider', { title: 'Rider earnings' });

export default function Page() {
  return (
    <ProtectedPlaceholder
      surface="rider"
      context="Rider workspace"
      description="Earnings information will appear only after the approved rider compensation workflow is implemented."
      returnHref="/rider"
      returnLabel="Return to current work"
      title="Rider earnings"
    />
  );
}
