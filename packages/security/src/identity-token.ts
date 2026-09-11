import { createHash, randomBytes } from 'node:crypto';

const RAW_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export interface OneTimeIdentityToken {
  readonly rawToken: string;
  readonly tokenDigest: string;
}

/** Issues purpose-bound identity proofs. Session tokens deliberately use another issuer. */
export class OneTimeIdentityTokenIssuer {
  issue(): OneTimeIdentityToken {
    const rawToken = randomBytes(32).toString('base64url');
    return Object.freeze({ rawToken, tokenDigest: this.digest(rawToken) });
  }

  digest(rawToken: string): string {
    if (!RAW_TOKEN_PATTERN.test(rawToken)) throw new Error('identity token is malformed');
    return createHash('sha256').update(rawToken, 'utf8').digest('hex');
  }
}

