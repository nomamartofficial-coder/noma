const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request): Promise<Response> {
  const serverEnvironment = process.env.NOMA_ENV ?? '';
  const publicEnvironment = process.env.NEXT_PUBLIC_NOMA_ENV ?? '';
  const remote = ['preview', 'staging', 'production'].includes(serverEnvironment);
  const mismatchedEnvironment = remote ? publicEnvironment !== serverEnvironment
    : ['preview', 'staging', 'production'].includes(publicEnvironment);
  const webOrigin = process.env.PUBLIC_WEB_ORIGIN ?? (remote ? '' : 'http://127.0.0.1:3000');
  if (mismatchedEnvironment || !webOrigin || request.headers.get('origin') !== webOrigin
    || request.headers.get('x-csrf-token') !== 'noma-admin-v1'
    || request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !== 'application/json'
    || new URL(request.url).search) {
    return Response.json({ status: 'UNAVAILABLE' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }
  const raw = await request.text();
  if (raw.length > 512) return Response.json({ status: 'UNAVAILABLE' }, { status: 404 });
  let candidate: unknown;
  try { candidate = JSON.parse(raw); } catch { return Response.json({ status: 'UNAVAILABLE' }, { status: 404 }); }
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)
    || Object.keys(candidate).sort().join(',') !== 'authorityAssignmentId,scopeId') {
    return Response.json({ status: 'UNAVAILABLE' }, { status: 404 });
  }
  const { scopeId, authorityAssignmentId } = candidate as Record<string, unknown>;
  if (typeof scopeId !== 'string' || typeof authorityAssignmentId !== 'string'
    || !UUID.test(scopeId) || !UUID.test(authorityAssignmentId)) {
    return Response.json({ status: 'UNAVAILABLE' }, { status: 404 });
  }
  const cookieName = remote ? '__Host-noma_access_scope' : 'noma_access_scope';
  return Response.json({ status: 'SCOPE_SELECTED' }, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store',
      'Set-Cookie': `${cookieName}=${scopeId}.${authorityAssignmentId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=900${remote ? '; Secure' : ''}`,
    },
  });
}
