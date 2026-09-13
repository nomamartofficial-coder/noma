import { describe, expect, it } from 'vitest';

import { createTotpSeed, digestRecoveryCode, generateRecoveryCodes, matchTotpTimeStep, TOTP_PROFILE } from '../src/mfa.js';

describe('IAM-004 TOTP and recovery material', () => {
  it('uses the RFC 6238 SHA-1 vector with the six-digit authenticator profile', () => {
    const secret = Buffer.from('12345678901234567890', 'ascii');
    expect(TOTP_PROFILE).toMatchObject({ algorithm: 'SHA1', digits: 6, periodSeconds: 30, seedBytes: 20, skewSteps: 1 });
    expect(matchTotpTimeStep(secret, '287082', new Date(59_000))).toBe(1n);
    expect(matchTotpTimeStep(secret, '287082', new Date(89_999))).toBe(1n);
    expect(matchTotpTimeStep(secret, '287082', new Date(120_000))).toBeNull();
    expect(matchTotpTimeStep(secret, '28708', new Date(59_000))).toBeNull();
    expect(matchTotpTimeStep(secret, 'x87082', new Date(59_000))).toBeNull();
  });

  it('creates independently random 160-bit secrets and ten one-time 128-bit codes', () => {
    const first = createTotpSeed();
    const second = createTotpSeed();
    try {
      expect(first.bytes).toHaveLength(20);
      expect(first.bytes.equals(second.bytes)).toBe(false);
      expect(first.provisioningUri).toMatch(/^otpauth:\/\/totp\//);
      const codes = generateRecoveryCodes();
      expect(codes).toHaveLength(10);
      expect(new Set(codes).size).toBe(10);
      expect(codes.every((code) => Buffer.from(code, 'base64url').length === 16)).toBe(true);
      expect(digestRecoveryCode(codes[0]!)).toMatch(/^[a-f0-9]{64}$/);
      expect(digestRecoveryCode('bad')).toBeNull();
      expect(digestRecoveryCode(codes[0]!)).not.toContain(codes[0]!);
    } finally {
      first.bytes.fill(0);
      second.bytes.fill(0);
    }
  });
});
