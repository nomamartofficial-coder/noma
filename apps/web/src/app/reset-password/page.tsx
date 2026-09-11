import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PasswordRecoveryCompletionForm } from '../../identity/identity-public-flow';

export const metadata: Metadata = { title: 'Reset password', referrer: 'no-referrer' };
export default function ResetPasswordPage() {
  return <main id="main-content"><h1>Choose a new password</h1><p>A successful reset signs out every existing session. You will need to sign in again.</p><Suspense fallback={<p>Preparing secure recovery…</p>}><PasswordRecoveryCompletionForm /></Suspense><a href="/">Return to the Marketplace</a></main>;
}

