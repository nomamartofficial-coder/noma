import { describe, expect, test } from 'vitest';

import {
  Argon2idPasswordHasher,
  OfflinePasswordPolicy,
  OpaqueSessionTokenIssuer,
  PASSWORD_HASH_POLICY_VERSION,
  PasswordPolicyError,
} from '../src/authentication.js';

describe('IAM-002 password and session cryptography', () => {
  const policy = new OfflinePasswordPolicy();

  test('enforces 15 to 128 Unicode code points without trimming or composition rules', () => {
    expect(() => policy.validate('short-phrase!')).toThrow(PasswordPolicyError);
    expect(policy.validate('  intentional spaces around a passphrase  ')).toBe('  intentional spaces around a passphrase  ');
    expect(policy.validate('🔐'.repeat(15))).toBe('🔐'.repeat(15));
    expect(() => policy.validate('x'.repeat(129))).toThrow(PasswordPolicyError);
    expect(() => policy.validate(`valid passphrase\u0000`)).toThrow(PasswordPolicyError);
  });

  test('uses NFC whole-password blocklist comparison without substring rejection', () => {
    expect(() => policy.validate('passwordpassword')).toThrowError(expect.objectContaining({ code: 'PASSWORD_BLOCKED' }));
    expect(() => policy.validate('covenantuniversity')).toThrowError(expect.objectContaining({ code: 'PASSWORD_BLOCKED' }));
    expect(policy.validate('prefix-passwordpassword-suffix')).toBe('prefix-passwordpassword-suffix');
    expect(policy.validate(`Cafe\u0301 has a long private phrase`)).toBe('Café has a long private phrase');
  });

  test('hashes with independent Argon2id salts and verifies without exposing plaintext', async () => {
    const hasher = new Argon2idPasswordHasher();
    const password = 'A long synthetic passphrase for Noma';
    const first = await hasher.hash(password);
    const second = await hasher.hash(password);
    expect(first).toMatch(/^\$argon2id\$v=19\$m=65536,p=1,t=3\$/);
    expect(second).not.toBe(first);
    await expect(hasher.verify(first, password)).resolves.toBe(true);
    await expect(hasher.verify(first, 'wrong synthetic passphrase')).resolves.toBe(false);
    expect(hasher.policyVersion).toBe(PASSWORD_HASH_POLICY_VERSION);
    expect(hasher.needsRehash(first, PASSWORD_HASH_POLICY_VERSION)).toBe(false);
    expect(hasher.needsRehash(first, 0)).toBe(true);
  });

  test('issues fresh 256-bit opaque session secrets and SHA-256 digests', () => {
    const issuer = new OpaqueSessionTokenIssuer();
    const first = issuer.issue();
    const second = issuer.issue();
    expect(first.rawToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(first.tokenDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(first.rawToken).not.toBe(second.rawToken);
    expect(first.tokenDigest).not.toBe(second.tokenDigest);
    expect(issuer.digest(first.rawToken)).toBe(first.tokenDigest);
    expect(() => issuer.digest('short')).toThrow('malformed');
  });
});
