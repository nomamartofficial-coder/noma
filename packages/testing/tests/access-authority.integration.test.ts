import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

import {
  createAccessAuthorityPersistence,
  createAccessScope,
  createDatabaseClient,
  createIdentityPersistence,
  disconnectDatabaseClient,
  lockActiveAuthorityFactForUse,
  runInDatabaseTransaction,
  type AccessAuthorityPersistence,
  type DatabaseClient,
} from '@noma/database';
import { ACCESS_CAPABILITY_CODES } from '@noma/platform/access';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import {
  startPostgreSqlTestHarness,
  type PostgreSqlTestConnection,
  type PostgreSqlTestHarness,
} from '../src/containers.js';
import { DeterministicTestIds } from '../src/random.js';

const execFileAsync = promisify(execFile);
const ROOT = resolve(import.meta.dirname, '../../..');
const DATABASE_DIR = resolve(ROOT, 'packages/database');
const prismaCli = createRequire(resolve(DATABASE_DIR, 'package.json')).resolve('prisma/build/index.js');
const ids = new DeterministicTestIds('iam-005-access-authority');
const now = new Date('2026-09-15T12:00:00.000Z');

function reference(prefix = 'REF'): string {
  return ids.nextPublicReference(prefix, 8).split('-')[1] ?? 'SYNTHETIC';
}

async function deployMigrations(connection: PostgreSqlTestConnection): Promise<void> {
  await execFileAsync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
    cwd: DATABASE_DIR,
    env: { ...process.env, NOMA_ENV: 'test', NOMA_CREDENTIAL_ENVIRONMENT: 'test', DATABASE_URL: connection.databaseUrl },
    timeout: 120_000,
    windowsHide: true,
  });
}

describe.sequential('IAM-005 PostgreSQL Access authority', () => {
  let harness: PostgreSqlTestHarness;
  let database: DatabaseClient;
  let access: AccessAuthorityPersistence;
  let grantorId: string;
  let targetId: string;
  let approverId: string;
  let otherId: string;
  let institutionOneId: string;
  let institutionTwoId: string;
  let sellerOneId: string;
  let sellerTwoId: string;
  let ordinaryTemplateId: string;
  let privilegedTemplateId: string;
  let serviceTemplateId: string;

  async function createActiveUser(label: string): Promise<string> {
    const identity = createIdentityPersistence(database);
    const created = await identity.registerPasswordIdentity({
      id: ids.nextUuid(), publicReference: ids.nextPublicReference('NOMA', 16),
      displayName: `Synthetic ${label}`, transitionId: ids.nextUuid(), occurredAt: now,
      email: { id: ids.nextUuid(), displayEmail: `${label}-${reference('MAIL').toLowerCase()}@noma.test`, primary: true },
      credential: { id: ids.nextUuid(), encodedHash: '$argon2id$synthetic-iam005-hash-value', hashAlgorithm: 'ARGON2ID', hashPolicyVersion: 1, createdAt: now },
    });
    await database.userEmail.update({ where: { id: created.email.id }, data: { verifiedAt: now } });
    await database.user.update({ where: { id: created.user.id }, data: { status: 'ACTIVE', updatedAt: now } });
    return created.user.id;
  }

  async function createSession(userId: string, input: Readonly<{ privileged?: boolean; expiresAt?: Date }> = {}) {
    const identity = createIdentityPersistence(database);
    const user = await database.user.findUniqueOrThrow({ where: { id: userId } });
    let factorId: string | null = null;
    if (input.privileged) {
      factorId = ids.nextUuid();
      await database.mfaFactor.create({ data: {
        id: factorId, userId, status: 'ACTIVE', encryptedSeedEnvelope: { format: 'synthetic-test-only' },
        algorithm: 'SHA1', digits: 6, periodSeconds: 30, enrollmentExpiresAt: new Date(now.getTime() + 600_000),
        activatedAt: now, createdAt: now, updatedAt: now,
      } });
    }
    const session = await identity.createSession({
      id: ids.nextUuid(), userId, tokenDigest: ids.nextTestToken(32),
      assurance: input.privileged ? 'PRIVILEGED_MFA_RECENT' : 'CONTACT_VERIFIED',
      issuedSecurityVersion: user.securityVersion, issuedAt: now,
      idleExpiresAt: new Date(now.getTime() + 1_800_000), absoluteExpiresAt: input.expiresAt ?? new Date(now.getTime() + 3_600_000),
      deviceLabel: 'Synthetic IAM-005 browser', transitionId: ids.nextUuid(),
    });
    if (input.privileged) {
      await database.session.update({ where: { id: session.id }, data: {
        passwordAuthenticatedAt: now, mfaVerifiedAt: now, mfaMethod: 'TOTP', mfaFactorId: factorId,
      } });
    }
    return database.session.findUniqueOrThrow({ where: { id: session.id } });
  }

  async function createTemplate(input: Readonly<{
    code: string; version?: number; privilege?: 'ORDINARY' | 'PRIVILEGED';
    scopes: readonly ('SELF' | 'SELLER' | 'INSTITUTION' | 'PLATFORM')[];
    subjects?: readonly ('HUMAN' | 'SERVICE_PRINCIPAL')[]; capabilities?: readonly string[];
  }>): Promise<string> {
    const id = ids.nextUuid();
    await access.createDraftRoleTemplate({
      id, code: input.code, version: input.version ?? 1, displayName: `Synthetic ${input.code}`,
      privilegeClass: input.privilege ?? 'ORDINARY', requireContactVerified: input.privilege === 'PRIVILEGED',
      ...(input.privilege === 'PRIVILEGED' ? { passwordMaxAgeMilliseconds: 600_000, mfaMaxAgeMilliseconds: 43_200_000 } : {}),
      allowedScopes: input.scopes, allowedSubjects: input.subjects ?? ['HUMAN'],
      capabilityCodes: input.capabilities ?? ['access.assignment.read'], createdAt: now,
    });
    await access.activateRoleTemplate(id, now);
    return id;
  }

  beforeAll(async () => {
    harness = await startPostgreSqlTestHarness({
      seed: 'iam-005-postgresql', environmentSource: { NOMA_ENV: 'test', NOMA_CREDENTIAL_ENVIRONMENT: 'test' },
    });
    await deployMigrations(harness.connection);
    database = createDatabaseClient({ databaseUrl: harness.connection.databaseUrl, applicationName: 'iam005_tests', maxConnections: 32 });
    access = createAccessAuthorityPersistence(database, { environment: 'test' });
    [grantorId, targetId, approverId, otherId] = await Promise.all([
      createActiveUser('grantor'), createActiveUser('target'), createActiveUser('approver'), createActiveUser('other'),
    ]);
    [institutionOneId, institutionTwoId] = [ids.nextUuid(), ids.nextUuid()];
    [sellerOneId, sellerTwoId] = [ids.nextUuid(), ids.nextUuid()];
    await runInDatabaseTransaction(database, async (transaction) => {
      await createAccessScope(transaction, { id: institutionOneId, type: 'INSTITUTION', resourceId: ids.nextUuid(), createdAt: now });
      await createAccessScope(transaction, { id: institutionTwoId, type: 'INSTITUTION', resourceId: ids.nextUuid(), createdAt: now });
      await createAccessScope(transaction, { id: sellerOneId, type: 'SELLER', resourceId: ids.nextUuid(), parentInstitutionScopeId: institutionOneId, createdAt: now });
      await createAccessScope(transaction, { id: sellerTwoId, type: 'SELLER', resourceId: ids.nextUuid(), parentInstitutionScopeId: institutionTwoId, createdAt: now });
    });
    ordinaryTemplateId = await createTemplate({ code: 'access.seller-reader', scopes: ['SELLER'] });
    privilegedTemplateId = await createTemplate({ code: 'access.privileged-reviewer', privilege: 'PRIVILEGED', scopes: ['INSTITUTION'], capabilities: ['access.approval.decide'] });
    serviceTemplateId = await createTemplate({ code: 'access.service-reader', scopes: ['INSTITUTION'], subjects: ['SERVICE_PRINCIPAL'], capabilities: ['access.service-principal.read'] });
  });

  afterAll(async () => {
    if (database) await disconnectDatabaseClient(database);
    if (harness) await harness.stop();
  });

  test('installs the reviewed extension, exact catalogue, and non-authoritative scope constraints', async () => {
    const extension = await database.$queryRaw<readonly { extname: string }[]>`SELECT extname FROM pg_extension WHERE extname = 'btree_gist'`;
    expect(extension).toEqual([{ extname: 'btree_gist' }]);
    const capabilities = await database.capability.findMany({ orderBy: { code: 'asc' } });
    expect(capabilities.map(({ code }) => code)).toEqual([...ACCESS_CAPABILITY_CODES].sort());
    expect(capabilities.filter(({ code }) => code.startsWith('access.'))).toHaveLength(13);
    expect(capabilities.every(({ code }) => !code.includes('*'))).toBe(true);
    const auditReadCapability = capabilities.find(({ code }) => code === 'audit.event.read');
    if (!auditReadCapability) throw new Error('IAM-008 audit read capability is missing');
    expect(await database.roleTemplateCapability.count({ where: { capabilityId: auditReadCapability.id } })).toBe(0);
    await expect(runInDatabaseTransaction(database, (transaction) => createAccessScope(transaction, {
      id: ids.nextUuid(), type: 'SELLER', resourceId: ids.nextUuid(), parentInstitutionScopeId: sellerOneId, createdAt: now,
    }))).rejects.toThrow();
    await expect(database.accessScope.update({ where: { id: sellerOneId }, data: { parentInstitutionScopeId: institutionTwoId } })).rejects.toThrow();
  });

  test('enforces one winner for overlapping grants and exact half-open validity', async () => {
    const firstId = ids.nextUuid();
    const secondId = ids.nextUuid();
    const grant = (id: string) => access.grantRoleAssignment({
      id, subject: { subjectType: 'HUMAN', userId: targetId }, roleTemplateId: ordinaryTemplateId,
      scopeId: sellerOneId, scopeType: 'SELLER', validFrom: new Date(now.getTime() + 10_000),
      validUntil: new Date(now.getTime() + 20_000), grantedByUserId: grantorId,
      grantReason: 'Concurrent exact scoped grant', grantedAt: now, containmentTransitionId: ids.nextUuid(),
    });
    const results = await Promise.allSettled([grant(firstId), grant(secondId)]);
    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(({ status }) => status === 'rejected')).toHaveLength(1);
    const activeId = results.find((result) => result.status === 'fulfilled')!.value.id;
    expect(await access.resolveActiveAuthorityFacts({ subjectType: 'HUMAN', userId: targetId }, new Date(now.getTime() + 9_999))).toHaveLength(0);
    expect((await access.resolveActiveAuthorityFacts({ subjectType: 'HUMAN', userId: targetId }, new Date(now.getTime() + 10_000))).map((fact) => fact.assignment.id)).toContain(activeId);
    expect(await access.resolveActiveAuthorityFacts({ subjectType: 'HUMAN', userId: targetId }, new Date(now.getTime() + 20_000))).toHaveLength(0);
  });

  test('keeps template versions immutable and prevents successor expansion of existing grants', async () => {
    const code = `access.versioned-${reference('VERSION').toLowerCase()}`;
    const v1 = await createTemplate({ code, version: 1, scopes: ['SELLER'], capabilities: ['access.assignment.read'] });
    const assignment = await access.grantRoleAssignment({
      id: ids.nextUuid(), subject: { subjectType: 'HUMAN', userId: otherId }, roleTemplateId: v1,
      scopeId: sellerOneId, scopeType: 'SELLER', validFrom: now, grantedByUserId: grantorId,
      grantReason: 'Version one grant', grantedAt: now, containmentTransitionId: ids.nextUuid(),
    });
    const v2 = await createTemplate({ code, version: 2, scopes: ['SELLER'], capabilities: ['access.assignment.read', 'access.assignment.revoke'] });
    expect(v2).not.toBe(v1);
    const facts = await access.resolveActiveAuthorityFacts({ subjectType: 'HUMAN', userId: otherId }, now);
    expect(facts.find((fact) => fact.assignment.id === assignment.id)?.capabilities).toEqual(['access.assignment.read']);
    await expect(database.roleTemplate.update({ where: { id: v1 }, data: { displayName: 'Mutated authority' } })).rejects.toThrow();
    await expect(database.roleTemplateCapability.create({ data: { roleTemplateId: v1, capabilityId: '10000000-0000-4000-8000-000000000004' } })).rejects.toThrow();
    await access.retireRoleTemplate(v1, new Date(now.getTime() + 1_000));
    expect((await access.resolveActiveAuthorityFacts({ subjectType: 'HUMAN', userId: otherId }, new Date(now.getTime() + 2_000))).some((fact) => fact.assignment.id === assignment.id)).toBe(true);
    await expect(access.grantRoleAssignment({
      id: ids.nextUuid(), subject: { subjectType: 'HUMAN', userId: targetId }, roleTemplateId: v1,
      scopeId: sellerTwoId, scopeType: 'SELLER', validFrom: now, grantedByUserId: grantorId,
      grantReason: 'Retired template must fail', grantedAt: now, containmentTransitionId: ids.nextUuid(),
    })).rejects.toThrow();
  });

  test('isolates exact seller and institution scopes without parent inheritance', async () => {
    const assignment = await access.grantRoleAssignment({
      id: ids.nextUuid(), subject: { subjectType: 'HUMAN', userId: targetId }, roleTemplateId: ordinaryTemplateId,
      scopeId: sellerTwoId, scopeType: 'SELLER', validFrom: now, grantedByUserId: grantorId,
      grantReason: 'Seller two only', grantedAt: now, containmentTransitionId: ids.nextUuid(),
    });
    const facts = await access.resolveActiveAuthorityFacts({ subjectType: 'HUMAN', userId: targetId }, now);
    expect(facts.find((fact) => fact.assignment.id === assignment.id)?.scope.id).toBe(sellerTwoId);
    expect(facts.find((fact) => fact.assignment.id === assignment.id)?.scope.parentInstitutionScopeId).toBe(institutionTwoId);
    expect(facts.some((fact) => fact.scope.id === institutionTwoId)).toBe(false);
    await expect(access.grantRoleAssignment({
      id: ids.nextUuid(), subject: { subjectType: 'HUMAN', userId: targetId }, roleTemplateId: ordinaryTemplateId,
      scopeId: institutionOneId, scopeType: 'INSTITUTION', validFrom: now, grantedByUserId: grantorId,
      grantReason: 'Scope compatibility must fail', grantedAt: now, containmentTransitionId: ids.nextUuid(),
    })).rejects.toThrow();
  });

  test('contains sessions atomically for privileged grants and revokes, but not ordinary or natural expiry', async () => {
    const ordinaryUser = await createActiveUser('ordinary-session');
    const ordinarySession = await createSession(ordinaryUser);
    const ordinarySecurityVersion = (await database.user.findUniqueOrThrow({ where: { id: ordinaryUser } })).securityVersion;
    const ordinary = await access.grantRoleAssignment({
      id: ids.nextUuid(), subject: { subjectType: 'HUMAN', userId: ordinaryUser }, roleTemplateId: ordinaryTemplateId,
      scopeId: sellerOneId, scopeType: 'SELLER', validFrom: now, validUntil: new Date(now.getTime() + 1_000),
      grantedByUserId: grantorId, grantReason: 'Ordinary access', grantedAt: now, containmentTransitionId: ids.nextUuid(),
    });
    expect((await database.user.findUniqueOrThrow({ where: { id: ordinaryUser } })).securityVersion).toBe(ordinarySecurityVersion);
    expect((await database.session.findUniqueOrThrow({ where: { id: ordinarySession.id } })).status).toBe('ACTIVE');
    expect(await access.resolveActiveAuthorityFacts({ subjectType: 'HUMAN', userId: ordinaryUser }, new Date(now.getTime() + 1_000))).toHaveLength(0);
    expect((await database.session.findUniqueOrThrow({ where: { id: ordinarySession.id } })).status).toBe('ACTIVE');
    await access.revokeRoleAssignment(ordinary.id, ordinary.version, grantorId, 'Ordinary revoke', new Date(now.getTime() + 2_000), ids.nextUuid());
    expect((await database.user.findUniqueOrThrow({ where: { id: ordinaryUser } })).securityVersion).toBe(ordinarySecurityVersion);
    expect(await access.resolveActiveAuthorityFacts({ subjectType: 'HUMAN', userId: ordinaryUser }, new Date(now.getTime() + 2_001))).toHaveLength(0);

    const privilegedUser = await createActiveUser('privileged-session');
    const predecessor = await createSession(privilegedUser);
    const privileged = await access.grantRoleAssignment({
      id: ids.nextUuid(), subject: { subjectType: 'HUMAN', userId: privilegedUser }, roleTemplateId: privilegedTemplateId,
      scopeId: institutionOneId, scopeType: 'INSTITUTION', validFrom: now, grantedByUserId: grantorId,
      grantReason: 'Privileged access', grantedAt: now, containmentTransitionId: ids.nextUuid(),
    });
    expect((await database.user.findUniqueOrThrow({ where: { id: privilegedUser } })).securityVersion).toBe(1);
    expect((await database.session.findUniqueOrThrow({ where: { id: predecessor.id } })).status).toBe('REVOKED');
    const successor = await createSession(privilegedUser);
    await access.revokeRoleAssignment(privileged.id, privileged.version, grantorId, 'Privileged revoke', new Date(now.getTime() + 3_000), ids.nextUuid());
    expect((await database.user.findUniqueOrThrow({ where: { id: privilegedUser } })).securityVersion).toBe(2);
    expect((await database.session.findUniqueOrThrow({ where: { id: successor.id } })).status).toBe('REVOKED');
    await expect(database.roleAssignment.update({ where: { id: privileged.id }, data: {
      revokedAt: null, revokedByUserId: null, revocationReason: null,
    } })).rejects.toThrow();
    await expect(database.roleAssignment.delete({ where: { id: privileged.id } })).rejects.toThrow();
  });

  test('serializes authority use with revocation at the assignment row', async () => {
    const userId = await createActiveUser('race-user');
    const assignment = await access.grantRoleAssignment({
      id: ids.nextUuid(), subject: { subjectType: 'HUMAN', userId }, roleTemplateId: ordinaryTemplateId,
      scopeId: sellerOneId, scopeType: 'SELLER', validFrom: now, grantedByUserId: grantorId,
      grantReason: 'Race proof', grantedAt: now, containmentTransitionId: ids.nextUuid(),
    });
    let release!: () => void;
    const releasePromise = new Promise<void>((resolveRelease) => { release = resolveRelease; });
    let locked!: () => void;
    const lockedPromise = new Promise<void>((resolveLocked) => { locked = resolveLocked; });
    const use = runInDatabaseTransaction(database, async (transaction) => {
      const fact = await lockActiveAuthorityFactForUse(transaction, {
        assignmentId: assignment.id, subject: { subjectType: 'HUMAN', userId }, capabilityCode: 'access.assignment.read', environment: 'test', at: now,
      });
      locked();
      await releasePromise;
      return fact;
    }, { timeoutMilliseconds: 30_000 });
    await lockedPromise;
    const revoke = access.revokeRoleAssignment(assignment.id, assignment.version, grantorId, 'Race revoke', new Date(now.getTime() + 1), ids.nextUuid());
    release();
    expect(await use).toMatchObject({ assignmentId: assignment.id });
    expect(await revoke).toMatchObject({ revokedAt: new Date(now.getTime() + 1) });
    expect(await runInDatabaseTransaction(database, (transaction) => lockActiveAuthorityFactForUse(transaction, {
      assignmentId: assignment.id, subject: { subjectType: 'HUMAN', userId }, capabilityCode: 'access.assignment.read', environment: 'test', at: new Date(now.getTime() + 2),
    }))).toBeNull();
  });

  test('enforces maker-checker independence, target separation, assurance reuse, and append-only decisions', async () => {
    const approverSession = await createSession(approverId, { privileged: true });
    expect(await access.resolveActiveAuthorityFacts({ subjectType: 'HUMAN', userId: approverId }, now)).toHaveLength(0);
    const selfRequest = await access.requestApproval({
      id: ids.nextUuid(), operation: 'ASSIGNMENT_GRANT', subject: { subjectType: 'HUMAN', userId: targetId },
      roleTemplateId: privilegedTemplateId, scopeId: institutionOneId, scopeType: 'INSTITUTION',
      requestedValidFrom: now, requestedByUserId: approverId, reason: 'Self approval must fail',
      expiresAt: new Date(now.getTime() + 600_000), idempotencyKey: ids.nextPublicReference('APPROVAL', 16), independentApprovalRequired: true, createdAt: now,
    });
    await expect(access.recordApprovalDecision({
      id: ids.nextUuid(), approvalRequestId: selfRequest.id, approverUserId: approverId,
      approverSessionId: approverSession.id, decision: 'APPROVE', reason: 'Invalid self approval', decidedAt: now, evaluatedAt: now,
    })).rejects.toThrow();

    const targetSession = await createSession(targetId, { privileged: true });
    const targetRequest = await access.requestApproval({
      id: ids.nextUuid(), operation: 'ASSIGNMENT_GRANT', subject: { subjectType: 'HUMAN', userId: targetId },
      roleTemplateId: privilegedTemplateId, scopeId: institutionOneId, scopeType: 'INSTITUTION',
      requestedValidFrom: now, requestedByUserId: grantorId, reason: 'Target cannot approve privileged grant',
      expiresAt: new Date(now.getTime() + 600_000), idempotencyKey: ids.nextPublicReference('APPROVAL', 16), independentApprovalRequired: true, createdAt: now,
    });
    await expect(access.recordApprovalDecision({
      id: ids.nextUuid(), approvalRequestId: targetRequest.id, approverUserId: targetId,
      approverSessionId: targetSession.id, decision: 'APPROVE', reason: 'Invalid target approval', decidedAt: now, evaluatedAt: now,
    })).rejects.toThrow();

    const validRequest = await access.requestApproval({
      id: ids.nextUuid(), operation: 'ASSIGNMENT_GRANT', subject: { subjectType: 'HUMAN', userId: targetId },
      roleTemplateId: privilegedTemplateId, scopeId: institutionOneId, scopeType: 'INSTITUTION',
      requestedValidFrom: now, requestedByUserId: grantorId, reason: 'Independent review',
      expiresAt: new Date(now.getTime() + 600_000), idempotencyKey: ids.nextPublicReference('APPROVAL', 16), independentApprovalRequired: true, createdAt: now,
    });
    const decision = await access.recordApprovalDecision({
      id: ids.nextUuid(), approvalRequestId: validRequest.id, approverUserId: approverId,
      approverSessionId: approverSession.id, decision: 'APPROVE', reason: 'Independent evidence reviewed', decidedAt: now, evaluatedAt: now,
    });
    expect(decision.requestState).toBe('APPROVED');
    await expect(database.approvalRequest.update({ where: { id: validRequest.id }, data: { reason: 'Rewrite requested authority' } })).rejects.toThrow();
    await expect(database.approvalDecision.update({ where: { id: decision.id }, data: { reason: 'Rewrite history' } })).rejects.toThrow();
    await expect(database.approvalDecision.delete({ where: { id: decision.id } })).rejects.toThrow();
  });

  test('bounds temporary access and isolates service principals from human sessions and environments', async () => {
    const temporaryUser = await createActiveUser('temporary-user');
    const temporary = await access.grantTemporaryAccess({
      id: ids.nextUuid(), temporaryGrantId: ids.nextUuid(), ownerUserId: grantorId,
      subject: { subjectType: 'HUMAN', userId: temporaryUser }, roleTemplateId: ordinaryTemplateId,
      scopeId: sellerOneId, scopeType: 'SELLER', validFrom: now, validUntil: new Date(now.getTime() + 60_000),
      grantedByUserId: grantorId, grantReason: 'Bounded temporary assignment', temporaryReason: 'Synthetic support window',
      grantedAt: now, containmentTransitionId: ids.nextUuid(),
    });
    expect((await access.resolveActiveAuthorityFacts({ subjectType: 'HUMAN', userId: temporaryUser }, new Date(now.getTime() + 59_999))).some((fact) => fact.assignment.id === temporary.id)).toBe(true);
    expect((await access.resolveActiveAuthorityFacts({ subjectType: 'HUMAN', userId: temporaryUser }, new Date(now.getTime() + 60_000))).some((fact) => fact.assignment.id === temporary.id)).toBe(false);
    await access.revokeRoleAssignment(temporary.id, temporary.version, grantorId, 'Temporary access ended early', new Date(now.getTime() + 30_000), ids.nextUuid());
    expect((await access.resolveActiveAuthorityFacts({ subjectType: 'HUMAN', userId: temporaryUser }, new Date(now.getTime() + 30_001))).some((fact) => fact.assignment.id === temporary.id)).toBe(false);

    const platformScopeId = ids.nextUuid();
    await runInDatabaseTransaction(database, (transaction) => createAccessScope(transaction, { id: platformScopeId, type: 'PLATFORM', createdAt: now }));
    await expect(access.grantRoleAssignment({
      id: ids.nextUuid(), subject: { subjectType: 'HUMAN', userId: temporaryUser }, roleTemplateId: ordinaryTemplateId,
      scopeId: platformScopeId, scopeType: 'PLATFORM', validFrom: now, grantedByUserId: grantorId,
      grantReason: 'Seller template must not escape to PLATFORM', grantedAt: now, containmentTransitionId: ids.nextUuid(),
    })).rejects.toThrow();
    const platformTemplateId = await createTemplate({ code: `access.platform-${reference('PLATFORM').toLowerCase()}`, scopes: ['PLATFORM'] });
    await expect(access.grantTemporaryAccess({
      id: ids.nextUuid(), temporaryGrantId: ids.nextUuid(), ownerUserId: grantorId,
      subject: { subjectType: 'HUMAN', userId: temporaryUser }, roleTemplateId: platformTemplateId,
      scopeId: platformScopeId, scopeType: 'PLATFORM', validFrom: now, validUntil: new Date(now.getTime() + 60_000),
      grantedByUserId: grantorId, grantReason: 'Must not persist', temporaryReason: 'Forbidden platform temporary access',
      grantedAt: now, containmentTransitionId: ids.nextUuid(),
    })).rejects.toThrow();

    const principal = await access.createServicePrincipal({
      id: ids.nextUuid(), code: `worker_${reference('SERVICE').toLowerCase()}`, purpose: 'Synthetic exact Access reader',
      ownerUserId: grantorId, credentialPolicyVersion: 1, createdAt: now,
    });
    const assignment = await access.grantRoleAssignment({
      id: ids.nextUuid(), subject: { subjectType: 'SERVICE_PRINCIPAL', servicePrincipalId: principal.id },
      roleTemplateId: serviceTemplateId, scopeId: institutionOneId, scopeType: 'INSTITUTION', validFrom: now,
      grantedByUserId: grantorId, grantReason: 'Test-environment service authority', grantedAt: now, containmentTransitionId: ids.nextUuid(),
    });
    expect((await access.resolveActiveAuthorityFacts({ subjectType: 'SERVICE_PRINCIPAL', servicePrincipalId: principal.id }, now)).map((fact) => fact.assignment.id)).toContain(assignment.id);
    expect(await createAccessAuthorityPersistence(database, { environment: 'production' }).resolveActiveAuthorityFacts({ subjectType: 'SERVICE_PRINCIPAL', servicePrincipalId: principal.id }, now)).toHaveLength(0);
    expect(await runInDatabaseTransaction(database, (transaction) => lockActiveAuthorityFactForUse(transaction, {
      assignmentId: assignment.id, subject: { subjectType: 'SERVICE_PRINCIPAL', servicePrincipalId: principal.id },
      capabilityCode: 'access.service-principal.read', environment: 'production', at: now,
    }))).toBeNull();
    expect(await runInDatabaseTransaction(database, (transaction) => lockActiveAuthorityFactForUse(transaction, {
      assignmentId: assignment.id, subject: { subjectType: 'SERVICE_PRINCIPAL', servicePrincipalId: principal.id },
      capabilityCode: 'access.service-principal.read', environment: 'test', at: now,
    }))).toMatchObject({ assignmentId: assignment.id });
    expect(await access.rotateServicePrincipal(principal.id, principal.version, principal.credentialPolicyVersion, new Date(now.getTime() + 1_000))).toBeNull();
    await expect(access.grantRoleAssignment({
      id: ids.nextUuid(), subject: { subjectType: 'HUMAN', userId: temporaryUser }, roleTemplateId: serviceTemplateId,
      scopeId: institutionOneId, scopeType: 'INSTITUTION', validFrom: now, grantedByUserId: grantorId,
      grantReason: 'Human cannot receive service-only template', grantedAt: now, containmentTransitionId: ids.nextUuid(),
    })).rejects.toThrow();
    await expect(database.session.create({ data: {
      id: ids.nextUuid(), userId: principal.id, tokenDigest: ids.nextTestToken(32), status: 'ACTIVE', assurance: 'AUTHENTICATED', issuedSecurityVersion: 0,
      issuedAt: now, lastUsedAt: now, idleExpiresAt: new Date(now.getTime() + 60_000), absoluteExpiresAt: new Date(now.getTime() + 60_000),
      deviceLabel: 'Forbidden service browser', version: 0, lastTransitionAt: now, lastTransitionId: ids.nextUuid(), createdAt: now, updatedAt: now,
    } })).rejects.toThrow();
  });

  test('rejects direct subject-XOR violations and exposes no future business capabilities', async () => {
    expect(await database.capability.count({ where: { OR: [
      { code: { startsWith: 'seller.' } }, { code: { startsWith: 'finance.' } }, { code: { startsWith: 'support.' } },
    ] } })).toBe(0);
    await expect(database.roleAssignment.create({ data: {
      id: ids.nextUuid(), subjectType: 'HUMAN', userId: targetId, servicePrincipalId: ids.nextUuid(),
      roleTemplateId: ordinaryTemplateId, scopeId: sellerOneId, scopeType: 'SELLER', validFrom: now,
      grantedByUserId: grantorId, grantReason: 'Invalid dual subject', grantedAt: now, createdAt: now, updatedAt: now,
    } })).rejects.toThrow();
  });

  test('retires capabilities without rewriting historical template or assignment identity', async () => {
    const code = `access.retirement-${reference('RETIRE').toLowerCase()}`;
    const templateId = await createTemplate({
      code,
      scopes: ['SELLER'],
      capabilities: ['access.service-principal.revoke'],
    });
    const subjectId = await createActiveUser('retired-capability');
    const assignment = await access.grantRoleAssignment({
      id: ids.nextUuid(), subject: { subjectType: 'HUMAN', userId: subjectId }, roleTemplateId: templateId,
      scopeId: sellerOneId, scopeType: 'SELLER', validFrom: now, grantedByUserId: grantorId,
      grantReason: 'Historical capability retirement proof', grantedAt: now, containmentTransitionId: ids.nextUuid(),
    });
    const capability = await database.capability.findUniqueOrThrow({
      where: { code: 'access.service-principal.revoke' }, select: { createdAt: true },
    });
    const retiredAt = new Date(Math.max(now.getTime(), capability.createdAt.getTime()) + 86_400_000);
    expect((await access.resolveActiveAuthorityFacts(
      { subjectType: 'HUMAN', userId: subjectId }, new Date(retiredAt.getTime() - 1),
    )).find((fact) => fact.assignment.id === assignment.id)?.capabilities).toContain('access.service-principal.revoke');
    await access.retireCapability('access.service-principal.revoke', retiredAt);
    await expect(database.capability.update({ where: { code: 'access.service-principal.revoke' }, data: { retiredAt: null } })).rejects.toThrow();
    const facts = await access.resolveActiveAuthorityFacts({ subjectType: 'HUMAN', userId: subjectId }, new Date(retiredAt.getTime() + 1_000));
    expect(facts.find((fact) => fact.assignment.id === assignment.id)?.capabilities).toEqual([]);
    expect(await database.roleAssignment.findUnique({ where: { id: assignment.id } })).not.toBeNull();
    await expect(access.createDraftRoleTemplate({
      id: ids.nextUuid(), code: `${code}-successor`, version: 1, displayName: 'Retired capability successor',
      privilegeClass: 'ORDINARY', requireContactVerified: false, allowedScopes: ['SELLER'], allowedSubjects: ['HUMAN'],
      capabilityCodes: ['access.service-principal.revoke'], createdAt: new Date(retiredAt.getTime() + 2_000),
    })).rejects.toThrow();
  });
});
