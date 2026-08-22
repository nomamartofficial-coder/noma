import { defineProtectedSurfaceMetadata, ProtectedPlaceholder } from '../../../shells/protected/protected-placeholder';

export const generateMetadata = defineProtectedSurfaceMetadata('seller', { title: 'Seller overview' });

export default function Page() {
  return (
    <ProtectedPlaceholder
      surface="seller"
      context="Seller Centre"
      description="The Seller Centre shell is prepared for future seller-scoped information after IAM and seller workflows are implemented."
      returnHref="/seller"
      returnLabel="Return to Seller overview"
      title="Seller overview"
    />
  );
}
