import { Link, StatusChip } from '@noma/ui';

export default function HomePage() {
  return (
    <main className="shell">
      <p className="eyebrow">Noma · Covenant pilot</p>
      <StatusChip tone="info">Runtime scaffold only</StatusChip>
      <h1>Web runtime is online.</h1>
      <p>
        This is the DEV-002 application shell. Marketplace and role-specific features remain
        intentionally unimplemented.
      </p>
      <dl>
        <div><dt>Liveness</dt><dd><Link href="/health/live"><code>/health/live</code></Link></dd></div>
        <div><dt>Readiness</dt><dd><Link href="/health/ready"><code>/health/ready</code></Link></dd></div>
      </dl>
    </main>
  );
}
