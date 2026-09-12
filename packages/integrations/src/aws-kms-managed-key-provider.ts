import { DecryptCommand, GenerateDataKeyCommand, KMSClient, ReEncryptCommand } from '@aws-sdk/client-kms';

import type { ManagedKeyContext, ManagedKeyProvider, GeneratedDataKey, RewrappedDataKey } from '@noma/platform';

const KEY_ARN_PATTERN = /^arn:aws:kms:eu-central-1:[0-9]{12}:key\/[0-9a-f-]{36}$/i;

interface AwsKmsManagedKeyOptions {
  readonly keyReference: string;
  readonly destinationKeyReferences?: readonly string[];
  /** Internal mocked-command test seam, never exported from the package public API. */
  readonly send?: (command: GenerateDataKeyCommand | DecryptCommand | ReEncryptCommand, signal?: AbortSignal) => Promise<unknown>;
}

function requireKeyArn(value: string): string {
  if (!KEY_ARN_PATTERN.test(value)) throw new Error('AWS KMS key reference must be a Frankfurt customer-managed key ARN');
  return value;
}

function requireContext(context: ManagedKeyContext): Record<string, string> {
  if (context.application !== 'noma' || context.contextVersion !== '1' || !/^noma:[a-z][a-z0-9-]{0,79}$/.test(context.purpose)) {
    throw new Error('AWS KMS context is invalid');
  }
  if (!['staging', 'production'].includes(context.environment)) throw new Error('AWS KMS environment is unavailable');
  return { application: 'noma', environment: context.environment, purpose: context.purpose, contextVersion: '1' };
}

function requireBytes(value: Uint8Array | undefined, length?: number): Uint8Array {
  if (!value || value.length === 0 || (length !== undefined && value.length !== length)) throw new Error('AWS KMS response is incomplete');
  return Uint8Array.from(value);
}

/** No explicit credentials: Render supplies rotated web-identity tokens to the SDK chain. */
export class AwsKmsManagedKeyProvider implements ManagedKeyProvider {
  readonly providerId = 'aws-kms' as const;
  readonly keyReference: string;
  private readonly destinationKeyReferences: ReadonlySet<string>;
  private readonly send: NonNullable<AwsKmsManagedKeyOptions['send']>;

  constructor(options: AwsKmsManagedKeyOptions) {
    this.keyReference = requireKeyArn(options.keyReference);
    this.destinationKeyReferences = new Set((options.destinationKeyReferences ?? []).map(requireKeyArn));
    if (['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_SESSION_TOKEN', 'AWS_PROFILE', 'AWS_SHARED_CREDENTIALS_FILE', 'AWS_CONFIG_FILE', 'AWS_CONTAINER_CREDENTIALS_RELATIVE_URI', 'AWS_CONTAINER_CREDENTIALS_FULL_URI'].some((key) => process.env[key])) {
      throw new Error('Static AWS environment credentials are prohibited for Noma encryption');
    }
    if (!options.send && (!process.env.AWS_ROLE_ARN || !process.env.AWS_WEB_IDENTITY_TOKEN_FILE)) {
      throw new Error('Managed AWS web identity is required for Noma encryption');
    }
    const client = options.send ? undefined : new KMSClient({ region: 'eu-central-1', maxAttempts: 1 });
    this.send = options.send ?? ((command, signal) => {
      const requestOptions = signal ? { abortSignal: signal } : {};
      if (command instanceof GenerateDataKeyCommand) return client!.send(command, requestOptions);
      if (command instanceof DecryptCommand) return client!.send(command, requestOptions);
      return client!.send(command, requestOptions);
    });
  }

  private async dispatch(command: GenerateDataKeyCommand | DecryptCommand | ReEncryptCommand, signal?: AbortSignal): Promise<unknown> {
    try {
      return await this.send(command, signal);
    } catch {
      throw new Error('Managed key service unavailable');
    }
  }

  async generateDataKey(context: ManagedKeyContext, signal?: AbortSignal): Promise<GeneratedDataKey> {
    const result = await this.dispatch(new GenerateDataKeyCommand({
      KeyId: this.keyReference,
      KeySpec: 'AES_256',
      EncryptionContext: requireContext(context),
    }), signal) as { Plaintext?: Uint8Array; CiphertextBlob?: Uint8Array; KeyId?: string; KeyMaterialId?: string };
    try {
      if (result.KeyId !== this.keyReference) throw new Error('AWS KMS returned an unexpected key');
      const wrappedKey = requireBytes(result.CiphertextBlob);
      const plaintextKey = requireBytes(result.Plaintext, 32);
      return {
        plaintextKey,
        wrappedKey,
        keyReference: result.KeyId,
        ...(result.KeyMaterialId ? { keyMaterialId: result.KeyMaterialId } : {}),
      };
    } finally {
      result.Plaintext?.fill(0);
    }
  }

  async unwrapDataKey(wrappedKey: Uint8Array, context: ManagedKeyContext, signal?: AbortSignal): Promise<Uint8Array> {
    const result = await this.dispatch(new DecryptCommand({
      CiphertextBlob: wrappedKey,
      KeyId: this.keyReference,
      EncryptionContext: requireContext(context),
    }), signal) as { Plaintext?: Uint8Array; KeyId?: string };
    try {
      if (result.KeyId !== this.keyReference) throw new Error('AWS KMS returned an unexpected key');
      return requireBytes(result.Plaintext, 32);
    } finally {
      result.Plaintext?.fill(0);
    }
  }

  async rewrapDataKey(wrappedKey: Uint8Array, context: ManagedKeyContext, destinationKeyReference: string, signal?: AbortSignal): Promise<RewrappedDataKey> {
    requireKeyArn(destinationKeyReference);
    if (!this.destinationKeyReferences.has(destinationKeyReference)) throw new Error('AWS KMS destination is not approved');
    const encryptionContext = requireContext(context);
    const result = await this.dispatch(new ReEncryptCommand({
      CiphertextBlob: wrappedKey,
      SourceKeyId: this.keyReference,
      DestinationKeyId: destinationKeyReference,
      SourceEncryptionContext: encryptionContext,
      DestinationEncryptionContext: encryptionContext,
    }), signal) as { CiphertextBlob?: Uint8Array; KeyId?: string; KeyMaterialId?: string };
    if (result.KeyId !== destinationKeyReference) throw new Error('AWS KMS returned an unexpected destination');
    return {
      wrappedKey: requireBytes(result.CiphertextBlob),
      keyReference: result.KeyId,
      ...(result.KeyMaterialId ? { keyMaterialId: result.KeyMaterialId } : {}),
    };
  }
}

/** Production-facing factory: no credentials, injected sender, or local fallback option. */
export function createAwsKmsManagedKeyProvider(options: {
  readonly keyReference: string;
  readonly destinationKeyReferences?: readonly string[];
}): ManagedKeyProvider {
  return new AwsKmsManagedKeyProvider(options);
}
