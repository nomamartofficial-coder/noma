import { ACCESS_SCOPE_TYPES, requireAccessCapabilityCode } from '../contracts.js';
import type { AuthorizationPolicyDefinition } from './contracts.js';
import { NOT_APPLICABLE, requirePolicyKey } from './requirements.js';

function validateRequirement(name: string, requirement: AuthorizationPolicyDefinition['businessFacts']): void {
  if (requirement.applicability === 'NOT_APPLICABLE') return;
  if (requirement.keys.length === 0 || new Set(requirement.keys.map(requirePolicyKey)).size !== requirement.keys.length) {
    throw new Error(`${name} must contain unique exact fact keys`);
  }
}

export function defineAuthorizationPolicy(definition: AuthorizationPolicyDefinition): AuthorizationPolicyDefinition {
  const id = requirePolicyKey(definition.id);
  const actionId = requirePolicyKey(definition.actionId);
  const requiredCapability = requireAccessCapabilityCode(definition.requiredCapability);
  if (definition.permittedActorTypes.length === 0 || new Set(definition.permittedActorTypes).size !== definition.permittedActorTypes.length) {
    throw new Error('Authorization policy actor types must be non-empty and unique');
  }
  if (definition.permittedScopeTypes.length === 0 || new Set(definition.permittedScopeTypes).size !== definition.permittedScopeTypes.length
    || definition.permittedScopeTypes.some((scope) => !ACCESS_SCOPE_TYPES.includes(scope))) {
    throw new Error('Authorization policy scope types must be non-empty, exact, and unique');
  }
  if (definition.relationship === 'EXACT_SCOPE' || definition.relationship === 'SELF') {
    if (definition.relationshipFactKey !== undefined) throw new Error('Exact and self scope policies cannot name a relationship fact');
  } else if (!definition.relationshipFactKey) {
    throw new Error('Contextual relationship policies must name an exact fact key');
  } else {
    requirePolicyKey(definition.relationshipFactKey);
  }
  for (const [name, requirement] of [
    ['businessFacts', definition.businessFacts],
    ['featureFacts', definition.featureFacts],
    ['restrictionFacts', definition.restrictionFacts],
    ['emergencyFacts', definition.emergencyFacts],
  ] as const) validateRequirement(name, requirement);
  if (definition.approval.applicability === 'REQUIRED' && definition.permittedActorTypes.includes('SERVICE_PRINCIPAL')) {
    throw new Error('Current Access approval evidence is human maker-checker evidence');
  }
  return Object.freeze({
    ...definition,
    id,
    actionId,
    requiredCapability,
    permittedActorTypes: Object.freeze([...definition.permittedActorTypes]),
    permittedScopeTypes: Object.freeze([...definition.permittedScopeTypes]),
  });
}

export interface AuthorizationPolicyRegistry {
  readonly policies: readonly AuthorizationPolicyDefinition[];
  resolve(policyId: string): AuthorizationPolicyDefinition | null;
}

export function createAuthorizationPolicyRegistry(definitions: readonly AuthorizationPolicyDefinition[]): AuthorizationPolicyRegistry {
  const policies = definitions.map(defineAuthorizationPolicy);
  const byId = new Map<string, AuthorizationPolicyDefinition>();
  for (const policy of policies) {
    if (byId.has(policy.id)) throw new Error(`Duplicate authorization policy: ${policy.id}`);
    byId.set(policy.id, policy);
  }
  return Object.freeze({
    policies: Object.freeze(policies),
    resolve(policyId: string) {
      try {
        return byId.get(requirePolicyKey(policyId)) ?? null;
      } catch {
        return null;
      }
    },
  });
}

const EVERY_EXACT_SCOPE = ACCESS_SCOPE_TYPES;
const PRIVILEGED_ACCESS_ASSURANCE = Object.freeze({
  requireContactVerified: true,
  passwordMaxAgeMilliseconds: 10 * 60_000,
  mfaMaxAgeMilliseconds: 5 * 60_000,
});

export const ACCESS_AUTHORIZATION_POLICIES = Object.freeze([
  defineAuthorizationPolicy({
    id: 'audit.event.read.v1', actionId: 'audit.event.read', effect: 'READ',
    permittedActorTypes: ['HUMAN'], requiredCapability: 'audit.event.read',
    permittedScopeTypes: ['SELLER', 'INSTITUTION', 'ORDER', 'CASE', 'ASSIGNMENT', 'FULFILMENT_LOCATION', 'QUEUE', 'CARRIER'],
    relationship: 'EXACT_SCOPE', humanAccount: 'ACTIVE',
    actionAssurance: PRIVILEGED_ACCESS_ASSURANCE, businessFacts: NOT_APPLICABLE,
    featureFacts: NOT_APPLICABLE, restrictionFacts: NOT_APPLICABLE, emergencyFacts: NOT_APPLICABLE,
    approval: NOT_APPLICABLE,
  }),
  defineAuthorizationPolicy({
    id: 'access.assignment.read.v1', actionId: 'access.assignment.read', effect: 'READ',
    permittedActorTypes: ['HUMAN'], requiredCapability: 'access.assignment.read',
    permittedScopeTypes: EVERY_EXACT_SCOPE, relationship: 'EXACT_SCOPE', humanAccount: 'ACTIVE',
    actionAssurance: { requireContactVerified: false }, businessFacts: NOT_APPLICABLE,
    featureFacts: NOT_APPLICABLE, restrictionFacts: NOT_APPLICABLE, emergencyFacts: NOT_APPLICABLE,
    approval: NOT_APPLICABLE,
  }),
  defineAuthorizationPolicy({
    id: 'access.assignment.grant.v1', actionId: 'access.assignment.grant', effect: 'LOCAL_MUTATION',
    permittedActorTypes: ['HUMAN'], requiredCapability: 'access.assignment.grant',
    permittedScopeTypes: EVERY_EXACT_SCOPE, relationship: 'EXACT_SCOPE', humanAccount: 'ACTIVE',
    actionAssurance: PRIVILEGED_ACCESS_ASSURANCE, businessFacts: NOT_APPLICABLE,
    featureFacts: NOT_APPLICABLE, restrictionFacts: NOT_APPLICABLE, emergencyFacts: NOT_APPLICABLE,
    approval: { applicability: 'REQUIRED', operation: 'ASSIGNMENT_GRANT', independent: true },
  }),
  defineAuthorizationPolicy({
    id: 'access.service-principal.read.v1', actionId: 'access.service-principal.read', effect: 'READ',
    permittedActorTypes: ['SERVICE_PRINCIPAL'], requiredCapability: 'access.service-principal.read',
    permittedScopeTypes: ['INSTITUTION', 'PLATFORM'], relationship: 'EXACT_SCOPE', humanAccount: 'NOT_APPLICABLE',
    actionAssurance: { requireContactVerified: false }, businessFacts: NOT_APPLICABLE,
    featureFacts: NOT_APPLICABLE, restrictionFacts: NOT_APPLICABLE, emergencyFacts: NOT_APPLICABLE,
    approval: NOT_APPLICABLE,
  }),
]);

export const authorizationPolicyRegistry = createAuthorizationPolicyRegistry(ACCESS_AUTHORIZATION_POLICIES);
