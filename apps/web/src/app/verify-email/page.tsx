import type { Metadata } from 'next';
import { Suspense } from 'react';
import { VerifyEmailExchange } from '../../identity/identity-public-flow';

export const metadata: Metadata = { title: 'Verify your email', referrer: 'no-referrer' };
export default function VerifyEmailPage() {
  return <main id="main-content"><h1>Verify your email</h1><Suspense fallback={<p>Checking your verification link…</p>}><VerifyEmailExchange /></Suspense><a href="/">Return to the Marketplace</a></main>;
}

