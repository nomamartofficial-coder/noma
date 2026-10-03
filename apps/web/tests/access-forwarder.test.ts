import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('server-only', () => ({}));
import { forwardAccessOperation, isAccessForwardOperation } from '../src/admin/access-forwarder.server';
import { POST as selectScope } from '../src/app/api/admin-access/select-scope/route';

const WEB = 'https://web.noma.test';
const API = 'https://api.noma.test';

function request(operation: string, options: Readonly<{ origin?: string; csrf?: string; cookie?: string; path?: string }> = {}) {
  return new Request(`${WEB}/api/admin-access/${options.path ?? operation}`, {
    method: 'POST', headers: {
      Origin: options.origin ?? WEB,
      'X-CSRF-Token': options.csrf ?? 'noma-admin-v1',
      'Content-Type': 'application/json',
      ...(options.cookie === undefined ? {} : { Cookie: options.cookie }),
    }, body: JSON.stringify({ scopeId: 'synthetic-scope' }),
  });
}

describe('IAM-009 same-origin Access transport', () => {
  beforeEach(() => {
    vi.stubEnv('NOMA_ENV', 'preview');
    vi.stubEnv('NEXT_PUBLIC_NOMA_ENV', 'preview');
    vi.stubEnv('PUBLIC_WEB_ORIGIN', WEB);
    vi.stubEnv('API_PUBLIC_URL', API);
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  test('uses one server-owned exact upstream and forwards only the session cookie', async () => {
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toBe(`${API}/api/v1/admin/access/reviews/query`);
      expect(init.headers).toMatchObject({
        Origin: WEB, 'X-CSRF-Token': 'noma-admin-v1', Cookie: '__Host-noma_session=synthetic-token',
      });
      expect(JSON.stringify(init.headers)).not.toContain('other_cookie');
      return new Response(JSON.stringify({ rows: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);
    const response = await forwardAccessOperation(request('review-query', {
      cookie: '__Host-noma_session=synthetic-token; other_cookie=never-forward',
    }), 'review-query');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ rows: [] });
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('fails closed for missing cookie, forged origin, CSRF, query, and unknown operation', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect((await forwardAccessOperation(request('review-query'), 'review-query')).status).toBe(404);
    expect((await forwardAccessOperation(request('review-query', { cookie: '__Host-noma_session=synthetic-token', origin: 'https://evil.test' }), 'review-query')).status).toBe(404);
    expect((await forwardAccessOperation(request('review-query', { cookie: '__Host-noma_session=synthetic-token', csrf: 'wrong' }), 'review-query')).status).toBe(404);
    expect((await forwardAccessOperation(request('review-query', { cookie: '__Host-noma_session=synthetic-token', path: 'review-query?target=https://evil.test' }), 'review-query')).status).toBe(404);
    expect(isAccessForwardOperation('https://evil.test')).toBe(false);
    expect(isAccessForwardOperation('audit-read')).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('fails closed when a Preview build lacks matching server-only configuration', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('NOMA_ENV', '');
    expect((await forwardAccessOperation(request('auth-sign-in'), 'auth-sign-in')).status).toBe(404);
    vi.stubEnv('NOMA_ENV', 'staging');
    expect((await forwardAccessOperation(request('auth-sign-in'), 'auth-sign-in')).status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('selects an exact scope only under matching Preview configuration', async () => {
    const select = () => selectScope(new Request(`${WEB}/api/admin-access/select-scope`, {
      method: 'POST', headers: {
        Origin: WEB, 'X-CSRF-Token': 'noma-admin-v1', 'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        scopeId: '11111111-1111-4111-8111-111111111111',
        authorityAssignmentId: '22222222-2222-4222-8222-222222222222',
      }),
    }));
    const accepted = await select();
    expect(accepted.status).toBe(200);
    expect(accepted.headers.get('set-cookie')).toContain('__Host-noma_access_scope=');
    expect(accepted.headers.get('set-cookie')).toContain('; Secure');
    vi.stubEnv('NOMA_ENV', '');
    const rejected = await select();
    expect(rejected.status).toBe(404);
    expect(rejected.headers.get('set-cookie')).toBeNull();
  });

  test('copies only a host-only HttpOnly sign-in cookie, never a browser token', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ status: 'SIGNED_IN' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': '__Host-noma_session=synthetic-token; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600; Secure',
      },
    })));
    const response = await forwardAccessOperation(request('auth-sign-in'), 'auth-sign-in');
    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    expect(await response.text()).not.toContain('synthetic-token');
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  test('rejects an upstream cookie with a Domain attribute', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ status: 'SIGNED_IN' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': '__Host-noma_session=synthetic-token; Path=/; Domain=.noma.test; HttpOnly; SameSite=Lax; Secure',
      },
    })));
    expect((await forwardAccessOperation(request('auth-sign-in'), 'auth-sign-in')).status).toBe(503);
  });
});
