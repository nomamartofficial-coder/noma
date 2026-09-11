import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';

import {
  PasswordRecoveryCompletionForm,
  PasswordRecoveryRequestForm,
  VerifyEmailExchange,
} from '../../apps/web/src/identity/identity-public-flow.js';

describe('IAM-003 public identity flows', () => {
  afterEach(() => window.history.replaceState(null, '', '/'));

  test('removes a verification proof from the address before the authoritative POST', async () => {
    window.history.replaceState(null, '', '/verify-email?token=synthetic-proof');
    const request = vi.fn(async () => {
      expect(window.location.pathname).toBe('/verify-email');
      expect(window.location.search).toBe('');
      return new Response(null, { status: 204 });
    });
    vi.stubGlobal('fetch', request);

    render(<VerifyEmailExchange />);

    expect(await screen.findByText('Your email address has been verified.')).toBeInTheDocument();
    expect(request).toHaveBeenCalledWith(
      'http://127.0.0.1:3001/api/v1/auth/email-verification/confirm',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
  });

  test('keeps recovery-request responses generic even when delivery is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('synthetic unavailable'); }));
    const user = userEvent.setup();
    render(<PasswordRecoveryRequestForm />);

    await user.type(screen.getByLabelText('Email address'), 'unknown@noma.test');
    await user.click(screen.getByRole('button', { name: 'Send recovery instructions' }));

    expect(await screen.findByText('If the account can use email recovery, instructions will be sent.')).toBeInTheDocument();
  });

  test('clears a recovery proof from both the address and component memory after one attempt', async () => {
    window.history.replaceState(null, '', '/reset-password?token=single-use-proof');
    const request = vi.fn(async () => new Response(null, { status: 400 }));
    vi.stubGlobal('fetch', request);
    const user = userEvent.setup();
    render(<PasswordRecoveryCompletionForm />);

    await waitFor(() => expect(window.location.search).toBe(''));
    await user.type(screen.getByLabelText('New password'), 'Synthetic password value 2026');
    await user.click(screen.getByRole('button', { name: 'Change my password' }));
    expect(await screen.findByText('This recovery link is unavailable, expired, or has already been used.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Change my password' }));
    expect(request).toHaveBeenCalledTimes(1);
  });
});
