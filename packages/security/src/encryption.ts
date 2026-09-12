import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

import type { EncryptionEnvironment, ManagedKeyContext, ManagedKeyProvider } from '@noma/platform';

const FORMAT = 'noma.encrypted-envelope';
const MAX_FIELD_BYTES = 1024 * 1024;
const MAX_WRAPPED_KEY_BYTES = 8192;
const PURPOSE_PATTERN = /^noma:[a-z][a-z0-9-]{0,79}$/;
const BINDING_PATTERN = /^[A-Za-z][A-Za-z0-9]{0,63}$/;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

export type EncryptionOperation = 'encrypt' | 'decrypt' | 'rewrap';
export type EncryptionPrincipal = 'api' | 'migration' | 'test';
export type EncryptionFailureCode = 'INVALID_INPUT' | 'INVALID_ENVELOPE' | 'CAPABILITY_DENIED' | 'KEY_UNAVAILABLE' | 'AUTHENTICATION_FAILED';

export class SafeEncryptionError extends Error {
  constructor(readonly code: EncryptionFailureCode) {
    super(`Sensitive-field operation failed: ${code}`);
    this.name = 'SafeEncryptionError';
  }
}

export interface SensitiveFieldContext {
  readonly purpose: string;
  readonly environment: EncryptionEnvironment;
  readonly bindings: Readonly<Record<string, string>>;
}

export interface SensitiveFieldCapability {
  readonly principal: EncryptionPrincipal;
  readonly purpose: string;
  readonly environment: EncryptionEnvironment;
  readonly operations: readonly EncryptionOperation[];
}

export interface EncryptedEnvelopeV1 {
  readonly format: typeof FORMAT;
  readonly version: 1;
  readonly contentAlgorithm: 'A256GCM';
  readonly providerId: ManagedKeyProvider['providerId'];
  readonly keyReference: string;
  readonly keyMaterialId?: string;
  readonly contextVersion: 1;
  readonly wrappedDataKey: string;
  readonly nonce: string;
  readonly authenticationTag: string;
  readonly ciphertext: string;
}

function fail(code: EncryptionFailureCode): never {
  throw new SafeEncryptionError(code);
}

function bytes(value: string, minimum: number, maximum: number): Buffer {
  if (value.length > Math.ceil(maximum * 4 / 3) + 4 || !BASE64URL_PATTERN.test(value)) fail('INVALID_ENVELOPE');
  const decoded = Buffer.from(value, 'base64url');
  if (decoded.length < minimum || decoded.length > maximum || decoded.toString('base64url') !== value) fail('INVALID_ENVELOPE');
  return decoded;
}

function requireContext(context: SensitiveFieldContext): void {
  if (!PURPOSE_PATTERN.test(context.purpose)) fail('INVALID_INPUT');
  if (!['development', 'test', 'preview', 'staging', 'production'].includes(context.environment)) fail('INVALID_INPUT');
  const entries = Object.entries(context.bindings);
  if (entries.length === 0 || entries.length > 16) fail('INVALID_INPUT');
  const seen = new Set<string>();
  for (const [key, value] of entries) {
    if (!BINDING_PATTERN.test(key) || seen.has(key) || typeof value !== 'string') fail('INVALID_INPUT');
    seen.add(key);
    const length = Buffer.byteLength(value.normalize('NFC'), 'utf8');
    if (length === 0 || length > 512) fail('INVALID_INPUT');
  }
}

function lengthPrefixed(value: string): Buffer {
  const content = Buffer.from(value.normalize('NFC'), 'utf8');
  const header = Buffer.alloc(4);
  header.writeUInt32BE(content.length);
  return Buffer.concat([header, content]);
}

/** Canonical binary AAD; named bindings are sorted and every field is length-prefixed. */
export function encodeSensitiveFieldAad(context: SensitiveFieldContext): Buffer {
  requireContext(context);
  const entries = Object.entries(context.bindings).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
  return Buffer.concat([
    Buffer.from('noma:aad:v1\0', 'utf8'),
    lengthPrefixed(context.environment),
    lengthPrefixed(context.purpose),
    ...entries.flatMap(([key, value]) => [lengthPrefixed(key), lengthPrefixed(value)]),
  ]);
}

export function parseEncryptedEnvelope(value: unknown): EncryptedEnvelopeV1 {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) fail('INVALID_ENVELOPE');
  const record = value as Record<string, unknown>;
  const required = ['format', 'version', 'contentAlgorithm', 'providerId', 'keyReference', 'contextVersion', 'wrappedDataKey', 'nonce', 'authenticationTag', 'ciphertext'];
  const allowed = new Set([...required, 'keyMaterialId']);
  if (Object.keys(record).some((key) => !allowed.has(key)) || required.some((key) => !Object.hasOwn(record, key))) fail('INVALID_ENVELOPE');
  if (record.format !== FORMAT || record.version !== 1 || record.contentAlgorithm !== 'A256GCM' || record.contextVersion !== 1) fail('INVALID_ENVELOPE');
  if (record.providerId !== 'aws-kms' && record.providerId !== 'test-only') fail('INVALID_ENVELOPE');
  if (typeof record.keyReference !== 'string' || record.keyReference.length < 8 || record.keyReference.length > 256 || /\s/.test(record.keyReference)) fail('INVALID_ENVELOPE');
  if (record.keyMaterialId !== undefined && (typeof record.keyMaterialId !== 'string' || !/^[A-Za-z0-9-]{1,128}$/.test(record.keyMaterialId))) fail('INVALID_ENVELOPE');
  for (const key of ['wrappedDataKey', 'nonce', 'authenticationTag', 'ciphertext']) {
    if (typeof record[key] !== 'string') fail('INVALID_ENVELOPE');
  }
  bytes(record.wrappedDataKey as string, 16, MAX_WRAPPED_KEY_BYTES);
  bytes(record.nonce as string, 12, 12);
  bytes(record.authenticationTag as string, 16, 16);
  bytes(record.ciphertext as string, 1, MAX_FIELD_BYTES);
  return value as EncryptedEnvelopeV1;
}

function providerContext(context: SensitiveFieldContext): ManagedKeyContext {
  return Object.freeze({ application: 'noma', environment: context.environment, purpose: context.purpose, contextVersion: '1' });
}

function assertCapability(capability: SensitiveFieldCapability, context: SensitiveFieldContext, operation: EncryptionOperation): void {
  requireContext(context);
  if (capability.environment !== context.environment || capability.purpose !== context.purpose || !capability.operations.includes(operation)) fail('CAPABILITY_DENIED');
  if (capability.principal === 'api' && operation === 'rewrap') fail('CAPABILITY_DENIED');
  if (!['api', 'migration', 'test'].includes(capability.principal)) fail('CAPABILITY_DENIED');
}

function assertProvider(provider: ManagedKeyProvider, envelope: EncryptedEnvelopeV1): void {
  if (envelope.providerId !== provider.providerId || envelope.keyReference !== provider.keyReference) fail('KEY_UNAVAILABLE');
}

export class SensitiveFieldProtector {
  constructor(readonly provider: ManagedKeyProvider, readonly capability: SensitiveFieldCapability) {
    if (provider.providerId === 'test-only' && !['development', 'test'].includes(capability.environment)) fail('CAPABILITY_DENIED');
    if (capability.principal === 'test' && !['development', 'test'].includes(capability.environment)) fail('CAPABILITY_DENIED');
    if (capability.principal === 'migration' && !capability.operations.includes('rewrap')) fail('CAPABILITY_DENIED');
  }

  async encrypt(plaintext: Uint8Array, context: SensitiveFieldContext, signal?: AbortSignal): Promise<EncryptedEnvelopeV1> {
    assertCapability(this.capability, context, 'encrypt');
    if (plaintext.length < 1 || plaintext.length > MAX_FIELD_BYTES) fail('INVALID_INPUT');
    let plaintextKey: Uint8Array | undefined;
    let key: Buffer | undefined;
    try {
      const generated = await this.provider.generateDataKey(providerContext(context), signal);
      plaintextKey = generated.plaintextKey;
      if (generated.keyReference !== this.provider.keyReference || plaintextKey.length !== 32) fail('KEY_UNAVAILABLE');
      if (generated.wrappedKey.length < 16 || generated.wrappedKey.length > MAX_WRAPPED_KEY_BYTES) fail('KEY_UNAVAILABLE');
      key = Buffer.from(plaintextKey);
      const nonce = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', key, nonce);
      cipher.setAAD(encodeSensitiveFieldAad(context));
      const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
      return Object.freeze({
        format: FORMAT,
        version: 1,
        contentAlgorithm: 'A256GCM',
        providerId: this.provider.providerId,
        keyReference: generated.keyReference,
        ...(generated.keyMaterialId ? { keyMaterialId: generated.keyMaterialId } : {}),
        contextVersion: 1,
        wrappedDataKey: Buffer.from(generated.wrappedKey).toString('base64url'),
        nonce: nonce.toString('base64url'),
        authenticationTag: cipher.getAuthTag().toString('base64url'),
        ciphertext: ciphertext.toString('base64url'),
      });
    } catch (error) {
      if (error instanceof SafeEncryptionError) throw error;
      return fail('KEY_UNAVAILABLE');
    } finally {
      key?.fill(0);
      plaintextKey?.fill(0);
    }
  }

  async decrypt(rawEnvelope: unknown, context: SensitiveFieldContext, signal?: AbortSignal): Promise<Buffer> {
    assertCapability(this.capability, context, 'decrypt');
    const envelope = parseEncryptedEnvelope(rawEnvelope);
    assertProvider(this.provider, envelope);
    let plaintextKey: Uint8Array | undefined;
    let key: Buffer | undefined;
    try {
      plaintextKey = await this.provider.unwrapDataKey(bytes(envelope.wrappedDataKey, 16, MAX_WRAPPED_KEY_BYTES), providerContext(context), signal);
      if (plaintextKey.length !== 32) fail('KEY_UNAVAILABLE');
      key = Buffer.from(plaintextKey);
      const decipher = createDecipheriv('aes-256-gcm', key, bytes(envelope.nonce, 12, 12));
      decipher.setAAD(encodeSensitiveFieldAad(context));
      decipher.setAuthTag(bytes(envelope.authenticationTag, 16, 16));
      return Buffer.concat([decipher.update(bytes(envelope.ciphertext, 1, MAX_FIELD_BYTES)), decipher.final()]);
    } catch (error) {
      if (error instanceof SafeEncryptionError) throw error;
      return fail('AUTHENTICATION_FAILED');
    } finally {
      key?.fill(0);
      plaintextKey?.fill(0);
    }
  }

  async rewrap(rawEnvelope: unknown, context: SensitiveFieldContext, destinationKeyReference: string, signal?: AbortSignal): Promise<EncryptedEnvelopeV1> {
    assertCapability(this.capability, context, 'rewrap');
    const envelope = parseEncryptedEnvelope(rawEnvelope);
    assertProvider(this.provider, envelope);
    if (!destinationKeyReference || /\s/.test(destinationKeyReference)) fail('INVALID_INPUT');
    try {
      const result = await this.provider.rewrapDataKey(bytes(envelope.wrappedDataKey, 16, MAX_WRAPPED_KEY_BYTES), providerContext(context), destinationKeyReference, signal);
      if (result.keyReference !== destinationKeyReference || result.wrappedKey.length < 16 || result.wrappedKey.length > MAX_WRAPPED_KEY_BYTES) fail('KEY_UNAVAILABLE');
      return Object.freeze({
        format: envelope.format,
        version: envelope.version,
        contentAlgorithm: envelope.contentAlgorithm,
        providerId: envelope.providerId,
        keyReference: result.keyReference,
        ...(result.keyMaterialId ? { keyMaterialId: result.keyMaterialId } : {}),
        contextVersion: envelope.contextVersion,
        wrappedDataKey: Buffer.from(result.wrappedKey).toString('base64url'),
        nonce: envelope.nonce,
        authenticationTag: envelope.authenticationTag,
        ciphertext: envelope.ciphertext,
      });
    } catch (error) {
      if (error instanceof SafeEncryptionError) throw error;
      fail('KEY_UNAVAILABLE');
    }
  }
}

/** Content re-encryption is distinct from a KEK-only rewrap. */
export async function fullyReencryptSensitiveField(
  source: SensitiveFieldProtector,
  target: SensitiveFieldProtector,
  rawEnvelope: unknown,
  sourceContext: SensitiveFieldContext,
  targetContext: SensitiveFieldContext,
  signal?: AbortSignal,
): Promise<EncryptedEnvelopeV1> {
  const plaintext = await source.decrypt(rawEnvelope, sourceContext, signal);
  try {
    return await target.encrypt(plaintext, targetContext, signal);
  } finally {
    plaintext.fill(0);
  }
}
