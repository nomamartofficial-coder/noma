const SECRET_FIELD_PATTERN = /(?:secret|token|password|authorization|cookie|databaseurl|redisurl|privatekey|accesskey)/i;
const PRODUCTION_HOST_PATTERN = /(?:^|\.)(?:noma\.ng|nomamart\.com)$|(?:^|[-.])prod(?:uction)?(?:[-.]|$)/i;

export function validateReleaseSha(value) {
  const sha = value?.trim();
  if (!sha || !/^[a-f0-9]{40}$/i.test(sha)) throw new Error('EXPECTED_RELEASE_SHA must be a full Git commit SHA');
  return sha.toLowerCase();
}

export function validateAutomationBypassSecret(value) {
  if (value === undefined) return undefined;
  const secret = value.trim();
  if (!/^[A-Za-z0-9._~-]{16,512}$/.test(secret)) {
    throw new Error('Vercel automation bypass secret has an unsafe format');
  }
  return secret;
}

export function validateDeploymentUrl(value, surface) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${surface} deployment URL must be valid`);
  }
  if (url.protocol !== 'https:') throw new Error(`${surface} deployment URL must use HTTPS`);
  if (url.username || url.password) throw new Error(`${surface} deployment URL must not contain credentials`);
  if (url.port || (url.pathname !== '/' && url.pathname !== '') || url.search || url.hash) {
    throw new Error(`${surface} deployment URL must be a bare HTTPS origin`);
  }
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || /^(?:127\.|0\.|10\.|192\.168\.|169\.254\.)/.test(host)) {
    throw new Error(`${surface} deployment URL must not target a local or private address`);
  }
  if (PRODUCTION_HOST_PATTERN.test(host)) throw new Error(`${surface} deployment URL looks production-scoped`);

  if (surface === 'web') {
    if (!host.endsWith('.vercel.app')) throw new Error('Web smoke target must be an approved Vercel preview host');
    if (!/(?:preview|staging|-git-)/.test(host)) throw new Error('Web smoke target must identify a stable non-production preview');
  } else if (surface === 'api') {
    if (!host.endsWith('.onrender.com') || !/(?:^|-)staging(?:\.|-)/.test(host)) {
      throw new Error('API smoke target must be a staging Render host');
    }
  } else {
    throw new Error('unknown deployment smoke surface');
  }
  return new URL(url.origin);
}

function rejectSensitiveFields(value, path = 'response') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => rejectSensitiveFields(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (SECRET_FIELD_PATTERN.test(key)) throw new Error(`${path} contains a sensitive field`);
    rejectSensitiveFields(child, `${path}.${key}`);
  }
}

export function validateHealthResponse(value, expected) {
  rejectSensitiveFields(value);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('health response must be an object');
  if (value.runtime !== expected.runtime) throw new Error('health response runtime mismatch');
  if (value.check !== expected.check) throw new Error('health response check mismatch');
  if (value.status !== 'ok') throw new Error('health response is not ready');
  if (value.environment !== expected.environment) throw new Error('health response environment mismatch');
  if (value.releaseSha?.toLowerCase() !== expected.releaseSha) throw new Error('health response release mismatch');
  if (typeof value.checkedAt !== 'string' || !Number.isFinite(Date.parse(value.checkedAt))) {
    throw new Error('health response timestamp is invalid');
  }
  if (!value.dependencies || typeof value.dependencies !== 'object' || Array.isArray(value.dependencies)) {
    throw new Error('health response dependencies are invalid');
  }
  return value;
}
