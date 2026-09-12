/** Provider-neutral managed-key boundary. Implementations live in integrations. */
export type EncryptionEnvironment = 'development' | 'test' | 'preview' | 'staging' | 'production';

export interface ManagedKeyContext {
  readonly application: 'noma';
  readonly environment: EncryptionEnvironment;
  readonly purpose: string;
  readonly contextVersion: '1';
}

export interface GeneratedDataKey {
  /** Transient key material. The caller must overwrite this buffer in a finally block. */
  readonly plaintextKey: Uint8Array;
  readonly wrappedKey: Uint8Array;
  readonly keyReference: string;
  readonly keyMaterialId?: string;
}

export interface RewrappedDataKey {
  readonly wrappedKey: Uint8Array;
  readonly keyReference: string;
  readonly keyMaterialId?: string;
}

export interface ManagedKeyProvider {
  readonly providerId: 'aws-kms' | 'test-only';
  readonly keyReference: string;
  generateDataKey(context: ManagedKeyContext, signal?: AbortSignal): Promise<GeneratedDataKey>;
  unwrapDataKey(wrappedKey: Uint8Array, context: ManagedKeyContext, signal?: AbortSignal): Promise<Uint8Array>;
  rewrapDataKey(
    wrappedKey: Uint8Array,
    context: ManagedKeyContext,
    destinationKeyReference: string,
    signal?: AbortSignal,
  ): Promise<RewrappedDataKey>;
}
