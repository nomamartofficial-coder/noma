import { describe, expect, test } from 'vitest';

import { TestOnlyManagedKeyProvider } from '@noma/integrations/testing';
import type { ManagedKeyProvider } from '@noma/platform';
import {
  SafeEncryptionError,
  SensitiveFieldProtector,
  encodeSensitiveFieldAad,
  fullyReencryptSensitiveField,
  maskSensitiveValue,
  migrateEncryptedFieldBatch,
  parseEncryptedEnvelope,
  type SensitiveFieldContext,
} from '@noma/security';

const context: SensitiveFieldContext = Object.freeze({
  purpose: 'noma:mfa-seed',
  environment: 'test',
  bindings: Object.freeze({ userId: 'synthetic-user-1', factorId: 'synthetic-factor-1', factorType: 'TOTP' }),
});
const plaintext = Buffer.from('synthetic-seed-do-not-persist');
const capability = Object.freeze({ principal: 'test', purpose: context.purpose, environment: context.environment, operations: ['encrypt', 'decrypt', 'rewrap'] as const });

function harness() {
  const provider = new TestOnlyManagedKeyProvider('synthetic-seed-for-sec003', 'test');
  return { provider, protector: new SensitiveFieldProtector(provider, capability) };
}

describe('SEC-003 sensitive-field envelope', () => {
  test('canonical AAD is stable under binding order and NFC normalization', () => {
    const reordered = { ...context, bindings: { factorType: 'TOTP', factorId: 'synthetic-factor-1', userId: 'synthetic-user-1' } };
    expect(encodeSensitiveFieldAad(context)).toEqual(encodeSensitiveFieldAad(reordered));
    expect(encodeSensitiveFieldAad({ ...context, bindings: { name: 'e\u0301' } }))
      .toEqual(encodeSensitiveFieldAad({ ...context, bindings: { name: '\u00e9' } }));
    expect(encodeSensitiveFieldAad(context).toString()).toContain('noma:aad:v1');
  });

  test('unique data keys and nonces produce distinct envelopes for the same value', async () => {
    const { protector } = harness();
    const first = await protector.encrypt(plaintext, context);
    const second = await protector.encrypt(plaintext, context);
    expect(first.wrappedDataKey).not.toBe(second.wrappedDataKey);
    expect(first.nonce).not.toBe(second.nonce);
    expect(first.ciphertext).not.toBe(second.ciphertext);
    expect(await protector.decrypt(first, context)).toEqual(plaintext);
    expect(JSON.stringify(first)).not.toContain(plaintext.toString());
  });

  test('strict envelope rejects unknown versions, fields and malformed binary', async () => {
    const { protector } = harness();
    const envelope = await protector.encrypt(plaintext, context);
    for (const invalid of [
      { ...envelope, version: 2 },
      { ...envelope, extra: 'unsafe' },
      { ...envelope, nonce: 'bad' },
      { ...envelope, authenticationTag: 'bad' },
      { ...envelope, wrappedDataKey: 'bad=' },
      { ...envelope, wrappedDataKey: 'A'.repeat(20_000) },
      { ...envelope, providerId: 'other' },
    ]) expect(() => parseEncryptedEnvelope(invalid)).toThrow(SafeEncryptionError);
  });

  test('ciphertext, nonce, tag and wrapped-key tampering fails closed', async () => {
    const { protector } = harness();
    const envelope = await protector.encrypt(plaintext, context);
    const change = (value: string) => `${value[0] === 'A' ? 'B' : 'A'}${value.slice(1)}`;
    for (const field of ['ciphertext', 'nonce', 'authenticationTag', 'wrappedDataKey'] as const) {
      await expect(protector.decrypt({ ...envelope, [field]: change(envelope[field]) }, context)).rejects.toThrow(SafeEncryptionError);
    }
  });

  test('cross-user, factor, purpose and environment substitution fails', async () => {
    const { protector } = harness();
    const envelope = await protector.encrypt(plaintext, context);
    for (const wrong of [
      { ...context, bindings: { ...context.bindings, userId: 'other-user' } },
      { ...context, bindings: { ...context.bindings, factorId: 'other-factor' } },
      { ...context, purpose: 'noma:other-purpose' },
      { ...context, environment: 'development' as const },
    ]) await expect(protector.decrypt(envelope, wrong)).rejects.toThrow(SafeEncryptionError);
  });

  test('wrong capability, provider, key and outage fail without leaking provider detail', async () => {
    const { provider, protector } = harness();
    const envelope = await protector.encrypt(plaintext, context);
    const encryptOnly = new SensitiveFieldProtector(provider, { ...capability, operations: ['encrypt'] });
    await expect(encryptOnly.decrypt(envelope, context)).rejects.toMatchObject({ code: 'CAPABILITY_DENIED' });
    await expect(protector.decrypt({ ...envelope, keyReference: 'test-only:key:other' }, context)).rejects.toMatchObject({ code: 'KEY_UNAVAILABLE' });
    const outage: ManagedKeyProvider = {
      providerId: provider.providerId,
      keyReference: provider.keyReference,
      generateDataKey: async () => { throw new Error('private provider diagnosis'); },
      unwrapDataKey: (wrapped, keyContext) => provider.unwrapDataKey(wrapped, keyContext),
      rewrapDataKey: (wrapped, keyContext, destination) => provider.rewrapDataKey(wrapped, keyContext, destination),
    };
    await expect(new SensitiveFieldProtector(outage, capability).encrypt(plaintext, context)).rejects.toMatchObject({ code: 'KEY_UNAVAILABLE' });
    await expect(new SensitiveFieldProtector(outage, capability).encrypt(plaintext, context)).rejects.not.toThrow('private provider diagnosis');
  });

  test('rewrap preserves content while full re-encryption changes content and nonce', async () => {
    const { provider, protector } = harness();
    const envelope = await protector.encrypt(plaintext, context);
    const rewrapped = await protector.rewrap(envelope, context, 'test-only:key:successor');
    expect(rewrapped.ciphertext).toBe(envelope.ciphertext);
    expect(rewrapped.nonce).toBe(envelope.nonce);
    expect(rewrapped.authenticationTag).toBe(envelope.authenticationTag);
    const successor = new SensitiveFieldProtector(new TestOnlyManagedKeyProvider('synthetic-seed-for-sec003', 'test', 'test-only:key:successor'), capability);
    expect(await successor.decrypt(rewrapped, context)).toEqual(plaintext);
    const renewed = await fullyReencryptSensitiveField(protector, successor, envelope, context, context);
    expect(renewed.ciphertext).not.toBe(envelope.ciphertext);
    expect(renewed.nonce).not.toBe(envelope.nonce);
    expect(await successor.decrypt(renewed, context)).toEqual(plaintext);
    expect(provider.keyReference).toBe(envelope.keyReference);
  });

  test('remote use of deterministic provider is impossible', () => {
    expect(() => new TestOnlyManagedKeyProvider('synthetic-seed-for-sec003', 'production')).toThrow();
    const provider = new TestOnlyManagedKeyProvider('synthetic-seed-for-sec003', 'test');
    expect(() => new SensitiveFieldProtector(provider, { ...capability, environment: 'production' })).toThrow();
  });

  test('migration orchestration prepares outside checkpoint and advances only after CAS', async () => {
    const { protector } = harness();
    const initial = await protector.encrypt(plaintext, context);
    const calls: string[] = [];
    const result = await migrateEncryptedFieldBatch({
      run: { id: 'synthetic-run', consumerId: 'synthetic-consumer', cursor: null, version: 1, leaseOwner: 'operator' },
      consumer: {
        consumerId: 'synthetic-consumer',
        readAfter: async () => [{ cursor: 'a', policy: 'source', envelope: initial, context }],
        compareAndSwap: async (_record, replacement, transaction) => {
          calls.push(`cas:${transaction}`);
          expect(replacement.ciphertext).toBe(initial.ciphertext);
          expect(replacement.wrappedDataKey).not.toBe(initial.wrappedDataKey);
          return true;
        },
        countOutdated: async () => 0n,
        targetWritePolicyActive: async () => true,
      },
      store: {
        checkpoint: async (input) => {
          calls.push('checkpoint');
          expect(input.expectedVersion).toBe(1);
          expect(input.expectedCursor).toBeNull();
          expect(await input.applyRecordCas?.('transaction')).toBe(true);
          return { version: 2, cursor: input.nextCursor };
        },
        block: async () => { throw new Error('unexpected block'); },
      },
      source: protector,
      target: new SensitiveFieldProtector(new TestOnlyManagedKeyProvider('synthetic-seed-for-sec003', 'test', 'test-only:key:successor'), capability),
      mode: 'rewrap',
      now: () => new Date('2026-09-12T10:00:00Z'),
    });
    expect(result).toEqual({ processed: 1, cursor: 'a', version: 2 });
    expect(calls).toEqual(['checkpoint', 'cas:transaction']);
  });

  test('unsupported migration policy blocks without advancing a checkpoint', async () => {
    const { protector } = harness();
    let checkpointed = false;
    const failures: string[] = [];
    const result = await migrateEncryptedFieldBatch({
      run: { id: 'synthetic-run', consumerId: 'synthetic-consumer', cursor: null, version: 1, leaseOwner: 'operator' },
      consumer: {
        consumerId: 'synthetic-consumer',
        readAfter: async () => [{ cursor: 'a', policy: 'unsupported', envelope: {}, context }],
        compareAndSwap: async () => { throw new Error('unexpected CAS'); },
        countOutdated: async () => 1n,
        targetWritePolicyActive: async () => false,
      },
      store: {
        checkpoint: async () => { checkpointed = true; return { version: 2, cursor: 'a' }; },
        block: async (input) => { failures.push(input.failureCode); },
      },
      source: protector,
      target: protector,
      mode: 'rewrap',
      now: () => new Date('2026-09-12T10:00:00Z'),
    });
    expect(failures).toEqual(['UNKNOWN_POLICY']);
    expect(checkpointed).toBe(false);
    expect(result).toEqual({ processed: 0, cursor: null, version: 1 });
  });
});

test('masking enforces minimum hidden Unicode code points', () => {
  expect(maskSensitiveValue('A😀éZ', { visiblePrefix: 1, visibleSuffix: 1, minimumHidden: 2, maskCharacter: '•' })).toBe('A••Z');
  expect(() => maskSensitiveValue('ab', { visiblePrefix: 1, visibleSuffix: 1, minimumHidden: 1, maskCharacter: '*' })).toThrow();
  expect(() => maskSensitiveValue('abcd', { visiblePrefix: 0, visibleSuffix: 4, minimumHidden: 1, maskCharacter: '*' })).toThrow();
});
