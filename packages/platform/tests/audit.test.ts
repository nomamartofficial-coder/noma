import { describe, expect, test } from 'vitest';
import {
  AUDIT_ACTION_CODES,
  auditEventRegistry,
  createAuditEventRegistry,
  defineAuditEventDefinition,
  formatAuditSummary,
  isPreparedAuditEvent,
  prepareAuditEvent,
  safeAuditReasonCode,
} from '../src/audit/index.js';

const EVENT_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '22222222-2222-4222-8222-222222222222';
const FACTOR_ID = '33333333-3333-4333-8333-333333333333';
const AT = new Date('2026-09-25T09:00:00.000Z');

function activation(overrides: Record<string, unknown> = {}) {
  return {
    eventId: EVENT_ID,
    actionCode: 'identity.mfa.factor.activate',
    occurredAt: AT,
    actor: { kind: 'HUMAN', userId: USER_ID },
    resource: { type: 'MFA_FACTOR', id: FACTOR_ID },
    outcome: 'SUCCEEDED',
    correlationId: 'iam008-correlation-1',
    operationId: 'iam008-operation-1',
    beforeSummary: { factorState: 'PENDING_ENROLLMENT' },
    afterSummary: { factorState: 'ACTIVE', recoveryCodeCount: 10 },
    ...overrides,
  } as never;
}

describe('IAM-008 closed audit event registry', () => {
  test('contains exactly the approved 21-action catalogue and remains frozen', () => {
    expect(auditEventRegistry.definitions.map(({ actionCode }) => actionCode)).toEqual(AUDIT_ACTION_CODES);
    expect(AUDIT_ACTION_CODES).toHaveLength(21);
    expect(AUDIT_ACTION_CODES).not.toContain('access.assignment.read');
    expect(Object.isFrozen(auditEventRegistry.definitions)).toBe(true);
    expect(auditEventRegistry.resolve('audit.event.read')?.contractVersion).toBe(1);
    expect(auditEventRegistry.resolve('access.*')).toBeNull();
    expect(auditEventRegistry.resolve('unknown.action')).toBeNull();
  });

  test('rejects duplicate, malformed, wildcard and invalid-version definitions', () => {
    const definition = auditEventRegistry.definitions[0]!;
    expect(() => createAuditEventRegistry([definition, definition])).toThrow('Duplicate audit action');
    expect(() => defineAuditEventDefinition({ ...definition, contractVersion: 0 })).toThrow('Invalid audit event definition');
    expect(() => defineAuditEventDefinition({ ...definition, actionCode: 'access.*' as never })).toThrow('Invalid audit event definition');
    expect(() => defineAuditEventDefinition({ ...definition, actionCode: 'MALFORMED' as never })).toThrow('Invalid audit event definition');
  });

  test('prepares only exact typed events and rejects wrong actors, resources and reasons', () => {
    const prepared = prepareAuditEvent(activation());
    expect(isPreparedAuditEvent(prepared)).toBe(true);
    expect(prepared.actionCode).toBe('identity.mfa.factor.activate');
    expect(prepared.contractVersion).toBe(1);
    expect(Object.isFrozen(prepared)).toBe(true);
    expect(isPreparedAuditEvent({ ...prepared })).toBe(false);

    expect(() => prepareAuditEvent(activation({ actor: { kind: 'SYSTEM', systemActorCode: 'TEST' } }))).toThrow('Invalid audit actor');
    expect(() => prepareAuditEvent(activation({ resource: { type: 'USER', id: USER_ID } }))).toThrow('Invalid audit resource');
    expect(() => prepareAuditEvent(activation({ reasonCode: 'NOT_ALLOWED' }))).toThrow('Invalid audit reason');
    expect(() => prepareAuditEvent(activation({ reasonText: 'even ordinary free text is not accepted' }))).toThrow('Invalid audit reason');
    expect(() => prepareAuditEvent(activation({ occurredAt: new Date('invalid') }))).toThrow('Invalid audit time');
  });

  test('accepts only source-controlled reason codes for actions that permit reasons', () => {
    const removal = {
      eventId: EVENT_ID,
      actionCode: 'identity.mfa.factor.remove',
      occurredAt: AT,
      actor: { kind: 'HUMAN', userId: USER_ID },
      resource: { type: 'MFA_FACTOR', id: FACTOR_ID },
      reasonCode: 'USER_REQUESTED_FACTOR_REMOVAL',
      outcome: 'SUCCEEDED',
      correlationId: 'iam008-correlation-reason',
      operationId: 'iam008-operation-reason',
      beforeSummary: { factorState: 'ACTIVE' },
      afterSummary: { factorState: 'REVOKED', sessionsRevoked: true },
    } as const;
    expect(prepareAuditEvent(removal).reasonCode).toBe('USER_REQUESTED_FACTOR_REMOVAL');
    expect(() => prepareAuditEvent({ ...removal, reasonCode: 'ARBITRARY_OPERATOR_TEXT' })).toThrow('Invalid audit reason');
    expect(safeAuditReasonCode(removal.actionCode, removal.reasonCode)).toBe(removal.reasonCode);
    expect(safeAuditReasonCode(removal.actionCode, 'ARBITRARY_OPERATOR_TEXT')).toBeNull();
  });

  test('revalidates persisted summaries before disclosure', () => {
    expect(formatAuditSummary('identity.mfa.factor.remove', { factorState: 'REVOKED', sessionsRevoked: true }, 'afterFields'))
      .toBe('factorState=REVOKED; sessionsRevoked=true');
    expect(formatAuditSummary('identity.mfa.factor.remove', { factorState: 'Bearer synthetic-token', sessionsRevoked: true }, 'afterFields')).toBeNull();
    expect(formatAuditSummary('identity.assurance.step-up.complete', { assurance: 'Bearer synthetic-token' }, 'afterFields')).toBeNull();
    expect(formatAuditSummary('identity.assurance.step-up.complete', { assurance: null }, 'afterFields')).toBeNull();
  });

  test('rejects missing, extra, nested, array, unsupported and oversized summary values', () => {
    expect(() => prepareAuditEvent(activation({ beforeSummary: undefined }))).toThrow('Missing before summary');
    expect(() => prepareAuditEvent(activation({ afterSummary: { factorState: 'ACTIVE', recoveryCodeCount: 10, raw: 'extra' } }))).toThrow('Invalid after summary');
    expect(() => prepareAuditEvent(activation({ afterSummary: { factorState: { nested: true }, recoveryCodeCount: 10 } }))).toThrow('Invalid after summary');
    expect(() => prepareAuditEvent(activation({ afterSummary: { factorState: ['ACTIVE'], recoveryCodeCount: 10 } }))).toThrow('Invalid after summary');
    expect(() => prepareAuditEvent(activation({ afterSummary: { factorState: 'ACTIVE', recoveryCodeCount: 1.5 } }))).toThrow('Invalid after summary');
    expect(() => prepareAuditEvent(activation({ afterSummary: { factorState: 'A'.repeat(121), recoveryCodeCount: 10 } }))).toThrow('Invalid after summary');
    expect(() => prepareAuditEvent(activation({ afterSummary: null }))).toThrow('Invalid after summary');
  });

  test('synthetic secret and private-evidence sentinels cannot enter allowed free text', () => {
    for (const sentinel of [
      'Bearer synthetic-token', '$argon2id$synthetic-hash', 'session_token:synthetic',
      'mfa_seed:synthetic', 'otp_code:123456', 'recovery_code:synthetic',
      'reset_token:synthetic', 'verification_token:synthetic', 'api_secret:synthetic',
      'provider_secret:synthetic', 'BEGIN PRIVATE KEY', 'raw_payload:synthetic', 'request_body:synthetic',
    ]) {
      expect(() => prepareAuditEvent({
        eventId: EVENT_ID,
        actionCode: 'access.scope.create',
        occurredAt: AT,
        actor: { kind: 'SYSTEM', systemActorCode: 'fixture.scope-bootstrap' },
        resource: { type: 'ACCESS_SCOPE', id: '44444444-4444-4444-8444-444444444444' },
        reasonText: sentinel,
        outcome: 'SUCCEEDED',
        correlationId: 'iam008-correlation-2',
        operationId: 'iam008-operation-2',
        afterSummary: { scopeType: 'INSTITUTION' },
      })).toThrow('Invalid audit reason');
    }
  });
});
