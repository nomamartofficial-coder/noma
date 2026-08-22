import { Link } from '@noma/ui';

export default function NotFound() {
  return (
    <main id="main-content" style={{ margin: '0 auto', maxWidth: '48rem', padding: 'var(--noma-space-12) var(--noma-space-4)' }}>
      <h1>Page unavailable</h1>
      <p>The requested page is not available. No information about its existence or access state is shown.</p>
      <Link href="/" standalone>Return to the Marketplace</Link>
    </main>
  );
}
