import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

import {
  createAccessAuthorityPersistence, createAccessScope, createDatabaseClient,
  createIdentityPersistence, disconnectDatabaseClient, runInDatabaseTransaction,
  readScopedAccessReviewRows,
  type DatabaseClient,
} from '@noma/database';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { OpaqueSessionTokenIssuer } from '@noma/security';
import { AuthorizationService } from '../../../apps/api/src/authorization/authorization.service.js';
import { attestAuthorizedAccessReviewItem } from '../../../apps/api/src/authorization/access-review-attestation.js';
import {
  decideAuthorizedAccessAssignment, executeAuthorizedAccessAssignment,
  requestAuthorizedAccessAssignment,
} from '../../../apps/api/src/authorization/access-assignment-workflow.js';
import {
  decideAuthorizedAccessReviewExport, executeAuthorizedAccessReviewExport,
  requestAuthorizedAccessReviewExport,
} from '../../../apps/api/src/authorization/access-review-export-workflow.js';
import { startPostgreSqlTestHarness, type PostgreSqlTestHarness } from '../src/containers.js';
import { DeterministicTestIds } from '../src/random.js';

const execFileAsync = promisify(execFile);
const ROOT = resolve(import.meta.dirname, '../../..');
const DATABASE_DIR = resolve(ROOT, 'packages/database');
const prismaCli = createRequire(resolve(DATABASE_DIR, 'package.json')).resolve('prisma/build/index.js');
const ids = new DeterministicTestIds('iam-009-access-review-foundation');
const AT = new Date('2026-10-02T12:00:00.000Z');
const LATER = new Date(AT.getTime() + 60_000);

describe.sequential('IAM-009 PostgreSQL Access review foundation', () => {
  let harness: PostgreSqlTestHarness;
  let database: DatabaseClient;
  let reviewerId: string;
  let approverId: string;
  let targetId: string;
  let scopeId: string;
  let assignmentId: string;

  async function activeUser(label: string): Promise<string> {
    const identity = createIdentityPersistence(database);
    const emailId = ids.nextUuid();
    const created = await identity.registerPasswordIdentity({
      id: ids.nextUuid(), publicReference: ids.nextPublicReference('NOMA', 16),
      displayName: `Synthetic ${label}`, transitionId: ids.nextUuid(), occurredAt: AT,
      email: { id: emailId, displayEmail: `${label}-${ids.nextPublicReference('MAIL', 8).toLowerCase()}@noma.test`, primary: true },
      credential: { id: ids.nextUuid(), encodedHash: '$argon2id$synthetic-iam009-hash', hashAlgorithm: 'ARGON2ID', hashPolicyVersion: 1, createdAt: AT },
    });
    await database.userEmail.update({ where: { id: emailId }, data: { verifiedAt: AT } });
    await database.user.update({ where: { id: created.user.id }, data: { status: 'ACTIVE', updatedAt: AT } });
    return created.user.id;
  }

  async function privilegedSession(userId: string): Promise<{ id: string; rawToken: string }> {
    const existingFactor = await database.mfaFactor.findFirst({ where: { userId, status: 'ACTIVE' }, select: { id: true } });
    const factorId = existingFactor?.id ?? ids.nextUuid();
    if (!existingFactor) await database.mfaFactor.create({ data: {
      id: factorId, userId, status: 'ACTIVE', encryptedSeedEnvelope: { format: 'synthetic-test-only' },
      algorithm: 'SHA1', digits: 6, periodSeconds: 30,
      enrollmentExpiresAt: new Date(AT.getTime() + 600_000), activatedAt: AT,
      createdAt: AT, updatedAt: AT,
    } });
    const user = await database.user.findUniqueOrThrow({ where: { id: userId } });
    const rawToken = ids.nextTestToken(40);
    const session = await createIdentityPersistence(database).createSession({
      id: ids.nextUuid(), userId, tokenDigest: new OpaqueSessionTokenIssuer().digest(rawToken), assurance: 'PRIVILEGED_MFA_RECENT',
      issuedSecurityVersion: user.securityVersion, issuedAt: AT,
      idleExpiresAt: new Date(AT.getTime() + 1_800_000), absoluteExpiresAt: new Date(AT.getTime() + 3_600_000),
      deviceLabel: 'Synthetic IAM-009 browser', transitionId: ids.nextUuid(),
    });
    await database.session.update({ where: { id: session.id }, data: {
      passwordAuthenticatedAt: AT, mfaVerifiedAt: AT, mfaMethod: 'TOTP', mfaFactorId: factorId,
    } });
    return { id: session.id, rawToken };
  }

  beforeAll(async () => {
    harness = await startPostgreSqlTestHarness({ seed: 'iam-009-review-postgresql', environmentSource: { NOMA_ENV: 'test', NOMA_CREDENTIAL_ENVIRONMENT: 'test' } });
    await execFileAsync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
      cwd: DATABASE_DIR,
      env: { ...process.env, NOMA_ENV: 'test', NOMA_CREDENTIAL_ENVIRONMENT: 'test', DATABASE_URL: harness.connection.databaseUrl },
      timeout: 120_000, windowsHide: true,
    });
    database = createDatabaseClient({ databaseUrl: harness.connection.databaseUrl, applicationName: 'iam009_review_tests', maxConnections: 12 });
    reviewerId = await activeUser('reviewer');
    approverId = await activeUser('approver');
    targetId = await activeUser('target');
    scopeId = ids.nextUuid();
    await runInDatabaseTransaction(database, (transaction) => createAccessScope(transaction, {
      id: scopeId, type: 'INSTITUTION', resourceId: ids.nextUuid(), createdAt: AT,
    }));
    const access = createAccessAuthorityPersistence(database, { environment: 'test' });
    const templateId = ids.nextUuid();
    await access.createDraftRoleTemplate({
      id: templateId, code: 'access.iam009-synthetic', version: 1, displayName: 'Synthetic review target',
      privilegeClass: 'ORDINARY', requireContactVerified: false, allowedScopes: ['INSTITUTION'],
      allowedSubjects: ['HUMAN'], capabilityCodes: ['access.assignment.read'], createdAt: AT,
    });
    await access.activateRoleTemplate(templateId, AT);
    assignmentId = ids.nextUuid();
    await access.grantRoleAssignment({
      id: assignmentId, subject: { subjectType: 'HUMAN', userId: targetId }, roleTemplateId: templateId,
      scopeId, scopeType: 'INSTITUTION', validFrom: AT, grantedByUserId: reviewerId,
      grantReason: 'Synthetic fixture only', grantedAt: AT, containmentTransitionId: ids.nextUuid(),
    });
  }, 180_000);

  afterAll(async () => {
    if (database) await disconnectDatabaseClient(database);
    if (harness) await harness.stop();
  });

  test('seeds three review capabilities without assigning them broadly', async () => {
    for (const code of ['access.review.read', 'access.review.attest', 'access.review.export']) {
      const capability = await database.capability.findUniqueOrThrow({ where: { code } });
      expect(capability.retiredAt).toBeNull();
      expect(await database.roleTemplateCapability.count({ where: { capabilityId: capability.id } })).toBe(0);
    }
  });

  test('assignment approvals are independent, exact, consumed once, and revoke the exact version', async () => {
    const access = createAccessAuthorityPersistence(database, { environment: 'test' });
    const adminTemplateId = ids.nextUuid();
    await access.createDraftRoleTemplate({
      id: adminTemplateId, code: 'access.iam009-admin', version: 1,
      displayName: 'Synthetic access administrator', privilegeClass: 'PRIVILEGED',
      requireContactVerified: true, passwordMaxAgeMilliseconds: 600_000, mfaMaxAgeMilliseconds: 300_000,
      allowedScopes: ['INSTITUTION'], allowedSubjects: ['HUMAN'],
      capabilityCodes: [
        'access.assignment.request', 'access.assignment.grant', 'access.assignment.revoke',
        'access.approval.decide', 'access.temporary.request', 'access.temporary.grant', 'access.temporary.revoke',
      ], createdAt: AT,
    });
    await access.activateRoleTemplate(adminTemplateId, AT);
    for (const userId of [reviewerId, approverId]) await access.grantRoleAssignment({
      id: ids.nextUuid(), subject: { subjectType: 'HUMAN', userId }, roleTemplateId: adminTemplateId,
      scopeId, scopeType: 'INSTITUTION', validFrom: AT, grantedByUserId: targetId,
      grantReason: 'Synthetic test authority', grantedAt: AT, containmentTransitionId: ids.nextUuid(),
    });
    const requesterAuthority = await database.roleAssignment.findFirstOrThrow({ where: {
      userId: reviewerId, roleTemplateId: adminTemplateId,
    } });
    const approverAuthority = await database.roleAssignment.findFirstOrThrow({ where: {
      userId: approverId, roleTemplateId: adminTemplateId,
    } });
    const requesterSession = await privilegedSession(reviewerId);
    const approverSession = await privilegedSession(approverId);
    const newTargetId = await activeUser('assignment-target');
    const targetTemplateId = ids.nextUuid();
    await access.createDraftRoleTemplate({
      id: targetTemplateId, code: 'access.iam009-target', version: 1,
      displayName: 'Synthetic scoped reader', privilegeClass: 'ORDINARY',
      requireContactVerified: false, allowedScopes: ['INSTITUTION'], allowedSubjects: ['HUMAN'],
      capabilityCodes: ['access.assignment.read'], createdAt: AT,
    });
    await access.activateRoleTemplate(targetTemplateId, AT);
    const authorization = new AuthorizationService();
    const requestId = ids.nextUuid();
    const requestBase = {
      rawSessionToken: requesterSession.rawToken, authorityAssignmentId: requesterAuthority.id,
      scopeId, environment: 'test' as const, at: LATER,
      operationId: 'synthetic-assignment-request', correlationId: 'synthetic-assignment-correlation',
      auditEventId: ids.nextUuid(), approvalRequestId: requestId, operation: 'ASSIGNMENT_GRANT' as const,
      subject: { subjectType: 'HUMAN' as const, userId: newTargetId }, roleTemplateId: targetTemplateId,
      scopeType: 'INSTITUTION' as const, requestedValidFrom: LATER, requestedValidUntil: null,
      reason: 'Synthetic test assignment', expiresAt: new Date(AT.getTime() + 3_600_000),
      idempotencyKey: 'synthetic-assignment-request-key',
    };
    expect((await requestAuthorizedAccessAssignment(database, authorization, requestBase)).state).toBe('PENDING');
    await expect(decideAuthorizedAccessAssignment(database, authorization, {
      rawSessionToken: requesterSession.rawToken, authorityAssignmentId: requesterAuthority.id,
      scopeId, environment: 'test', at: new Date(LATER.getTime() + 1_000),
      operationId: 'synthetic-self-decision', correlationId: 'synthetic-assignment-correlation',
      auditEventId: ids.nextUuid(), approvalRequestId: requestId, decisionId: ids.nextUuid(),
      decision: 'APPROVE', reason: 'Self approval must fail',
    })).rejects.toThrow();
    const targetSelfRequestId = ids.nextUuid();
    await requestAuthorizedAccessAssignment(database, authorization, {
      ...requestBase, approvalRequestId: targetSelfRequestId, auditEventId: ids.nextUuid(),
      operationId: 'synthetic-target-self-request', idempotencyKey: 'synthetic-target-self-request',
      operation: 'ASSIGNMENT_REVOKE', subject: { subjectType: 'HUMAN', userId: approverId },
      roleTemplateId: adminTemplateId, requestedValidFrom: approverAuthority.validFrom,
      requestedValidUntil: approverAuthority.validUntil,
      revocationTarget: { assignmentId: approverAuthority.id, expectedVersion: approverAuthority.version },
    });
    await expect(decideAuthorizedAccessAssignment(database, authorization, {
      rawSessionToken: approverSession.rawToken, authorityAssignmentId: approverAuthority.id,
      scopeId, environment: 'test', at: new Date(LATER.getTime() + 1_000),
      operationId: 'synthetic-target-self-decision', correlationId: 'synthetic-assignment-correlation',
      auditEventId: ids.nextUuid(), approvalRequestId: targetSelfRequestId, decisionId: ids.nextUuid(),
      decision: 'APPROVE', reason: 'Target cannot approve own revocation',
    })).rejects.toThrow();
    const rejectedRequestId = ids.nextUuid();
    await requestAuthorizedAccessAssignment(database, authorization, {
      ...requestBase, approvalRequestId: rejectedRequestId, auditEventId: ids.nextUuid(),
      operationId: 'synthetic-rejected-request', idempotencyKey: 'synthetic-rejected-request',
    });
    expect((await decideAuthorizedAccessAssignment(database, authorization, {
      rawSessionToken: approverSession.rawToken, authorityAssignmentId: approverAuthority.id,
      scopeId, environment: 'test', at: new Date(LATER.getTime() + 1_000),
      operationId: 'synthetic-rejected-decision', correlationId: 'synthetic-assignment-correlation',
      auditEventId: ids.nextUuid(), approvalRequestId: rejectedRequestId, decisionId: ids.nextUuid(),
      decision: 'REJECT', reason: 'Independent synthetic rejection',
    })).state).toBe('REJECTED');
    const expiredRequestId = ids.nextUuid();
    await requestAuthorizedAccessAssignment(database, authorization, {
      ...requestBase, approvalRequestId: expiredRequestId, auditEventId: ids.nextUuid(),
      operationId: 'synthetic-expired-request', idempotencyKey: 'synthetic-expired-request',
      expiresAt: new Date(LATER.getTime() + 5_000),
    });
    await expect(decideAuthorizedAccessAssignment(database, authorization, {
      rawSessionToken: approverSession.rawToken, authorityAssignmentId: approverAuthority.id,
      scopeId, environment: 'test', at: new Date(LATER.getTime() + 6_000),
      operationId: 'synthetic-expired-decision', correlationId: 'synthetic-assignment-correlation',
      auditEventId: ids.nextUuid(), approvalRequestId: expiredRequestId, decisionId: ids.nextUuid(),
      decision: 'APPROVE', reason: 'Expired approval must fail',
    })).rejects.toThrow();
    expect((await decideAuthorizedAccessAssignment(database, authorization, {
      rawSessionToken: approverSession.rawToken, authorityAssignmentId: approverAuthority.id,
      scopeId, environment: 'test', at: new Date(LATER.getTime() + 1_000),
      operationId: 'synthetic-independent-decision', correlationId: 'synthetic-assignment-correlation',
      auditEventId: ids.nextUuid(), approvalRequestId: requestId, decisionId: ids.nextUuid(),
      decision: 'APPROVE', reason: 'Independent synthetic review',
    })).state).toBe('APPROVED');
    const assignmentId = ids.nextUuid();
    const execution = {
      rawSessionToken: requesterSession.rawToken, authorityAssignmentId: requesterAuthority.id,
      scopeId, environment: 'test' as const, at: new Date(LATER.getTime() + 2_000),
      operationId: 'synthetic-assignment-execute', correlationId: 'synthetic-assignment-correlation',
      auditEventId: ids.nextUuid(), approvalRequestId: requestId, effectId: ids.nextUuid(),
      roleAssignmentId: assignmentId, containmentTransitionId: ids.nextUuid(),
      reviewCycleId: ids.nextUuid(), reviewItemId: ids.nextUuid(),
      idempotencyKey: 'synthetic-assignment-effect-key',
    };
    expect((await executeAuthorizedAccessAssignment(database, authorization, execution)).repeated).toBe(false);
    expect((await executeAuthorizedAccessAssignment(database, authorization, execution)).repeated).toBe(true);
    await expect(executeAuthorizedAccessAssignment(database, authorization, {
      ...execution, roleAssignmentId: ids.nextUuid(), operationId: 'synthetic-second-effect',
    })).rejects.toThrow();
    expect(await database.roleAssignment.count({ where: { id: assignmentId } })).toBe(1);
    expect(await database.accessApprovalEffect.count({ where: { approvalRequestId: requestId } })).toBe(1);

    const revokeRequestId = ids.nextUuid();
    const revokeRequest = {
      ...requestBase, at: new Date(LATER.getTime() + 3_000), auditEventId: ids.nextUuid(),
      operationId: 'synthetic-revoke-request', approvalRequestId: revokeRequestId,
      operation: 'ASSIGNMENT_REVOKE' as const, idempotencyKey: 'synthetic-revoke-request-key',
      revocationTarget: { assignmentId, expectedVersion: 0 },
    };
    expect((await requestAuthorizedAccessAssignment(database, authorization, revokeRequest)).state).toBe('PENDING');
    await decideAuthorizedAccessAssignment(database, authorization, {
      rawSessionToken: approverSession.rawToken, authorityAssignmentId: approverAuthority.id,
      scopeId, environment: 'test', at: new Date(LATER.getTime() + 4_000),
      operationId: 'synthetic-revoke-decision', correlationId: 'synthetic-assignment-correlation',
      auditEventId: ids.nextUuid(), approvalRequestId: revokeRequestId, decisionId: ids.nextUuid(),
      decision: 'APPROVE', reason: 'Independent synthetic revoke review',
    });
    const { reviewCycleId: _reviewCycleId, reviewItemId: _reviewItemId, ...revokeExecution } = execution;
    expect((await executeAuthorizedAccessAssignment(database, authorization, {
      ...revokeExecution, at: new Date(LATER.getTime() + 5_000), approvalRequestId: revokeRequestId,
      operationId: 'synthetic-revoke-execute', auditEventId: ids.nextUuid(),
      effectId: ids.nextUuid(), idempotencyKey: 'synthetic-revoke-effect-key',
    })).operation).toBe('ASSIGNMENT_REVOKE');
    expect((await database.roleAssignment.findUniqueOrThrow({ where: { id: assignmentId } })).revokedAt).not.toBeNull();
  }, 120_000);

  test('follow-up cannot complete the review; final attestations require immutable evidence', async () => {
    const cycleId = ids.nextUuid();
    const itemId = ids.nextUuid();
    await database.accessReviewCycle.create({ data: {
      id: cycleId, scopeId, cadence: 'MONTHLY', opensAt: AT,
      dueAt: new Date(AT.getTime() + 30 * 24 * 60 * 60_000), createdAt: AT,
    } });
    await database.accessReviewItem.create({ data: { id: itemId, cycleId, roleAssignmentId: assignmentId, assignmentVersion: 0, createdAt: AT } });
    await expect(database.accessReviewItem.update({ where: { id: itemId }, data: {
      outcome: 'RETAIN_CONFIRMED', completedAt: LATER, version: { increment: 1 },
    } })).rejects.toThrow();
    const followUpId = ids.nextUuid();
    await runInDatabaseTransaction(database, async (transaction) => {
      await transaction.accessReviewAttestation.create({ data: {
        id: followUpId, itemId, reviewerUserId: reviewerId, outcome: 'NEEDS_FOLLOW_UP',
        reason: 'Confirm current owner before a final decision', itemVersion: 0, attestedAt: LATER,
        operationId: 'synthetic-follow-up',
      } });
      await transaction.accessReviewItem.update({ where: { id: itemId }, data: {
        outcome: 'NEEDS_FOLLOW_UP', completedAt: null, version: { increment: 1 },
      } });
    });
    const unresolved = await database.accessReviewItem.findUniqueOrThrow({ where: { id: itemId } });
    expect(unresolved.outcome).toBe('NEEDS_FOLLOW_UP');
    expect(unresolved.completedAt).toBeNull();
    await runInDatabaseTransaction(database, async (transaction) => {
      await transaction.accessReviewAttestation.create({ data: {
        id: ids.nextUuid(), itemId, reviewerUserId: reviewerId, outcome: 'RETAIN_CONFIRMED',
        reason: 'Synthetic owner confirmed', itemVersion: 1, attestedAt: new Date(LATER.getTime() + 1_000),
        operationId: 'synthetic-retain',
      } });
      await transaction.accessReviewItem.update({ where: { id: itemId }, data: {
        outcome: 'RETAIN_CONFIRMED', completedAt: new Date(LATER.getTime() + 1_000), version: { increment: 1 },
      } });
    });
    await expect(database.accessReviewAttestation.delete({ where: { id: followUpId } })).rejects.toThrow();
    await expect(database.$executeRaw`TRUNCATE TABLE "access_review_attestations"`).rejects.toThrow();
    await expect(database.accessReviewItem.update({ where: { id: itemId }, data: {
      outcome: 'REVOKE_REQUESTED', version: { increment: 1 },
    } })).rejects.toThrow();
    expect((await database.accessReviewItem.findUniqueOrThrow({ where: { id: itemId } })).completedAt).not.toBeNull();
  });

  test('export approval is independent, bounded, immutable, and single-use', async () => {
    const requestId = ids.nextUuid();
    await database.accessReviewExportRequest.create({ data: {
      id: requestId, scopeId, projectionId: 'access.review.export.row.v1', filterCategory: 'ALL',
      rowCeiling: 2, reason: 'Synthetic monthly access review', requestedByUserId: reviewerId,
      expiresAt: new Date(AT.getTime() + 1_800_000), idempotencyKey: 'synthetic-export-request', createdAt: AT,
    } });
    const makerSessionId = (await privilegedSession(reviewerId)).id;
    await expect(database.accessReviewExportDecision.create({ data: {
      id: ids.nextUuid(), requestId, approverUserId: reviewerId, decision: 'APPROVE',
      reason: 'Self decision must fail', sessionId: makerSessionId, securityVersion: 0, decidedAt: LATER,
    } })).rejects.toThrow();
    const approverSessionId = (await privilegedSession(approverId)).id;
    const approverSecurityVersion = (await database.user.findUniqueOrThrow({ where: { id: approverId } })).securityVersion;
    await runInDatabaseTransaction(database, async (transaction) => {
      await transaction.accessReviewExportDecision.create({ data: {
        id: ids.nextUuid(), requestId, approverUserId: approverId, decision: 'APPROVE',
        reason: 'Synthetic independent decision', sessionId: approverSessionId,
        securityVersion: approverSecurityVersion, decidedAt: LATER,
      } });
      await transaction.accessReviewExportRequest.update({ where: { id: requestId }, data: {
        state: 'APPROVED', version: { increment: 1 },
      } });
    });
    await expect(database.accessReviewExportEffect.create({ data: {
      id: ids.nextUuid(), requestId, executedByUserId: reviewerId, resultCount: 3,
      operationId: 'synthetic-oversize', executedAt: new Date(LATER.getTime() + 1_000),
    } })).rejects.toThrow();
    const effectId = ids.nextUuid();
    await database.accessReviewExportEffect.create({ data: {
      id: effectId, requestId, executedByUserId: reviewerId, resultCount: 2,
      operationId: 'synthetic-export-effect', executedAt: new Date(LATER.getTime() + 1_000),
    } });
    await expect(database.accessReviewExportEffect.create({ data: {
      id: ids.nextUuid(), requestId, executedByUserId: reviewerId, resultCount: 1,
      operationId: 'synthetic-second-effect', executedAt: new Date(LATER.getTime() + 2_000),
    } })).rejects.toThrow();
    await expect(database.accessReviewExportEffect.delete({ where: { id: effectId } })).rejects.toThrow();
    await expect(database.$executeRaw`TRUNCATE TABLE "access_review_export_effects"`).rejects.toThrow();
    expect(await database.accessReviewExportEffect.count({ where: { requestId } })).toBe(1);
  });

  test('review list is exact-scoped, bounded, stable, and read-only', async () => {
    const read = (scope: string, filter: 'ALL' | 'COMPLETED', cursor?: { dueAt: Date; id: string }) =>
      runInDatabaseTransaction(database, (transaction) => readScopedAccessReviewRows(transaction, {
        scopeId: scope, filter, at: LATER, limit: 1, ...(cursor ? { cursor } : {}),
      }));
    const rows = await read(scopeId, 'COMPLETED');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual(expect.objectContaining({
      subjectReference: expect.stringMatching(/^NOMA-/), outcome: 'RETAIN_CONFIRMED', stale: false,
    }));
    expect(await read(ids.nextUuid(), 'ALL')).toEqual([]);
    const after = await read(scopeId, 'ALL', { dueAt: rows[0]!.dueAt, id: rows[0]!.reviewItemId });
    expect(after).toHaveLength(1);
    expect(after[0]!.dueAt > rows[0]!.dueAt).toBe(true);
    expect(await database.accessReviewAttestation.count()).toBe(2);
    await expect(runInDatabaseTransaction(database, (transaction) => readScopedAccessReviewRows(transaction, {
      scopeId, filter: 'ALL', at: LATER, limit: 502,
    }))).rejects.toThrow('Invalid scoped Access review query');
  });

  test('protected attestation preserves follow-up, links revocation, and rolls back on audit failure', async () => {
    const access = createAccessAuthorityPersistence(database, { environment: 'test' });
    const reviewerTemplateId = ids.nextUuid();
    await access.createDraftRoleTemplate({
      id: reviewerTemplateId, code: 'access.iam009-reviewer', version: 1,
      displayName: 'Synthetic review attester', privilegeClass: 'PRIVILEGED',
      requireContactVerified: true, passwordMaxAgeMilliseconds: 600_000,
      mfaMaxAgeMilliseconds: 300_000, allowedScopes: ['INSTITUTION'], allowedSubjects: ['HUMAN'],
      capabilityCodes: ['access.review.attest'], createdAt: AT,
    });
    await access.activateRoleTemplate(reviewerTemplateId, AT);
    const authorityAssignmentId = ids.nextUuid();
    await access.grantRoleAssignment({
      id: authorityAssignmentId, subject: { subjectType: 'HUMAN', userId: reviewerId },
      roleTemplateId: reviewerTemplateId, scopeId, scopeType: 'INSTITUTION', validFrom: AT,
      grantedByUserId: approverId, grantReason: 'Synthetic fixture authority', grantedAt: AT,
      containmentTransitionId: ids.nextUuid(),
    });
    const { rawToken } = await privilegedSession(reviewerId);
    const cycleId = ids.nextUuid();
    const reviewItemId = ids.nextUuid();
    await database.accessReviewCycle.create({ data: {
      id: cycleId, scopeId, cadence: 'MONTHLY', opensAt: AT,
      dueAt: new Date(AT.getTime() + 30 * 24 * 60 * 60_000), createdAt: AT,
    } });
    await database.accessReviewItem.create({ data: {
      id: reviewItemId, cycleId, roleAssignmentId: assignmentId, assignmentVersion: 0, createdAt: AT,
    } });
    const authorization = new AuthorizationService();
    const auditEventId = ids.nextUuid();
    const base = {
      rawSessionToken: rawToken, authorityAssignmentId, scopeId, reviewItemId,
      reason: 'Confirm the current scope owner', operationId: 'review-follow-up',
      correlationId: 'iam009-synthetic-review', attestationId: ids.nextUuid(), auditEventId,
      environment: 'test' as const, at: LATER,
    };
    expect(await attestAuthorizedAccessReviewItem(database, authorization, {
      ...base, expectedItemVersion: 0, outcome: 'NEEDS_FOLLOW_UP',
    })).toEqual({ reviewItemId, outcome: 'NEEDS_FOLLOW_UP', repeated: false });
    expect(await attestAuthorizedAccessReviewItem(database, authorization, {
      ...base, expectedItemVersion: 0, outcome: 'NEEDS_FOLLOW_UP',
    })).toEqual({ reviewItemId, outcome: 'NEEDS_FOLLOW_UP', repeated: true });
    expect((await database.accessReviewItem.findUniqueOrThrow({ where: { id: reviewItemId } })).completedAt).toBeNull();
    const revocationRequestId = ids.nextUuid();
    const revoke = {
      ...base, expectedItemVersion: 1, outcome: 'REVOKE_REQUESTED' as const,
      reason: 'Access is no longer justified', operationId: 'review-request-revoke',
      attestationId: ids.nextUuid(), revocationRequestId, revocationAuditEventId: ids.nextUuid(),
      nextCycleId: ids.nextUuid(), nextItemId: ids.nextUuid(),
    };
    await expect(attestAuthorizedAccessReviewItem(database, authorization, revoke)).rejects.toThrow();
    expect(await database.accessApprovalRevocationTarget.count({ where: { approvalRequestId: revocationRequestId } })).toBe(0);
    expect((await database.accessReviewItem.findUniqueOrThrow({ where: { id: reviewItemId } })).version).toBe(1);
    const result = await attestAuthorizedAccessReviewItem(database, authorization, { ...revoke, auditEventId: ids.nextUuid() });
    expect(result).toEqual({ reviewItemId, outcome: 'REVOKE_REQUESTED', repeated: false });
    const item = await database.accessReviewItem.findUniqueOrThrow({ where: { id: reviewItemId } });
    expect(item.completedAt).toEqual(LATER);
    expect(item.revocationRequestId).toBe(revocationRequestId);
    expect((await database.approvalRequest.findUniqueOrThrow({ where: { id: revocationRequestId } })).state).toBe('PENDING');
    expect((await database.roleAssignment.findUniqueOrThrow({ where: { id: assignmentId } })).revokedAt).toBeNull();
    expect(await database.auditEvent.count({ where: { actionCode: 'access.review.attest', resourceId: reviewItemId } })).toBe(2);
  });

  test('protected export needs independent approval, hard row bound, and one-use effect', async () => {
    const access = createAccessAuthorityPersistence(database, { environment: 'test' });
    const makeAuthority = async (userId: string, code: string, capability: string) => {
      const roleTemplateId = ids.nextUuid();
      await access.createDraftRoleTemplate({
        id: roleTemplateId, code, version: 1, displayName: 'Synthetic IAM-009 export authority',
        privilegeClass: 'PRIVILEGED', requireContactVerified: true,
        passwordMaxAgeMilliseconds: 600_000, mfaMaxAgeMilliseconds: 300_000,
        allowedScopes: ['INSTITUTION'], allowedSubjects: ['HUMAN'],
        capabilityCodes: [capability], createdAt: AT,
      });
      await access.activateRoleTemplate(roleTemplateId, AT);
      const id = ids.nextUuid();
      await access.grantRoleAssignment({
        id, subject: { subjectType: 'HUMAN', userId }, roleTemplateId,
        scopeId, scopeType: 'INSTITUTION', validFrom: AT,
        grantedByUserId: targetId, grantReason: 'Synthetic fixture authority', grantedAt: AT,
        containmentTransitionId: ids.nextUuid(),
      });
      return id;
    };
    const requesterAuthority = await makeAuthority(reviewerId, 'access.iam009-exporter', 'access.review.export');
    const approverAuthority = await makeAuthority(approverId, 'access.iam009-export-approver', 'access.approval.decide');
    const requesterToken = (await privilegedSession(reviewerId)).rawToken;
    const approverToken = (await privilegedSession(approverId)).rawToken;
    const authorization = new AuthorizationService();
    const requestId = ids.nextUuid();
    const common = { scopeId, environment: 'test' as const, at: LATER, correlationId: 'iam009-synthetic-export' };
    const requestInput = {
      ...common, rawSessionToken: requesterToken, authorityAssignmentId: requesterAuthority,
      exportRequestId: requestId, filter: 'COMPLETED' as const, rowCeiling: 2,
      reason: 'Synthetic monthly review export', idempotencyKey: 'synthetic-reviewed-export',
      operationId: 'export-request', auditEventId: ids.nextUuid(),
    };
    const requested = await requestAuthorizedAccessReviewExport(database, authorization, requestInput);
    expect(requested).toEqual({
      exportRequestId: requestId, state: 'PENDING', repeated: false,
    });
    expect(await requestAuthorizedAccessReviewExport(database, authorization, requestInput)).toEqual({
      exportRequestId: requestId, state: 'PENDING', repeated: true,
    });
    await expect(requestAuthorizedAccessReviewExport(database, authorization, {
      ...requestInput, rowCeiling: 1,
    })).rejects.toThrow();
    await expect(decideAuthorizedAccessReviewExport(database, authorization, {
      ...common, rawSessionToken: requesterToken, authorityAssignmentId: requesterAuthority,
      exportRequestId: requestId, decisionId: ids.nextUuid(), decision: 'APPROVE',
      reason: 'Self approval must fail', operationId: 'export-self-decision', auditEventId: ids.nextUuid(),
    })).rejects.toThrow();
    const decisionInput = {
      ...common, rawSessionToken: approverToken, authorityAssignmentId: approverAuthority,
      exportRequestId: requestId, decisionId: ids.nextUuid(), decision: 'APPROVE' as const,
      reason: 'Synthetic independent approval', operationId: 'export-approval', auditEventId: ids.nextUuid(),
    };
    expect(await decideAuthorizedAccessReviewExport(database, authorization, decisionInput)).toEqual({
      exportRequestId: requestId, state: 'APPROVED',
    });
    const execution = {
      ...common, rawSessionToken: requesterToken, authorityAssignmentId: requesterAuthority,
      exportRequestId: requestId, exportEffectId: ids.nextUuid(),
      operationId: 'export-effect', auditEventId: ids.nextUuid(),
    };
    const exported = await executeAuthorizedAccessReviewExport(database, authorization, execution);
    expect(exported.headers['Cache-Control']).toBe('no-store');
    expect(exported.body).toContain('"subject_reference"');
    expect(exported.body).not.toMatch(/password|email|session|mfa|reason/i);
    await expect(executeAuthorizedAccessReviewExport(database, authorization, {
      ...execution, exportEffectId: ids.nextUuid(), auditEventId: ids.nextUuid(), operationId: 'export-second-effect',
    })).rejects.toThrow();
    expect(await database.accessReviewExportEffect.count({ where: { requestId } })).toBe(1);
    const event = await database.auditEvent.findFirstOrThrow({ where: { actionCode: 'access.review.export', resourceId: requestId } });
    expect(JSON.stringify(event.afterSummary)).not.toContain(exported.body);
    expect(event.afterSummary).toEqual({
      projectionId: 'access.review.export.row.v1', scopeType: 'INSTITUTION', resultCount: 2, rowCeiling: 2,
    });
  });

  test('two export executors waiting on the same approval commit only one effect', async () => {
    const requesterAuthority = await database.roleAssignment.findFirstOrThrow({ where: {
      userId: reviewerId, roleTemplate: { code: 'access.iam009-exporter' },
    } });
    const requesterToken = (await privilegedSession(reviewerId)).rawToken;
    const approverSession = await privilegedSession(approverId);
    const approverSecurityVersion = (await database.user.findUniqueOrThrow({ where: { id: approverId } })).securityVersion;
    const requestId = ids.nextUuid();
    await runInDatabaseTransaction(database, async (transaction) => {
      await transaction.accessReviewExportRequest.create({ data: {
        id: requestId, scopeId, projectionId: 'access.review.export.row.v1', filterCategory: 'COMPLETED',
        rowCeiling: 10, reason: 'Synthetic concurrent export', requestedByUserId: reviewerId,
        expiresAt: new Date(AT.getTime() + 1_800_000), idempotencyKey: 'synthetic-concurrent-export', createdAt: AT,
      } });
      await transaction.accessReviewExportDecision.create({ data: {
        id: ids.nextUuid(), requestId, approverUserId: approverId, decision: 'APPROVE',
        reason: 'Independent synthetic decision', sessionId: approverSession.id,
        securityVersion: approverSecurityVersion, decidedAt: LATER,
      } });
      await transaction.accessReviewExportRequest.update({ where: { id: requestId }, data: {
        state: 'APPROVED', version: { increment: 1 },
      } });
    });
    let release!: () => void;
    let locked!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    const ready = new Promise<void>((resolve) => { locked = resolve; });
    const holder = runInDatabaseTransaction(database, async (transaction) => {
      await transaction.$queryRaw`SELECT "id" FROM "access_review_export_requests" WHERE "id" = CAST(${requestId} AS uuid) FOR UPDATE`;
      locked();
      await held;
    });
    await ready;
    const authorization = new AuthorizationService();
    const execution = (label: string) => executeAuthorizedAccessReviewExport(database, authorization, {
      rawSessionToken: requesterToken, authorityAssignmentId: requesterAuthority.id,
      scopeId, environment: 'test', at: new Date(LATER.getTime() + 1_000),
      exportRequestId: requestId, exportEffectId: ids.nextUuid(),
      operationId: `synthetic-concurrent-${label}`, correlationId: 'iam009-concurrent-export', auditEventId: ids.nextUuid(),
    });
    const executions = [execution('first'), execution('second')];
    try {
      const deadline = Date.now() + 4_000;
      let waiters = 0;
      while (Date.now() < deadline && waiters < 2) {
        const activity = await database.$queryRaw<readonly { waiting: number }[]>`
          SELECT COUNT(*)::int AS waiting FROM pg_stat_activity
          WHERE datname = current_database() AND wait_event_type = 'Lock'
            AND query LIKE '%access_review_export_requests%' AND pid <> pg_backend_pid()`;
        waiters = activity[0]?.waiting ?? 0;
        if (waiters < 2) await new Promise<void>((resolve) => setImmediate(resolve));
      }
      expect(waiters).toBe(2);
    } finally { release(); }
    await holder;
    const results = await Promise.allSettled(executions);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(await database.accessReviewExportEffect.count({ where: { requestId } })).toBe(1);
    expect(await database.auditEvent.count({ where: { actionCode: 'access.review.export', resourceId: requestId } })).toBe(1);
  }, 30_000);
});
