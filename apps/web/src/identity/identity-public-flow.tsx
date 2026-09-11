'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { publicEnvironment } from '../config/public-environment';

const API_BASE = publicEnvironment.apiBaseUrl;

function removeTokenFromAddress(): void {
  window.history.replaceState(null, '', window.location.pathname);
}

function readTokenFromAddress(): string | null {
  return new URLSearchParams(window.location.search).get('token');
}

export function VerifyEmailExchange() {
  const started = useRef(false);
  const [message, setMessage] = useState('Checking your verification link…');
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = readTokenFromAddress();
    removeTokenFromAddress();
    if (!token) { setMessage('This verification link is unavailable or no longer valid.'); return; }
    void fetch(`${API_BASE}/api/v1/auth/email-verification/confirm`, {
      method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token }),
    }).then((response) => {
      setMessage(response.ok ? 'Your email address has been verified.' : 'This verification link is unavailable or no longer valid.');
    }).catch(() => setMessage('Verification is temporarily unavailable. Please try again safely from your email.'));
  }, []);
  return <p role="status" aria-live="polite">{message}</p>;
}

export function PasswordRecoveryRequestForm() {
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await fetch(`${API_BASE}/api/v1/auth/password-recovery/request`, {
      method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: data.get('email') }),
    }).catch(() => undefined);
    setMessage('If the account can use email recovery, instructions will be sent.');
  }
  return <form onSubmit={submit}><label htmlFor="recovery-email">Email address</label><input id="recovery-email" name="email" type="email" autoComplete="email" required /><button type="submit">Send recovery instructions</button><p role="status" aria-live="polite">{message}</p></form>;
}

export function PasswordRecoveryCompletionForm() {
  const token = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    token.current = readTokenFromAddress();
    removeTokenFromAddress();
    setReady(true);
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token.current) { setMessage('This recovery link is unavailable or no longer valid.'); return; }
    const data = new FormData(event.currentTarget);
    const response = await fetch(`${API_BASE}/api/v1/auth/password-recovery/complete`, {
      method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: token.current, newPassword: data.get('newPassword') }),
    }).catch(() => null);
    token.current = null;
    setMessage(response?.ok ? 'Your password has been changed. Sign in again on every device.' : 'This recovery link is unavailable, expired, or has already been used.');
  }
  if (!ready) return <p>Preparing secure recovery…</p>;
  return <form onSubmit={submit}><label htmlFor="new-password">New password</label><input id="new-password" name="newPassword" type="password" autoComplete="new-password" minLength={15} required /><button type="submit">Change my password</button><p role="status" aria-live="polite">{message}</p></form>;
}
