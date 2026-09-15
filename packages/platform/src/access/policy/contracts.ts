import type { AuthenticatedSessionRecord, AuthenticationAssuranceRequirement } from '../../identity/index.js';
import type {
  AccessApprovalOperation,
  AccessApprovalState,
  AccessEnvironment,
  AccessScopeType,
  AccessSubjectType,
  ActiveAuthorityFact,
  ServicePrincipalRecord,
} from '../contracts.js';

export const AUTHORIZATION_DECISIONS = ['ALLOW', 'DENY'] as const;
export type AuthorizationDecisionValue = (typeof AUTHORIZATION_DECISIONS)[number];

export const AUTHORIZATION_DENIAL_REASONS = [
  'UNAUTHENTICATED',
  'ACCOUNT_INELIGIBLE',
  'AUTHORITY_MISSING',
  'CAPABILITY_MISSING',
  'SCOPE_MISMATCH',
  'RELATIONSHIP_MISSING',
  'ASSURANCE_REQUIRED',
  'STATE_INVALID',
  'FEATURE_INACTIVE',
  'RESTRICTION_ACTIVE',
  'EMERGENCY_BLOCK',
  'APPROVAL_REQUIRED',
  'FACT_UNAVAILABLE',
  'POLICY_UNKNOWN',
] as const;
export type AuthorizationDenialReason = (typeof AUTHORIZATION_DENIAL_REASONS)[number];

export const AUTHORIZATION_RELATIONSHIPS = [
  'EXACT_SCOPE',
  'SELF',
  'RESOURCE_IN_INSTITUTION',
  'RESOURCE_OF_SELLER',
  'CURRENT_ASSIGNMENT',
] as const;
export type AuthorizationRelationship = (typeof AUTHORIZATION_RELATIONSHIPS)[number];

export const AUTHORIZATION_FACT_STATES = ['SATISFIED', 'NOT_SATISFIED', 'UNKNOWN'] as const;
export type AuthorizationFactState = (typeof AUTHORIZATION_FACT_STATES)[number];

export const AUTHORIZATION_FEATURE_STATES = ['ACTIVE', 'INACTIVE', 'UNKNOWN'] as const;
export type AuthorizationFeatureState = (typeof AUTHORIZATION_FEATURE_STATES)[number];

export const AUTHORIZATION_RESTRICTION_STATES = ['CLEAR', 'BLOCKED', 'UNKNOWN'] as const;
export type AuthorizationRestrictionState = (typeof AUTHORIZATION_RESTRICTION_STATES)[number];

export const AUTHORIZATION_EMERGENCY_STATES = ['PERMITS_OPERATION', 'BLOCKS_OPERATION', 'UNKNOWN'] as const;
export type AuthorizationEmergencyState = (typeof AUTHORIZATION_EMERGENCY_STATES)[number];

export const AUTHORIZATION_EFFECT_CLASSES = [
  'READ',
  'LOCAL_MUTATION',
  'INITIATE',
  'REVIEW',
  'RECONCILE',
  'GOVERNED_CORRECTION',
] as const;
export type AuthorizationEffectClass = (typeof AUTHORIZATION_EFFECT_CLASSES)[number];

export const AUTHORIZATION_FACT_SOURCES = [
  'IDENTITY_DATABASE',
  'ACCESS_DATABASE',
  'OWNING_MODULE_DATABASE',
  'SERVER_CONFIGURATION',
  'DETERMINISTIC_TEST',
] as const;
export type AuthorizationFactSource = (typeof AUTHORIZATION_FACT_SOURCES)[number];

export interface AuthorizationFactProvenance {
  readonly source: AuthorizationFactSource;
  readonly observedAt: Date;
}

export interface AuthorizationPredicateFact {
  readonly key: string;
  readonly state: AuthorizationFactState;
  readonly provenance: AuthorizationFactProvenance;
}

export interface AuthorizationFeatureFact {
  readonly key: string;
  readonly state: AuthorizationFeatureState;
  readonly provenance: AuthorizationFactProvenance;
}

export interface AuthorizationRestrictionFact {
  readonly key: string;
  readonly state: AuthorizationRestrictionState;
  readonly provenance: AuthorizationFactProvenance;
}

export interface AuthorizationEmergencyFact {
  readonly key: string;
  readonly state: AuthorizationEmergencyState;
  readonly provenance: AuthorizationFactProvenance;
}

export interface AuthorizationRelationshipFact {
  readonly key: string;
  readonly relationship: Exclude<AuthorizationRelationship, 'EXACT_SCOPE' | 'SELF'>;
  readonly authorityScopeId: string;
  readonly resourceId: string;
  readonly state: AuthorizationFactState;
  readonly provenance: AuthorizationFactProvenance;
}

export interface AuthorizationApprovalExpectation {
  readonly operation: AccessApprovalOperation;
  readonly subjectType: AccessSubjectType;
  readonly targetUserId: string | null;
  readonly targetServicePrincipalId: string | null;
  readonly roleTemplateId: string;
  readonly scopeId: string;
  readonly scopeType: AccessScopeType;
  readonly requestedValidFrom: Date;
  readonly requestedValidUntil: Date | null;
}

export interface AuthorizationApprovalFact extends AuthorizationApprovalExpectation {
  readonly id: string;
  readonly requestedByUserId: string;
  readonly state: AccessApprovalState;
  readonly expiresAt: Date;
  readonly independentApprovalRequired: boolean;
  readonly decision: Readonly<{
    approverUserId: string;
    value: 'APPROVE' | 'REJECT';
    securityVersion: number;
    currentSecurityVersion: number;
    accountActive: boolean;
    passwordAuthenticatedAt: Date | null;
    mfaVerifiedAt: Date | null;
    mfaMethod: 'TOTP' | 'RECOVERY_CODE' | null;
    mfaFactorId: string | null;
    currentMfaFactorId: string | null;
    evaluatedAt: Date;
  }> | null;
  readonly provenance: AuthorizationFactProvenance;
}

export type AuthorizationActor =
  | Readonly<{
      actorType: 'HUMAN';
      userId: string;
      session: AuthenticatedSessionRecord | null;
    }>
  | Readonly<{
      actorType: 'SERVICE_PRINCIPAL';
      servicePrincipalId: string;
      authenticated: boolean;
      principal: ServicePrincipalRecord | null;
    }>;

export interface AuthorizationResourceDescriptor {
  readonly resourceType: string;
  readonly resourceId: string;
  readonly authorityScopeId: string;
  readonly authorityScopeType: AccessScopeType;
}

export type AuthorizationFactRequirement =
  | Readonly<{ applicability: 'NOT_APPLICABLE' }>
  | Readonly<{ applicability: 'REQUIRED'; keys: readonly string[] }>;

export type AuthorizationApprovalRequirement =
  | Readonly<{ applicability: 'NOT_APPLICABLE' }>
  | Readonly<{ applicability: 'REQUIRED'; operation: AccessApprovalOperation; independent: boolean }>;

export interface AuthorizationPolicyDefinition {
  readonly id: string;
  readonly actionId: string;
  readonly effect: AuthorizationEffectClass;
  readonly permittedActorTypes: readonly AccessSubjectType[];
  readonly requiredCapability: string;
  readonly permittedScopeTypes: readonly AccessScopeType[];
  readonly relationship: AuthorizationRelationship;
  readonly relationshipFactKey?: string;
  readonly humanAccount: 'ACTIVE' | 'NOT_APPLICABLE';
  readonly actionAssurance: AuthenticationAssuranceRequirement;
  readonly businessFacts: AuthorizationFactRequirement;
  readonly featureFacts: AuthorizationFactRequirement;
  readonly restrictionFacts: AuthorizationFactRequirement;
  readonly emergencyFacts: AuthorizationFactRequirement;
  readonly approval: AuthorizationApprovalRequirement;
}

const trustedAuthorizationContext: unique symbol = Symbol('noma.trusted-authorization-context');

export interface TrustedAuthorizationContext {
  readonly [trustedAuthorizationContext]: true;
  readonly actionId: string;
  readonly actor: AuthorizationActor;
  readonly resource: AuthorizationResourceDescriptor;
  readonly environment: AccessEnvironment;
  readonly evaluatedAt: Date;
  readonly authorityFacts: readonly ActiveAuthorityFact[];
  readonly relationshipFacts: readonly AuthorizationRelationshipFact[];
  readonly businessFacts: readonly AuthorizationPredicateFact[];
  readonly featureFacts: readonly AuthorizationFeatureFact[];
  readonly restrictionFacts: readonly AuthorizationRestrictionFact[];
  readonly emergencyFacts: readonly AuthorizationEmergencyFact[];
  readonly approvalExpectation: AuthorizationApprovalExpectation | null;
  readonly approvalFact: AuthorizationApprovalFact | null;
}

export type AuthorizationDecision =
  | Readonly<{
      decision: 'ALLOW';
      policyId: string;
      authorityAssignmentId: string;
      effectiveAssuranceRequirement?: AuthenticationAssuranceRequirement;
    }>
  | Readonly<{
      decision: 'DENY';
      policyId: string;
      reasonCode: AuthorizationDenialReason;
      effectiveAssuranceRequirement?: AuthenticationAssuranceRequirement;
    }>;

export interface CreateTrustedAuthorizationContextInput extends Omit<TrustedAuthorizationContext, typeof trustedAuthorizationContext> {}

export function createTrustedAuthorizationContext(input: CreateTrustedAuthorizationContextInput): TrustedAuthorizationContext {
  return Object.freeze({
    ...input,
    authorityFacts: Object.freeze([...input.authorityFacts]),
    relationshipFacts: Object.freeze([...input.relationshipFacts]),
    businessFacts: Object.freeze([...input.businessFacts]),
    featureFacts: Object.freeze([...input.featureFacts]),
    restrictionFacts: Object.freeze([...input.restrictionFacts]),
    emergencyFacts: Object.freeze([...input.emergencyFacts]),
    [trustedAuthorizationContext]: true as const,
  });
}

export function isTrustedAuthorizationContext(value: unknown): value is TrustedAuthorizationContext {
  return typeof value === 'object' && value !== null
    && (value as Partial<TrustedAuthorizationContext>)[trustedAuthorizationContext] === true;
}
