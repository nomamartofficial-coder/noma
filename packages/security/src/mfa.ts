import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import { Secret, TOTP } from 'otpauth';

export const TOTP_PROFILE = Object.freeze({ algorithm: 'SHA1', digits: 6, periodSeconds: 30, seedBytes: 20, skewSteps: 1 });
export const RECOVERY_CODE_COUNT = 10;
const CODE_PATTERN = /^[A-Za-z0-9_-]{22}$/;
const OTP_PATTERN = /^[0-9]{6}$/;

export interface TotpSeed {
  readonly bytes: Buffer;
  readonly provisioningUri: string;
}

function totp(seed: Uint8Array): TOTP {
  if (seed.length !== TOTP_PROFILE.seedBytes) throw new Error('Invalid authenticator profile');
  return new TOTP({
    issuer: 'Noma', label: 'Noma account',
    secret: Secret.fromHex(Buffer.from(seed).toString('hex')),
    algorithm: TOTP_PROFILE.algorithm,
    digits: TOTP_PROFILE.digits,
    period: TOTP_PROFILE.periodSeconds,
  });
}

/** The URI and seed are response-only secrets. The caller must clear bytes after encryption. */
export function createTotpSeed(): TotpSeed {
  const bytes = randomBytes(TOTP_PROFILE.seedBytes);
  return { bytes, provisioningUri: totp(bytes).toString() };
}

/** Return the greatest matching allowed step to make an ambiguous OTP replay-safe. */
export function matchTotpTimeStep(seed: Uint8Array, token: string, at: Date): bigint | null {
  if (!OTP_PATTERN.test(token) || Number.isNaN(at.getTime())) return null;
  const profile = totp(seed);
  const step = Math.floor(at.getTime() / (TOTP_PROFILE.periodSeconds * 1_000));
  let matched: bigint | null = null;
  for (let offset = -TOTP_PROFILE.skewSteps; offset <= TOTP_PROFILE.skewSteps; offset += 1) {
    const candidateStep = step + offset;
    if (candidateStep < 0) continue;
    const expected = Buffer.from(profile.generate({ timestamp: candidateStep * TOTP_PROFILE.periodSeconds * 1_000 }), 'ascii');
    if (timingSafeEqual(expected, Buffer.from(token, 'ascii'))) matched = BigInt(candidateStep);
  }
  return matched;
}

export function generateRecoveryCodes(): readonly string[] {
  return Object.freeze(Array.from({ length: RECOVERY_CODE_COUNT }, () => randomBytes(16).toString('base64url')));
}

/** A uniformly random 128-bit code is safe to identify by a one-way SHA-256 digest. */
export function digestRecoveryCode(code: string): string | null {
  if (!CODE_PATTERN.test(code)) return null;
  return createHash('sha256').update('noma:mfa-recovery:v1\0').update(code, 'ascii').digest('hex');
}
