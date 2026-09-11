import {
  assertSafeProviderValue,
  type EmailObservation,
  type ProviderCallResult,
  type TransactionalEmailInput,
  type TransactionalEmailProviderPort,
} from '@noma/platform/providers';

const POSTMARK_ENDPOINT = 'https://api.postmarkapp.com/email/withTemplate';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface PostmarkTransactionalEmailOptions {
  readonly serverToken: string;
  readonly fromAddress: string;
  readonly messageStream?: string;
  readonly responseTimeoutMilliseconds?: number;
  readonly fetch?: typeof fetch;
}

function requireSecret(value: string): string {
  if (value.trim().length < 20 || /\s/u.test(value)) throw new Error('Postmark server token is invalid');
  return value;
}

function requireAddress(value: string, name: string): string {
  const address = value.trim();
  if (!EMAIL_PATTERN.test(address) || address.length > 320) throw new Error(`${name} is invalid`);
  return address;
}

export class PostmarkTransactionalEmailAdapter implements TransactionalEmailProviderPort {
  readonly #serverToken: string;
  readonly #fromAddress: string;
  readonly #messageStream: string;
  readonly #timeout: number;
  readonly #fetch: typeof fetch;

  constructor(options: PostmarkTransactionalEmailOptions) {
    this.#serverToken = requireSecret(options.serverToken);
    this.#fromAddress = requireAddress(options.fromAddress, 'Postmark from address');
    this.#messageStream = options.messageStream?.trim() || 'outbound';
    if (!/^[a-z0-9][a-z0-9-]{0,49}$/.test(this.#messageStream)) throw new Error('Postmark message stream is invalid');
    this.#timeout = options.responseTimeoutMilliseconds ?? 10_000;
    if (!Number.isSafeInteger(this.#timeout) || this.#timeout < 500 || this.#timeout > 30_000) throw new Error('Postmark response timeout is invalid');
    this.#fetch = options.fetch ?? globalThis.fetch;
  }

  async sendEmail(input: TransactionalEmailInput, signal?: AbortSignal): Promise<ProviderCallResult<EmailObservation>> {
    if (!input.recipientAddress) return Object.freeze({ kind: 'rejected', code: 'RECIPIENT_ADDRESS_REQUIRED', safeMessage: 'email delivery address is unavailable' });
    const recipientAddress = requireAddress(input.recipientAddress, 'email recipient address');
    assertSafeProviderValue(input.metadata, 'email metadata');
    const timeout = AbortSignal.timeout(this.#timeout);
    const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
    let response: Response;
    try {
      response = await this.#fetch(POSTMARK_ENDPOINT, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Postmark-Server-Token': this.#serverToken,
        },
        body: JSON.stringify({
          From: this.#fromAddress,
          To: recipientAddress,
          TemplateAlias: input.templateKey,
          TemplateModel: input.variables,
          MessageStream: this.#messageStream,
          Metadata: { ...input.metadata, nomaMessageIdentity: input.messageIdentity },
        }),
        redirect: 'error',
        signal: requestSignal,
      });
    } catch {
      return Object.freeze({ kind: 'uncertain', code: 'POSTMARK_ACCEPTANCE_UNKNOWN' });
    }
    if (response.ok) {
      let messageId = input.messageIdentity;
      try {
        const body = await response.json() as { readonly MessageID?: unknown };
        if (typeof body.MessageID === 'string' && /^[A-Za-z0-9-]{8,160}$/.test(body.MessageID)) messageId = body.MessageID;
      } catch {
        return Object.freeze({ kind: 'uncertain', code: 'POSTMARK_RESPONSE_INVALID' });
      }
      return Object.freeze({ kind: 'accepted', providerReference: messageId, data: Object.freeze({ status: 'accepted', messageIdentity: input.messageIdentity }) });
    }
    if (response.status >= 500) {
      return Object.freeze({ kind: 'uncertain', code: 'POSTMARK_ACCEPTANCE_UNKNOWN' });
    }
    if (response.status === 429) {
      return Object.freeze({ kind: 'final_failure', code: 'POSTMARK_TRANSIENT_REJECTION', retryable: true });
    }
    return Object.freeze({ kind: 'rejected', code: 'POSTMARK_REQUEST_REJECTED', safeMessage: 'email provider rejected the delivery request' });
  }

  async mapDeliveryEvent(): Promise<ProviderCallResult<EmailObservation>> {
    return Object.freeze({ kind: 'rejected', code: 'POSTMARK_EVENT_DEFERRED', safeMessage: 'delivery-event mapping is not enabled by IAM-003' });
  }

  async lookupSuppression(): Promise<ProviderCallResult<{ readonly suppressed: boolean; readonly safeReason?: string }>> {
    return Object.freeze({ kind: 'rejected', code: 'POSTMARK_SUPPRESSION_DEFERRED', safeMessage: 'suppression lookup is not enabled by IAM-003' });
  }
}
