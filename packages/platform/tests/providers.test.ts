import { describe, expect, it } from 'vitest';

import {
  assertSafeProviderValue,
  parseMinorMoney,
  parseProviderCallResult,
  parseProviderConfiguration,
  parseProviderOperationIdentity,
} from '../src/providers/index.js';

describe('provider-neutral values', () => {
  it('validates every common result kind without leaking vendor objects', () => {
    expect(parseProviderCallResult({ kind: 'accepted', providerReference: 'provider-ref-1', data: { status: 'pending' } }, (value) => value)).toEqual({ kind: 'accepted', providerReference: 'provider-ref-1', data: { status: 'pending' } });
    expect(parseProviderCallResult({ kind: 'final_success', providerReference: 'provider-ref-1', data: { status: 'successful' } }, (value) => value).kind).toBe('final_success');
    expect(parseProviderCallResult({ kind: 'final_failure', code: 'FINAL_FAILURE', retryable: false }, (value) => value).kind).toBe('final_failure');
    expect(parseProviderCallResult({ kind: 'uncertain', code: 'TIMEOUT_AFTER_POSSIBLE_ACCEPTANCE' }, (value) => value).kind).toBe('uncertain');
    expect(parseProviderCallResult({ kind: 'rejected', code: 'INVALID_INPUT', safeMessage: 'input was rejected' }, (value) => value).kind).toBe('rejected');
    expect(() => parseProviderCallResult({ kind: 'accepted', providerReference: 'provider-ref-1', data: {}, paystackStatus: 'success' }, (value) => value)).toThrow(/unsupported fields/);
  });

  it('requires stable operation identity and integer monetary subunits', () => {
    expect(parseProviderOperationIdentity({ operationId: 'operation-001', idempotencyKey: 'idempotency-001', correlationId: 'correlation-001', attempt: 1, deadlineAt: '2026-08-01T00:01:00.000Z' }).attempt).toBe(1);
    expect(parseMinorMoney({ amountMinor: 12_345, currency: 'NGN' })).toEqual({ amountMinor: 12_345, currency: 'NGN' });
    expect(() => parseMinorMoney({ amountMinor: 12.5, currency: 'NGN' })).toThrow(/safe integer/);
    expect(() => parseMinorMoney({ amountMinor: 100, currency: 'ngn' })).toThrow(/currency/);
  });

  it('fails closed for production simulation and secret-bearing diagnostics', () => {
    const base = {
      provider: 'local-payments', environment: 'test', mode: 'simulator', enabled: true,
      connectTimeoutMilliseconds: 100, responseTimeoutMilliseconds: 500,
      operationDeadlineMilliseconds: 1_000, maximumAttempts: 2,
      retryPolicyReference: 'provider-safe-retry-v1', circuitBreakerPolicyReference: 'provider-breaker-v1',
      dataClassifications: ['financial'], owningTeam: 'finance-engineering', runbookPath: 'runbooks/providers.md',
    };
    expect(parseProviderConfiguration(base).mode).toBe('simulator');
    expect(() => parseProviderConfiguration({ ...base, environment: 'production' })).toThrow(/production cannot select/);
    expect(() => assertSafeProviderValue({ authorization: 'Bearer test-token' })).toThrow(/prohibited/);
    expect(() => assertSafeProviderValue({ note: 'postgresql://user:password@db.example.invalid/noma' })).toThrow(/sensitive/);
  });
});
