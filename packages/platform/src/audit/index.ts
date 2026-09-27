import type { AccessScopeType } from '../access/contracts.js';
import { AUTHENTICATION_ASSURANCE_LEVELS, type AuthenticationAssurance } from '../identity/contracts.js';

export const AUDIT_ACTION_CODES = [
  'identity.password.recovery.complete',
  'identity.mfa.factor.activate',
  'identity.mfa.factor.replace',
  'identity.mfa.factor.remove',
  'identity.mfa.recovery-codes.regenerate',
  'identity.assurance.step-up.complete',
  'access.scope.create',
  'access.role-template.create',
  'access.role-template.activate',
  'access.role-template.retire',
  'access.capability.retire',
  'access.service-principal.create',
  'access.service-principal.rotate',
  'access.service-principal.revoke',
  'access.assignment.grant',
  'access.assignment.revoke',
  'access.temporary-access.grant',
  'access.temporary-access.revoke',
  'access.approval.request',
  'access.approval.decide',
  'audit.event.read',
] as const;

export type AuditActionCode = (typeof AUDIT_ACTION_CODES)[number];
export const AUDIT_ACTOR_KINDS = ['HUMAN', 'SERVICE_PRINCIPAL', 'SYSTEM'] as const;
export type AuditActorKind = (typeof AUDIT_ACTOR_KINDS)[number];
export const AUDIT_OUTCOMES = ['SUCCEEDED', 'DENIED', 'FAILED'] as const;
export type AuditOutcome = (typeof AUDIT_OUTCOMES)[number];
export type AuditPrimitive = string | number | boolean | null;

export type AuditActor =
  | Readonly<{ kind: 'HUMAN'; userId: string; sessionId?: string }>
  | Readonly<{ kind: 'SERVICE_PRINCIPAL'; servicePrincipalId: string }>
  | Readonly<{ kind: 'SYSTEM'; systemActorCode: string }>;

export interface AuditAuthoritySnapshot {
  readonly roleAssignmentId: string;
  readonly roleTemplateCode: string;
  readonly roleTemplateVersion: number;
  readonly capabilityCode: string;
  readonly policyId: string;
  readonly scopeType: AccessScopeType;
  readonly scopeId: string;
  readonly institutionId?: string;
  readonly assurance?: AuthenticationAssurance;
  readonly approvalRequestId?: string;
}

export interface AuditResourceReference {
  readonly type: string;
  readonly id: string;
  readonly institutionId?: string;
}

export interface AuditEventLinkInput {
  readonly targetType: string;
  readonly targetId: string;
  readonly relationshipType: string;
}

type SummaryPair<TBefore, TAfter> = Readonly<{
  beforeSummary?: TBefore;
  afterSummary?: TAfter;
}>;

export interface AuditSummaryByAction {
  'identity.password.recovery.complete': SummaryPair<Readonly<{ securityVersion: number }>, Readonly<{ securityVersion: number; sessionsRevoked: boolean }>>;
  'identity.mfa.factor.activate': SummaryPair<Readonly<{ factorState: 'PENDING_ENROLLMENT' }>, Readonly<{ factorState: 'ACTIVE'; recoveryCodeCount: number }>>;
  'identity.mfa.factor.replace': SummaryPair<Readonly<{ factorState: 'ACTIVE' }>, Readonly<{ factorState: 'ACTIVE'; previousFactorState: 'REPLACED'; recoveryCodeCount: number }>>;
  'identity.mfa.factor.remove': SummaryPair<Readonly<{ factorState: 'ACTIVE' }>, Readonly<{ factorState: 'REVOKED'; sessionsRevoked: boolean }>>;
  'identity.mfa.recovery-codes.regenerate': SummaryPair<Readonly<{ batchState: 'ACTIVE' }>, Readonly<{ batchState: 'ACTIVE'; recoveryCodeCount: number }>>;
  'identity.assurance.step-up.complete': SummaryPair<Readonly<{ assurance: string }>, Readonly<{ assurance: string }>>;
  'access.scope.create': SummaryPair<never, Readonly<{ scopeType: AccessScopeType }>>;
  'access.role-template.create': SummaryPair<never, Readonly<{ status: 'DRAFT'; version: number }>>;
  'access.role-template.activate': SummaryPair<Readonly<{ status: 'DRAFT' }>, Readonly<{ status: 'ACTIVE' }>>;
  'access.role-template.retire': SummaryPair<Readonly<{ status: 'ACTIVE' }>, Readonly<{ status: 'RETIRED' }>>;
  'access.capability.retire': SummaryPair<Readonly<{ retired: false }>, Readonly<{ retired: true }>>;
  'access.service-principal.create': SummaryPair<never, Readonly<{ environment: string; revoked: false }>>;
  'access.service-principal.rotate': SummaryPair<Readonly<{ version: number }>, Readonly<{ version: number }>>;
  'access.service-principal.revoke': SummaryPair<Readonly<{ revoked: false }>, Readonly<{ revoked: true }>>;
  'access.assignment.grant': SummaryPair<never, Readonly<{ scopeType: AccessScopeType; temporary: false }>>;
  'access.assignment.revoke': SummaryPair<Readonly<{ revoked: false }>, Readonly<{ revoked: true }>>;
  'access.temporary-access.grant': SummaryPair<never, Readonly<{ scopeType: AccessScopeType; temporary: true }>>;
  'access.temporary-access.revoke': SummaryPair<Readonly<{ revoked: false }>, Readonly<{ revoked: true; temporary: true }>>;
  'access.approval.request': SummaryPair<never, Readonly<{ state: 'PENDING'; operation: string }>>;
  'access.approval.decide': SummaryPair<Readonly<{ state: 'PENDING' }>, Readonly<{ state: 'APPROVED' | 'REJECTED'; decision: 'APPROVE' | 'REJECT' }>>;
  'audit.event.read': SummaryPair<never, Readonly<{ projectionId: 'audit.timeline.row.v1'; filterCategory: string; resultCount: number }>>;
}

type AuditCommonInput<A extends AuditActionCode> = Readonly<{
  eventId: string;
  actionCode: A;
  occurredAt: Date;
  actor: AuditActor;
  authority?: AuditAuthoritySnapshot;
  resource: AuditResourceReference;
  reasonCode?: string;
  reasonText?: string;
  outcome: AuditOutcome;
  failureCode?: string;
  requestId?: string;
  correlationId: string;
  operationId: string;
  sourceVersion?: number;
  correctsAuditEventId?: string;
  links?: readonly AuditEventLinkInput[];
}>;

export type AuditEventInput<A extends AuditActionCode = AuditActionCode> = AuditCommonInput<A> & AuditSummaryByAction[A];

type AuditFieldRule = Readonly<{
  key: string;
  type: 'string' | 'number' | 'boolean';
  values?: readonly AuditPrimitive[];
  maximum?: number;
}>;

export type AuditEventDefinition = Readonly<{
  actionCode: AuditActionCode;
  contractVersion: number;
  sourceModule: 'identity' | 'access' | 'audit';
  actorKinds: readonly AuditActorKind[];
  resourceType: string;
  reason: 'REQUIRED' | 'OPTIONAL' | 'FORBIDDEN';
  outcomes: readonly AuditOutcome[];
  beforeFields: readonly AuditFieldRule[];
  afterFields: readonly AuditFieldRule[];
  authorityRequired: boolean;
  approvalRequired: boolean;
}>;

const ACTION = /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/;
const RESOURCE_TYPE = /^[A-Z][A-Z0-9_]{0,79}$/;
const REFERENCE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const unsafeText = /(?:\$argon2|bearer\s|session[-_ ]?token|mfa[-_ ]?seed|otp[-_ ]?code|totp[-_ ]?code|recovery[-_ ]?code|reset[-_ ]?token|verification[-_ ]?token|api[-_ ]?secret|provider[-_ ]?secret|private\s+key|BEGIN [A-Z ]*PRIVATE KEY|raw[-_ ]?payload|request[-_ ]?body)/i;

function field(key: string, type: AuditFieldRule['type'], values?: readonly AuditPrimitive[], maximum?: number): AuditFieldRule {
  return Object.freeze({ key, type, ...(values ? { values: Object.freeze([...values]) } : {}), ...(maximum === undefined ? {} : { maximum }) });
}

const scopeTypes = ['SELF', 'SELLER', 'INSTITUTION', 'ORDER', 'CASE', 'ASSIGNMENT', 'FULFILMENT_LOCATION', 'QUEUE', 'CARRIER', 'PLATFORM'] as const;
const succeeded = ['SUCCEEDED'] as const;
const human = ['HUMAN'] as const;
const humanOrSystem = ['HUMAN', 'SYSTEM'] as const;

const reasonCodesByAction: Readonly<Partial<Record<AuditActionCode, readonly string[]>>> = Object.freeze({
  'identity.mfa.factor.remove': Object.freeze(['USER_REQUESTED_FACTOR_REMOVAL']),
  'access.scope.create': Object.freeze(['BUSINESS_RESOURCE_CREATED', 'SYSTEM_BOOTSTRAP']),
  'access.role-template.create': Object.freeze(['ACCESS_DESIGN_CHANGE']),
  'access.role-template.activate': Object.freeze(['ROLE_TEMPLATE_APPROVED']),
  'access.role-template.retire': Object.freeze(['ROLE_TEMPLATE_RETIRED']),
  'access.capability.retire': Object.freeze(['CAPABILITY_RETIRED']),
  'access.service-principal.create': Object.freeze(['WORKLOAD_IDENTITY_CREATED']),
  'access.service-principal.rotate': Object.freeze(['CREDENTIAL_POLICY_ROTATED']),
  'access.service-principal.revoke': Object.freeze(['SERVICE_PRINCIPAL_REVOKED']),
  'access.assignment.grant': Object.freeze(['APPROVED_ACCESS_CHANGE']),
  'access.assignment.revoke': Object.freeze(['APPROVED_ACCESS_CHANGE']),
  'access.temporary-access.grant': Object.freeze(['APPROVED_TEMPORARY_ACCESS']),
  'access.temporary-access.revoke': Object.freeze(['TEMPORARY_ACCESS_ENDED']),
  'access.approval.request': Object.freeze(['ACCESS_CHANGE_REQUESTED']),
  'access.approval.decide': Object.freeze(['INDEPENDENT_REVIEW_COMPLETED']),
  'audit.event.read': Object.freeze(['INVESTIGATION', 'COMPLIANCE_REVIEW']),
});

const rawDefinitions: readonly AuditEventDefinition[] = [
  { actionCode: 'identity.password.recovery.complete', contractVersion: 1, sourceModule: 'identity', actorKinds: humanOrSystem, resourceType: 'USER', reason: 'FORBIDDEN', outcomes: succeeded, beforeFields: [field('securityVersion', 'number')], afterFields: [field('securityVersion', 'number'), field('sessionsRevoked', 'boolean')], authorityRequired: false, approvalRequired: false },
  { actionCode: 'identity.mfa.factor.activate', contractVersion: 1, sourceModule: 'identity', actorKinds: human, resourceType: 'MFA_FACTOR', reason: 'FORBIDDEN', outcomes: succeeded, beforeFields: [field('factorState', 'string', ['PENDING_ENROLLMENT'])], afterFields: [field('factorState', 'string', ['ACTIVE']), field('recoveryCodeCount', 'number')], authorityRequired: false, approvalRequired: false },
  { actionCode: 'identity.mfa.factor.replace', contractVersion: 1, sourceModule: 'identity', actorKinds: human, resourceType: 'MFA_FACTOR', reason: 'FORBIDDEN', outcomes: succeeded, beforeFields: [field('factorState', 'string', ['ACTIVE'])], afterFields: [field('factorState', 'string', ['ACTIVE']), field('previousFactorState', 'string', ['REPLACED']), field('recoveryCodeCount', 'number')], authorityRequired: false, approvalRequired: false },
  { actionCode: 'identity.mfa.factor.remove', contractVersion: 1, sourceModule: 'identity', actorKinds: human, resourceType: 'MFA_FACTOR', reason: 'REQUIRED', outcomes: succeeded, beforeFields: [field('factorState', 'string', ['ACTIVE'])], afterFields: [field('factorState', 'string', ['REVOKED']), field('sessionsRevoked', 'boolean')], authorityRequired: false, approvalRequired: false },
  { actionCode: 'identity.mfa.recovery-codes.regenerate', contractVersion: 1, sourceModule: 'identity', actorKinds: human, resourceType: 'MFA_RECOVERY_BATCH', reason: 'FORBIDDEN', outcomes: succeeded, beforeFields: [field('batchState', 'string', ['ACTIVE'])], afterFields: [field('batchState', 'string', ['ACTIVE']), field('recoveryCodeCount', 'number')], authorityRequired: false, approvalRequired: false },
  { actionCode: 'identity.assurance.step-up.complete', contractVersion: 1, sourceModule: 'identity', actorKinds: human, resourceType: 'SESSION', reason: 'FORBIDDEN', outcomes: succeeded, beforeFields: [field('assurance', 'string', undefined, 40)], afterFields: [field('assurance', 'string', undefined, 40)], authorityRequired: false, approvalRequired: false },
  { actionCode: 'access.scope.create', contractVersion: 1, sourceModule: 'access', actorKinds: humanOrSystem, resourceType: 'ACCESS_SCOPE', reason: 'OPTIONAL', outcomes: succeeded, beforeFields: [], afterFields: [field('scopeType', 'string', scopeTypes)], authorityRequired: false, approvalRequired: false },
  { actionCode: 'access.role-template.create', contractVersion: 1, sourceModule: 'access', actorKinds: human, resourceType: 'ROLE_TEMPLATE', reason: 'OPTIONAL', outcomes: succeeded, beforeFields: [], afterFields: [field('status', 'string', ['DRAFT']), field('version', 'number')], authorityRequired: true, approvalRequired: false },
  { actionCode: 'access.role-template.activate', contractVersion: 1, sourceModule: 'access', actorKinds: human, resourceType: 'ROLE_TEMPLATE', reason: 'REQUIRED', outcomes: succeeded, beforeFields: [field('status', 'string', ['DRAFT'])], afterFields: [field('status', 'string', ['ACTIVE'])], authorityRequired: true, approvalRequired: false },
  { actionCode: 'access.role-template.retire', contractVersion: 1, sourceModule: 'access', actorKinds: human, resourceType: 'ROLE_TEMPLATE', reason: 'REQUIRED', outcomes: succeeded, beforeFields: [field('status', 'string', ['ACTIVE'])], afterFields: [field('status', 'string', ['RETIRED'])], authorityRequired: true, approvalRequired: false },
  { actionCode: 'access.capability.retire', contractVersion: 1, sourceModule: 'access', actorKinds: human, resourceType: 'CAPABILITY', reason: 'REQUIRED', outcomes: succeeded, beforeFields: [field('retired', 'boolean', [false])], afterFields: [field('retired', 'boolean', [true])], authorityRequired: true, approvalRequired: false },
  { actionCode: 'access.service-principal.create', contractVersion: 1, sourceModule: 'access', actorKinds: human, resourceType: 'SERVICE_PRINCIPAL', reason: 'REQUIRED', outcomes: succeeded, beforeFields: [], afterFields: [field('environment', 'string', undefined, 20), field('revoked', 'boolean', [false])], authorityRequired: true, approvalRequired: false },
  { actionCode: 'access.service-principal.rotate', contractVersion: 1, sourceModule: 'access', actorKinds: human, resourceType: 'SERVICE_PRINCIPAL', reason: 'REQUIRED', outcomes: succeeded, beforeFields: [field('version', 'number')], afterFields: [field('version', 'number')], authorityRequired: true, approvalRequired: false },
  { actionCode: 'access.service-principal.revoke', contractVersion: 1, sourceModule: 'access', actorKinds: human, resourceType: 'SERVICE_PRINCIPAL', reason: 'REQUIRED', outcomes: succeeded, beforeFields: [field('revoked', 'boolean', [false])], afterFields: [field('revoked', 'boolean', [true])], authorityRequired: true, approvalRequired: false },
  { actionCode: 'access.assignment.grant', contractVersion: 1, sourceModule: 'access', actorKinds: human, resourceType: 'ROLE_ASSIGNMENT', reason: 'REQUIRED', outcomes: succeeded, beforeFields: [], afterFields: [field('scopeType', 'string', scopeTypes), field('temporary', 'boolean', [false])], authorityRequired: true, approvalRequired: true },
  { actionCode: 'access.assignment.revoke', contractVersion: 1, sourceModule: 'access', actorKinds: human, resourceType: 'ROLE_ASSIGNMENT', reason: 'REQUIRED', outcomes: succeeded, beforeFields: [field('revoked', 'boolean', [false])], afterFields: [field('revoked', 'boolean', [true])], authorityRequired: true, approvalRequired: true },
  { actionCode: 'access.temporary-access.grant', contractVersion: 1, sourceModule: 'access', actorKinds: human, resourceType: 'ROLE_ASSIGNMENT', reason: 'REQUIRED', outcomes: succeeded, beforeFields: [], afterFields: [field('scopeType', 'string', scopeTypes), field('temporary', 'boolean', [true])], authorityRequired: true, approvalRequired: true },
  { actionCode: 'access.temporary-access.revoke', contractVersion: 1, sourceModule: 'access', actorKinds: human, resourceType: 'ROLE_ASSIGNMENT', reason: 'REQUIRED', outcomes: succeeded, beforeFields: [field('revoked', 'boolean', [false])], afterFields: [field('revoked', 'boolean', [true]), field('temporary', 'boolean', [true])], authorityRequired: true, approvalRequired: true },
  { actionCode: 'access.approval.request', contractVersion: 1, sourceModule: 'access', actorKinds: human, resourceType: 'APPROVAL_REQUEST', reason: 'REQUIRED', outcomes: succeeded, beforeFields: [], afterFields: [field('state', 'string', ['PENDING']), field('operation', 'string', undefined, 80)], authorityRequired: true, approvalRequired: false },
  { actionCode: 'access.approval.decide', contractVersion: 1, sourceModule: 'access', actorKinds: human, resourceType: 'APPROVAL_REQUEST', reason: 'REQUIRED', outcomes: succeeded, beforeFields: [field('state', 'string', ['PENDING'])], afterFields: [field('state', 'string', ['APPROVED', 'REJECTED']), field('decision', 'string', ['APPROVE', 'REJECT'])], authorityRequired: true, approvalRequired: true },
  { actionCode: 'audit.event.read', contractVersion: 1, sourceModule: 'audit', actorKinds: human, resourceType: 'AUDIT_TIMELINE', reason: 'OPTIONAL', outcomes: succeeded, beforeFields: [], afterFields: [field('projectionId', 'string', ['audit.timeline.row.v1']), field('filterCategory', 'string', ['RESOURCE', 'ACTOR', 'INSTITUTION', 'ACTION', 'CORRELATION', 'TIME']), field('resultCount', 'number')], authorityRequired: true, approvalRequired: false },
];

const definedDefinitions = new WeakSet<object>();

export function defineAuditEventDefinition(definition: AuditEventDefinition): AuditEventDefinition {
  if (!AUDIT_ACTION_CODES.includes(definition.actionCode) || !ACTION.test(definition.actionCode)
    || definition.actionCode.includes('*') || !Number.isSafeInteger(definition.contractVersion) || definition.contractVersion < 1
    || definition.actorKinds.length === 0 || new Set(definition.actorKinds).size !== definition.actorKinds.length
    || definition.actorKinds.some((kind) => !AUDIT_ACTOR_KINDS.includes(kind))
    || !RESOURCE_TYPE.test(definition.resourceType)
    || definition.outcomes.length === 0 || definition.outcomes.some((outcome) => !AUDIT_OUTCOMES.includes(outcome))) {
    throw new Error('Invalid audit event definition');
  }
  const freezeRules = (rules: readonly AuditFieldRule[]) => Object.freeze(rules.map((rule) => Object.freeze({ ...rule, ...(rule.values ? { values: Object.freeze([...rule.values]) } : {}) })));
  const result = Object.freeze({ ...definition, actorKinds: Object.freeze([...definition.actorKinds]), outcomes: Object.freeze([...definition.outcomes]), beforeFields: freezeRules(definition.beforeFields), afterFields: freezeRules(definition.afterFields) });
  definedDefinitions.add(result);
  return result;
}

export interface AuditEventRegistry {
  readonly definitions: readonly AuditEventDefinition[];
  readonly resolve: (actionCode: string) => AuditEventDefinition | null;
}

export function createAuditEventRegistry(definitions: readonly AuditEventDefinition[]): AuditEventRegistry {
  const byCode = new Map<AuditActionCode, AuditEventDefinition>();
  for (const candidate of definitions) {
    const definition = definedDefinitions.has(candidate) ? candidate : defineAuditEventDefinition(candidate);
    if (byCode.has(definition.actionCode)) throw new Error(`Duplicate audit action: ${definition.actionCode}`);
    byCode.set(definition.actionCode, definition);
  }
  return Object.freeze({
    definitions: Object.freeze([...byCode.values()]),
    resolve(actionCode: string) {
      if (!ACTION.test(actionCode) || actionCode.includes('*')) return null;
      return byCode.get(actionCode as AuditActionCode) ?? null;
    },
  });
}

export const auditEventRegistry = createAuditEventRegistry(rawDefinitions.map(defineAuditEventDefinition));

export function safeAuditReasonCode(actionCode: string, value: unknown): string | null {
  const definition = auditEventRegistry.resolve(actionCode);
  return definition && typeof value === 'string' && (reasonCodesByAction[definition.actionCode] ?? []).includes(value)
    ? value : null;
}

export function formatAuditSummary(actionCode: string, value: unknown, side: 'beforeFields' | 'afterFields'): string | null {
  const definition = auditEventRegistry.resolve(actionCode);
  if (!definition || value === null || value === undefined) return null;
  try {
    const safe = validateSummary(value, definition[side], side);
    return safe ? Object.entries(safe).map(([key, item]) => `${key}=${String(item)}`).join('; ') : null;
  } catch {
    return null;
  }
}

export interface PreparedAuditEvent {
  readonly eventId: string;
  readonly actionCode: AuditActionCode;
  readonly contractVersion: number;
  readonly sourceModule: 'identity' | 'access' | 'audit';
  readonly occurredAt: Date;
  readonly actor: AuditActor;
  readonly authority?: AuditAuthoritySnapshot;
  readonly resource: AuditResourceReference;
  readonly reasonCode?: string;
  readonly reasonText?: string;
  readonly outcome: AuditOutcome;
  readonly failureCode?: string;
  readonly requestId?: string;
  readonly correlationId: string;
  readonly operationId: string;
  readonly sourceVersion?: number;
  readonly beforeSummary?: Readonly<Record<string, AuditPrimitive>>;
  readonly afterSummary?: Readonly<Record<string, AuditPrimitive>>;
  readonly correctsAuditEventId?: string;
  readonly links: readonly AuditEventLinkInput[];
}

const preparedEvents = new WeakSet<object>();

function requireReference(name: string, value: string, uuid = false): string {
  if (typeof value !== 'string' || value !== value.trim() || !(uuid ? UUID : REFERENCE).test(value)) throw new Error(`Invalid ${name}`);
  return value;
}

function validateSummary(value: unknown, rules: readonly AuditFieldRule[], name: string): Readonly<Record<string, AuditPrimitive>> | undefined {
  if (value === undefined) {
    if (rules.length > 0) throw new Error(`Missing ${name}`);
    return undefined;
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`Invalid ${name}`);
  const keys = Object.keys(value);
  if (keys.length !== rules.length || rules.some((rule) => !Object.hasOwn(value, rule.key))) throw new Error(`Invalid ${name}`);
  const safe: Record<string, AuditPrimitive> = Object.create(null);
  for (const rule of rules) {
    const descriptor = Object.getOwnPropertyDescriptor(value, rule.key);
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) throw new Error(`Invalid ${name}`);
    const fieldValue = descriptor.value;
    if (typeof fieldValue !== rule.type || (typeof fieldValue === 'number' && (!Number.isSafeInteger(fieldValue) || fieldValue < 0))
      || (typeof fieldValue === 'string' && (fieldValue !== fieldValue.trim() || fieldValue.length === 0 || fieldValue.length > (rule.maximum ?? 120) || unsafeText.test(fieldValue)))
      || (rule.values && !rule.values.includes(fieldValue as AuditPrimitive))) throw new Error(`Invalid ${name}`);
    safe[rule.key] = fieldValue as AuditPrimitive;
  }
  return Object.freeze(safe);
}

function validateActor(actor: AuditActor, allowed: readonly AuditActorKind[]): AuditActor {
  if (!allowed.includes(actor.kind)) throw new Error('Invalid audit actor');
  if (actor.kind === 'HUMAN') return Object.freeze({ kind: actor.kind, userId: requireReference('actor user id', actor.userId, true), ...(actor.sessionId ? { sessionId: requireReference('session id', actor.sessionId, true) } : {}) });
  if (actor.kind === 'SERVICE_PRINCIPAL') return Object.freeze({ kind: actor.kind, servicePrincipalId: requireReference('service principal id', actor.servicePrincipalId, true) });
  return Object.freeze({ kind: actor.kind, systemActorCode: requireReference('system actor code', actor.systemActorCode) });
}

export function prepareAuditEvent<A extends AuditActionCode>(input: AuditEventInput<A>): PreparedAuditEvent {
  const definition = auditEventRegistry.resolve(input.actionCode);
  if (!definition || !definition.outcomes.includes(input.outcome)) throw new Error('Unknown or invalid audit action');
  if (!(input.occurredAt instanceof Date) || !Number.isFinite(input.occurredAt.getTime())) throw new Error('Invalid audit time or version');
  const reasonCode = input.reasonCode === undefined ? undefined : requireReference('reason code', input.reasonCode);
  const allowedReasonCodes = reasonCodesByAction[definition.actionCode] ?? [];
  if ((definition.reason === 'REQUIRED' && !reasonCode)
    || (reasonCode !== undefined && !allowedReasonCodes.includes(reasonCode))
    || input.reasonText !== undefined) throw new Error('Invalid audit reason');
  if (definition.authorityRequired !== (input.authority !== undefined)) throw new Error('Invalid audit authority snapshot');
  if (definition.approvalRequired && !input.authority?.approvalRequestId) throw new Error('Audit approval evidence is required');
  if ((input.outcome === 'SUCCEEDED') === (input.failureCode !== undefined)) throw new Error('Invalid audit failure evidence');
  if (input.resource.type !== definition.resourceType) throw new Error('Invalid audit resource');
  const authority = input.authority ? Object.freeze({
    ...input.authority,
    roleAssignmentId: requireReference('role assignment id', input.authority.roleAssignmentId, true),
    roleTemplateCode: requireReference('role template code', input.authority.roleTemplateCode),
    capabilityCode: requireReference('capability code', input.authority.capabilityCode),
    policyId: requireReference('policy id', input.authority.policyId),
    scopeId: requireReference('scope id', input.authority.scopeId, true),
    ...(input.authority.institutionId ? { institutionId: requireReference('institution id', input.authority.institutionId, true) } : {}),
    ...(input.authority.approvalRequestId ? { approvalRequestId: requireReference('approval request id', input.authority.approvalRequestId, true) } : {}),
  }) : undefined;
  if (authority && (!Number.isSafeInteger(authority.roleTemplateVersion) || authority.roleTemplateVersion < 1
    || !scopeTypes.includes(authority.scopeType)
    || (authority.assurance !== undefined && !AUTHENTICATION_ASSURANCE_LEVELS.includes(authority.assurance)))) {
    throw new Error('Invalid audit authority snapshot');
  }
  const links = Object.freeze((input.links ?? []).map((link) => Object.freeze({
    targetType: requireReference('link target type', link.targetType),
    targetId: requireReference('link target id', link.targetId),
    relationshipType: requireReference('link relationship type', link.relationshipType),
  })));
  if (new Set(links.map((link) => `${link.targetType}\0${link.targetId}`)).size !== links.length) throw new Error('Duplicate audit event target');
  const beforeSummary = validateSummary(input.beforeSummary, definition.beforeFields, 'before summary');
  const afterSummary = validateSummary(input.afterSummary, definition.afterFields, 'after summary');
  const result: PreparedAuditEvent = Object.freeze({
    eventId: requireReference('audit event id', input.eventId, true),
    actionCode: definition.actionCode,
    contractVersion: definition.contractVersion,
    sourceModule: definition.sourceModule,
    occurredAt: new Date(input.occurredAt.getTime()),
    actor: validateActor(input.actor, definition.actorKinds),
    ...(authority ? { authority } : {}),
    resource: Object.freeze({ type: input.resource.type, id: requireReference('resource id', input.resource.id), ...(input.resource.institutionId ? { institutionId: requireReference('resource institution id', input.resource.institutionId, true) } : {}) }),
    ...(reasonCode ? { reasonCode } : {}),
    outcome: input.outcome,
    ...(input.failureCode ? { failureCode: requireReference('failure code', input.failureCode) } : {}),
    ...(input.requestId ? { requestId: requireReference('request id', input.requestId) } : {}),
    correlationId: requireReference('correlation id', input.correlationId),
    operationId: requireReference('operation id', input.operationId),
    ...(input.sourceVersion === undefined ? {} : { sourceVersion: input.sourceVersion }),
    ...(beforeSummary ? { beforeSummary } : {}),
    ...(afterSummary ? { afterSummary } : {}),
    ...(input.correctsAuditEventId ? { correctsAuditEventId: requireReference('corrected audit event id', input.correctsAuditEventId, true) } : {}),
    links,
  });
  if (!Number.isFinite(result.occurredAt.getTime()) || (result.sourceVersion !== undefined && (!Number.isSafeInteger(result.sourceVersion) || result.sourceVersion < 0))) throw new Error('Invalid audit time or version');
  preparedEvents.add(result);
  return result;
}

export function isPreparedAuditEvent(value: unknown): value is PreparedAuditEvent {
  return typeof value === 'object' && value !== null && preparedEvents.has(value);
}
