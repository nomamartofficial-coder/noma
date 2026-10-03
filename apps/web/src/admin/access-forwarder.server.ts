import 'server-only';

const ACCESS_PATHS = Object.freeze({
  'assignment-grant-request': '/api/v1/admin/access/assignments/grant/request',
  'assignment-revoke-request': '/api/v1/admin/access/assignments/revoke/request',
  'temporary-grant-request': '/api/v1/admin/access/temporary/grant/request',
  'temporary-revoke-request': '/api/v1/admin/access/temporary/revoke/request',
  'approval-decide': '/api/v1/admin/access/approvals/decide',
  'approval-query': '/api/v1/admin/access/approvals/query',
  'assignment-grant-execute': '/api/v1/admin/access/assignments/grant/execute',
  'assignment-revoke-execute': '/api/v1/admin/access/assignments/revoke/execute',
  'temporary-grant-execute': '/api/v1/admin/access/temporary/grant/execute',
  'temporary-revoke-execute': '/api/v1/admin/access/temporary/revoke/execute',
  'assignment-query': '/api/v1/admin/access/assignments/query',
  'review-query': '/api/v1/admin/access/reviews/query',
  'review-attest': '/api/v1/admin/access/reviews/attest',
  'export-request': '/api/v1/admin/access/exports/request',
  'export-decide': '/api/v1/admin/access/exports/decide',
  'export-approval-query': '/api/v1/admin/access/exports/approvals/query',
  'export-execute': '/api/v1/admin/access/exports/execute',
  'auth-sign-in': '/api/v1/auth/sign-in',
  'auth-sign-out': '/api/v1/auth/sign-out',
  'auth-session': '/api/v1/auth/session',
  'auth-step-up-request': '/api/v1/auth/step-up/request',
  'auth-step-up-password': '/api/v1/auth/step-up/password',
  'auth-step-up-totp': '/api/v1/auth/step-up/totp',
  'auth-step-up-recovery-code': '/api/v1/auth/step-up/recovery-code',
} as const);

export type AccessForwardOperation = keyof typeof ACCESS_PATHS;

export function isAccessForwardOperation(value: string): value is AccessForwardOperation {
  return Object.hasOwn(ACCESS_PATHS, value);
}

function unavailable(status = 404): Response {
  return Response.json({ status: 'UNAVAILABLE' }, { status, headers: { 'Cache-Control': 'no-store' } });
}

function exactOrigin(value: string | undefined, remote: boolean): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash
      || (remote ? url.protocol !== 'https:' : !['http:', 'https:'].includes(url.protocol))) return null;
    return url.origin;
  } catch { return null; }
}

function origins(): Readonly<{ web: string; api: string; secure: boolean }> | null {
  const serverEnvironment = process.env.NOMA_ENV ?? '';
  const publicEnvironment = process.env.NEXT_PUBLIC_NOMA_ENV ?? '';
  const remote = ['preview', 'staging', 'production'].includes(serverEnvironment);
  // A Preview build without matching server-only settings must never become a
  // localhost forwarder or downgrade its host-bound session cookie name.
  if (remote ? publicEnvironment !== serverEnvironment
    : ['preview', 'staging', 'production'].includes(publicEnvironment)) return null;
  const web = exactOrigin(process.env.PUBLIC_WEB_ORIGIN ?? (remote ? undefined : 'http://127.0.0.1:3000'), remote);
  const api = exactOrigin(process.env.API_PUBLIC_URL ?? (remote ? undefined : 'http://127.0.0.1:3001'), remote);
  return web && api ? { web, api, secure: remote } : null;
}

function sessionCookie(request: Request, secure: boolean): string | null {
  const cookieName = secure ? '__Host-noma_session' : 'noma_session';
  const raw = request.headers.get('cookie');
  if (!raw || raw.length > 8_192) return null;
  for (const component of raw.split(';')) {
    const separator = component.indexOf('=');
    if (separator < 1 || component.slice(0, separator).trim() !== cookieName) continue;
    const token = component.slice(separator + 1).trim();
    if (!token || token.length > 512 || /[;\s]/u.test(token)) return null;
    return `${cookieName}=${token}`;
  }
  return null;
}

function safeSetCookie(value: string | null, secure: boolean): string | null {
  if (!value) return null;
  const name = secure ? '__Host-noma_session' : 'noma_session';
  if (!value.startsWith(`${name}=`) || /(?:^|;)\s*Domain=/iu.test(value)
    || !/(?:^|;)\s*HttpOnly(?:;|$)/iu.test(value)
    || !/(?:^|;)\s*SameSite=Lax(?:;|$)/iu.test(value)
    || !/(?:^|;)\s*Path=\/(?:;|$)/iu.test(value)
    || (secure && !/(?:^|;)\s*Secure(?:;|$)/iu.test(value))) return null;
  return value;
}

/** Exact transport only: no client-selected upstream, policy, method, or path. */
export async function forwardAccessOperation(request: Request, operation: AccessForwardOperation): Promise<Response> {
  const path = ACCESS_PATHS[operation];
  const configured = origins();
  if (!path || !configured || new URL(request.url).search) return unavailable();
  const sessionRead = operation === 'auth-session';
  if (request.method !== (sessionRead ? 'GET' : 'POST')) return unavailable(405);
  if (!sessionRead && (request.headers.get('origin') !== configured.web
    || request.headers.get('x-csrf-token') !== 'noma-admin-v1'
    || !['same-origin', null].includes(request.headers.get('sec-fetch-site')))) return unavailable();
  const cookie = sessionCookie(request, configured.secure);
  if (!cookie && operation !== 'auth-sign-in') return unavailable();
  let body: string | undefined;
  if (!sessionRead) {
    if (request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !== 'application/json') return unavailable();
    body = await request.text();
    if (body.length > 16_384) return unavailable(413);
    try {
      const parsed: unknown = JSON.parse(body);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return unavailable();
    } catch { return unavailable(); }
  }
  try {
    const upstream = await fetch(`${configured.api}${path}`, {
      method: request.method, redirect: 'manual', cache: 'no-store',
      headers: {
        Origin: configured.web,
        'X-CSRF-Token': 'noma-admin-v1',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(cookie ? { Cookie: cookie } : {}),
      },
      ...(body === undefined ? {} : { body }),
    });
    if (upstream.status >= 300 && upstream.status < 400) return unavailable(503);
    if (!upstream.ok) return unavailable(upstream.status >= 500 ? 503 : upstream.status);
    if (upstream.status === 204 && operation === 'auth-sign-out') {
      const accepted = safeSetCookie(upstream.headers.get('set-cookie'), configured.secure);
      if (!accepted) return unavailable(503);
      return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store', 'Set-Cookie': accepted } });
    }
    const contentType = upstream.headers.get('content-type') ?? '';
    if (!contentType.startsWith(operation === 'export-execute' ? 'text/csv' : 'application/json')) return unavailable(503);
    const responseBody = await upstream.text();
    if (responseBody.length > 512_000 || /"(?:rawSessionToken|accessToken|refreshToken)"\s*:/u.test(responseBody)) return unavailable(503);
    const headers = new Headers({
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      'Content-Type': contentType,
    });
    if (operation === 'export-execute') {
      const disposition = upstream.headers.get('content-disposition');
      if (disposition !== 'attachment; filename="noma-access-review.csv"') return unavailable(503);
      headers.set('Content-Disposition', disposition);
    }
    const setCookie = upstream.headers.get('set-cookie');
    if (setCookie) {
      if (!operation.startsWith('auth-')) return unavailable(503);
      const accepted = safeSetCookie(setCookie, configured.secure);
      if (!accepted) return unavailable(503);
      headers.set('Set-Cookie', accepted);
    }
    return new Response(responseBody, { status: upstream.status, headers });
  } catch { return unavailable(503); }
}
