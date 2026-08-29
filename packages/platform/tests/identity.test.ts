import { describe, expect, test } from 'vitest';

import {
  ACCOUNT_STATUSES,
  AUTHENTICATION_ASSURANCE_LEVELS,
  IDENTITY_TOKEN_PURPOSES,
  SESSION_STATUSES,
  normalizeIdentityEmail,
} from '../src/identity/index.js';

describe('identity persistence contracts', () => {
  test('uses the authoritative account, session, assurance, and token-purpose vocabularies', () => {
    expect(ACCOUNT_STATUSES).toEqual([
      'PENDING_EMAIL',
      'ACTIVE',
      'RECOVERY_LOCKED',
      'COMPROMISED_LOCKED',
      'SUSPENDED',
      'DEACTIVATION_REQUESTED',
      'DEACTIVATED',
    ]);
    expect(SESSION_STATUSES).toEqual(['ACTIVE', 'STEP_UP_REQUIRED', 'REVOKED', 'EXPIRED']);
    expect(AUTHENTICATION_ASSURANCE_LEVELS).toContain('PRIVILEGED_MFA_RECENT');
    expect(IDENTITY_TOKEN_PURPOSES).toEqual(['EMAIL_VERIFICATION', 'PASSWORD_RECOVERY']);
  });

  test('normalizes conservatively without guessing provider aliases', () => {
    expect(normalizeIdentityEmail('  Person.Name+buyer@Example.COM  ')).toBe(
      'person.name+buyer@example.com',
    );
    expect(normalizeIdentityEmail('personname@example.com')).not.toBe(
      normalizeIdentityEmail('person.name@example.com'),
    );
    expect(normalizeIdentityEmail('person@example.com')).not.toBe(
      normalizeIdentityEmail('person+buyer@example.com'),
    );
  });

  test.each(['', 'missing-at.example', '@example.com', 'person@', 'a@b@c.example', 'a b@example.com'])(
    'rejects invalid identity email %j',
    (value) => expect(() => normalizeIdentityEmail(value)).toThrow(),
  );
});
