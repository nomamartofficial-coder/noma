import type {
  AuthenticatedSessionRecord,
  AuthenticationAssuranceRequirement,
} from '../identity/index.js';
import { evaluateAuthenticationAssurance } from '../identity/index.js';

export const ACCESS_SCOPE_TYPES = [
  'SELF',
  'SELLER',
  'INSTITUTION',
  'ORDER',
  'CASE',
  'ASSIGNMENT',
  'FULFILMENT_LOCATION',
  'QUEUE',
  'CARRIER',
  'PLATFORM',
] as const;
export type AccessScopeType = (typeof ACCESS_SCOPE_TYPES)[number];

export const ACCESS_SUBJECT_TYPES = ['HUMAN', 'SERVICE_PRINCIPAL'] as const;
export type AccessSubjectType = (typeof ACCESS_SUBJECT_TYPES)[number];

export const ACCESS_PRIVILEGE_CLASSES = ['ORDINARY', 'PRIVILEGED'] as const;
export type AccessPrivilegeClass = (typeof ACCESS_PRIVILEGE_CLASSES)[number];

export const ROLE_TEMPLATE_STATUSES = ['DRAFT', 'ACTIVE', 'RETIRED'] as const;
export type RoleTemplateStatus = (typeof ROLE_TEMPLATE_STATUSES)[number];

export const ACCESS_APPROVAL_OPERATIONS = [
  'ASSIGNMENT_GRANT',
  'ASSIGNMENT_REVOKE',
  'TEMPORARY_ACCESS_GRANT',
  'TEMPORARY_ACCESS_REVOKE',
] as const;
export type AccessApprovalOperation = (typeof ACCESS_APPROVAL_OPERATIONS)[number];

export const ACCESS_APPROVAL_STATES = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'EXPIRED',
  'CANCELLED',
] as const;
export type AccessApprovalState = (typeof ACCESS_APPROVAL_STATES)[number];

export const ACCESS_APPROVAL_DECISIONS = ['APPROVE', 'REJECT'] as const;
export type AccessApprovalDecisionValue = (typeof ACCESS_APPROVAL_DECISIONS)[number];

export const ACCESS_ENVIRONMENTS = ['test', 'preview', 'staging', 'production'] as const;
export type AccessEnvironment = (typeof ACCESS_ENVIRONMENTS)[number];

export const ACCESS_CAPABILITY_CODES = [
  'access.assignment.read',
  'access.assignment.request',
  'access.assignment.grant',
  'access.assignment.revoke',
  'access.approval.read',
  'access.approval.decide',
  'access.temporary.request',
  'access.temporary.grant',
  'access.temporary.revoke',
  'access.service-principal.read',
  'access.service-principal.create',
  'access.service-principal.rotate',
  'access.service-principal.revoke',
] as const;
export type AccessCapabilityCode = (typeof ACCESS_CAPABILITY_CODES)[number];

const CAPABILITY_CODE = /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/;

export function requireAccessCapabilityCode(value: string): string {
  if (value.length > 120 || !CAPABILITY_CODE.test(value) || value.includes('*')) {
    throw new Error('Access capability must be an exact lowercase dotted code without wildcards');
  }
  return value;
}

export interface AccessScopeRecord {
  readonly id: string;
  readonly type: AccessScopeType;
  readonly userId: string | null;
  readonly resourceId: string | null;
  readonly parentInstitutionScopeId: string | null;
  readonly retiredAt: Date | null;
  readonly createdAt: Date;
}

export interface CapabilityRecord {
  readonly id: string;
  readonly code: string;
  readonly retiredAt: Date | null;
}

export interface RoleTemplateRecord {
  readonly id: string;
  readonly code: string;
  readonly version: number;
  readonly displayName: string;
  readonly status: RoleTemplateStatus;
  readonly privilegeClass: AccessPrivilegeClass;
  readonly assuranceRequirement: AuthenticationAssuranceRequirement;
  readonly activatedAt: Date | null;
  readonly retiredAt: Date | null;
}

export interface RoleAssignmentRecord {
  readonly id: string;
  readonly subjectType: AccessSubjectType;
  readonly userId: string | null;
  readonly servicePrincipalId: string | null;
  readonly roleTemplateId: string;
  readonly scopeId: string;
  readonly scopeType: AccessScopeType;
  readonly validFrom: Date;
  readonly validUntil: Date | null;
  readonly grantedByUserId: string;
  readonly grantReason: string;
  readonly grantedAt: Date;
  readonly revokedByUserId: string | null;
  readonly revocationReason: string | null;
  readonly revokedAt: Date | null;
  readonly version: number;
}

export interface ActiveAuthorityFact {
  readonly assignment: RoleAssignmentRecord;
  readonly template: RoleTemplateRecord;
  readonly scope: AccessScopeRecord;
  readonly capabilities: readonly string[];
}

export interface AccessApprovalProofSnapshot {
  readonly sessionId: string;
  readonly securityVersion: number;
  readonly passwordAuthenticatedAt: Date | null;
  readonly mfaVerifiedAt: Date | null;
  readonly mfaMethod: 'TOTP' | 'RECOVERY_CODE' | null;
  readonly mfaFactorId: string | null;
  readonly evaluatedAt: Date;
}

export interface ServicePrincipalRecord {
  readonly id: string;
  readonly environment: AccessEnvironment;
  readonly code: string;
  readonly purpose: string;
  readonly ownerUserId: string;
  readonly credentialPolicyVersion: number;
  readonly lastRotatedAt: Date | null;
  readonly revokedAt: Date | null;
  readonly version: number;
}

export function isRoleAssignmentActive(
  assignment: Pick<RoleAssignmentRecord, 'validFrom' | 'validUntil' | 'revokedAt'>,
  at: Date,
): boolean {
  return assignment.revokedAt === null
    && assignment.validFrom <= at
    && (assignment.validUntil === null || at < assignment.validUntil);
}

export function evaluateAuthorityFactAssurance(
  fact: Pick<ActiveAuthorityFact, 'template'>,
  session: AuthenticatedSessionRecord,
  at: Date,
) {
  return evaluateAuthenticationAssurance(session, at, fact.template.assuranceRequirement);
}
