import { createCipheriv, createDecipheriv, createHash } from 'node:crypto';

import type { EncryptionEnvironment, GeneratedDataKey, ManagedKeyContext, ManagedKeyProvider, RewrappedDataKey } from '@noma/platform';

/** Deterministic and explicitly test-only. It is not imported by the production entry point. */
export class TestOnlyManagedKeyProvider implements ManagedKeyProvider {
  readonly providerId = 'test-only' as const;
  readonly keyReference: string;
  private counter = 0;

  constructor(private readonly seed: string, environment: EncryptionEnvironment, keyReference = 'test-only:key:initial') {
    if (!['development', 'test'].includes(environment) || ['preview', 'staging', 'production'].includes(process.env.NOMA_ENV ?? '')) {
      throw new Error('Test-only managed keys are unavailable outside local/test');
    }
    if (seed.length < 8 || !/^test-only:key:[A-Za-z0-9_-]{1,80}$/.test(keyReference)) throw new Error('Invalid test-only key setup');
    this.keyReference = keyReference;
  }

  private derive(label: string): Buffer {
    return createHash('sha256').update('noma:test-managed-key:v1\0').update(this.seed).update('\0').update(label).digest();
  }

  private context(context: ManagedKeyContext): Buffer {
    if (context.application !== 'noma' || context.contextVersion !== '1' || !['development', 'test'].includes(context.environment)) {
      throw new Error('Invalid test-only key context');
    }
    return Buffer.from(`${context.application}\0${context.environment}\0${context.purpose}\0${context.contextVersion}`);
  }

  private wrap(key: Uint8Array, keyReference: string, context: ManagedKeyContext): Uint8Array {
    this.counter += 1;
    const nonce = this.derive(`nonce:${this.counter}:${keyReference}`).subarray(0, 12);
    const wrappingKey = this.derive(`wrapping:${keyReference}`);
    try {
      const cipher = createCipheriv('aes-256-gcm', wrappingKey, nonce);
      cipher.setAAD(this.context(context));
      return Buffer.concat([nonce, cipher.update(key), cipher.final(), cipher.getAuthTag()]);
    } finally {
      wrappingKey.fill(0);
    }
  }

  private unwrap(wrappedKey: Uint8Array, keyReference: string, context: ManagedKeyContext): Uint8Array {
    if (wrappedKey.length !== 60) throw new Error('Invalid test-only wrapped key');
    const wrappingKey = this.derive(`wrapping:${keyReference}`);
    try {
      const decipher = createDecipheriv('aes-256-gcm', wrappingKey, wrappedKey.subarray(0, 12));
      decipher.setAAD(this.context(context));
      decipher.setAuthTag(wrappedKey.subarray(44, 60));
      return Buffer.concat([decipher.update(wrappedKey.subarray(12, 44)), decipher.final()]);
    } finally {
      wrappingKey.fill(0);
    }
  }

  async generateDataKey(context: ManagedKeyContext): Promise<GeneratedDataKey> {
    this.counter += 1;
    const plaintextKey = this.derive(`data:${this.counter}`);
    return { plaintextKey, wrappedKey: this.wrap(plaintextKey, this.keyReference, context), keyReference: this.keyReference };
  }

  async unwrapDataKey(wrappedKey: Uint8Array, context: ManagedKeyContext): Promise<Uint8Array> {
    return this.unwrap(wrappedKey, this.keyReference, context);
  }

  async rewrapDataKey(wrappedKey: Uint8Array, context: ManagedKeyContext, destinationKeyReference: string): Promise<RewrappedDataKey> {
    if (!/^test-only:key:[A-Za-z0-9_-]{1,80}$/.test(destinationKeyReference)) throw new Error('Invalid test-only destination');
    const plaintextKey = this.unwrap(wrappedKey, this.keyReference, context);
    try {
      return { wrappedKey: this.wrap(plaintextKey, destinationKeyReference, context), keyReference: destinationKeyReference };
    } finally {
      plaintextKey.fill(0);
    }
  }
}
