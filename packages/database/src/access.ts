import {
  ACCESS_ENVIRONMENTS,
  requireAccessCapabilityCode,
  type AccessApprovalDecisionValue,
  type AccessApprovalOperation,
  type AccessEnvironment,
  type AccessPrivilegeClass,
  type AccessScopeRecord,
  type AccessScopeType,
  type AccessSubjectType,
  type ActiveAuthorityFact,
  type RoleAssignmentRecord,
  type RoleTemplateRecord,
  type ServicePrincipalRecord,
} from '@noma/platform/access';
import {
  evaluateAuthenticationAssurance,
  type AuthenticatedSessionRecord,
} from '@noma/platform/identity';

import type { DatabaseClient } from './client.js';
import type {
  AccessScope,
  RoleAssignment,
  RoleTemplate,
  ServicePrincipal,
} from './generated/prisma/client.js';
import { containIdentitySessionsForAuthorityChange } from './identity.js';
import { runInDatabaseTransaction, type DatabaseTransactionClient } from './transaction.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TEMPLATE_CODE = /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)*$/;
const SERVICE_CODE = /^[a-z][a-z0-9_-]{1,99}$/;

function uuid(name: string, value: string): string {
  if (!UUID.test(value)) throw new Error(`${name} must be a UUID`);
  return value;
}

function text(name: string, value: string, maximum: number): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > maximum) throw new Error(`${name} must contain 1 to ${maximum} characters`);
  return normalized;
}

function instant(name: string, value: Date): Date {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) throw new Error(`${name} must be a valid instant`);
  return value;
}

function positive(name: string, value: number): number {
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`${name} must be a positive integer`);
  return value;
}

function environment(value: string): AccessEnvironment {
  if (!ACCESS_ENVIRONMENTS.includes(value as AccessEnvironment)) throw new Error('Unsupported Access environment');
  return value as AccessEnvironment;
}

function scopeRecord(scope: AccessScope): AccessScopeRecord {
  return Object.freeze({
    id: scope.id,
    type: scope.type,
    userId: scope.userId,
    resourceId: scope.resourceId,
    parentInstitutionScopeId: scope.parentInstitutionScopeId,
    retiredAt: scope.retiredAt,
    createdAt: scope.createdAt,
  });
}

function templateRecord(template: RoleTemplate): RoleTemplateRecord {
  return Object.freeze({
    id: template.id,
    code: template.code,
    version: template.version,
    displayName: template.displayName,
    status: template.status,
    privilegeClass: template.privilegeClass,
    assuranceRequirement: Object.freeze({
      requireContactVerified: template.requireContactVerified,
      ...(template.passwordMaxAgeMilliseconds === null ? {} : { passwordMaxAgeMilliseconds: template.passwordMaxAgeMilliseconds }),
      ...(template.mfaMaxAgeMilliseconds === null ? {} : { mfaMaxAgeMilliseconds: template.mfaMaxAgeMilliseconds }),
    }),
    activatedAt: template.activatedAt,
    retiredAt: template.retiredAt,
  });
}

function assignmentRecord(assignment: RoleAssignment): RoleAssignmentRecord {
  return Object.freeze({
    id: assignment.id,
    subjectType: assignment.subjectType,
    userId: assignment.userId,
    servicePrincipalId: assignment.servicePrincipalId,
    roleTemplateId: assignment.roleTemplateId,
    scopeId: assignment.scopeId,
    scopeType: assignment.scopeType,
    validFrom: assignment.validFrom,
    validUntil: assignment.validUntil,
    grantedByUserId: assignment.grantedByUserId,
    grantReason: assignment.grantReason,
    grantedAt: assignment.grantedAt,
    revokedByUserId: assignment.revokedByUserId,
    revocationReason: assignment.revocationReason,
    revokedAt: assignment.revokedAt,
    version: assignment.version,
  });
}

function principalRecord(principal: ServicePrincipal): ServicePrincipalRecord {
  return Object.freeze({
    id: principal.id,
    environment: environment(principal.environment),
    code: principal.code,
    purpose: principal.purpose,
    ownerUserId: principal.ownerUserId,
    credentialPolicyVersion: principal.credentialPolicyVersion,
    lastRotatedAt: principal.lastRotatedAt,
    revokedAt: principal.revokedAt,
    version: principal.version,
  });
}

export type CreateAccessScopeInput =
  | Readonly<{ id: string; type: 'SELF'; userId: string; createdAt: Date }>
  | Readonly<{ id: string; type: 'PLATFORM'; createdAt: Date }>
  | Readonly<{ id: string; type: 'INSTITUTION'; resourceId: string; createdAt: Date }>
  | Readonly<{
    id: string;
    type: Exclude<AccessScopeType, 'SELF' | 'PLATFORM' | 'INSTITUTION'>;
    resourceId: string;
    parentInstitutionScopeId: string;
    createdAt: Date;
  }>;

/** Transaction-bound seam for the future business module that owns the referenced resource. */
export async function createAccessScope(
  transaction: DatabaseTransactionClient,
  input: CreateAccessScopeInput,
): Promise<AccessScopeRecord> {
  let userId: string | null = null;
  let resourceId: string | null = null;
  let parentInstitutionScopeId: string | null = null;
  if (input.type === 'SELF') userId = uuid('userId', input.userId);
  else if (input.type !== 'PLATFORM') {
    resourceId = uuid('resourceId', input.resourceId);
    if (input.type !== 'INSTITUTION') parentInstitutionScopeId = uuid('parentInstitutionScopeId', input.parentInstitutionScopeId);
  }
  const created = await transaction.accessScope.create({
    data: {
      id: uuid('access scope id', input.id),
      type: input.type,
      userId,
      resourceId,
      parentInstitutionScopeId,
      createdAt: instant('createdAt', input.createdAt),
    },
  });
  return scopeRecord(created);
}

export interface CreateDraftRoleTemplateInput {
  readonly id: string;
  readonly code: string;
  readonly version: number;
  readonly displayName: string;
  readonly privilegeClass: AccessPrivilegeClass;
  readonly requireContactVerified: boolean;
  readonly passwordMaxAgeMilliseconds?: number;
  readonly mfaMaxAgeMilliseconds?: number;
  readonly allowedScopes: readonly AccessScopeType[];
  readonly allowedSubjects: readonly AccessSubjectType[];
  readonly capabilityCodes: readonly string[];
  readonly createdAt: Date;
}

export type AccessSubject =
  | Readonly<{ subjectType: 'HUMAN'; userId: string }>
  | Readonly<{ subjectType: 'SERVICE_PRINCIPAL'; servicePrincipalId: string }>;

export interface GrantRoleAssignmentInput {
  readonly id: string;
  readonly subject: AccessSubject;
  readonly roleTemplateId: string;
  readonly scopeId: string;
  readonly scopeType: AccessScopeType;
  readonly validFrom: Date;
  readonly validUntil?: Date;
  readonly grantedByUserId: string;
  readonly grantReason: string;
  readonly grantedAt: Date;
  readonly containmentTransitionId: string;
}

export interface RequestAccessApprovalInput {
  readonly id: string;
  readonly operation: AccessApprovalOperation;
  readonly subject: AccessSubject;
  readonly roleTemplateId: string;
  readonly scopeId: string;
  readonly scopeType: AccessScopeType;
  readonly requestedValidFrom: Date;
  readonly requestedValidUntil?: Date;
  readonly requestedByUserId: string;
  readonly reason: string;
  readonly expiresAt: Date;
  readonly idempotencyKey: string;
  readonly independentApprovalRequired: boolean;
  readonly createdAt: Date;
}

export interface RecordAccessApprovalDecisionInput {
  readonly id: string;
  readonly approvalRequestId: string;
  readonly approverUserId: string;
  readonly approverSessionId: string;
  readonly decision: AccessApprovalDecisionValue;
  readonly reason: string;
  readonly decidedAt: Date;
  readonly evaluatedAt: Date;
}

export interface CreateServicePrincipalInput {
  readonly id: string;
  readonly code: string;
  readonly purpose: string;
  readonly ownerUserId: string;
  readonly credentialPolicyVersion: number;
  readonly createdAt: Date;
}

export interface AccessAuthorityPersistence {
  createDraftRoleTemplate(input: CreateDraftRoleTemplateInput): Promise<RoleTemplateRecord>;
  activateRoleTemplate(roleTemplateId: string, activatedAt: Date): Promise<RoleTemplateRecord>;
  retireRoleTemplate(roleTemplateId: string, retiredAt: Date): Promise<RoleTemplateRecord>;
  retireCapability(code: string, retiredAt: Date): Promise<Readonly<{ code: string; retiredAt: Date }>>;
  createServicePrincipal(input: CreateServicePrincipalInput): Promise<ServicePrincipalRecord>;
  rotateServicePrincipal(id: string, expectedVersion: number, credentialPolicyVersion: number, rotatedAt: Date): Promise<ServicePrincipalRecord | null>;
  revokeServicePrincipal(id: string, expectedVersion: number, revokedByUserId: string, reason: string, revokedAt: Date): Promise<ServicePrincipalRecord | null>;
  grantRoleAssignment(input: GrantRoleAssignmentInput): Promise<RoleAssignmentRecord>;
  grantTemporaryAccess(input: GrantRoleAssignmentInput & Readonly<{ temporaryGrantId: string; ownerUserId: string; temporaryReason: string; approvalRequestId?: string }>): Promise<RoleAssignmentRecord>;
  revokeRoleAssignment(id: string, expectedVersion: number, revokedByUserId: string, reason: string, revokedAt: Date, containmentTransitionId: string): Promise<RoleAssignmentRecord | null>;
  resolveActiveAuthorityFacts(subject: AccessSubject, at: Date): Promise<readonly ActiveAuthorityFact[]>;
  requestApproval(input: RequestAccessApprovalInput): Promise<Readonly<{ id: string; state: 'PENDING'; version: number }>>;
  recordApprovalDecision(input: RecordAccessApprovalDecisionInput): Promise<Readonly<{ id: string; requestState: 'APPROVED' | 'REJECTED' }>>;
}

async function grantInTransaction(
  transaction: DatabaseTransactionClient,
  input: GrantRoleAssignmentInput,
  expectedEnvironment: AccessEnvironment,
): Promise<{ assignment: RoleAssignment; privilegeClass: AccessPrivilegeClass }> {
  const template = await transaction.roleTemplate.findUniqueOrThrow({ where: { id: uuid('roleTemplateId', input.roleTemplateId) } });
  const scope = await transaction.accessScope.findUniqueOrThrow({ where: { id: uuid('scopeId', input.scopeId) } });
  if (scope.type !== input.scopeType) throw new Error('Assignment scope type does not match the exact AccessScope');
  if (input.subject.subjectType === 'SERVICE_PRINCIPAL') {
    const principal = await transaction.servicePrincipal.findUniqueOrThrow({ where: { id: uuid('servicePrincipalId', input.subject.servicePrincipalId) } });
    if (principal.environment !== expectedEnvironment || principal.revokedAt) throw new Error('Service principal is unavailable in this environment');
  }
  const validFrom = instant('validFrom', input.validFrom);
  const validUntil = input.validUntil ? instant('validUntil', input.validUntil) : null;
  if (validUntil && validUntil <= validFrom) throw new Error('validUntil must be later than validFrom');
  const assignment = await transaction.roleAssignment.create({
    data: {
      id: uuid('assignment id', input.id),
      subjectType: input.subject.subjectType,
      userId: input.subject.subjectType === 'HUMAN' ? uuid('userId', input.subject.userId) : null,
      servicePrincipalId: input.subject.subjectType === 'SERVICE_PRINCIPAL' ? uuid('servicePrincipalId', input.subject.servicePrincipalId) : null,
      roleTemplateId: template.id,
      scopeId: scope.id,
      scopeType: input.scopeType,
      validFrom,
      validUntil,
      grantedByUserId: uuid('grantedByUserId', input.grantedByUserId),
      grantReason: text('grantReason', input.grantReason, 500),
      grantedAt: instant('grantedAt', input.grantedAt),
    },
  });
  if (template.privilegeClass === 'PRIVILEGED' && input.subject.subjectType === 'HUMAN') {
    await containIdentitySessionsForAuthorityChange(transaction, {
      userId: input.subject.userId,
      occurredAt: input.grantedAt,
      transitionId: input.containmentTransitionId,
      reasonCode: 'PRIVILEGED_ACCESS_GRANTED',
    });
  }
  return { assignment, privilegeClass: template.privilegeClass };
}

export function createAccessAuthorityPersistence(
  client: DatabaseClient,
  options: Readonly<{ environment: AccessEnvironment }>,
): AccessAuthorityPersistence {
  const expectedEnvironment = environment(options.environment);
  const persistence: AccessAuthorityPersistence = {
    async createDraftRoleTemplate(input) {
      if (!TEMPLATE_CODE.test(input.code) || input.code.length > 80) throw new Error('Invalid role template code');
      if (input.allowedScopes.length === 0 || input.allowedSubjects.length === 0 || input.capabilityCodes.length === 0) throw new Error('Role template mappings cannot be empty');
      if (new Set(input.allowedScopes).size !== input.allowedScopes.length
        || new Set(input.allowedSubjects).size !== input.allowedSubjects.length
        || new Set(input.capabilityCodes).size !== input.capabilityCodes.length) throw new Error('Role template mappings must be unique');
      const capabilityCodes = input.capabilityCodes.map(requireAccessCapabilityCode);
      return runInDatabaseTransaction(client, async (transaction) => {
        const capabilities = await transaction.capability.findMany({ where: { code: { in: capabilityCodes }, retiredAt: null } });
        if (capabilities.length !== capabilityCodes.length) throw new Error('Role template contains an unknown or retired capability');
        const created = await transaction.roleTemplate.create({
          data: {
            id: uuid('role template id', input.id),
            code: input.code,
            version: positive('template version', input.version),
            displayName: text('displayName', input.displayName, 120),
            privilegeClass: input.privilegeClass,
            requireContactVerified: input.requireContactVerified,
            passwordMaxAgeMilliseconds: input.passwordMaxAgeMilliseconds ?? null,
            mfaMaxAgeMilliseconds: input.mfaMaxAgeMilliseconds ?? null,
            createdAt: instant('createdAt', input.createdAt),
            updatedAt: input.createdAt,
            allowedScopes: { createMany: { data: input.allowedScopes.map((scopeType) => ({ scopeType })) } },
            allowedSubjects: { createMany: { data: input.allowedSubjects.map((subjectType) => ({ subjectType })) } },
            capabilities: { createMany: { data: capabilities.map((capability) => ({ capabilityId: capability.id })) } },
          },
        });
        return templateRecord(created);
      });
    },

    async activateRoleTemplate(roleTemplateId, activatedAt) {
      const at = instant('activatedAt', activatedAt);
      const updated = await client.roleTemplate.update({
        where: { id: uuid('roleTemplateId', roleTemplateId), status: 'DRAFT' },
        data: { status: 'ACTIVE', activatedAt: at, updatedAt: at },
      });
      return templateRecord(updated);
    },

    async retireRoleTemplate(roleTemplateId, retiredAt) {
      const at = instant('retiredAt', retiredAt);
      const updated = await client.roleTemplate.update({
        where: { id: uuid('roleTemplateId', roleTemplateId), status: 'ACTIVE' },
        data: { status: 'RETIRED', retiredAt: at, updatedAt: at },
      });
      return templateRecord(updated);
    },

    async retireCapability(code, retiredAt) {
      const at = instant('retiredAt', retiredAt);
      const capability = await client.capability.update({ where: { code: requireAccessCapabilityCode(code) }, data: { retiredAt: at } });
      return Object.freeze({ code: capability.code, retiredAt: at });
    },

    async createServicePrincipal(input) {
      if (!SERVICE_CODE.test(input.code)) throw new Error('Invalid service-principal code');
      const created = await client.servicePrincipal.create({ data: {
        id: uuid('service principal id', input.id), environment: expectedEnvironment, code: input.code,
        purpose: text('purpose', input.purpose, 240), ownerUserId: uuid('ownerUserId', input.ownerUserId),
        credentialPolicyVersion: positive('credentialPolicyVersion', input.credentialPolicyVersion),
        createdAt: instant('createdAt', input.createdAt), updatedAt: input.createdAt,
      } });
      return principalRecord(created);
    },

    async rotateServicePrincipal(id, expectedVersion, credentialPolicyVersion, rotatedAt) {
      const nextCredentialPolicyVersion = positive('credentialPolicyVersion', credentialPolicyVersion);
      const updated = await client.servicePrincipal.updateMany({
        where: {
          id: uuid('service principal id', id), environment: expectedEnvironment, version: expectedVersion,
          revokedAt: null, credentialPolicyVersion: { lt: nextCredentialPolicyVersion },
        },
        data: { credentialPolicyVersion: nextCredentialPolicyVersion, lastRotatedAt: instant('rotatedAt', rotatedAt), version: { increment: 1 }, updatedAt: rotatedAt },
      });
      if (updated.count !== 1) return null;
      return principalRecord(await client.servicePrincipal.findUniqueOrThrow({ where: { id } }));
    },

    async revokeServicePrincipal(id, expectedVersion, revokedByUserId, reason, revokedAt) {
      const at = instant('revokedAt', revokedAt);
      return runInDatabaseTransaction(client, async (transaction) => {
        const updated = await transaction.servicePrincipal.updateMany({
          where: { id: uuid('service principal id', id), environment: expectedEnvironment, version: expectedVersion, revokedAt: null },
          data: { revokedAt: at, revokedByUserId: uuid('revokedByUserId', revokedByUserId), revocationReason: text('revocationReason', reason, 500), version: { increment: 1 }, updatedAt: at },
        });
        if (updated.count !== 1) return null;
        await transaction.roleAssignment.updateMany({
          where: { servicePrincipalId: id, revokedAt: null },
          data: { revokedAt: at, revokedByUserId, revocationReason: 'SERVICE_PRINCIPAL_REVOKED', version: { increment: 1 }, updatedAt: at },
        });
        return principalRecord(await transaction.servicePrincipal.findUniqueOrThrow({ where: { id } }));
      });
    },

    async grantRoleAssignment(input) {
      return runInDatabaseTransaction(client, async (transaction) => assignmentRecord((await grantInTransaction(transaction, input, expectedEnvironment)).assignment));
    },

    async grantTemporaryAccess(input) {
      if (!input.validUntil) throw new Error('Temporary access requires finite expiry');
      return runInDatabaseTransaction(client, async (transaction) => {
        const granted = await grantInTransaction(transaction, input, expectedEnvironment);
        await transaction.temporaryAccessGrant.create({ data: {
          id: uuid('temporary grant id', input.temporaryGrantId), roleAssignmentId: granted.assignment.id,
          ownerUserId: uuid('ownerUserId', input.ownerUserId), reason: text('temporaryReason', input.temporaryReason, 500),
          approvalRequestId: input.approvalRequestId ? uuid('approvalRequestId', input.approvalRequestId) : null,
          createdAt: input.grantedAt,
        } });
        return assignmentRecord(granted.assignment);
      });
    },

    async revokeRoleAssignment(id, expectedVersion, revokedByUserId, reason, revokedAt, containmentTransitionId) {
      const at = instant('revokedAt', revokedAt);
      return runInDatabaseTransaction(client, async (transaction) => {
        const current = await transaction.roleAssignment.findUnique({ where: { id: uuid('assignment id', id) }, include: { roleTemplate: true } });
        if (!current || current.revokedAt || current.version !== expectedVersion) return null;
        const updated = await transaction.roleAssignment.updateMany({
          where: { id: current.id, version: expectedVersion, revokedAt: null },
          data: { revokedAt: at, revokedByUserId: uuid('revokedByUserId', revokedByUserId), revocationReason: text('revocationReason', reason, 500), version: { increment: 1 }, updatedAt: at },
        });
        if (updated.count !== 1) return null;
        if (current.roleTemplate.privilegeClass === 'PRIVILEGED' && current.subjectType === 'HUMAN' && current.userId) {
          await containIdentitySessionsForAuthorityChange(transaction, {
            userId: current.userId, occurredAt: at, transitionId: containmentTransitionId,
            reasonCode: 'PRIVILEGED_ACCESS_REVOKED',
          });
        }
        return assignmentRecord(await transaction.roleAssignment.findUniqueOrThrow({ where: { id: current.id } }));
      });
    },

    async resolveActiveAuthorityFacts(subject, at) {
      const now = instant('at', at);
      if (subject.subjectType === 'SERVICE_PRINCIPAL') {
        const principal = await client.servicePrincipal.findUnique({ where: { id: uuid('servicePrincipalId', subject.servicePrincipalId) } });
        if (!principal || principal.environment !== expectedEnvironment || principal.revokedAt) return Object.freeze([]);
      }
      const assignments = await client.roleAssignment.findMany({
        where: {
          ...(subject.subjectType === 'HUMAN' ? { subjectType: 'HUMAN', userId: uuid('userId', subject.userId) } : { subjectType: 'SERVICE_PRINCIPAL', servicePrincipalId: subject.servicePrincipalId }),
          revokedAt: null, validFrom: { lte: now }, OR: [{ validUntil: null }, { validUntil: { gt: now } }],
          scope: { retiredAt: null },
        },
        include: { scope: true, roleTemplate: { include: { capabilities: { include: { capability: true } } } } },
        orderBy: { id: 'asc' },
      });
      return Object.freeze(assignments.map((assignment) => Object.freeze({
        assignment: assignmentRecord(assignment),
        template: templateRecord(assignment.roleTemplate),
        scope: scopeRecord(assignment.scope),
        capabilities: Object.freeze(assignment.roleTemplate.capabilities
          .filter(({ capability }) => capability.retiredAt === null)
          .map(({ capability }) => capability.code)
          .sort()),
      })));
    },

    async requestApproval(input) {
      const validFrom = instant('requestedValidFrom', input.requestedValidFrom);
      const validUntil = input.requestedValidUntil ? instant('requestedValidUntil', input.requestedValidUntil) : null;
      if (validUntil && validUntil <= validFrom) throw new Error('requestedValidUntil must be later than requestedValidFrom');
      const created = await client.approvalRequest.create({ data: {
        id: uuid('approval request id', input.id), operation: input.operation, subjectType: input.subject.subjectType,
        targetUserId: input.subject.subjectType === 'HUMAN' ? uuid('targetUserId', input.subject.userId) : null,
        targetServicePrincipalId: input.subject.subjectType === 'SERVICE_PRINCIPAL' ? uuid('targetServicePrincipalId', input.subject.servicePrincipalId) : null,
        roleTemplateId: uuid('roleTemplateId', input.roleTemplateId), scopeId: uuid('scopeId', input.scopeId), scopeType: input.scopeType,
        requestedValidFrom: validFrom, requestedValidUntil: validUntil,
        requestedByUserId: uuid('requestedByUserId', input.requestedByUserId), reason: text('reason', input.reason, 500),
        expiresAt: instant('expiresAt', input.expiresAt), idempotencyKey: text('idempotencyKey', input.idempotencyKey, 160),
        independentApprovalRequired: input.independentApprovalRequired, createdAt: instant('createdAt', input.createdAt), updatedAt: input.createdAt,
      } });
      return Object.freeze({ id: created.id, state: 'PENDING' as const, version: created.version });
    },

    async recordApprovalDecision(input) {
      const decidedAt = instant('decidedAt', input.decidedAt);
      const evaluatedAt = instant('evaluatedAt', input.evaluatedAt);
      return runInDatabaseTransaction(client, async (transaction) => {
        const request = await transaction.approvalRequest.findUniqueOrThrow({ where: { id: uuid('approvalRequestId', input.approvalRequestId) }, include: { roleTemplate: true } });
        const session = await transaction.session.findUniqueOrThrow({ where: { id: uuid('approverSessionId', input.approverSessionId) }, include: { user: true } });
        const [contact, activeFactor] = await Promise.all([
          transaction.userEmail.findFirst({ where: { userId: input.approverUserId, verifiedAt: { not: null }, primaryAt: { not: null }, retiredAt: null }, select: { id: true } }),
          transaction.mfaFactor.findFirst({ where: { userId: input.approverUserId, status: 'ACTIVE' }, select: { id: true } }),
        ]);
        const authenticated: AuthenticatedSessionRecord = {
          user: {
            id: session.user.id, publicReference: session.user.publicReference, status: session.user.status,
            displayName: session.user.displayName, locale: session.user.locale, version: session.user.version,
            securityVersion: session.user.securityVersion, lastTransitionAt: session.user.lastTransitionAt,
            lastTransitionId: session.user.lastTransitionId, statusReasonCode: session.user.statusReasonCode,
            createdAt: session.user.createdAt, updatedAt: session.user.updatedAt, deactivatedAt: session.user.deactivatedAt,
          },
          session: {
            id: session.id, userId: session.userId, tokenDigest: session.tokenDigest, status: session.status,
            assurance: session.assurance, issuedSecurityVersion: session.issuedSecurityVersion,
            passwordAuthenticatedAt: session.passwordAuthenticatedAt, mfaVerifiedAt: session.mfaVerifiedAt,
            mfaMethod: session.mfaMethod, mfaFactorId: session.mfaFactorId, issuedAt: session.issuedAt,
            lastUsedAt: session.lastUsedAt, idleExpiresAt: session.idleExpiresAt, absoluteExpiresAt: session.absoluteExpiresAt,
            revokedAt: session.revokedAt, revocationCode: session.revocationCode, deviceLabel: session.deviceLabel,
            clientFamily: session.clientFamily, version: session.version, lastTransitionAt: session.lastTransitionAt,
            lastTransitionId: session.lastTransitionId,
          },
          contactVerified: contact !== null,
          activeMfaFactorId: activeFactor?.id ?? null,
        };
        if (session.userId !== input.approverUserId || !evaluateAuthenticationAssurance(authenticated, evaluatedAt, templateRecord(request.roleTemplate).assuranceRequirement).satisfiesRequirement) {
          throw new Error('Approval session does not satisfy the role template assurance baseline');
        }
        const decision = await transaction.approvalDecision.create({ data: {
          id: uuid('approval decision id', input.id), approvalRequestId: request.id,
          approverUserId: uuid('approverUserId', input.approverUserId), decision: input.decision,
          reason: text('reason', input.reason, 500), decidedAt, sessionId: session.id,
          securityVersion: session.user.securityVersion, passwordAuthenticatedAt: session.passwordAuthenticatedAt,
          mfaVerifiedAt: session.mfaVerifiedAt, mfaMethod: session.mfaMethod, mfaFactorId: session.mfaFactorId,
          assuranceEvaluatedAt: evaluatedAt, createdAt: decidedAt,
        } });
        const requestState = input.decision === 'APPROVE' ? 'APPROVED' as const : 'REJECTED' as const;
        const updated = await transaction.approvalRequest.updateMany({
          where: { id: request.id, state: 'PENDING', version: request.version },
          data: { state: requestState, version: { increment: 1 }, updatedAt: decidedAt },
        });
        if (updated.count !== 1) throw new Error('Approval request authority changed');
        return Object.freeze({ id: decision.id, requestState });
      });
    },
  };
  return Object.freeze(persistence);
}

export async function lockActiveAuthorityFactForUse(
  transaction: DatabaseTransactionClient,
  input: Readonly<{ assignmentId: string; subject: AccessSubject; capabilityCode: string; environment: AccessEnvironment; at: Date }>,
): Promise<Readonly<{ assignmentId: string; roleTemplateId: string; scopeId: string; capabilityCode: string }> | null> {
  const at = instant('at', input.at);
  const subjectId = input.subject.subjectType === 'HUMAN' ? uuid('userId', input.subject.userId) : uuid('servicePrincipalId', input.subject.servicePrincipalId);
  const capabilityCode = requireAccessCapabilityCode(input.capabilityCode);
  const expectedEnvironment = environment(input.environment);
  const rows = await transaction.$queryRaw<readonly { assignmentId: string; roleTemplateId: string; scopeId: string }[]>`
    SELECT ra."id" AS "assignmentId", ra."role_template_id" AS "roleTemplateId", ra."scope_id" AS "scopeId"
    FROM "role_assignments" ra
    JOIN "access_scopes" s ON s."id" = ra."scope_id" AND s."retired_at" IS NULL
    JOIN "role_template_capabilities" rtc ON rtc."role_template_id" = ra."role_template_id"
    JOIN "capabilities" c ON c."id" = rtc."capability_id" AND c."retired_at" IS NULL
    LEFT JOIN "service_principals" sp ON sp."id" = ra."service_principal_id"
    WHERE ra."id" = CAST(${uuid('assignmentId', input.assignmentId)} AS uuid)
      AND c."code" = ${capabilityCode}
      AND ra."subject_type" = CAST(${input.subject.subjectType} AS "access_subject_type")
      AND ((${input.subject.subjectType} = 'HUMAN' AND ra."user_id" = CAST(${subjectId} AS uuid))
        OR (${input.subject.subjectType} = 'SERVICE_PRINCIPAL' AND ra."service_principal_id" = CAST(${subjectId} AS uuid)
          AND sp."environment" = ${expectedEnvironment} AND sp."revoked_at" IS NULL))
      AND ra."valid_from" <= ${at}
      AND (ra."valid_until" IS NULL OR ${at} < ra."valid_until")
      AND ra."revoked_at" IS NULL
    FOR UPDATE OF ra`;
  const row = rows[0];
  return row ? Object.freeze({ ...row, capabilityCode }) : null;
}
