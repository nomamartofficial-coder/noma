import { describe, expect, test } from 'vitest';

import {
  ACCESS_AUTHORIZATION_POLICIES,
  authorizationPolicyRegistry,
  combineAuthenticationAssuranceRequirements,
  createAuthorizationPolicyRegistry,
  createTrustedAuthorizationContext,
  defineAuthorizationPolicy,
  evaluateAuthorization,
  NOT_APPLICABLE,
  requiredFacts,
  type ActiveAuthorityFact,
  type AuthenticatedSessionRecord,
  type AuthorizationApprovalFact,
  type AuthorizationApprovalExpectation,
  type AuthorizationPolicyDefinition,
  type TrustedAuthorizationContext,
} from '../src/index.js';

const AT = new Date('2026-09-15T12:00:00.000Z');
const USER = '10000000-0000-4000-8000-000000000001';
const SCOPE = '10000000-0000-4000-8000-000000000002';
const ASSIGNMENT = '10000000-0000-4000-8000-000000000003';
const TEMPLATE = '10000000-0000-4000-8000-000000000004';
const FACTOR = '10000000-0000-4000-8000-000000000005';

function session(overrides: Partial<AuthenticatedSessionRecord['session']> = {}): AuthenticatedSessionRecord {
  return Object.freeze({
    user: Object.freeze({ id: USER, publicReference: 'NOMA-AUTHZ-USER', status: 'ACTIVE', displayName: 'Synthetic actor', locale: 'en-NG', version: 1, securityVersion: 7, lastTransitionAt: AT, lastTransitionId: '10000000-0000-4000-8000-000000000006', statusReasonCode: null, createdAt: AT, updatedAt: AT, deactivatedAt: null }),
    session: Object.freeze({ id: '10000000-0000-4000-8000-000000000007', userId: USER, tokenDigest: 'a'.repeat(64), status: 'ACTIVE', assurance: 'PRIVILEGED_MFA_RECENT', issuedSecurityVersion: 7, passwordAuthenticatedAt: new Date(AT.getTime() - 60_000), mfaVerifiedAt: new Date(AT.getTime() - 60_000), mfaMethod: 'TOTP', mfaFactorId: FACTOR, issuedAt: new Date(AT.getTime() - 120_000), lastUsedAt: AT, idleExpiresAt: new Date(AT.getTime() + 60_000), absoluteExpiresAt: new Date(AT.getTime() + 3_600_000), revokedAt: null, revocationCode: null, deviceLabel: 'Synthetic browser', clientFamily: null, version: 0, lastTransitionAt: AT, lastTransitionId: '10000000-0000-4000-8000-000000000008', ...overrides }),
    contactVerified: true, activeMfaFactorId: FACTOR,
  });
}

function authority(overrides: Partial<ActiveAuthorityFact> = {}): ActiveAuthorityFact {
  return Object.freeze({
    assignment: Object.freeze({ id: ASSIGNMENT, subjectType: 'HUMAN', userId: USER, servicePrincipalId: null, roleTemplateId: TEMPLATE, scopeId: SCOPE, scopeType: 'SELLER', validFrom: new Date(AT.getTime() - 1), validUntil: null, grantedByUserId: USER, grantReason: 'Synthetic grant', grantedAt: AT, revokedByUserId: null, revocationReason: null, revokedAt: null, version: 0 }),
    template: Object.freeze({ id: TEMPLATE, code: 'access.synthetic', version: 1, displayName: 'Synthetic access', status: 'ACTIVE', privilegeClass: 'ORDINARY', assuranceRequirement: { requireContactVerified: false }, activatedAt: AT, retiredAt: null }),
    scope: Object.freeze({ id: SCOPE, type: 'SELLER', userId: null, resourceId: '10000000-0000-4000-8000-000000000009', parentInstitutionScopeId: null, retiredAt: null, createdAt: AT }),
    capabilities: Object.freeze(['access.assignment.read']),
    ...overrides,
  });
}

function context(overrides: Partial<Omit<TrustedAuthorizationContext, never>> = {}): TrustedAuthorizationContext {
  return createTrustedAuthorizationContext({
    actionId: 'access.assignment.read', actor: { actorType: 'HUMAN', userId: USER, session: session() },
    resource: { resourceType: 'access-assignment', resourceId: ASSIGNMENT, authorityScopeId: SCOPE, authorityScopeType: 'SELLER' },
    environment: 'test', evaluatedAt: AT, authorityFacts: [authority()], relationshipFacts: [], businessFacts: [], featureFacts: [], restrictionFacts: [], emergencyFacts: [], approvalExpectation: null, approvalFact: null,
    ...overrides,
  });
}

function policy(overrides: Partial<AuthorizationPolicyDefinition> = {}): AuthorizationPolicyDefinition {
  return defineAuthorizationPolicy({
    id: 'synthetic.resource.use.v1', actionId: 'synthetic.resource.use', effect: 'LOCAL_MUTATION',
    permittedActorTypes: ['HUMAN'], requiredCapability: 'access.assignment.read', permittedScopeTypes: ['SELLER'],
    relationship: 'EXACT_SCOPE', humanAccount: 'ACTIVE', actionAssurance: { requireContactVerified: false },
    businessFacts: NOT_APPLICABLE, featureFacts: NOT_APPLICABLE, restrictionFacts: NOT_APPLICABLE,
    emergencyFacts: NOT_APPLICABLE, approval: NOT_APPLICABLE, ...overrides,
  });
}

describe('IAM-006 central policy decision point', () => {
  test('allows only one independently sufficient assignment fact', () => {
    expect(evaluateAuthorization(authorizationPolicyRegistry, 'access.assignment.read.v1', context())).toEqual(expect.objectContaining({ decision: 'ALLOW', authorityAssignmentId: ASSIGNMENT }));
    const capabilityOnly = authority({ scope: { ...authority().scope, id: '10000000-0000-4000-8000-000000000010' }, assignment: { ...authority().assignment, id: '10000000-0000-4000-8000-000000000011', scopeId: '10000000-0000-4000-8000-000000000010' } });
    const scopeOnly = authority({ capabilities: [], assignment: { ...authority().assignment, id: '10000000-0000-4000-8000-000000000012' } });
    expect(evaluateAuthorization(authorizationPolicyRegistry, 'access.assignment.read.v1', context({ authorityFacts: [capabilityOnly, scopeOnly] }))).toEqual(expect.objectContaining({ decision: 'DENY', reasonCode: 'SCOPE_MISMATCH' }));
  });

  test.each([
    ['unknown policy', 'missing.policy.v1', context(), 'POLICY_UNKNOWN'],
    ['untrusted context', 'access.assignment.read.v1', {}, 'FACT_UNAVAILABLE'],
    ['missing session', 'access.assignment.read.v1', context({ actor: { actorType: 'HUMAN', userId: USER, session: null } }), 'UNAUTHENTICATED'],
    ['wrong subject', 'access.assignment.read.v1', context({ actor: { actorType: 'HUMAN', userId: '10000000-0000-4000-8000-000000000099', session: session() } }), 'UNAUTHENTICATED'],
    ['missing authority', 'access.assignment.read.v1', context({ authorityFacts: [] }), 'AUTHORITY_MISSING'],
    ['missing capability', 'access.assignment.read.v1', context({ authorityFacts: [authority({ capabilities: [] })] }), 'CAPABILITY_MISSING'],
    ['wrong scope', 'access.assignment.read.v1', context({ resource: { resourceType: 'access-assignment', resourceId: ASSIGNMENT, authorityScopeId: '10000000-0000-4000-8000-000000000098', authorityScopeType: 'SELLER' } }), 'SCOPE_MISMATCH'],
  ])('fails closed for %s', (_name, policyId, candidate, reasonCode) => {
    expect(evaluateAuthorization(authorizationPolicyRegistry, policyId as string, candidate)).toEqual(expect.objectContaining({ decision: 'DENY', reasonCode }));
  });

  test('requires explicit tri-state facts and denies unknown or negative dimensions', () => {
    const registry = createAuthorizationPolicyRegistry([policy({ id: 'synthetic.state.use.v1', actionId: 'synthetic.state.use', businessFacts: requiredFacts('resource.state.permits'), featureFacts: requiredFacts('feature.synthetic.active'), restrictionFacts: requiredFacts('restriction.synthetic.clear'), emergencyFacts: requiredFacts('emergency.synthetic.permits') })]);
    const base = context({ actionId: 'synthetic.state.use' });
    const facts = {
      businessFacts: [{ key: 'resource.state.permits', state: 'SATISFIED' as const, provenance: { source: 'DETERMINISTIC_TEST' as const, observedAt: AT } }],
      featureFacts: [{ key: 'feature.synthetic.active', state: 'ACTIVE' as const, provenance: { source: 'DETERMINISTIC_TEST' as const, observedAt: AT } }],
      restrictionFacts: [{ key: 'restriction.synthetic.clear', state: 'CLEAR' as const, provenance: { source: 'DETERMINISTIC_TEST' as const, observedAt: AT } }],
      emergencyFacts: [{ key: 'emergency.synthetic.permits', state: 'PERMITS_OPERATION' as const, provenance: { source: 'DETERMINISTIC_TEST' as const, observedAt: AT } }],
    };
    expect(evaluateAuthorization(registry, 'synthetic.state.use.v1', context({ ...base, ...facts }))).toEqual(expect.objectContaining({ decision: 'ALLOW' }));
    for (const [key, replacement, reason] of [
      ['businessFacts', [], 'FACT_UNAVAILABLE'],
      ['featureFacts', [{ ...facts.featureFacts[0], state: 'INACTIVE' }], 'FEATURE_INACTIVE'],
      ['restrictionFacts', [{ ...facts.restrictionFacts[0], state: 'BLOCKED' }], 'RESTRICTION_ACTIVE'],
      ['emergencyFacts', [{ ...facts.emergencyFacts[0], state: 'UNKNOWN' }], 'FACT_UNAVAILABLE'],
    ] as const) expect(evaluateAuthorization(registry, 'synthetic.state.use.v1', context({ actionId: 'synthetic.state.use', ...facts, [key]: replacement }))).toEqual(expect.objectContaining({ decision: 'DENY', reasonCode: reason }));
  });

  test('monotonically composes template and action assurance at exact boundaries', () => {
    expect(combineAuthenticationAssuranceRequirements(
      { requireContactVerified: false, passwordMaxAgeMilliseconds: 600_000, mfaMaxAgeMilliseconds: 43_200_000 },
      { requireContactVerified: true, passwordMaxAgeMilliseconds: 300_000, mfaMaxAgeMilliseconds: 300_000 },
    )).toEqual({ requireContactVerified: true, passwordMaxAgeMilliseconds: 300_000, mfaMaxAgeMilliseconds: 300_000 });
    const strict = createAuthorizationPolicyRegistry([policy({ id: 'synthetic.step-up.v1', actionId: 'synthetic.step-up', actionAssurance: { requireContactVerified: true, passwordMaxAgeMilliseconds: 600_000, mfaMaxAgeMilliseconds: 300_000 } })]);
    const atBoundary = session({ mfaVerifiedAt: new Date(AT.getTime() - 300_000) });
    const result = evaluateAuthorization(strict, 'synthetic.step-up.v1', context({ actionId: 'synthetic.step-up', actor: { actorType: 'HUMAN', userId: USER, session: atBoundary } }));
    expect(result).toEqual(expect.objectContaining({ decision: 'DENY', reasonCode: 'ASSURANCE_REQUIRED', effectiveAssuranceRequirement: { requireContactVerified: true, passwordMaxAgeMilliseconds: 600_000, mfaMaxAgeMilliseconds: 300_000 } }));
  });

  test('requires exact current independent approval evidence', () => {
    const definition = policy({ id: 'synthetic.approved.use.v1', actionId: 'synthetic.approved.use', approval: { applicability: 'REQUIRED', operation: 'ASSIGNMENT_GRANT', independent: true } });
    const registry = createAuthorizationPolicyRegistry([definition]);
    const expected: AuthorizationApprovalExpectation = { operation: 'ASSIGNMENT_GRANT', subjectType: 'HUMAN', targetUserId: '10000000-0000-4000-8000-000000000020', targetServicePrincipalId: null, roleTemplateId: TEMPLATE, scopeId: SCOPE, scopeType: 'SELLER', requestedValidFrom: AT, requestedValidUntil: null };
    const fact: AuthorizationApprovalFact = { ...expected, id: '10000000-0000-4000-8000-000000000021', requestedByUserId: USER, state: 'APPROVED', expiresAt: new Date(AT.getTime() + 1), independentApprovalRequired: true, decision: { approverUserId: '10000000-0000-4000-8000-000000000022', value: 'APPROVE', securityVersion: 2, currentSecurityVersion: 2, accountActive: true, passwordAuthenticatedAt: AT, mfaVerifiedAt: AT, mfaMethod: 'TOTP', mfaFactorId: FACTOR, currentMfaFactorId: FACTOR, evaluatedAt: AT }, provenance: { source: 'ACCESS_DATABASE', observedAt: AT } };
    const approved = context({ actionId: 'synthetic.approved.use', approvalExpectation: expected, approvalFact: fact });
    expect(evaluateAuthorization(registry, definition.id, approved)).toEqual(expect.objectContaining({ decision: 'ALLOW' }));
    for (const invalid of [{ ...fact, expiresAt: AT }, { ...fact, scopeId: '10000000-0000-4000-8000-000000000023' }, { ...fact, decision: { ...fact.decision!, currentSecurityVersion: 3 } }, { ...fact, decision: { ...fact.decision!, approverUserId: USER } }]) {
      expect(evaluateAuthorization(registry, definition.id, context({ actionId: 'synthetic.approved.use', approvalExpectation: expected, approvalFact: invalid }))).toEqual(expect.objectContaining({ decision: 'DENY', reasonCode: 'APPROVAL_REQUIRED' }));
    }
  });

  test('uses explicit relationship facts without treating parent scope as inherited authority', () => {
    const definition = policy({ id: 'synthetic.relationship.read.v1', actionId: 'synthetic.relationship.read', relationship: 'RESOURCE_OF_SELLER', relationshipFactKey: 'resource.belongs-to-seller' });
    const registry = createAuthorizationPolicyRegistry([definition]);
    const base = context({ actionId: definition.actionId });
    expect(evaluateAuthorization(registry, definition.id, base)).toEqual(expect.objectContaining({ decision: 'DENY', reasonCode: 'FACT_UNAVAILABLE' }));
    const proof = { key: 'resource.belongs-to-seller', relationship: 'RESOURCE_OF_SELLER' as const, authorityScopeId: SCOPE, resourceId: ASSIGNMENT, state: 'SATISFIED' as const, provenance: { source: 'DETERMINISTIC_TEST' as const, observedAt: AT } };
    expect(evaluateAuthorization(registry, definition.id, context({ actionId: definition.actionId, relationshipFacts: [proof] }))).toEqual(expect.objectContaining({ decision: 'ALLOW' }));
    expect(evaluateAuthorization(registry, definition.id, context({ actionId: definition.actionId, relationshipFacts: [{ ...proof, resourceId: '10000000-0000-4000-8000-000000000090' }] }))).toEqual(expect.objectContaining({ decision: 'DENY', reasonCode: 'FACT_UNAVAILABLE' }));
  });

  test('fails closed for account, session, expiry, security-version, and MFA-factor changes', () => {
    const strict = createAuthorizationPolicyRegistry([policy({ id: 'synthetic.identity.read.v1', actionId: 'synthetic.identity.read', actionAssurance: { requireContactVerified: true, mfaMaxAgeMilliseconds: 300_000 } })]);
    const evaluate = (record: AuthenticatedSessionRecord) => evaluateAuthorization(strict, 'synthetic.identity.read.v1', context({ actionId: 'synthetic.identity.read', actor: { actorType: 'HUMAN', userId: USER, session: record } }));
    expect(evaluate({ ...session(), user: { ...session().user, status: 'SUSPENDED' } })).toEqual(expect.objectContaining({ decision: 'DENY', reasonCode: 'ACCOUNT_INELIGIBLE' }));
    for (const record of [
      session({ status: 'REVOKED', revokedAt: AT }),
      session({ idleExpiresAt: AT }),
      session({ issuedSecurityVersion: 6 }),
      { ...session(), activeMfaFactorId: '10000000-0000-4000-8000-000000000099' },
    ]) expect(evaluate(record)).toEqual(expect.objectContaining({ decision: 'DENY', reasonCode: 'ASSURANCE_REQUIRED' }));
  });

  test('permits service principals only through explicit machine policies and exact environment', () => {
    const principal = { id: '10000000-0000-4000-8000-000000000030', environment: 'test' as const, code: 'synthetic_reader', purpose: 'Synthetic authorization verification', ownerUserId: USER, credentialPolicyVersion: 1, lastRotatedAt: null, revokedAt: null, version: 0 };
    const machineAuthority = authority({
      assignment: { ...authority().assignment, subjectType: 'SERVICE_PRINCIPAL', userId: null, servicePrincipalId: principal.id, scopeType: 'INSTITUTION' },
      scope: { ...authority().scope, type: 'INSTITUTION' }, capabilities: ['access.service-principal.read'],
    });
    const machine = context({
      actionId: 'access.service-principal.read', actor: { actorType: 'SERVICE_PRINCIPAL', servicePrincipalId: principal.id, authenticated: true, principal },
      resource: { resourceType: 'service-principal', resourceId: principal.id, authorityScopeId: SCOPE, authorityScopeType: 'INSTITUTION' }, authorityFacts: [machineAuthority],
    });
    expect(evaluateAuthorization(authorizationPolicyRegistry, 'access.service-principal.read.v1', machine)).toEqual(expect.objectContaining({ decision: 'ALLOW' }));
    expect(evaluateAuthorization(authorizationPolicyRegistry, 'access.assignment.read.v1', machine)).toEqual(expect.objectContaining({ decision: 'DENY' }));
    expect(evaluateAuthorization(authorizationPolicyRegistry, 'access.service-principal.read.v1', context({ ...machine, actor: { actorType: 'SERVICE_PRINCIPAL', servicePrincipalId: principal.id, authenticated: true, principal: { ...principal, environment: 'preview' } } }))).toEqual(expect.objectContaining({ decision: 'DENY', reasonCode: 'AUTHORITY_MISSING' }));
    expect(evaluateAuthorization(authorizationPolicyRegistry, 'access.service-principal.read.v1', context({ ...machine, actor: { actorType: 'SERVICE_PRINCIPAL', servicePrincipalId: principal.id, authenticated: true, principal: { ...principal, revokedAt: AT } } }))).toEqual(expect.objectContaining({ decision: 'DENY', reasonCode: 'AUTHORITY_MISSING' }));
  });

  test('removing a required proof never preserves or creates ALLOW', () => {
    const definition = policy({ id: 'synthetic.monotonic.read.v1', actionId: 'synthetic.monotonic.read', featureFacts: requiredFacts('feature.synthetic.active') });
    const registry = createAuthorizationPolicyRegistry([definition]);
    const featureFacts = [{ key: 'feature.synthetic.active', state: 'ACTIVE' as const, provenance: { source: 'DETERMINISTIC_TEST' as const, observedAt: AT } }];
    expect(evaluateAuthorization(registry, definition.id, context({ actionId: definition.actionId, featureFacts }))).toEqual(expect.objectContaining({ decision: 'ALLOW' }));
    for (const mutation of [
      { authorityFacts: [authority({ capabilities: [] })] },
      { authorityFacts: [authority({ assignment: { ...authority().assignment, validUntil: AT } })] },
      { featureFacts: [] },
      { featureFacts: [{ ...featureFacts[0]!, state: 'INACTIVE' as const }] },
    ]) expect(evaluateAuthorization(registry, definition.id, context({ actionId: definition.actionId, featureFacts, ...mutation }))).toEqual(expect.objectContaining({ decision: 'DENY' }));
  });

  test('has an immutable closed registry with no wildcard or duplicate defaults', () => {
    expect(ACCESS_AUTHORIZATION_POLICIES.map(({ id }) => id)).toEqual(['audit.event.read.v1', 'access.assignment.read.v1', 'access.assignment.grant.v1', 'access.service-principal.read.v1']);
    expect(() => createAuthorizationPolicyRegistry([policy(), policy()])).toThrow(/Duplicate/);
    expect(() => policy({ id: 'synthetic.*' })).toThrow(/without wildcards/);
    expect(Object.isFrozen(authorizationPolicyRegistry.policies)).toBe(true);
  });
});
