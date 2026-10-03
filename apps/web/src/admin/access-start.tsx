'use client';

import { useState, type FormEvent } from 'react';
import styles from './access-workspace.module.css';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function auth(operation: string, body?: object): Promise<Response> {
  return fetch(`/api/admin-access/${operation}`, {
    method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json', 'X-CSRF-Token': 'noma-admin-v1' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

export function AccessStart() {
  const [status, setStatus] = useState('Sign in with your existing Noma identity. Privileged access still requires independent provisioning.');
  const [busy, setBusy] = useState(false);
  const [scopeId, setScopeId] = useState('');
  const [authorityAssignmentId, setAuthorityAssignmentId] = useState('');

  async function run(action: () => Promise<string>) {
    setBusy(true); setStatus('Checking…');
    try { setStatus(await action()); }
    catch { setStatus('The request was unavailable. No access has been assumed.'); }
    finally { setBusy(false); }
  }

  function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    void run(async () => {
      const result = await auth('auth-sign-in', { email: data.get('email'), password: data.get('password') });
      form.reset();
      return result.ok ? 'Signed in. Complete recent MFA before entering Access.' : 'Sign-in was unavailable. Check credentials and retry.';
    });
  }

  function passwordStepUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    void run(async () => {
      const result = await auth('auth-step-up-password', { password: data.get('password') });
      form.reset();
      return result.ok ? 'Password proof accepted. Complete the MFA proof next.' : 'Password step-up was unavailable.';
    });
  }

  function totpStepUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    void run(async () => {
      const result = await auth('auth-step-up-totp', { token: data.get('token') });
      form.reset();
      return result.ok ? 'Recent MFA proof accepted. Enter your provisioned exact scope and assignment.' : 'MFA proof was unavailable.';
    });
  }

  return <main className={styles.workspace} id="main-content">
    <header className={styles.heading}><p>Noma Restricted Administration</p><h1>Access session</h1>
      <p>Use your own identity and a named, auditable Access assignment. No first-user or environment-admin shortcut exists.</p></header>
    <p role="status" aria-live="polite" className={styles.notice}>{busy ? 'Loading… ' : ''}{status}</p>
    <section className={styles.section} aria-labelledby="sign-in-title">
      <h2 id="sign-in-title">Sign in</h2>
      <form className={styles.form} onSubmit={signIn}>
        <label>Email <input type="email" name="email" autoComplete="username" required /></label>
        <label>Password <input type="password" name="password" autoComplete="current-password" required /></label>
        <button disabled={busy}>Sign in</button>
      </form>
      <button type="button" disabled={busy} onClick={() => void run(async () => {
        const response = await auth('auth-session');
        return response.ok ? 'Your Noma session is active.' : 'No active Noma session is available.';
      })}>Check session</button>
    </section>
    <section className={styles.section} aria-labelledby="step-up-title">
      <h2 id="step-up-title">Recent privileged authentication</h2>
      <button type="button" disabled={busy} onClick={() => void run(async () => {
        const response = await auth('auth-step-up-request', {});
        return response.ok ? 'Step-up requested. Complete password and MFA proofs.' : 'Step-up is unavailable for this session.';
      })}>Request step-up</button>
      <form className={styles.form} onSubmit={passwordStepUp}>
        <label>Confirm password <input type="password" name="password" autoComplete="current-password" required /></label>
        <button disabled={busy}>Submit password proof</button>
      </form>
      <form className={styles.form} onSubmit={totpStepUp}>
        <label>Authenticator code <input type="text" name="token" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" required /></label>
        <button disabled={busy}>Submit MFA proof</button>
      </form>
    </section>
    <section className={styles.section} aria-labelledby="scope-title">
      <h2 id="scope-title">Enter the exact provisioned scope</h2>
      <p>The scope and Access assignment IDs come from the separately approved provisioning record; they do not grant access by themselves.</p>
      <form className={styles.form} onSubmit={(event) => {
        event.preventDefault();
        if (!UUID.test(scopeId) || !UUID.test(authorityAssignmentId)) { setStatus('Enter valid exact IDs from the provisioning record.'); return; }
        void run(async () => {
          const response = await fetch('/api/admin-access/select-scope', {
            method: 'POST', credentials: 'same-origin', cache: 'no-store',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'noma-admin-v1' },
            body: JSON.stringify({ scopeId, authorityAssignmentId }),
          });
          if (!response.ok) return 'The exact scope could not be selected.';
          window.location.assign('/admin/access');
          return 'Opening authorized Access workspace…';
        });
      }}>
        <label>Scope ID <input value={scopeId} onChange={(event) => setScopeId(event.target.value)} required maxLength={36} /></label>
        <label>Access assignment ID <input value={authorityAssignmentId} onChange={(event) => setAuthorityAssignmentId(event.target.value)} required maxLength={36} /></label>
        <button disabled={busy}>Open authorized Access workspace</button>
      </form>
    </section>
  </main>;
}
