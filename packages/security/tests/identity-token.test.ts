import { describe, expect, test } from 'vitest';
import { OneTimeIdentityTokenIssuer } from '../src/index.js';

describe('IAM-003 one-time identity proof issuer', () => {
  test('issues 256-bit base64url material and stores only a SHA-256 digest', () => {
    const issuer = new OneTimeIdentityTokenIssuer();
    const first = issuer.issue();
    const second = issuer.issue();
    expect(first.rawToken).toMatch(/^[A-Za-z0-9_-]{43}$/u);
    expect(first.tokenDigest).toMatch(/^[a-f0-9]{64}$/u);
    expect(first.tokenDigest).toBe(issuer.digest(first.rawToken));
    expect(second.rawToken).not.toBe(first.rawToken);
    expect(JSON.stringify({ tokenDigest: first.tokenDigest })).not.toContain(first.rawToken);
  });

  test('rejects malformed, padded, and non-base64url representations', () => {
    const issuer = new OneTimeIdentityTokenIssuer();
    for (const candidate of ['', 'short', `${'a'.repeat(42)}=`, `${'a'.repeat(42)}+`]) {
      expect(() => issuer.digest(candidate)).toThrow(/malformed/u);
    }
  });
});

