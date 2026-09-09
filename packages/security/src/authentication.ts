import { createHash, randomBytes } from 'node:crypto';

import { dictionary } from '@zxcvbn-ts/language-common';
import { argon2id, hash, needsRehash, verify } from 'argon2';

export const PASSWORD_HASH_POLICY_VERSION = 1;
export const PASSWORD_MINIMUM_CODE_POINTS = 15;
export const PASSWORD_MAXIMUM_CODE_POINTS = 128;
export const ARGON2ID_POLICY = Object.freeze({
  memoryCost: 65_536,
  timeCost: 3,
  parallelism: 1,
  hashLength: 32,
  type: argon2id,
});

const NOMA_CONTEXT_PASSWORDS = Object.freeze([
  'covenantuniversity',
  'nomamarketplace',
  'nomamartpassword',
]);

const BLOCKED_PASSWORDS = new Set<string>([
  ...dictionary['passwords-common'],
  ...dictionary['diceware-common'],
  ...NOMA_CONTEXT_PASSWORDS,
].map((value) => value.normalize('NFC')));

export class PasswordPolicyError extends Error {
  readonly code: 'PASSWORD_INVALID' | 'PASSWORD_BLOCKED';

  constructor(code: PasswordPolicyError['code'], message: string) {
    super(message);
    this.name = 'PasswordPolicyError';
    this.code = code;
  }
}

function hasUnpairedSurrogate(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return true;
    }
  }
  return false;
}

export class OfflinePasswordPolicy {
  validate(password: string): string {
    if (typeof password !== 'string') {
      throw new PasswordPolicyError('PASSWORD_INVALID', 'password must be text');
    }
    const normalized = password.normalize('NFC');
    const length = [...normalized].length;
    if (length < PASSWORD_MINIMUM_CODE_POINTS || length > PASSWORD_MAXIMUM_CODE_POINTS) {
      throw new PasswordPolicyError(
        'PASSWORD_INVALID',
        `password must contain ${PASSWORD_MINIMUM_CODE_POINTS} to ${PASSWORD_MAXIMUM_CODE_POINTS} Unicode characters`,
      );
    }
    if (/\p{Cc}/u.test(normalized) || hasUnpairedSurrogate(normalized)) {
      throw new PasswordPolicyError('PASSWORD_INVALID', 'password must contain printable Unicode text');
    }
    if (BLOCKED_PASSWORDS.has(normalized)) {
      throw new PasswordPolicyError('PASSWORD_BLOCKED', 'password is present in the offline blocklist');
    }
    return normalized;
  }
}

export class Argon2idPasswordHasher {
  readonly algorithm = 'ARGON2ID' as const;
  readonly policyVersion = PASSWORD_HASH_POLICY_VERSION;

  async hash(password: string): Promise<string> {
    return hash(password, ARGON2ID_POLICY);
  }

  async verify(encodedHash: string, password: string): Promise<boolean> {
    try {
      return await verify(encodedHash, password);
    } catch {
      return false;
    }
  }

  needsRehash(encodedHash: string, storedPolicyVersion: number): boolean {
    if (storedPolicyVersion !== this.policyVersion) return true;
    try {
      return needsRehash(encodedHash, ARGON2ID_POLICY);
    } catch {
      return true;
    }
  }
}

export class OpaqueSessionTokenIssuer {
  issue(): Readonly<{ rawToken: string; tokenDigest: string }> {
    const rawToken = randomBytes(32).toString('base64url');
    return Object.freeze({ rawToken, tokenDigest: this.digest(rawToken) });
  }

  digest(rawToken: string): string {
    if (typeof rawToken !== 'string' || rawToken.length < 32 || rawToken.length > 256 || /\s/u.test(rawToken)) {
      throw new Error('session token is malformed');
    }
    return createHash('sha256').update(rawToken, 'utf8').digest('hex');
  }
}

export async function calibrateArgon2id(samples = 3): Promise<Readonly<{ samples: readonly number[]; medianMilliseconds: number }>> {
  if (!Number.isSafeInteger(samples) || samples < 1 || samples > 10) {
    throw new RangeError('calibration samples must be an integer from 1 to 10');
  }
  const durations: number[] = [];
  for (let index = 0; index < samples; index += 1) {
    const started = performance.now();
    await hash('synthetic calibration passphrase 2026', ARGON2ID_POLICY);
    durations.push(performance.now() - started);
  }
  const sorted = [...durations].sort((left, right) => left - right);
  return Object.freeze({
    samples: Object.freeze(durations),
    medianMilliseconds: sorted[Math.floor(sorted.length / 2)] ?? 0,
  });
}
