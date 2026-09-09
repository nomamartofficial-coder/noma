import { describe, expect, test } from 'vitest';

import {
  createAuthenticationCookiePolicy,
  readAuthenticationCookie,
  serializeAuthenticationCookie,
} from '../src/auth/auth-cookie.js';

describe('IAM-002 authentication cookie boundary', () => {
  test('remote environments use a secure host-only opaque session cookie', () => {
    const policy = createAuthenticationCookiePolicy('production', 30 * 24 * 60 * 60_000);
    const serialized = serializeAuthenticationCookie(policy, 'opaque-session-token');

    expect(policy.name).toBe('__Host-noma_session');
    expect(serialized).toBe('__Host-noma_session=opaque-session-token; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000; Secure');
    expect(serialized).not.toContain('Domain=');
  });

  test('local tests remain HTTP-compatible and clearing preserves protections', () => {
    const policy = createAuthenticationCookiePolicy('test', 60_000);

    expect(serializeAuthenticationCookie(policy, 'test-token')).toBe(
      'noma_session=test-token; Path=/; HttpOnly; SameSite=Lax; Max-Age=60',
    );
    expect(serializeAuthenticationCookie(policy, undefined)).toBe(
      'noma_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
    );
  });

  test('cookie parsing is bounded and rejects malformed token representations', () => {
    const policy = createAuthenticationCookiePolicy('production', 60_000);

    expect(readAuthenticationCookie('other=1; __Host-noma_session=safe-token', policy)).toBe('safe-token');
    expect(readAuthenticationCookie('__Host-noma_session=unsafe token', policy)).toBeUndefined();
    expect(readAuthenticationCookie(`__Host-noma_session=${'a'.repeat(8_192)}`, policy)).toBeUndefined();
    expect(() => serializeAuthenticationCookie(policy, 'unsafe;token')).toThrow(/invalid/u);
  });
});
