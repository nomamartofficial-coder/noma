import { DecryptCommand, GenerateDataKeyCommand, ReEncryptCommand } from '@aws-sdk/client-kms';
import { describe, expect, test } from 'vitest';

import { AwsKmsManagedKeyProvider } from '../src/aws-kms-managed-key-provider.js';

const source = 'arn:aws:kms:eu-central-1:111122223333:key/12345678-1234-1234-1234-123456789abc';
const destination = 'arn:aws:kms:eu-central-1:111122223333:key/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const context = { application: 'noma', environment: 'staging', purpose: 'noma:mfa-seed', contextVersion: '1' } as const;

describe('SEC-003 AWS KMS adapter contract without network', () => {
  test('GenerateDataKey, Decrypt and ReEncrypt map only privacy-safe context', async () => {
    const commands: Array<GenerateDataKeyCommand | DecryptCommand | ReEncryptCommand> = [];
    const provider = new AwsKmsManagedKeyProvider({
      keyReference: source,
      destinationKeyReferences: [destination],
      send: async (command) => {
        commands.push(command);
        if (command instanceof GenerateDataKeyCommand) return { KeyId: source, Plaintext: Uint8Array.from({ length: 32 }, () => 7), CiphertextBlob: Uint8Array.from({ length: 64 }, () => 8) };
        if (command instanceof DecryptCommand) return { KeyId: source, Plaintext: Uint8Array.from({ length: 32 }, () => 7) };
        return { KeyId: destination, CiphertextBlob: Uint8Array.from({ length: 64 }, () => 9) };
      },
    });
    const generated = await provider.generateDataKey(context);
    expect(generated.plaintextKey).toHaveLength(32);
    expect(generated.wrappedKey).toHaveLength(64);
    expect(await provider.unwrapDataKey(generated.wrappedKey, context)).toHaveLength(32);
    expect((await provider.rewrapDataKey(generated.wrappedKey, context, destination)).keyReference).toBe(destination);
    expect(commands).toHaveLength(3);
    expect(commands[0]).toBeInstanceOf(GenerateDataKeyCommand);
    expect(commands[1]).toBeInstanceOf(DecryptCommand);
    expect(commands[2]).toBeInstanceOf(ReEncryptCommand);
    const contextText = JSON.stringify(commands.map((command) => command.input));
    expect(contextText).toContain('noma:mfa-seed');
    expect(contextText).not.toContain('synthetic-user');
    expect(contextText).not.toContain('factorId');
    expect((commands[0] as GenerateDataKeyCommand).input.KeySpec).toBe('AES_256');
    expect((commands[2] as ReEncryptCommand).input.DestinationKeyId).toBe(destination);
  });

  test('wrong region, unexpected output key and unapproved destination fail closed', async () => {
    expect(() => new AwsKmsManagedKeyProvider({ keyReference: source.replace('eu-central-1', 'us-east-1') })).toThrow();
    const provider = new AwsKmsManagedKeyProvider({ keyReference: source, send: async () => ({ KeyId: destination, Plaintext: new Uint8Array(32), CiphertextBlob: new Uint8Array(64) }) });
    await expect(provider.generateDataKey(context)).rejects.toThrow();
    await expect(provider.rewrapDataKey(new Uint8Array(64), context, destination)).rejects.toThrow();
    await expect(provider.generateDataKey({ ...context, environment: 'test' })).rejects.toThrow();
  });

  test('KMS transport failure discards private diagnostics', async () => {
    const provider = new AwsKmsManagedKeyProvider({
      keyReference: source,
      send: async () => { throw new Error('private provider credential and account diagnosis'); },
    });
    await expect(provider.generateDataKey(context)).rejects.toThrow('Managed key service unavailable');
    await expect(provider.generateDataKey(context)).rejects.not.toThrow('private provider credential');
  });
});
