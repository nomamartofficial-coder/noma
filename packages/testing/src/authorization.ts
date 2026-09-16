import {
  createTrustedAuthorizationContext,
  type ActiveAuthorityFact,
  type AuthorizationActor,
  type AuthorizationResourceDescriptor,
  type CreateTrustedAuthorizationContextInput,
  type TrustedAuthorizationContext,
} from '@noma/platform/access';
import type { AuthenticatedSessionRecord } from '@noma/platform/identity';

import type { FixtureContext } from './fixtures.js';

export interface AuthorizationFixtureOverrides {
  readonly actor?: AuthorizationActor;
  readonly resource?: AuthorizationResourceDescriptor;
  readonly authorityFacts?: readonly ActiveAuthorityFact[];
  readonly actionId?: string;
  readonly context?: Partial<Omit<CreateTrustedAuthorizationContextInput,
    'actionId' | 'actor' | 'resource' | 'authorityFacts'>>;
}

export function createAuthorizationFixture(
  fixture: FixtureContext,
  overrides: AuthorizationFixtureOverrides = {},
): TrustedAuthorizationContext {
  const at = fixture.clock.now();
  const userId = fixture.ids.nextUuid();
  const assignmentId = fixture.ids.nextUuid();
  const templateId = fixture.ids.nextUuid();
  const scopeId = fixture.ids.nextUuid();
  const factorId = fixture.ids.nextUuid();
  const session: AuthenticatedSessionRecord = Object.freeze({
    user: Object.freeze({
      id: userId, publicReference: fixture.ids.nextPublicReference('USER', 10), status: 'ACTIVE',
      displayName: 'Synthetic authorization actor', locale: 'en-NG', version: 1, securityVersion: 1,
      lastTransitionAt: at, lastTransitionId: fixture.ids.nextUuid(), statusReasonCode: null,
      createdAt: at, updatedAt: at, deactivatedAt: null,
    }),
    session: Object.freeze({
      id: fixture.ids.nextUuid(), userId, tokenDigest: 'a'.repeat(64), status: 'ACTIVE',
      assurance: 'PRIVILEGED_MFA_RECENT', issuedSecurityVersion: 1,
      passwordAuthenticatedAt: at, mfaVerifiedAt: at, mfaMethod: 'TOTP', mfaFactorId: factorId,
      issuedAt: at, lastUsedAt: at, idleExpiresAt: new Date(at.getTime() + 3_600_000),
      absoluteExpiresAt: new Date(at.getTime() + 7_200_000), revokedAt: null, revocationCode: null,
      deviceLabel: 'Synthetic browser', clientFamily: null, version: 0,
      lastTransitionAt: at, lastTransitionId: fixture.ids.nextUuid(),
    }),
    contactVerified: true,
    activeMfaFactorId: factorId,
  });
  const authority: ActiveAuthorityFact = Object.freeze({
    assignment: Object.freeze({
      id: assignmentId, subjectType: 'HUMAN', userId, servicePrincipalId: null,
      roleTemplateId: templateId, scopeId, scopeType: 'SELLER', validFrom: new Date(at.getTime() - 1),
      validUntil: null, grantedByUserId: fixture.ids.nextUuid(), grantReason: 'Synthetic governed grant',
      grantedAt: at, revokedByUserId: null, revocationReason: null, revokedAt: null, version: 0,
    }),
    template: Object.freeze({
      id: templateId, code: 'access.synthetic-reviewer', version: 1, displayName: 'Synthetic reviewer',
      status: 'ACTIVE', privilegeClass: 'ORDINARY', assuranceRequirement: { requireContactVerified: false },
      activatedAt: at, retiredAt: null,
    }),
    scope: Object.freeze({
      id: scopeId, type: 'SELLER', userId: null, resourceId: fixture.ids.nextUuid(),
      parentInstitutionScopeId: null, retiredAt: null, createdAt: at,
    }),
    capabilities: Object.freeze(['access.assignment.read']),
  });
  return createTrustedAuthorizationContext({
    actionId: overrides.actionId ?? 'access.assignment.read',
    actor: overrides.actor ?? Object.freeze({ actorType: 'HUMAN', userId, session }),
    resource: overrides.resource ?? Object.freeze({
      resourceType: 'access-assignment', resourceId: assignmentId,
      authorityScopeId: scopeId, authorityScopeType: 'SELLER',
    }),
    environment: 'test', evaluatedAt: at,
    authorityFacts: overrides.authorityFacts ?? [authority], relationshipFacts: [], businessFacts: [],
    featureFacts: [], restrictionFacts: [], emergencyFacts: [], approvalExpectation: null, approvalFact: null,
    ...overrides.context,
  });
}
