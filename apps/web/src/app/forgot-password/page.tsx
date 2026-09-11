import type { Metadata } from 'next';
import { PasswordRecoveryRequestForm } from '../../identity/identity-public-flow';

export const metadata: Metadata = { title: 'Forgot password', referrer: 'no-referrer' };
export default function ForgotPasswordPage() {
  return <main id="main-content"><h1>Forgot your password?</h1><p>Request a time-limited recovery link. The response is the same whether or not an account is eligible.</p><PasswordRecoveryRequestForm /><a href="/">Return to the Marketplace</a></main>;
}

