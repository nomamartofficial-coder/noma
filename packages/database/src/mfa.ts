import { IDENTITY_SECURITY_NOTICE_CONTRACT, type MfaAuthorityPersistence, type MfaFactorRecord, type MfaSessionContext, type MfaStepUpChallengeRecord } from '@noma/platform/identity';

import type { DatabaseClient } from './client.js';
import { Prisma, type MfaFactor, type SessionStepUpChallenge } from './generated/prisma/client.js';
import { createOutboxEvent, createOutboxEventEnvelope } from './outbox.js';
import { runInDatabaseTransaction, type DatabaseTransactionClient } from './transaction.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DIGEST = /^[a-f0-9]{64}$/;
const MAX_PASSWORD_FRESH_MS = 10 * 60_000;
const MAX_MFA_FRESH_MS = 12 * 60 * 60_000;
const IDLE_MS = 30 * 60_000;

function uuid(value: string): string {
  if (!UUID.test(value)) throw new Error('Invalid MFA authority identifier');
  return value;
}

function digest(value: string): string {
  if (!DIGEST.test(value)) throw new Error('Invalid MFA token digest');
  return value;
}

function recent(proof: Date | null | undefined, now: Date, maximumAge: number): boolean {
  if (!proof) return false;
  const age = now.getTime() - proof.getTime();
  return age >= 0 && age < maximumAge;
}

function factorRecord(factor: MfaFactor): MfaFactorRecord {
  if (factor.algorithm !== 'SHA1' || factor.digits !== 6 || factor.periodSeconds !== 30) throw new Error('Unsupported MFA factor profile');
  return Object.freeze({
    id: factor.id, userId: factor.userId, status: factor.status,
    encryptedSeedEnvelope: factor.encryptedSeedEnvelope,
    algorithm: 'SHA1', digits: 6, periodSeconds: 30,
    lastAcceptedTimeStep: factor.lastAcceptedTimeStep,
    enrollmentExpiresAt: factor.enrollmentExpiresAt,
    activatedAt: factor.activatedAt, version: factor.version,
  });
}

function challengeRecord(challenge: SessionStepUpChallenge): MfaStepUpChallengeRecord {
  return Object.freeze({
    id: challenge.id, sessionId: challenge.sessionId, requirement: challenge.requirement,
    contextCode: challenge.contextCode, issuedSecurityVersion: challenge.issuedSecurityVersion,
    passwordProvenAt: challenge.passwordProvenAt, mfaProvenAt: challenge.mfaProvenAt,
    mfaMethod: challenge.mfaMethod, mfaFactorId: challenge.mfaFactorId,
    issuedAt: challenge.issuedAt, expiresAt: challenge.expiresAt,
    completedAt: challenge.completedAt, invalidatedAt: challenge.invalidatedAt, version: challenge.version,
  });
}

async function lockedAuthority(
  transaction: DatabaseTransactionClient,
  input: { readonly tokenDigest: string; readonly userId: string; readonly securityVersion: number; readonly at: Date },
): Promise<{ readonly sessionId: string; readonly userVersion: number } | null> {
  const rows = await transaction.$queryRaw<{ sessionId: string; userVersion: number }[]>`
    SELECT s."id" AS "sessionId", u."version" AS "userVersion"
    FROM "users" u INNER JOIN "sessions" s ON s."user_id" = u."id"
    WHERE u."id" = CAST(${uuid(input.userId)} AS uuid)
      AND u."status" = 'ACTIVE'
      AND u."security_version" = ${input.securityVersion}
      AND s."token_digest" = ${digest(input.tokenDigest)}
      AND s."issued_security_version" = u."security_version"
      AND s."status" IN ('ACTIVE', 'STEP_UP_REQUIRED')
      AND s."revoked_at" IS NULL
      AND s."idle_expires_at" > ${input.at}
      AND s."absolute_expires_at" > ${input.at}
    FOR UPDATE OF u, s`;
  return rows[0] ?? null;
}

async function verifiedEmailId(transaction: DatabaseTransactionClient, userId: string): Promise<string | null> {
  const email = await transaction.userEmail.findFirst({
    where: { userId, verifiedAt: { not: null }, retiredAt: null, primaryAt: { not: null } },
    select: { id: true },
  });
  return email?.id ?? null;
}

async function enqueueMfaNotice(transaction: DatabaseTransactionClient, input: {
  readonly eventId: string; readonly userEmailId: string; readonly userVersion: number;
  readonly code: 'MFA_FACTOR_ACTIVATED' | 'MFA_FACTOR_REPLACED' | 'MFA_FACTOR_REMOVED' | 'MFA_RECOVERY_CODES_REGENERATED';
  readonly at: Date; readonly correlationId: string;
}): Promise<void> {
  await createOutboxEvent(transaction, {
    contract: IDENTITY_SECURITY_NOTICE_CONTRACT,
    event: createOutboxEventEnvelope({
      eventId: uuid(input.eventId), eventType: 'identity.security-notice.requested', eventVersion: 1,
      aggregateType: 'identity-user-email', aggregateId: uuid(input.userEmailId),
      aggregateVersion: String(input.userVersion),
      payload: Object.freeze({ userEmailId: input.userEmailId, eventCode: input.code, operationId: input.eventId }),
      privacyClassification: 'account-private', servicePrincipal: 'noma_api_identity',
      correlationId: input.correlationId, occurredAt: input.at, availableAt: input.at,
    }),
  });
}

async function revokeSessions(transaction: DatabaseTransactionClient, userId: string, at: Date, transitionId: string, code: string): Promise<void> {
  await transaction.session.updateMany({
    where: { userId, status: { in: ['ACTIVE', 'STEP_UP_REQUIRED'] }, revokedAt: null },
    data: { status: 'REVOKED', revokedAt: at, revocationCode: code, statusReasonCode: code,
      lastTransitionAt: at, lastTransitionId: uuid(transitionId), version: { increment: 1 }, updatedAt: at },
  });
}

export function createMfaAuthorityPersistence(client: DatabaseClient, policy: {
  readonly passwordFreshMilliseconds?: number; readonly mfaFreshMilliseconds?: number;
} = {}): MfaAuthorityPersistence {
  const passwordFreshMs = Math.min(policy.passwordFreshMilliseconds ?? MAX_PASSWORD_FRESH_MS, MAX_PASSWORD_FRESH_MS);
  const mfaFreshMs = Math.min(policy.mfaFreshMilliseconds ?? MAX_MFA_FRESH_MS, MAX_MFA_FRESH_MS);
  if (!Number.isSafeInteger(passwordFreshMs) || passwordFreshMs < 60_000
    || !Number.isSafeInteger(mfaFreshMs) || mfaFreshMs < 60_000) throw new Error('Invalid MFA freshness policy');
  const configurationFreshMs = Math.min(mfaFreshMs, 10 * 60_000);
  const persistence: MfaAuthorityPersistence = {
    async readSession(tokenDigest, at): Promise<MfaSessionContext | null> {
      const session = await client.session.findUnique({
        where: { tokenDigest: digest(tokenDigest) }, include: { user: true },
      });
      if (!session || !['ACTIVE', 'STEP_UP_REQUIRED'].includes(session.status) || session.revokedAt
        || session.idleExpiresAt <= at || session.absoluteExpiresAt <= at
        || session.issuedSecurityVersion !== session.user.securityVersion
        || session.user.status !== 'ACTIVE') return null;
      const [email, credential, activeFactor, pendingFactor] = await Promise.all([
        client.userEmail.findFirst({ where: { userId: session.userId, verifiedAt: { not: null }, retiredAt: null, primaryAt: { not: null } }, select: { id: true } }),
        client.credential.findFirst({ where: { userId: session.userId, type: 'PASSWORD', revokedAt: null }, select: { encodedHash: true, version: true } }),
        client.mfaFactor.findFirst({ where: { userId: session.userId, status: 'ACTIVE' } }),
        client.mfaFactor.findFirst({ where: { userId: session.userId, status: 'PENDING_ENROLLMENT' } }),
      ]);
      return Object.freeze({
        user: Object.freeze({ id: session.user.id, publicReference: session.user.publicReference,
          status: session.user.status, displayName: session.user.displayName, locale: session.user.locale,
          version: session.user.version, securityVersion: session.user.securityVersion,
          lastTransitionAt: session.user.lastTransitionAt, lastTransitionId: session.user.lastTransitionId,
          statusReasonCode: session.user.statusReasonCode, createdAt: session.user.createdAt,
          updatedAt: session.user.updatedAt, deactivatedAt: session.user.deactivatedAt }),
        session: Object.freeze({ id: session.id, userId: session.userId, tokenDigest: session.tokenDigest,
          status: session.status, assurance: session.assurance, issuedSecurityVersion: session.issuedSecurityVersion,
          issuedAt: session.issuedAt, lastUsedAt: session.lastUsedAt,
          idleExpiresAt: session.idleExpiresAt, absoluteExpiresAt: session.absoluteExpiresAt,
          passwordAuthenticatedAt: session.passwordAuthenticatedAt, mfaVerifiedAt: session.mfaVerifiedAt,
          mfaMethod: session.mfaMethod, mfaFactorId: session.mfaFactorId,
          revokedAt: session.revokedAt, revocationCode: session.revocationCode,
          deviceLabel: session.deviceLabel, clientFamily: session.clientFamily, version: session.version,
          lastTransitionAt: session.lastTransitionAt, lastTransitionId: session.lastTransitionId }),
        verifiedEmailId: email?.id ?? null,
        passwordCredential: credential,
        activeFactor: activeFactor ? factorRecord(activeFactor) : null,
        pendingFactor: pendingFactor ? factorRecord(pendingFactor) : null,
      });
    },

    async recordPasswordProof(input) {
      return runInDatabaseTransaction(client, async (transaction) => {
        const authority = await lockedAuthority(transaction, input);
        if (!authority || !await verifiedEmailId(transaction, input.userId)) return false;
        const session = await transaction.session.findUniqueOrThrow({ where: { id: authority.sessionId } });
        const current = await transaction.credential.findFirst({ where: { userId: input.userId, type: 'PASSWORD', revokedAt: null } });
        if (!current || current.version !== input.credentialVersion) return false;
        await transaction.session.update({ where: { id: session.id }, data: {
          passwordAuthenticatedAt: input.at, lastTransitionAt: input.at,
          lastTransitionId: uuid(input.transitionId), version: { increment: 1 }, updatedAt: input.at,
        } });
        await transaction.sessionStepUpChallenge.updateMany({
          where: { sessionId: session.id, completedAt: null, invalidatedAt: null, expiresAt: { gt: input.at } },
          data: { passwordProvenAt: input.at, version: { increment: 1 } },
        });
        return true;
      });
    },

    async startPendingFactor(input) {
      return runInDatabaseTransaction(client, async (transaction) => {
        const authority = await lockedAuthority(transaction, input);
        if (!authority || !await verifiedEmailId(transaction, input.userId)) return false;
        const session = await transaction.session.findUniqueOrThrow({ where: { id: authority.sessionId } });
        if (session.status !== 'ACTIVE' || !recent(session.passwordAuthenticatedAt, input.at, passwordFreshMs)) return false;
        const active = await transaction.mfaFactor.findFirst({ where: { userId: input.userId, status: 'ACTIVE' } });
        if (active && (session.mfaFactorId !== active.id || !recent(session.mfaVerifiedAt, input.at, configurationFreshMs))) return false;
        await transaction.mfaFactor.updateMany({
          where: { userId: input.userId, status: 'PENDING_ENROLLMENT', enrollmentExpiresAt: { lte: input.at } },
          data: { status: 'REVOKED', revokedAt: input.at, version: { increment: 1 }, updatedAt: input.at },
        });
        const pending = await transaction.mfaFactor.findFirst({ where: { userId: input.userId, status: 'PENDING_ENROLLMENT' } });
        if (pending) return false;
        await transaction.mfaFactor.create({ data: {
          id: uuid(input.factorId), userId: input.userId, status: 'PENDING_ENROLLMENT',
          encryptedSeedEnvelope: input.encryptedSeedEnvelope as Prisma.InputJsonValue,
          algorithm: 'SHA1', digits: 6, periodSeconds: 30,
          enrollmentExpiresAt: input.expiresAt, createdAt: input.at, updatedAt: input.at,
        } });
        return true;
      });
    },

    async confirmPendingFactor(input) {
      return runInDatabaseTransaction(client, async (transaction) => {
        const authority = await lockedAuthority(transaction, input);
        if (!authority) return false;
        const emailId = await verifiedEmailId(transaction, input.userId);
        if (!emailId) return false;
        const session = await transaction.session.findUniqueOrThrow({ where: { id: authority.sessionId } });
        if (session.status !== 'ACTIVE' || !recent(session.passwordAuthenticatedAt, input.at, passwordFreshMs)) return false;
        const factor = await transaction.mfaFactor.findFirst({ where: { id: uuid(input.factorId), userId: input.userId, status: 'PENDING_ENROLLMENT', version: input.factorVersion, enrollmentExpiresAt: { gt: input.at } } });
        if (!factor || (factor.lastAcceptedTimeStep !== null && factor.lastAcceptedTimeStep >= input.matchedTimeStep)) return false;
        const old = await transaction.mfaFactor.findFirst({ where: { userId: input.userId, status: 'ACTIVE' } });
        if (old && (session.mfaFactorId !== old.id || !recent(session.mfaVerifiedAt, input.at, configurationFreshMs))) return false;
        if (old) {
          await transaction.mfaFactor.update({ where: { id: old.id }, data: { status: 'REPLACED', replacedAt: input.at, version: { increment: 1 }, updatedAt: input.at } });
        }
        const advanced = await transaction.mfaFactor.updateMany({
          where: { id: factor.id, status: 'PENDING_ENROLLMENT', version: factor.version,
            OR: [{ lastAcceptedTimeStep: null }, { lastAcceptedTimeStep: { lt: input.matchedTimeStep } }] },
          data: { status: 'ACTIVE', activatedAt: input.at, lastAcceptedTimeStep: input.matchedTimeStep,
            version: { increment: 1 }, updatedAt: input.at },
        });
        if (advanced.count !== 1) return false;
        await transaction.mfaRecoveryCodeBatch.updateMany({
          where: { userId: input.userId, status: 'ACTIVE' },
          data: { status: 'INVALIDATED', invalidatedAt: input.at, version: { increment: 1 } },
        });
        await transaction.mfaRecoveryCode.updateMany({
          where: { batch: { userId: input.userId }, consumedAt: null, invalidatedAt: null },
          data: { invalidatedAt: input.at, version: { increment: 1 } },
        });
        if (input.recoveryCodes.length !== 10 || new Set(input.recoveryCodes.map((entry) => entry.digest)).size !== 10) throw new Error('Invalid recovery batch');
        await transaction.mfaRecoveryCodeBatch.create({ data: {
          id: uuid(input.recoveryBatchId), userId: input.userId, factorId: factor.id,
          status: 'ACTIVE', issuedAt: input.at,
          codes: { create: input.recoveryCodes.map((entry) => ({ id: uuid(entry.id), codeDigest: digest(entry.digest) })) },
        } });
        const user = await transaction.user.update({ where: { id: input.userId }, data: {
          securityVersion: { increment: 1 }, version: { increment: 1 },
          lastTransitionAt: input.at, lastTransitionId: uuid(input.transitionId), updatedAt: input.at,
        } });
        await revokeSessions(transaction, input.userId, input.at, input.transitionId, old ? 'MFA_FACTOR_REPLACED' : 'MFA_FACTOR_ACTIVATED');
        if (session.absoluteExpiresAt <= input.at) return false;
        await transaction.session.create({ data: {
          id: uuid(input.successorSessionId), userId: input.userId,
          tokenDigest: digest(input.successorTokenDigest), status: 'ACTIVE',
          assurance: 'PRIVILEGED_MFA_RECENT', issuedSecurityVersion: user.securityVersion,
          issuedAt: input.at, lastUsedAt: input.at,
          idleExpiresAt: new Date(Math.min(input.at.getTime() + IDLE_MS, session.absoluteExpiresAt.getTime())),
          absoluteExpiresAt: session.absoluteExpiresAt, passwordAuthenticatedAt: session.passwordAuthenticatedAt,
          mfaVerifiedAt: input.at, mfaMethod: 'TOTP', mfaFactorId: factor.id,
          deviceLabel: session.deviceLabel, clientFamily: session.clientFamily,
          lastTransitionAt: input.at, lastTransitionId: uuid(input.transitionId),
          createdAt: input.at, updatedAt: input.at,
        } });
        await enqueueMfaNotice(transaction, {
          eventId: input.noticeEventId, userEmailId: emailId, userVersion: authority.userVersion + 1,
          code: old ? 'MFA_FACTOR_REPLACED' : 'MFA_FACTOR_ACTIVATED', at: input.at, correlationId: input.correlationId,
        });
        return true;
      });
    },

    async createStepUpChallenge(input) {
      return runInDatabaseTransaction(client, async (transaction) => {
        const authority = await lockedAuthority(transaction, input);
        if (!authority || !await verifiedEmailId(transaction, input.userId)) return null;
        const existing = await transaction.sessionStepUpChallenge.findFirst({ where: { sessionId: authority.sessionId, completedAt: null, invalidatedAt: null } });
        const strength = { RECENT_AUTH: 1, MFA: 2, MFA_AND_RECENT: 3 } as const;
        if (existing && existing.expiresAt > input.at && strength[existing.requirement] >= strength[input.requirement]) return challengeRecord(existing);
        if (existing) await transaction.sessionStepUpChallenge.update({ where: { id: existing.id }, data: { invalidatedAt: input.at, version: { increment: 1 } } });
        const challenge = await transaction.sessionStepUpChallenge.create({ data: {
          id: uuid(input.challengeId), sessionId: authority.sessionId, requirement: input.requirement,
          contextCode: input.contextCode, issuedSecurityVersion: input.securityVersion,
          issuedAt: input.at, expiresAt: input.expiresAt,
        } });
        await transaction.session.update({ where: { id: authority.sessionId }, data: {
          status: 'STEP_UP_REQUIRED', lastTransitionAt: input.at, lastTransitionId: uuid(input.transitionId),
          statusReasonCode: 'STEP_UP_REQUIRED', version: { increment: 1 }, updatedAt: input.at,
        } });
        return challengeRecord(challenge);
      });
    },

    async readStepUpChallenge(sessionId, at) {
      const challenge = await client.sessionStepUpChallenge.findFirst({
        where: { sessionId: uuid(sessionId), completedAt: null, invalidatedAt: null, expiresAt: { gt: at } },
      });
      return challenge ? challengeRecord(challenge) : null;
    },

    async recordTotpProof(input) {
      return runInDatabaseTransaction(client, async (transaction) => {
        const authority = await lockedAuthority(transaction, input);
        if (!authority) return false;
        const challenge = await transaction.sessionStepUpChallenge.findFirst({ where: {
          sessionId: authority.sessionId, completedAt: null, invalidatedAt: null, expiresAt: { gt: input.at },
          issuedSecurityVersion: input.securityVersion, requirement: { in: ['MFA', 'MFA_AND_RECENT'] },
        } });
        if (!challenge) return false;
        const result = await transaction.mfaFactor.updateMany({ where: {
          id: uuid(input.factorId), userId: input.userId, status: 'ACTIVE', version: input.factorVersion,
          OR: [{ lastAcceptedTimeStep: null }, { lastAcceptedTimeStep: { lt: input.matchedTimeStep } }],
        }, data: { lastAcceptedTimeStep: input.matchedTimeStep, version: { increment: 1 }, updatedAt: input.at } });
        if (result.count !== 1) return false;
        await transaction.session.update({ where: { id: authority.sessionId }, data: {
          mfaVerifiedAt: input.at, mfaMethod: 'TOTP', mfaFactorId: input.factorId,
          lastTransitionAt: input.at, lastTransitionId: uuid(input.transitionId),
          version: { increment: 1 }, updatedAt: input.at,
        } });
        await transaction.sessionStepUpChallenge.update({ where: { id: challenge.id }, data: {
          mfaProvenAt: input.at, mfaMethod: 'TOTP', mfaFactorId: input.factorId,
          version: { increment: 1 },
        } });
        return true;
      });
    },

    async consumeRecoveryCodeProof(input) {
      return runInDatabaseTransaction(client, async (transaction) => {
        const authority = await lockedAuthority(transaction, input);
        if (!authority) return false;
        const challenge = await transaction.sessionStepUpChallenge.findFirst({ where: {
          sessionId: authority.sessionId, completedAt: null, invalidatedAt: null, expiresAt: { gt: input.at },
          issuedSecurityVersion: input.securityVersion, requirement: { in: ['MFA', 'MFA_AND_RECENT'] },
        } });
        if (!challenge) return false;
        const factor = await transaction.mfaFactor.findFirst({ where: { id: uuid(input.factorId), userId: input.userId, status: 'ACTIVE' } });
        if (!factor) return false;
        const code = await transaction.mfaRecoveryCode.findFirst({ where: {
          codeDigest: digest(input.codeDigest), consumedAt: null, invalidatedAt: null,
          batch: { userId: input.userId, factorId: factor.id, status: 'ACTIVE' },
        } });
        if (!code) return false;
        const consumed = await transaction.mfaRecoveryCode.updateMany({
          where: { id: code.id, consumedAt: null, invalidatedAt: null, batch: { status: 'ACTIVE', factorId: factor.id } },
          data: { consumedAt: input.at, version: { increment: 1 } },
        });
        if (consumed.count !== 1) return false;
        await transaction.session.update({ where: { id: authority.sessionId }, data: {
          mfaVerifiedAt: input.at, mfaMethod: 'RECOVERY_CODE', mfaFactorId: factor.id,
          lastTransitionAt: input.at, lastTransitionId: uuid(input.transitionId),
          version: { increment: 1 }, updatedAt: input.at,
        } });
        await transaction.sessionStepUpChallenge.update({ where: { id: challenge.id }, data: {
          mfaProvenAt: input.at, mfaMethod: 'RECOVERY_CODE', mfaFactorId: factor.id,
          version: { increment: 1 },
        } });
        return true;
      });
    },

    async completeStepUpChallenge(input) {
      return runInDatabaseTransaction(client, async (transaction) => {
        const authority = await lockedAuthority(transaction, input);
        if (!authority) return false;
        const challenge = await transaction.sessionStepUpChallenge.findFirst({ where: {
          id: uuid(input.challengeId), sessionId: authority.sessionId, version: input.challengeVersion,
          completedAt: null, invalidatedAt: null, expiresAt: { gt: input.at }, issuedSecurityVersion: input.securityVersion,
        } });
        if (!challenge) return false;
        const needsPassword = challenge.requirement !== 'MFA';
        const needsMfa = challenge.requirement !== 'RECENT_AUTH';
        if ((needsPassword && !recent(challenge.passwordProvenAt, input.at, passwordFreshMs))
          || (needsMfa && !recent(challenge.mfaProvenAt, input.at, mfaFreshMs))) return false;
        const session = await transaction.session.findUniqueOrThrow({ where: { id: authority.sessionId } });
        if (session.status !== 'STEP_UP_REQUIRED' || session.absoluteExpiresAt <= input.at) return false;
        if (needsMfa) {
          const factor = await transaction.mfaFactor.findFirst({ where: { id: challenge.mfaFactorId ?? '', userId: input.userId, status: 'ACTIVE' } });
          if (!factor) return false;
        }
        await transaction.sessionStepUpChallenge.update({ where: { id: challenge.id }, data: { completedAt: input.at, version: { increment: 1 } } });
        await transaction.session.update({ where: { id: session.id }, data: {
          status: 'REVOKED', revokedAt: input.at, revocationCode: 'STEP_UP_COMPLETED', statusReasonCode: 'STEP_UP_COMPLETED',
          lastTransitionAt: input.at, lastTransitionId: uuid(input.transitionId), version: { increment: 1 }, updatedAt: input.at,
        } });
        await transaction.session.create({ data: {
          id: uuid(input.successorSessionId), userId: input.userId,
          tokenDigest: digest(input.successorTokenDigest), status: 'ACTIVE',
          assurance: needsMfa && needsPassword ? 'PRIVILEGED_MFA_RECENT' : needsMfa ? 'MFA_VERIFIED' : 'RECENTLY_AUTHENTICATED',
          issuedSecurityVersion: input.securityVersion, issuedAt: input.at, lastUsedAt: input.at,
          idleExpiresAt: new Date(Math.min(input.at.getTime() + IDLE_MS, session.absoluteExpiresAt.getTime())),
          absoluteExpiresAt: session.absoluteExpiresAt,
          passwordAuthenticatedAt: challenge.passwordProvenAt ?? session.passwordAuthenticatedAt,
          mfaVerifiedAt: challenge.mfaProvenAt ?? session.mfaVerifiedAt,
          mfaMethod: challenge.mfaMethod ?? session.mfaMethod,
          mfaFactorId: challenge.mfaFactorId ?? session.mfaFactorId,
          deviceLabel: session.deviceLabel, clientFamily: session.clientFamily,
          lastTransitionAt: input.at, lastTransitionId: uuid(input.transitionId), createdAt: input.at, updatedAt: input.at,
        } });
        return true;
      });
    },

    async removeActiveFactor(input) {
      return runInDatabaseTransaction(client, async (transaction) => {
        const authority = await lockedAuthority(transaction, input);
        if (!authority) return false;
        const emailId = await verifiedEmailId(transaction, input.userId);
        if (!emailId) return false;
        const session = await transaction.session.findUniqueOrThrow({ where: { id: authority.sessionId } });
        if (session.status !== 'ACTIVE'
          || !recent(session.passwordAuthenticatedAt, input.at, passwordFreshMs)
          || !recent(session.mfaVerifiedAt, input.at, configurationFreshMs)
          || session.mfaFactorId !== input.factorId) return false;
        const changed = await transaction.mfaFactor.updateMany({
          where: { id: uuid(input.factorId), userId: input.userId, status: 'ACTIVE', version: input.factorVersion },
          data: { status: 'REVOKED', revokedAt: input.at, version: { increment: 1 }, updatedAt: input.at },
        });
        if (changed.count !== 1) return false;
        await transaction.mfaRecoveryCodeBatch.updateMany({
          where: { userId: input.userId, status: 'ACTIVE' },
          data: { status: 'INVALIDATED', invalidatedAt: input.at, version: { increment: 1 } },
        });
        await transaction.mfaRecoveryCode.updateMany({
          where: { batch: { userId: input.userId }, consumedAt: null, invalidatedAt: null },
          data: { invalidatedAt: input.at, version: { increment: 1 } },
        });
        await transaction.user.update({ where: { id: input.userId }, data: {
          securityVersion: { increment: 1 }, version: { increment: 1 },
          lastTransitionAt: input.at, lastTransitionId: uuid(input.transitionId), updatedAt: input.at,
        } });
        await revokeSessions(transaction, input.userId, input.at, input.transitionId, 'MFA_FACTOR_REMOVED');
        await enqueueMfaNotice(transaction, { eventId: input.noticeEventId, userEmailId: emailId,
          userVersion: authority.userVersion + 1, code: 'MFA_FACTOR_REMOVED',
          at: input.at, correlationId: input.correlationId });
        return true;
      });
    },

    async regenerateRecoveryCodeBatch(input) {
      if (input.codes.length !== 10 || new Set(input.codes.map((entry) => entry.digest)).size !== 10) throw new Error('Invalid recovery batch');
      return runInDatabaseTransaction(client, async (transaction) => {
        const authority = await lockedAuthority(transaction, input);
        if (!authority) return false;
        const emailId = await verifiedEmailId(transaction, input.userId);
        if (!emailId) return false;
        const session = await transaction.session.findUniqueOrThrow({ where: { id: authority.sessionId } });
        if (session.status !== 'ACTIVE' || session.absoluteExpiresAt <= input.at
          || !recent(session.passwordAuthenticatedAt, input.at, passwordFreshMs)
          || !recent(session.mfaVerifiedAt, input.at, configurationFreshMs)
          || session.mfaFactorId !== input.factorId) return false;
        const factor = await transaction.mfaFactor.findFirst({ where: { id: uuid(input.factorId), userId: input.userId, status: 'ACTIVE', version: input.factorVersion } });
        if (!factor) return false;
        await transaction.mfaRecoveryCodeBatch.updateMany({
          where: { userId: input.userId, status: 'ACTIVE' },
          data: { status: 'INVALIDATED', invalidatedAt: input.at, version: { increment: 1 } },
        });
        await transaction.mfaRecoveryCode.updateMany({
          where: { batch: { userId: input.userId }, consumedAt: null, invalidatedAt: null },
          data: { invalidatedAt: input.at, version: { increment: 1 } },
        });
        await transaction.mfaRecoveryCodeBatch.create({ data: {
          id: uuid(input.batchId), userId: input.userId, factorId: factor.id,
          status: 'ACTIVE', issuedAt: input.at,
          codes: { create: input.codes.map((entry) => ({ id: uuid(entry.id), codeDigest: digest(entry.digest) })) },
        } });
        const user = await transaction.user.update({ where: { id: input.userId }, data: {
          securityVersion: { increment: 1 }, version: { increment: 1 },
          lastTransitionAt: input.at, lastTransitionId: uuid(input.transitionId), updatedAt: input.at,
        } });
        await revokeSessions(transaction, input.userId, input.at, input.transitionId, 'MFA_RECOVERY_CODES_REGENERATED');
        await transaction.session.create({ data: {
          id: uuid(input.successorSessionId), userId: input.userId,
          tokenDigest: digest(input.successorTokenDigest), status: 'ACTIVE',
          assurance: 'PRIVILEGED_MFA_RECENT', issuedSecurityVersion: user.securityVersion,
          issuedAt: input.at, lastUsedAt: input.at,
          idleExpiresAt: new Date(Math.min(input.at.getTime() + IDLE_MS, session.absoluteExpiresAt.getTime())),
          absoluteExpiresAt: session.absoluteExpiresAt,
          passwordAuthenticatedAt: session.passwordAuthenticatedAt,
          mfaVerifiedAt: session.mfaVerifiedAt, mfaMethod: session.mfaMethod, mfaFactorId: factor.id,
          deviceLabel: session.deviceLabel, clientFamily: session.clientFamily,
          lastTransitionAt: input.at, lastTransitionId: uuid(input.transitionId),
          createdAt: input.at, updatedAt: input.at,
        } });
        await enqueueMfaNotice(transaction, { eventId: input.noticeEventId, userEmailId: emailId,
          userVersion: authority.userVersion + 1, code: 'MFA_RECOVERY_CODES_REGENERATED',
          at: input.at, correlationId: input.correlationId });
        return true;
      });
    },
  };
  return Object.freeze(persistence);
}
