import { describe, expect, test, vi } from 'vitest';

import { API_OPERATION_REGISTRY, resolveApiOperation } from '../src/authorization/api-operation-registry.js';
import { AuthorizationDeniedError, AuthorizationService, publicAuthorizationFailure } from '../src/authorization/authorization.service.js';

describe('IAM-006 API policy enforcement point', () => {
  test('classifies exact routes and activates only IAM-009 protected Access operations', () => {
    expect(new Set(API_OPERATION_REGISTRY.map(({ method, path }) => `${method} ${path}`)).size).toBe(API_OPERATION_REGISTRY.length);
    const protectedOperations = API_OPERATION_REGISTRY.filter(({ classification }) => classification === 'IAM006_PROTECTED');
    expect(protectedOperations).toHaveLength(17);
    expect(protectedOperations.every(({ method, path, policyId }) => method === 'POST'
      && path.startsWith('/api/v1/admin/access/') && policyId !== null)).toBe(true);
    expect(resolveApiOperation('POST', '/api/v1/auth/sign-in')?.classification).toBe('PUBLIC');
    expect(resolveApiOperation('GET', '/api/v1/auth/session')?.classification).toBe('AUTHENTICATED_SELF');
    expect(resolveApiOperation('POST', '/api/v1/admin/access/reviews/attest')?.policyId).toBe('access.review.attest.v1');
    expect(resolveApiOperation('GET', '/api/v1/admin/audit')).toBeNull();
    expect(resolveApiOperation('GET', '/seller')).toBeNull();
  });

  test('maps internal denial metadata to one generic IDOR-safe public response', () => {
    for (const reasonCode of ['CAPABILITY_MISSING', 'SCOPE_MISMATCH', 'RESTRICTION_ACTIVE'] as const) {
      const result = publicAuthorizationFailure(new AuthorizationDeniedError({ decision: 'DENY', policyId: 'synthetic.read.v1', reasonCode }));
      expect(result).toEqual({ statusCode: 404, body: { status: 'UNAVAILABLE' } });
      expect(JSON.stringify(result)).not.toContain(reasonCode);
    }
  });

  test('never runs a protected effect after DENY', async () => {
    const service = new AuthorizationService();
    vi.spyOn(service, 'evaluate').mockReturnValue({ decision: 'DENY', policyId: 'synthetic.read.v1', reasonCode: 'FACT_UNAVAILABLE' });
    const execute = vi.fn();
    const transaction = {};
    const database = { $transaction: (operation: (tx: object) => Promise<unknown>) => operation(transaction) };
    await expect(service.executeProtectedMutation(database as never, {
      policyId: 'synthetic.read.v1', resolveContext: async () => ({}) as never, execute,
    })).rejects.toBeInstanceOf(AuthorizationDeniedError);
    expect(execute).not.toHaveBeenCalled();
  });

  test('executes an allowed effect inside the same database transaction', async () => {
    const service = new AuthorizationService();
    vi.spyOn(service, 'evaluate').mockReturnValue({ decision: 'ALLOW', policyId: 'synthetic.read.v1', authorityAssignmentId: 'assignment' });
    const transaction = { marker: 'same-transaction' };
    const database = { $transaction: (operation: (tx: object) => Promise<unknown>) => operation(transaction) };
    const result = await service.executeProtectedMutation(database as never, {
      policyId: 'synthetic.read.v1', resolveContext: async (tx) => {
        expect(tx).toBe(transaction);
        return {} as never;
      }, execute: async (tx) => {
        expect(tx).toBe(transaction);
        return 'committed';
      },
    });
    expect(result).toBe('committed');
  });
});
