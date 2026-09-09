import type { ApplicationEnvironment } from '@noma/config/server';

export interface AuthenticationCookiePolicy {
  readonly name: '__Host-noma_session' | 'noma_session';
  readonly secure: boolean;
  readonly maximumAgeSeconds: number;
}

export function createAuthenticationCookiePolicy(
  environment: ApplicationEnvironment,
  absoluteMilliseconds: number,
): AuthenticationCookiePolicy {
  if (!Number.isSafeInteger(absoluteMilliseconds) || absoluteMilliseconds <= 0) {
    throw new Error('authentication cookie lifetime must be a positive safe integer');
  }
  const secure = ['preview', 'staging', 'production'].includes(environment);
  return Object.freeze({
    name: secure ? '__Host-noma_session' : 'noma_session',
    secure,
    maximumAgeSeconds: Math.floor(absoluteMilliseconds / 1_000),
  });
}

export function serializeAuthenticationCookie(
  policy: AuthenticationCookiePolicy,
  rawToken: string | undefined,
): string {
  if (rawToken !== undefined && (!rawToken || /[;\s]/u.test(rawToken))) {
    throw new Error('authentication cookie token is invalid');
  }
  const maximumAge = rawToken === undefined ? 0 : policy.maximumAgeSeconds;
  return `${policy.name}=${rawToken ?? ''}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maximumAge}${policy.secure ? '; Secure' : ''}`;
}

export function readAuthenticationCookie(
  cookieHeader: string | undefined,
  policy: AuthenticationCookiePolicy,
): string | undefined {
  if (!cookieHeader || cookieHeader.length > 8_192) return undefined;
  for (const item of cookieHeader.split(';')) {
    const separator = item.indexOf('=');
    if (separator < 1 || item.slice(0, separator).trim() !== policy.name) continue;
    const value = item.slice(separator + 1).trim();
    return value && !/[;\s]/u.test(value) ? value : undefined;
  }
  return undefined;
}
