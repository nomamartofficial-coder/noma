import { describe, expect, test, vi } from 'vitest';
import { PostmarkTransactionalEmailAdapter } from '../src/index.js';

function input() {
  return {
    identity: { operationId: 'operation-001', idempotencyKey: 'delivery-001', correlationId: 'correlation-001', attempt: 1, deadlineAt: '2026-09-11T10:01:00.000Z' },
    environment: 'test' as const,
    messageIdentity: 'message-001', templateKey: 'noma-email-verification-v1', templateVersion: '1',
    recipientReference: 'recipient-001', recipientAddress: 'person@example.test', locale: 'en-NG',
    variables: { actionUrl: `https://noma.invalid/verify-email?token=${'r'.repeat(43)}` }, metadata: { purpose: 'EMAIL_VERIFICATION' },
  };
}

describe('IAM-003 Postmark transactional email adapter', () => {
  test('submits to the fixed TLS endpoint without exposing the server token in results', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ MessageID: '12345678-abcd' }), { status: 200, headers: { 'content-type': 'application/json' } }));
    const adapter = new PostmarkTransactionalEmailAdapter({ serverToken: 'server-token-value-1234567890', fromAddress: 'security@noma.invalid', fetch });
    const result = await adapter.sendEmail(input());
    expect(result).toMatchObject({ kind: 'accepted', providerReference: '12345678-abcd' });
    expect(fetch).toHaveBeenCalledWith('https://api.postmarkapp.com/email/withTemplate', expect.objectContaining({ method: 'POST', redirect: 'error' }));
    expect(JSON.stringify(result)).not.toContain('server-token-value');
  });

  test('classifies transport ambiguity without blind retry authority', async () => {
    const adapter = new PostmarkTransactionalEmailAdapter({ serverToken: 'server-token-value-1234567890', fromAddress: 'security@noma.invalid', fetch: vi.fn(async () => { throw new Error('socket closed'); }) });
    await expect(adapter.sendEmail(input())).resolves.toEqual({ kind: 'uncertain', code: 'POSTMARK_ACCEPTANCE_UNKNOWN' });
  });

  test('treats provider 5xx as acceptance ambiguity rather than retry authority', async () => {
    const adapter = new PostmarkTransactionalEmailAdapter({
      serverToken: 'server-token-value-1234567890',
      fromAddress: 'security@noma.invalid',
      fetch: vi.fn(async () => new Response('provider failed after receipt', { status: 500 })),
    });
    await expect(adapter.sendEmail(input())).resolves.toEqual({ kind: 'uncertain', code: 'POSTMARK_ACCEPTANCE_UNKNOWN' });
  });

  test('retries only an explicit provider rate-limit rejection', async () => {
    const adapter = new PostmarkTransactionalEmailAdapter({
      serverToken: 'server-token-value-1234567890',
      fromAddress: 'security@noma.invalid',
      fetch: vi.fn(async () => new Response('rate limited', { status: 429 })),
    });
    await expect(adapter.sendEmail(input())).resolves.toEqual({ kind: 'final_failure', code: 'POSTMARK_TRANSIENT_REJECTION', retryable: true });
  });

  test('requires an explicit delivery address and never returns it', async () => {
    const adapter = new PostmarkTransactionalEmailAdapter({ serverToken: 'server-token-value-1234567890', fromAddress: 'security@noma.invalid', fetch: vi.fn() });
    const result = await adapter.sendEmail({ ...input(), recipientAddress: undefined });
    expect(result).toMatchObject({ kind: 'rejected', code: 'RECIPIENT_ADDRESS_REQUIRED' });
    expect(JSON.stringify(result)).not.toContain('person@example.test');
  });

  test('rejects malformed and adversarially long addresses with bounded validation', () => {
    expect(() => new PostmarkTransactionalEmailAdapter({
      serverToken: 'server-token-value-1234567890',
      fromAddress: `!@!.${'!.'.repeat(400)}`,
      fetch: vi.fn(),
    })).toThrow('Postmark from address is invalid');
  });
});
