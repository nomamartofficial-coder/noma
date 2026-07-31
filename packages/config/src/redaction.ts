import type { EnvironmentSource } from './model.js';

const SECRET_KEY_PATTERN = /(?:^|_)(?:SECRET|TOKEN|PASSWORD|PASSCODE|PRIVATE_KEY|ACCESS_KEY|API_KEY|WEBHOOK|DATABASE_URL|REDIS_URL|AUTHORIZATION|COOKIE|SESSION|ENCRYPTION|CREDENTIAL)(?:_|$)/i;
const LIVE_PROVIDER_KEY_PATTERN = /\b(?:sk_live|pk_live)_[A-Za-z0-9_-]+\b/g;
const AUTHORITY_PATTERN = /\b(?:postgres(?:ql)?|redis(?:s)?):\/\/[^\s:@/]+:[^\s@/]+@/gi;
const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9._~-]+/gi;
const PRIVATE_KEY_PATTERN = /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g;

export const REDACTED_VALUE = '[REDACTED]' as const;

export function isSecretEnvironmentKey(key: string): boolean {
  return SECRET_KEY_PATTERN.test(key);
}

export function redactEnvironment(source: EnvironmentSource): Readonly<Record<string, string | undefined>> {
  const result: Record<string, string | undefined> = {};

  for (const [key, value] of Object.entries(source)) {
    result[key] = isSecretEnvironmentKey(key) && value ? REDACTED_VALUE : value;
  }

  return Object.freeze(result);
}

export function redactText(value: string): string {
  return value
    .replace(PRIVATE_KEY_PATTERN, REDACTED_VALUE)
    .replace(AUTHORITY_PATTERN, (match) => `${match.split('://')[0]}://${REDACTED_VALUE}@`)
    .replace(LIVE_PROVIDER_KEY_PATTERN, REDACTED_VALUE)
    .replace(BEARER_PATTERN, `Bearer ${REDACTED_VALUE}`);
}
