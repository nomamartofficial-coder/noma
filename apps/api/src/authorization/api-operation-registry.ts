export const API_OPERATION_CLASSES = [
  'PUBLIC',
  'AUTHENTICATED_SELF',
  'IAM006_PROTECTED',
  'SYSTEM_PROVIDER',
  'NOT_YET_ACTIVATED',
] as const;
export type ApiOperationClass = (typeof API_OPERATION_CLASSES)[number];

export interface ApiOperationDefinition {
  readonly id: string;
  readonly method: 'GET' | 'POST';
  readonly path: string;
  readonly classification: ApiOperationClass;
  readonly policyId: string | null;
}

function operation(id: string, method: ApiOperationDefinition['method'], path: string, classification: ApiOperationClass): ApiOperationDefinition {
  if (!/^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/.test(id)) throw new Error('API operation ID must be exact and dotted');
  if (!path.startsWith('/') || path.includes('*')) throw new Error('API operation path must be exact');
  return Object.freeze({ id, method, path, classification, policyId: null });
}

export const API_OPERATION_REGISTRY: readonly ApiOperationDefinition[] = Object.freeze([
  operation('health.live.read', 'GET', '/health/live', 'PUBLIC'),
  operation('health.ready.read', 'GET', '/health/ready', 'PUBLIC'),
  operation('identity.registration.create', 'POST', '/api/v1/auth/register', 'PUBLIC'),
  operation('identity.session.create', 'POST', '/api/v1/auth/sign-in', 'PUBLIC'),
  operation('identity.email-verification.request', 'POST', '/api/v1/auth/email-verification/request', 'PUBLIC'),
  operation('identity.email-verification.confirm', 'POST', '/api/v1/auth/email-verification/confirm', 'PUBLIC'),
  operation('identity.password-recovery.request', 'POST', '/api/v1/auth/password-recovery/request', 'PUBLIC'),
  operation('identity.password-recovery.complete', 'POST', '/api/v1/auth/password-recovery/complete', 'PUBLIC'),
  ...[
    ['identity.session.revoke', 'POST', '/api/v1/auth/sign-out'],
    ['identity.step-up.password', 'POST', '/api/v1/auth/step-up/password'],
    ['identity.mfa.password-reauthenticate', 'POST', '/api/v1/auth/mfa/password/reauthenticate'],
    ['identity.step-up.request', 'POST', '/api/v1/auth/step-up/request'],
    ['identity.step-up.totp', 'POST', '/api/v1/auth/step-up/totp'],
    ['identity.step-up.recovery-code', 'POST', '/api/v1/auth/step-up/recovery-code'],
    ['identity.mfa.enrollment.start', 'POST', '/api/v1/auth/mfa/totp/enrollment/start'],
    ['identity.mfa.enrollment.confirm', 'POST', '/api/v1/auth/mfa/totp/enrollment/confirm'],
    ['identity.mfa.replacement.start', 'POST', '/api/v1/auth/mfa/totp/replacement/start'],
    ['identity.mfa.replacement.confirm', 'POST', '/api/v1/auth/mfa/totp/replacement/confirm'],
    ['identity.mfa.recovery-codes.regenerate', 'POST', '/api/v1/auth/mfa/recovery-codes/regenerate'],
    ['identity.mfa.factor.remove', 'POST', '/api/v1/auth/mfa/totp/remove'],
    ['identity.session.read', 'GET', '/api/v1/auth/session'],
  ].map(([id, method, path]) => operation(id!, method as 'GET' | 'POST', path!, 'AUTHENTICATED_SELF')),
]);

export function resolveApiOperation(method: string, path: string): ApiOperationDefinition | null {
  return API_OPERATION_REGISTRY.find((entry) => entry.method === method && entry.path === path) ?? null;
}
