import type { EnvironmentSource } from './model.js';

const SECRET_KEY_PATTERN = /(?:^|_)(?:SECRET|TOKEN|PASSWORD|PASSCODE|PRIVATE_KEY|ACCESS_KEY|API_KEY|WEBHOOK|DATABASE_URL|REDIS_URL|AUTHORIZATION|COOKIE|SESSION|ENCRYPTION|CREDENTIAL)(?:_|$)/i;
const LIVE_PROVIDER_KEY_PATTERN = /\b(?:sk_live|pk_live)_[A-Za-z0-9_-]+\b/g;
const AUTHORITY_PATTERN = /\b(?:postgres(?:ql)?|redis(?:s)?):\/\/[^\s:@/]+:[^\s@/]+@/gi;
const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9._~-]+/gi;
const PEM_BEGIN_MARKER = '-----BEGIN';
const PEM_BEGIN_PREFIX = '-----BEGIN ';
const PEM_END_PREFIX = '-----END ';
const MAX_PEM_LABEL_LENGTH = 64;

export const REDACTED_VALUE = '[REDACTED]' as const;

function findNextPemBegin(value: string, from: number): number {
  for (let index = from; index <= value.length - PEM_BEGIN_MARKER.length; index += 1) {
    if (value.slice(index, index + PEM_BEGIN_MARKER.length).toUpperCase() === PEM_BEGIN_MARKER) {
      return index;
    }
  }
  return -1;
}

function redactPrivateKeyBlocks(value: string): string {
  const parts: string[] = [];
  let cursor = 0;

  while (cursor < value.length) {
    const begin = findNextPemBegin(value, cursor);
    if (begin === -1) {
      parts.push(value.slice(cursor));
      break;
    }
    parts.push(value.slice(cursor, begin));

    if (value.slice(begin, begin + PEM_BEGIN_PREFIX.length).toUpperCase() !== PEM_BEGIN_PREFIX) {
      parts.push(REDACTED_VALUE);
      break;
    }
    const labelStart = begin + PEM_BEGIN_PREFIX.length;
    let labelEnd = labelStart;
    while (labelEnd - labelStart <= MAX_PEM_LABEL_LENGTH && labelEnd < value.length) {
      const character = value.charAt(labelEnd);
      if (!(character === ' ' || (character >= 'A' && character <= 'Z'))) break;
      labelEnd += 1;
    }
    const label = value.slice(labelStart, labelEnd);
    if (
      label.length === 0 ||
      label.length > MAX_PEM_LABEL_LENGTH ||
      !value.startsWith('-----', labelEnd)
    ) {
      parts.push(REDACTED_VALUE);
      break;
    }

    if (!label.endsWith('PRIVATE KEY')) {
      parts.push(value.slice(begin, labelEnd + 5));
      cursor = labelEnd + 5;
      continue;
    }

    const bodyStart = labelEnd + 5;
    const nextBegin = findNextPemBegin(value, bodyStart);
    const nextEnd = value.indexOf(PEM_END_PREFIX, bodyStart);
    const expectedEnd = `${PEM_END_PREFIX}${label}-----`;
    if (
      nextEnd === -1 ||
      (nextBegin !== -1 && nextBegin < nextEnd) ||
      !value.startsWith(expectedEnd, nextEnd)
    ) {
      parts.push(REDACTED_VALUE);
      break;
    }

    parts.push(REDACTED_VALUE);
    cursor = nextEnd + expectedEnd.length;
  }
  return parts.join('');
}

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
  return redactPrivateKeyBlocks(value)
    .replace(AUTHORITY_PATTERN, (match) => `${match.split('://')[0]}://${REDACTED_VALUE}@`)
    .replace(LIVE_PROVIDER_KEY_PATTERN, REDACTED_VALUE)
    .replace(BEARER_PATTERN, `Bearer ${REDACTED_VALUE}`);
}
