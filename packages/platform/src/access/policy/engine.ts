import { evaluateAuthenticationAssurance } from '../../identity/index.js';
import { isRoleAssignmentActive } from '../contracts.js';
import type { ActiveAuthorityFact } from '../contracts.js';
import type {
  AuthorizationApprovalFact,
  AuthorizationApprovalRequirement,
  AuthorizationDecision,
  AuthorizationDenialReason,
  AuthorizationFactRequirement,
  AuthorizationPolicyDefinition,
  AuthorizationRelationshipFact,
  TrustedAuthorizationContext,
} from './contracts.js';
import { isTrustedAuthorizationContext } from './contracts.js';
import { combineAuthenticationAssuranceRequirements } from './requirements.js';
import type { AuthorizationPolicyRegistry } from './registry.js';

function deny(policyId: string, reasonCode: AuthorizationDenialReason, effectiveAssuranceRequirement?: AuthorizationDecision['effectiveAssuranceRequirement']): AuthorizationDecision {
  return Object.freeze({ decision: 'DENY' as const, policyId, reasonCode, ...(effectiveAssuranceRequirement ? { effectiveAssuranceRequirement } : {}) });
}

function validInstant(value: unknown): value is Date {
  return value instanceof Date && Number.isFinite(value.getTime());
}

function factMap<T extends { readonly key: string }>(facts: readonly T[]): ReadonlyMap<string, T> | null {
  const result = new Map<string, T>();
  for (const fact of facts) {
    if (!fact || typeof fact.key !== 'string' || result.has(fact.key)) return null;
    result.set(fact.key, fact);
  }
  return result;
}

function evaluateRequiredFacts<T extends { readonly key: string; readonly state: string }>(
  requirement: AuthorizationFactRequirement,
  facts: readonly T[],
  satisfiedState: string,
  negativeReason: AuthorizationDenialReason,
): AuthorizationDenialReason | null {
  if (requirement.applicability === 'NOT_APPLICABLE') return null;
  const byKey = factMap(facts);
  if (!byKey) return 'FACT_UNAVAILABLE';
  for (const key of requirement.keys) {
    const fact = byKey.get(key);
    if (!fact || fact.state === 'UNKNOWN') return 'FACT_UNAVAILABLE';
    if (fact.state !== satisfiedState) return negativeReason;
  }
  return null;
}

function subjectMatches(fact: ActiveAuthorityFact, context: TrustedAuthorizationContext): boolean {
  return context.actor.actorType === 'HUMAN'
    ? fact.assignment.subjectType === 'HUMAN' && fact.assignment.userId === context.actor.userId
    : fact.assignment.subjectType === 'SERVICE_PRINCIPAL'
      && fact.assignment.servicePrincipalId === context.actor.servicePrincipalId;
}

function scopeMatches(fact: ActiveAuthorityFact, policy: AuthorizationPolicyDefinition, context: TrustedAuthorizationContext): boolean {
  return fact.scope.id === context.resource.authorityScopeId
    && fact.scope.type === context.resource.authorityScopeType
    && fact.assignment.scopeId === fact.scope.id
    && fact.assignment.scopeType === fact.scope.type
    && policy.permittedScopeTypes.includes(fact.scope.type);
}

function relationshipMatches(fact: ActiveAuthorityFact, policy: AuthorizationPolicyDefinition, context: TrustedAuthorizationContext): 'MATCH' | 'MISMATCH' | 'UNKNOWN' {
  if (policy.relationship === 'EXACT_SCOPE') return 'MATCH';
  if (policy.relationship === 'SELF') {
    return context.actor.actorType === 'HUMAN' && fact.scope.type === 'SELF'
      && fact.scope.userId === context.actor.userId ? 'MATCH' : 'MISMATCH';
  }
  const matches = context.relationshipFacts.filter((candidate: AuthorizationRelationshipFact) => candidate.key === policy.relationshipFactKey
    && candidate.relationship === policy.relationship
    && candidate.authorityScopeId === fact.scope.id
    && candidate.resourceId === context.resource.resourceId);
  const match = matches[0];
  if (matches.length !== 1 || !match || match.state === 'UNKNOWN') return 'UNKNOWN';
  return match.state === 'SATISFIED' ? 'MATCH' : 'MISMATCH';
}

function sameInstant(left: Date | null, right: Date | null): boolean {
  return left === null ? right === null : right !== null && left.getTime() === right.getTime();
}

function approvalMatches(requirement: AuthorizationApprovalRequirement, context: TrustedAuthorizationContext): AuthorizationDenialReason | null {
  if (requirement.applicability === 'NOT_APPLICABLE') return null;
  const fact: AuthorizationApprovalFact | null = context.approvalFact;
  const expected = context.approvalExpectation;
  if (!fact || !expected) return 'APPROVAL_REQUIRED';
  if (fact.operation !== requirement.operation || expected.operation !== requirement.operation
    || fact.operation !== expected.operation || fact.subjectType !== expected.subjectType
    || fact.targetUserId !== expected.targetUserId || fact.targetServicePrincipalId !== expected.targetServicePrincipalId
    || fact.roleTemplateId !== expected.roleTemplateId || fact.scopeId !== expected.scopeId || fact.scopeType !== expected.scopeType
    || !sameInstant(fact.requestedValidFrom, expected.requestedValidFrom)
    || !sameInstant(fact.requestedValidUntil, expected.requestedValidUntil)) return 'APPROVAL_REQUIRED';
  if (fact.state !== 'APPROVED' || context.evaluatedAt >= fact.expiresAt
    || (requirement.independent && !fact.independentApprovalRequired)) return 'APPROVAL_REQUIRED';
  const decision = fact.decision;
  if (!decision || decision.value !== 'APPROVE' || !decision.accountActive
    || decision.securityVersion !== decision.currentSecurityVersion
    || (requirement.independent && (decision.approverUserId === fact.requestedByUserId
      || (fact.targetUserId !== null && decision.approverUserId === fact.targetUserId)))) return 'APPROVAL_REQUIRED';
  if (decision.mfaFactorId !== null && decision.mfaFactorId !== decision.currentMfaFactorId) return 'APPROVAL_REQUIRED';
  return null;
}

function contextShapeValid(context: TrustedAuthorizationContext): boolean {
  return validInstant(context.evaluatedAt)
    && typeof context.actionId === 'string'
    && typeof context.resource?.resourceId === 'string'
    && typeof context.resource?.authorityScopeId === 'string'
    && Array.isArray(context.authorityFacts)
    && Array.isArray(context.relationshipFacts)
    && Array.isArray(context.businessFacts)
    && Array.isArray(context.featureFacts)
    && Array.isArray(context.restrictionFacts)
    && Array.isArray(context.emergencyFacts);
}

export function evaluateAuthorization(
  registry: AuthorizationPolicyRegistry,
  policyId: string,
  candidate: unknown,
): AuthorizationDecision {
  const policy = registry.resolve(policyId);
  if (!policy) return deny(policyId, 'POLICY_UNKNOWN');
  if (!isTrustedAuthorizationContext(candidate) || !contextShapeValid(candidate)) return deny(policy.id, 'FACT_UNAVAILABLE');
  const context = candidate;
  if (context.actionId !== policy.actionId) return deny(policy.id, 'POLICY_UNKNOWN');
  if (!policy.permittedActorTypes.includes(context.actor.actorType)) return deny(policy.id, 'AUTHORITY_MISSING');

  if (context.actor.actorType === 'HUMAN') {
    if (!context.actor.session) return deny(policy.id, 'UNAUTHENTICATED');
    if (context.actor.session.user.id !== context.actor.userId || context.actor.session.session.userId !== context.actor.userId) {
      return deny(policy.id, 'UNAUTHENTICATED');
    }
    if (policy.humanAccount === 'ACTIVE' && context.actor.session.user.status !== 'ACTIVE') return deny(policy.id, 'ACCOUNT_INELIGIBLE');
  } else {
    const principal = context.actor.principal;
    if (!context.actor.authenticated || !principal || principal.id !== context.actor.servicePrincipalId) return deny(policy.id, 'UNAUTHENTICATED');
    if (principal.revokedAt !== null || principal.environment !== context.environment) return deny(policy.id, 'AUTHORITY_MISSING');
  }

  const current = context.authorityFacts.filter((fact) => subjectMatches(fact, context)
    && isRoleAssignmentActive(fact.assignment, context.evaluatedAt));
  if (current.length === 0) return deny(policy.id, 'AUTHORITY_MISSING');
  const capable = current.filter((fact) => fact.capabilities.includes(policy.requiredCapability));
  if (capable.length === 0) return deny(policy.id, 'CAPABILITY_MISSING');
  const scoped = capable.filter((fact) => scopeMatches(fact, policy, context));
  if (scoped.length === 0) return deny(policy.id, 'SCOPE_MISMATCH');

  let sawRelationshipUnknown = false;
  const related = scoped.filter((fact) => {
    const result = relationshipMatches(fact, policy, context);
    if (result === 'UNKNOWN') sawRelationshipUnknown = true;
    return result === 'MATCH';
  });
  if (related.length === 0) return deny(policy.id, sawRelationshipUnknown ? 'FACT_UNAVAILABLE' : 'RELATIONSHIP_MISSING');

  let selected: ActiveAuthorityFact | undefined;
  let strictestFailedRequirement: AuthorizationDecision['effectiveAssuranceRequirement'];
  if (context.actor.actorType === 'HUMAN') {
    for (const fact of related) {
      const requirement = combineAuthenticationAssuranceRequirements(fact.template.assuranceRequirement, policy.actionAssurance);
      if (evaluateAuthenticationAssurance(context.actor.session!, context.evaluatedAt, requirement).satisfiesRequirement) {
        selected = fact;
        strictestFailedRequirement = requirement;
        break;
      }
      strictestFailedRequirement = requirement;
    }
    if (!selected) return deny(policy.id, 'ASSURANCE_REQUIRED', strictestFailedRequirement);
  } else {
    selected = related[0];
  }

  const dimensions: readonly [AuthorizationFactRequirement, readonly { readonly key: string; readonly state: string }[], string, AuthorizationDenialReason][] = [
    [policy.businessFacts, context.businessFacts, 'SATISFIED', 'STATE_INVALID'],
    [policy.featureFacts, context.featureFacts, 'ACTIVE', 'FEATURE_INACTIVE'],
    [policy.restrictionFacts, context.restrictionFacts, 'CLEAR', 'RESTRICTION_ACTIVE'],
    [policy.emergencyFacts, context.emergencyFacts, 'PERMITS_OPERATION', 'EMERGENCY_BLOCK'],
  ];
  for (const [requirement, facts, satisfied, negative] of dimensions) {
    const result = evaluateRequiredFacts(requirement, facts, satisfied, negative);
    if (result) return deny(policy.id, result);
  }
  const approvalFailure = approvalMatches(policy.approval, context);
  if (approvalFailure) return deny(policy.id, approvalFailure);
  return Object.freeze({
    decision: 'ALLOW' as const,
    policyId: policy.id,
    authorityAssignmentId: selected!.assignment.id,
    ...(strictestFailedRequirement ? { effectiveAssuranceRequirement: strictestFailedRequirement } : {}),
  });
}
