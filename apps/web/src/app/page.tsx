export default function HomePage() {
  return (
    <main className="shell">
      <p className="eyebrow">Noma · Covenant pilot</p>
      <h1>Web runtime is online.</h1>
      <p>
        This is the DEV-002 application shell. Marketplace and role-specific features remain
        intentionally unimplemented.
      </p>
      <dl>
        <div><dt>Liveness</dt><dd><code>/health/live</code></dd></div>
        <div><dt>Readiness</dt><dd><code>/health/ready</code></dd></div>
      </dl>
    </main>
  );
}
