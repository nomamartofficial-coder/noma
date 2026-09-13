import {
  PASSWORD_AUTHENTICATION_ACCOUNT_STATUSES,
  IDENTITY_EMAIL_DELIVERY_CONTRACT,
  IDENTITY_SECURITY_NOTICE_CONTRACT,
  normalizeIdentityEmail,
  IdentityRegistrationConflictError,
  IdentityAuthenticationAuthorityChangedError,
  type ConsumeIdentityTokenInput,
  type CompletePasswordRecoveryInput,
  type ConfirmEmailVerificationInput,
  type CreateSessionInput,
  type CreateUserIdentityInput,
  type IdentityPersistence,
  type IdentityTokenPurpose,
  type IdentityTokenRecord,
  type IssueIdentityTokenInput,
  type IssueReplacementIdentityTokenInput,
  type PasswordRecoveryPreflight,
  type PasswordCredentialRecord,
  type RegisterPasswordIdentityInput,
  type ReplacePasswordCredentialHashInput,
  type RecordRecoveryAttemptInput,
  type RequestIdentityDeliveryInput,
  type RecoveryAttemptRecord,
  type RevokeSessionInput,
  type RotatePasswordSessionInput,
  type SessionRecord,
  type StorePasswordCredentialInput,
  type TouchSessionInput,
  type UserEmailRecord,
  type UserIdentityRecord,
} from '@noma/platform/identity';

import type { DatabaseClient } from './client.js';
import type {
  Credential,
  IdentityToken,
  RecoveryAttempt,
  Session,
  User,
  UserEmail,
} from './generated/prisma/client.js';
import { Prisma } from './generated/prisma/client.js';
import { createOutboxEvent, createOutboxEventEnvelope } from './outbox.js';
import { runInDatabaseTransaction } from './transaction.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,79}$/;
const PUBLIC_REFERENCE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{5,31}$/;

class IdentityProofAuthorityChangedError extends Error {}

function requireUuid(name: string, value: string): string {
  if (!UUID_PATTERN.test(value)) throw new Error(`${name} must be a UUID`);
  return value;
}

function requireText(name: string, value: string, maximum: number): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > maximum) {
    throw new Error(`${name} must contain 1 to ${maximum} characters`);
  }
  return normalized;
}

function requireCode(name: string, value: string): string {
  const normalized = value.trim();
  if (!SAFE_CODE_PATTERN.test(normalized)) {
    throw new Error(`${name} must be an uppercase safe code`);
  }
  return normalized;
}

function optionalCode(name: string, value: string | null | undefined): string | null {
  return value === null || value === undefined ? null : requireCode(name, value);
}

function requireDigest(name: string, value: string): string {
  const normalized = value.trim();
  if (normalized.length < 32 || normalized.length > 128 || /\s/u.test(normalized)) {
    throw new Error(`${name} must be a 32 to 128 character digest`);
  }
  return normalized;
}

function requireDate(name: string, value: Date): Date {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new Error(`${name} must be a valid instant`);
  }
  return value;
}

function requireNonNegativeInteger(name: string, value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  return value;
}

function requirePositiveInteger(name: string, value: number): number {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

function mapUser(user: User): UserIdentityRecord {
  return Object.freeze({
    id: user.id,
    publicReference: user.publicReference,
    status: user.status,
    displayName: user.displayName,
    locale: user.locale,
    version: user.version,
    securityVersion: user.securityVersion,
    lastTransitionAt: user.lastTransitionAt,
    lastTransitionId: user.lastTransitionId,
    statusReasonCode: user.statusReasonCode,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    deactivatedAt: user.deactivatedAt,
  });
}

function mapEmail(email: UserEmail): UserEmailRecord {
  return Object.freeze({
    id: email.id,
    userId: email.userId,
    displayEmail: email.displayEmail,
    normalizedEmail: email.normalizedEmail,
    verifiedAt: email.verifiedAt,
    primaryAt: email.primaryAt,
    retiredAt: email.retiredAt,
  });
}

function mapCredential(credential: Credential): PasswordCredentialRecord {
  return Object.freeze({
    id: credential.id,
    userId: credential.userId,
    encodedHash: credential.encodedHash,
    hashAlgorithm: credential.hashAlgorithm,
    hashPolicyVersion: credential.hashPolicyVersion,
    version: credential.version,
    createdAt: credential.createdAt,
    rotatedAt: credential.rotatedAt,
    revokedAt: credential.revokedAt,
  });
}

function mapSession(session: Session): SessionRecord {
  return Object.freeze({
    id: session.id,
    userId: session.userId,
    tokenDigest: session.tokenDigest,
    status: session.status,
    assurance: session.assurance,
    issuedSecurityVersion: session.issuedSecurityVersion,
    passwordAuthenticatedAt: session.passwordAuthenticatedAt,
    mfaVerifiedAt: session.mfaVerifiedAt,
    mfaMethod: session.mfaMethod,
    mfaFactorId: session.mfaFactorId,
    issuedAt: session.issuedAt,
    lastUsedAt: session.lastUsedAt,
    idleExpiresAt: session.idleExpiresAt,
    absoluteExpiresAt: session.absoluteExpiresAt,
    revokedAt: session.revokedAt,
    revocationCode: session.revocationCode,
    deviceLabel: session.deviceLabel,
    clientFamily: session.clientFamily,
    version: session.version,
    lastTransitionAt: session.lastTransitionAt,
    lastTransitionId: session.lastTransitionId,
  });
}

function mapToken(token: IdentityToken): IdentityTokenRecord {
  return Object.freeze({
    id: token.id,
    userEmailId: token.userEmailId,
    purpose: token.purpose,
    tokenDigest: token.tokenDigest,
    issuedSecurityVersion: token.issuedSecurityVersion,
    issuedAt: token.issuedAt,
    expiresAt: token.expiresAt,
    consumedAt: token.consumedAt,
    invalidatedAt: token.invalidatedAt,
    invalidationCode: token.invalidationCode,
    replacedByTokenId: token.replacedByTokenId,
  });
}

function mapRecoveryAttempt(attempt: RecoveryAttempt): RecoveryAttemptRecord {
  return Object.freeze({
    id: attempt.id,
    userId: attempt.userId,
    subjectDigest: attempt.subjectDigest,
    correlationId: attempt.correlationId,
    methodCode: attempt.methodCode,
    outcomeCode: attempt.outcomeCode,
    assuranceEvidenceCode: attempt.assuranceEvidenceCode,
    containmentCode: attempt.containmentCode,
    occurredAt: attempt.occurredAt,
  });
}

function validateCreateSessionInput(input: CreateSessionInput) {
  const issuedAt = requireDate('issuedAt', input.issuedAt);
  const idleExpiresAt = requireDate('idleExpiresAt', input.idleExpiresAt);
  const absoluteExpiresAt = requireDate('absoluteExpiresAt', input.absoluteExpiresAt);
  if (idleExpiresAt <= issuedAt || absoluteExpiresAt < idleExpiresAt) {
    throw new Error('session expiry instants are inconsistent');
  }
  return {
    id: requireUuid('session id', input.id),
    userId: requireUuid('userId', input.userId),
    tokenDigest: requireDigest('tokenDigest', input.tokenDigest),
    assurance: input.assurance,
    issuedSecurityVersion: requireNonNegativeInteger('issuedSecurityVersion', input.issuedSecurityVersion),
    issuedAt,
    lastUsedAt: issuedAt,
    idleExpiresAt,
    absoluteExpiresAt,
    deviceLabel: requireText('deviceLabel', input.deviceLabel, 80),
    clientFamily: input.clientFamily ? requireText('clientFamily', input.clientFamily, 80) : null,
    lastTransitionAt: issuedAt,
    lastTransitionId: requireUuid('transitionId', input.transitionId),
    createdAt: issuedAt,
    updatedAt: issuedAt,
  } as const;
}

function validateTokenPurpose(value: IdentityTokenPurpose): IdentityTokenPurpose {
  if (value !== 'EMAIL_VERIFICATION' && value !== 'PASSWORD_RECOVERY') {
    throw new Error('identity token purpose is unsupported');
  }
  return value;
}

function isNormalizedEmailConflict(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') return false;
  const target = String(error.meta?.target ?? '').toLowerCase();
  return error.meta?.modelName === 'UserEmail'
    || target.includes('normalized_email')
    || target.includes('user_emails_normalized_active_key');
}

async function enqueueIdentityDelivery(
  transaction: Prisma.TransactionClient,
  input: {
    readonly eventId: string;
    readonly userEmailId: string;
    readonly userVersion: number;
    readonly purpose: IdentityTokenPurpose;
    readonly correlationId: string;
    readonly occurredAt: Date;
  },
): Promise<void> {
  const occurredAt = requireDate('delivery occurredAt', input.occurredAt);
  await createOutboxEvent(transaction, {
    contract: IDENTITY_EMAIL_DELIVERY_CONTRACT,
    event: createOutboxEventEnvelope({
      eventId: requireUuid('delivery eventId', input.eventId),
      eventType: 'identity.email-delivery.requested',
      eventVersion: 1,
      aggregateType: 'identity-user-email',
      aggregateId: requireUuid('delivery userEmailId', input.userEmailId),
      aggregateVersion: String(requireNonNegativeInteger('delivery userVersion', input.userVersion)),
      payload: Object.freeze({
        userEmailId: input.userEmailId,
        purpose: validateTokenPurpose(input.purpose),
        operationId: input.eventId,
      }),
      privacyClassification: 'account-private',
      servicePrincipal: 'noma_api_identity',
      correlationId: requireText('delivery correlationId', input.correlationId, 200),
      occurredAt,
      availableAt: occurredAt,
    }),
  });
}

async function enqueueSecurityNotice(
  transaction: Prisma.TransactionClient,
  input: {
    readonly eventId: string;
    readonly userEmailId: string;
    readonly userVersion: number;
    readonly eventCode: import('@noma/platform/identity').IdentitySecurityNoticePayload['eventCode'];
    readonly correlationId: string;
    readonly occurredAt: Date;
  },
): Promise<void> {
  const occurredAt = requireDate('notice occurredAt', input.occurredAt);
  await createOutboxEvent(transaction, {
    contract: IDENTITY_SECURITY_NOTICE_CONTRACT,
    event: createOutboxEventEnvelope({
      eventId: requireUuid('notice eventId', input.eventId),
      eventType: 'identity.security-notice.requested',
      eventVersion: 1,
      aggregateType: 'identity-user-email',
      aggregateId: requireUuid('notice userEmailId', input.userEmailId),
      aggregateVersion: String(requireNonNegativeInteger('notice userVersion', input.userVersion)),
      payload: Object.freeze({ userEmailId: input.userEmailId, eventCode: input.eventCode, operationId: input.eventId }),
      privacyClassification: 'account-private',
      servicePrincipal: 'noma_api_identity',
      correlationId: requireText('notice correlationId', input.correlationId, 200),
      occurredAt,
      availableAt: occurredAt,
    }),
  });
}

export function createIdentityPersistence(client: DatabaseClient): IdentityPersistence {
  return Object.freeze({
    async createUserIdentity(input: CreateUserIdentityInput) {
      const occurredAt = requireDate('occurredAt', input.occurredAt);
      const publicReference = input.publicReference.trim();
      if (!PUBLIC_REFERENCE_PATTERN.test(publicReference)) {
        throw new Error('publicReference must be 6 to 32 uppercase safe characters');
      }
      const displayEmail = requireText('displayEmail', input.email.displayEmail, 320);
      const normalizedEmail = normalizeIdentityEmail(displayEmail);
      return runInDatabaseTransaction(client, async (transaction) => {
        const user = await transaction.user.create({
          data: {
            id: requireUuid('user id', input.id),
            publicReference,
            displayName: requireText('displayName', input.displayName, 160),
            locale: requireText('locale', input.locale ?? 'en-NG', 35),
            lastTransitionAt: occurredAt,
            lastTransitionId: requireUuid('transitionId', input.transitionId),
            createdAt: occurredAt,
            updatedAt: occurredAt,
          },
        });
        const email = await transaction.userEmail.create({
          data: {
            id: requireUuid('email id', input.email.id),
            userId: user.id,
            displayEmail,
            normalizedEmail,
            primaryAt: input.email.primary ? occurredAt : null,
            createdAt: occurredAt,
            updatedAt: occurredAt,
          },
        });
        return Object.freeze({ user: mapUser(user), email: mapEmail(email) });
      });
    },

    async findUserById(userId: string) {
      const user = await client.user.findUnique({ where: { id: requireUuid('userId', userId) } });
      return user ? mapUser(user) : null;
    },

    async findUserByNormalizedEmail(email: string) {
      const record = await client.userEmail.findFirst({
        where: { normalizedEmail: normalizeIdentityEmail(email), retiredAt: null },
        include: { user: true },
      });
      return record ? mapUser(record.user) : null;
    },

    async storePasswordCredential(input: StorePasswordCredentialInput) {
      const encodedHash = input.encodedHash.trim();
      if (encodedHash.length < 20) throw new Error('encodedHash must contain encoded hash metadata');
      const credential = await client.credential.create({
        data: {
          id: requireUuid('credential id', input.id),
          userId: requireUuid('userId', input.userId),
          type: 'PASSWORD',
          encodedHash,
          hashAlgorithm: requireCode('hashAlgorithm', input.hashAlgorithm),
          hashPolicyVersion: requirePositiveInteger('hashPolicyVersion', input.hashPolicyVersion),
          createdAt: requireDate('createdAt', input.createdAt),
        },
      });
      return mapCredential(credential);
    },

    async readActivePasswordCredential(userId: string) {
      const credential = await client.credential.findFirst({
        where: { userId: requireUuid('userId', userId), type: 'PASSWORD', revokedAt: null },
      });
      return credential ? mapCredential(credential) : null;
    },

    async registerPasswordIdentity(input: RegisterPasswordIdentityInput) {
      const occurredAt = requireDate('occurredAt', input.occurredAt);
      const publicReference = input.publicReference.trim();
      if (!PUBLIC_REFERENCE_PATTERN.test(publicReference)) {
        throw new Error('publicReference must be 6 to 32 uppercase safe characters');
      }
      const displayEmail = requireText('displayEmail', input.email.displayEmail, 320);
      const normalizedEmail = normalizeIdentityEmail(displayEmail);
      const encodedHash = input.credential.encodedHash.trim();
      if (encodedHash.length < 20) throw new Error('encodedHash must contain encoded hash metadata');
      try {
        return await runInDatabaseTransaction(client, async (transaction) => {
        const user = await transaction.user.create({
          data: {
            id: requireUuid('user id', input.id),
            publicReference,
            displayName: requireText('displayName', input.displayName, 160),
            locale: requireText('locale', input.locale ?? 'en-NG', 35),
            lastTransitionAt: occurredAt,
            lastTransitionId: requireUuid('transitionId', input.transitionId),
            createdAt: occurredAt,
            updatedAt: occurredAt,
          },
        });
        const email = await transaction.userEmail.create({
          data: {
            id: requireUuid('email id', input.email.id),
            userId: user.id,
            displayEmail,
            normalizedEmail,
            primaryAt: occurredAt,
            createdAt: occurredAt,
            updatedAt: occurredAt,
          },
        });
        const credential = await transaction.credential.create({
          data: {
            id: requireUuid('credential id', input.credential.id),
            userId: user.id,
            type: 'PASSWORD',
            encodedHash,
            hashAlgorithm: requireCode('hashAlgorithm', input.credential.hashAlgorithm),
            hashPolicyVersion: requirePositiveInteger('hashPolicyVersion', input.credential.hashPolicyVersion),
            createdAt: requireDate('credential createdAt', input.credential.createdAt),
          },
        });
          if (input.verificationDelivery) {
            if (input.verificationDelivery.purpose !== 'EMAIL_VERIFICATION') {
              throw new Error('registration delivery must be email verification');
            }
            await enqueueIdentityDelivery(transaction, {
              ...input.verificationDelivery,
              userEmailId: email.id,
              userVersion: user.version,
            });
          }
          return Object.freeze({ user: mapUser(user), email: mapEmail(email), credential: mapCredential(credential) });
        });
      } catch (error) {
        if (isNormalizedEmailConflict(error)) throw new IdentityRegistrationConflictError();
        throw error;
      }
    },

    async readPasswordAuthenticationCandidate(normalizedEmail: string) {
      const email = await client.userEmail.findFirst({
        where: { normalizedEmail: normalizeIdentityEmail(normalizedEmail), retiredAt: null },
        include: {
          user: {
            include: {
              credentials: { where: { type: 'PASSWORD', revokedAt: null }, take: 1 },
            },
          },
        },
      });
      const credential = email?.user.credentials[0];
      return email && credential
        ? Object.freeze({ user: mapUser(email.user), credential: mapCredential(credential), emailVerified: email.verifiedAt !== null })
        : null;
    },

    async replacePasswordCredentialHash(input: ReplacePasswordCredentialHashInput) {
      const encodedHash = input.encodedHash.trim();
      if (encodedHash.length < 20) throw new Error('encodedHash must contain encoded hash metadata');
      const result = await client.credential.updateMany({
        where: {
          id: requireUuid('credentialId', input.credentialId),
          type: 'PASSWORD',
          version: requireNonNegativeInteger('expectedVersion', input.expectedVersion),
          revokedAt: null,
        },
        data: {
          encodedHash,
          hashAlgorithm: requireCode('hashAlgorithm', input.hashAlgorithm),
          hashPolicyVersion: requirePositiveInteger('hashPolicyVersion', input.hashPolicyVersion),
          rotatedAt: requireDate('rotatedAt', input.rotatedAt),
          version: { increment: 1 },
        },
      });
      if (result.count !== 1) return null;
      return mapCredential(await client.credential.findUniqueOrThrow({ where: { id: input.credentialId } }));
    },

    async createSession(input: CreateSessionInput) {
      const session = await client.session.create({
        data: validateCreateSessionInput(input),
      });
      return mapSession(session);
    },

    async resolveActiveSessionCandidate(tokenDigest: string, at: Date) {
      const rows = await client.$queryRaw<SessionRecord[]>`
        SELECT
          s."id",
          s."user_id" AS "userId",
          s."token_digest" AS "tokenDigest",
          s."status",
          s."assurance",
          s."issued_security_version" AS "issuedSecurityVersion",
          s."password_authenticated_at" AS "passwordAuthenticatedAt",
          s."mfa_verified_at" AS "mfaVerifiedAt",
          s."mfa_method" AS "mfaMethod",
          s."mfa_factor_id" AS "mfaFactorId",
          s."issued_at" AS "issuedAt",
          s."last_used_at" AS "lastUsedAt",
          s."idle_expires_at" AS "idleExpiresAt",
          s."absolute_expires_at" AS "absoluteExpiresAt",
          s."revoked_at" AS "revokedAt",
          s."revocation_code" AS "revocationCode",
          s."device_label" AS "deviceLabel",
          s."client_family" AS "clientFamily",
          s."version",
          s."last_transition_at" AS "lastTransitionAt",
          s."last_transition_id" AS "lastTransitionId"
        FROM "sessions" s
        INNER JOIN "users" u ON u."id" = s."user_id"
        WHERE s."token_digest" = ${requireDigest('tokenDigest', tokenDigest)}
          AND s."status" IN ('ACTIVE', 'STEP_UP_REQUIRED')
          AND s."revoked_at" IS NULL
          AND s."idle_expires_at" > ${requireDate('at', at)}
          AND s."absolute_expires_at" > ${at}
          AND s."issued_security_version" = u."security_version"
        LIMIT 1`;
      return rows[0] ? Object.freeze(rows[0]) : null;
    },

    async resolveAuthenticatedSession(tokenDigest: string, at: Date) {
      const candidate = await client.session.findFirst({
        where: {
          tokenDigest: requireDigest('tokenDigest', tokenDigest),
          status: { in: ['ACTIVE', 'STEP_UP_REQUIRED'] },
          revokedAt: null,
          idleExpiresAt: { gt: requireDate('at', at) },
          absoluteExpiresAt: { gt: at },
          user: { status: { in: [...PASSWORD_AUTHENTICATION_ACCOUNT_STATUSES] } },
        },
        include: { user: true },
      });
      if (!candidate || candidate.issuedSecurityVersion !== candidate.user.securityVersion) return null;
      const [verifiedContact, activeFactor] = await Promise.all([
        client.userEmail.findFirst({ where: { userId: candidate.userId, verifiedAt: { not: null }, retiredAt: null }, select: { id: true } }),
        candidate.mfaFactorId
          ? client.mfaFactor.findFirst({ where: { id: candidate.mfaFactorId, userId: candidate.userId, status: 'ACTIVE' }, select: { id: true } })
          : Promise.resolve(null),
      ]);
      return Object.freeze({
        session: mapSession(candidate), user: mapUser(candidate.user),
        contactVerified: Boolean(verifiedContact), activeMfaFactorId: activeFactor?.id ?? null,
      });
    },

    async rotatePasswordSession(input: RotatePasswordSessionInput) {
      const revokedAt = requireDate('revokedAt', input.revokedAt);
      return runInDatabaseTransaction(client, async (transaction) => {
        const authority = await transaction.user.findUnique({
          where: { id: requireUuid('session.userId', input.session.userId) },
          select: { securityVersion: true, status: true },
        });
        if (
          !authority
          || authority.securityVersion !== input.session.issuedSecurityVersion
          || !(PASSWORD_AUTHENTICATION_ACCOUNT_STATUSES as readonly string[]).includes(authority.status)
        ) {
          throw new IdentityAuthenticationAuthorityChangedError();
        }
        if (input.replacedTokenDigest) {
          await transaction.session.updateMany({
            where: {
              tokenDigest: requireDigest('replacedTokenDigest', input.replacedTokenDigest),
              status: { in: ['ACTIVE', 'STEP_UP_REQUIRED'] },
              revokedAt: null,
            },
            data: {
              status: 'REVOKED',
              revokedAt,
              revocationCode: 'SESSION_ROTATED',
              statusReasonCode: 'SESSION_ROTATED',
              lastTransitionAt: revokedAt,
              lastTransitionId: requireUuid('revocationTransitionId', input.revocationTransitionId),
              version: { increment: 1 },
              updatedAt: revokedAt,
            },
          });
        }
        return mapSession(await transaction.session.create({ data: validateCreateSessionInput(input.session) }));
      });
    },

    async touchSession(input: TouchSessionInput) {
      const touchedAt = requireDate('touchedAt', input.touchedAt);
      const idleExpiresAt = requireDate('idleExpiresAt', input.idleExpiresAt);
      if (idleExpiresAt <= touchedAt) throw new Error('touched idle expiry must follow touch time');
      const rows = await client.$queryRaw<SessionRecord[]>`
        UPDATE "sessions"
        SET "last_used_at" = ${touchedAt},
            "idle_expires_at" = ${idleExpiresAt},
            "last_transition_at" = ${touchedAt},
            "last_transition_id" = CAST(${requireUuid('transitionId', input.transitionId)} AS uuid),
            "version" = "version" + 1,
            "updated_at" = ${touchedAt}
        WHERE "id" = CAST(${requireUuid('sessionId', input.sessionId)} AS uuid)
          AND "version" = ${requireNonNegativeInteger('expectedVersion', input.expectedVersion)}
          AND "status" IN ('ACTIVE', 'STEP_UP_REQUIRED')
          AND "revoked_at" IS NULL
          AND "idle_expires_at" > ${touchedAt}
          AND "absolute_expires_at" > ${touchedAt}
          AND "absolute_expires_at" >= ${idleExpiresAt}
          AND EXISTS (
            SELECT 1
            FROM "users" u
            WHERE u."id" = "sessions"."user_id"
              AND u."status" = ANY(
                ARRAY[${Prisma.join(PASSWORD_AUTHENTICATION_ACCOUNT_STATUSES)}]::"account_status"[]
              )
              AND u."security_version" = "sessions"."issued_security_version"
          )
        RETURNING
          "id", "user_id" AS "userId", "token_digest" AS "tokenDigest", "status", "assurance",
          "issued_security_version" AS "issuedSecurityVersion", "issued_at" AS "issuedAt",
          "password_authenticated_at" AS "passwordAuthenticatedAt", "mfa_verified_at" AS "mfaVerifiedAt",
          "mfa_method" AS "mfaMethod", "mfa_factor_id" AS "mfaFactorId",
          "last_used_at" AS "lastUsedAt", "idle_expires_at" AS "idleExpiresAt",
          "absolute_expires_at" AS "absoluteExpiresAt", "revoked_at" AS "revokedAt",
          "revocation_code" AS "revocationCode", "device_label" AS "deviceLabel",
          "client_family" AS "clientFamily", "version", "last_transition_at" AS "lastTransitionAt",
          "last_transition_id" AS "lastTransitionId"`;
      return rows[0] ? Object.freeze(rows[0]) : null;
    },

    async revokeSessionByTokenDigest(tokenDigest: string, revokedAt: Date, revocationCode: string, transitionId: string) {
      const instant = requireDate('revokedAt', revokedAt);
      const result = await client.session.updateMany({
        where: {
          tokenDigest: requireDigest('tokenDigest', tokenDigest),
          status: { in: ['ACTIVE', 'STEP_UP_REQUIRED'] },
          revokedAt: null,
        },
        data: {
          status: 'REVOKED',
          revokedAt: instant,
          revocationCode: requireCode('revocationCode', revocationCode),
          statusReasonCode: requireCode('revocationCode', revocationCode),
          lastTransitionAt: instant,
          lastTransitionId: requireUuid('transitionId', transitionId),
          version: { increment: 1 },
          updatedAt: instant,
        },
      });
      return result.count === 1;
    },

    async revokeSession(input: RevokeSessionInput) {
      const revokedAt = requireDate('revokedAt', input.revokedAt);
      const result = await client.session.updateMany({
        where: {
          id: requireUuid('sessionId', input.sessionId),
          version: requireNonNegativeInteger('expectedVersion', input.expectedVersion),
          status: { in: ['ACTIVE', 'STEP_UP_REQUIRED'] },
          revokedAt: null,
        },
        data: {
          status: 'REVOKED',
          revokedAt,
          revocationCode: requireCode('revocationCode', input.revocationCode),
          statusReasonCode: requireCode('revocationCode', input.revocationCode),
          lastTransitionAt: revokedAt,
          lastTransitionId: requireUuid('transitionId', input.transitionId),
          version: { increment: 1 },
          updatedAt: revokedAt,
        },
      });
      if (result.count !== 1) return null;
      const session = await client.session.findUniqueOrThrow({ where: { id: input.sessionId } });
      return mapSession(session);
    },

    async issueIdentityToken(input: IssueIdentityTokenInput) {
      const issuedAt = requireDate('issuedAt', input.issuedAt);
      const expiresAt = requireDate('expiresAt', input.expiresAt);
      if (expiresAt <= issuedAt) throw new Error('identity token expiry must follow issuance');
      const token = await client.identityToken.create({
        data: {
          id: requireUuid('identity token id', input.id),
          userEmailId: requireUuid('userEmailId', input.userEmailId),
          purpose: validateTokenPurpose(input.purpose),
          tokenDigest: requireDigest('tokenDigest', input.tokenDigest),
          issuedSecurityVersion: requireNonNegativeInteger('issuedSecurityVersion', input.issuedSecurityVersion),
          issuedAt,
          expiresAt,
          createdAt: issuedAt,
        },
      });
      return mapToken(token);
    },

    async requestIdentityDelivery(input: RequestIdentityDeliveryInput) {
      const occurredAt = requireDate('occurredAt', input.occurredAt);
      return runInDatabaseTransaction(client, async (transaction) => {
        const email = await transaction.userEmail.findFirst({
          where: { normalizedEmail: normalizeIdentityEmail(input.normalizedEmail), retiredAt: null, primaryAt: { not: null } },
          include: { user: { include: { credentials: { where: { type: 'PASSWORD', revokedAt: null }, take: 1 } } } },
        });
        if (!email) return false;
        const eligible = input.purpose === 'EMAIL_VERIFICATION'
          ? email.user.status === 'PENDING_EMAIL' && email.verifiedAt === null
          : (email.user.status === 'ACTIVE' || email.user.status === 'RECOVERY_LOCKED')
            && email.verifiedAt !== null
            && email.user.credentials.length === 1;
        if (!eligible) return false;
        await enqueueIdentityDelivery(transaction, {
          eventId: input.eventId,
          userEmailId: email.id,
          userVersion: email.user.version,
          purpose: input.purpose,
          correlationId: input.correlationId,
          occurredAt,
        });
        return true;
      });
    },

    async readIdentityDeliveryCandidate(userEmailId: string, purpose: IdentityTokenPurpose) {
      const email = await client.userEmail.findUnique({
        where: { id: requireUuid('userEmailId', userEmailId) },
        include: { user: { include: { credentials: { where: { type: 'PASSWORD', revokedAt: null }, take: 1 } } } },
      });
      if (!email || email.retiredAt || !email.primaryAt) return null;
      const eligible = purpose === 'EMAIL_VERIFICATION'
        ? email.user.status === 'PENDING_EMAIL' && email.verifiedAt === null
        : (email.user.status === 'ACTIVE' || email.user.status === 'RECOVERY_LOCKED')
          && email.verifiedAt !== null
          && email.user.credentials.length === 1;
      return eligible ? Object.freeze({ user: mapUser(email.user), email: mapEmail(email) }) : null;
    },

    async issueReplacementIdentityToken(input: IssueReplacementIdentityTokenInput) {
      const issuedAt = requireDate('issuedAt', input.issuedAt);
      const expiresAt = requireDate('expiresAt', input.expiresAt);
      if (expiresAt <= issuedAt) throw new Error('identity token expiry must follow issuance');
      return runInDatabaseTransaction(client, async (transaction) => {
        await transaction.$queryRaw`SELECT "id" FROM "user_emails" WHERE "id" = CAST(${requireUuid('userEmailId', input.userEmailId)} AS uuid) FOR UPDATE`;
        if (await transaction.identityToken.findUnique({ where: { id: requireUuid('identity token id', input.id) } })) {
          return Object.freeze({ disposition: 'already-issued' as const });
        }
        const purpose = validateTokenPurpose(input.purpose);
        if (await transaction.identityToken.findFirst({
          where: { userEmailId: input.userEmailId, purpose, issuedAt: { gt: issuedAt } },
          select: { id: true },
        })) {
          return Object.freeze({ disposition: 'superseded' as const });
        }
        const email = await transaction.userEmail.findUnique({
          where: { id: input.userEmailId },
          include: { user: { include: { credentials: { where: { type: 'PASSWORD', revokedAt: null }, take: 1 } } } },
        });
        if (!email || email.retiredAt || !email.primaryAt || email.user.securityVersion !== input.issuedSecurityVersion) {
          return Object.freeze({ disposition: 'ineligible' as const });
        }
        const eligible = purpose === 'EMAIL_VERIFICATION'
          ? email.user.status === 'PENDING_EMAIL' && email.verifiedAt === null
          : (email.user.status === 'ACTIVE' || email.user.status === 'RECOVERY_LOCKED')
            && email.verifiedAt !== null
            && email.user.credentials.length === 1;
        if (!eligible) return Object.freeze({ disposition: 'ineligible' as const });
        const token = await transaction.identityToken.create({
          data: {
            id: input.id,
            userEmailId: email.id,
            purpose,
            tokenDigest: requireDigest('tokenDigest', input.tokenDigest),
            issuedSecurityVersion: requireNonNegativeInteger('issuedSecurityVersion', input.issuedSecurityVersion),
            issuedAt,
            expiresAt,
            createdAt: issuedAt,
          },
        });
        await transaction.identityToken.updateMany({
          where: { userEmailId: email.id, purpose, id: { not: token.id }, consumedAt: null, invalidatedAt: null },
          data: { invalidatedAt: issuedAt, invalidationCode: 'REPLACED_BY_NEW_TOKEN', replacedByTokenId: token.id },
        });
        return Object.freeze({ disposition: 'issued' as const, token: mapToken(token), recipientAddress: email.displayEmail, locale: email.user.locale });
      });
    },

    async invalidateIdentityToken(tokenId: string, invalidatedAt: Date, code: string) {
      const result = await client.identityToken.updateMany({
        where: { id: requireUuid('tokenId', tokenId), consumedAt: null, invalidatedAt: null },
        data: { invalidatedAt: requireDate('invalidatedAt', invalidatedAt), invalidationCode: requireCode('invalidationCode', code) },
      });
      return result.count === 1;
    },

    async readIdentityEmailContact(userEmailId: string) {
      const email = await client.userEmail.findUnique({ where: { id: requireUuid('userEmailId', userEmailId) }, include: { user: true } });
      return email && !email.retiredAt ? Object.freeze({ user: mapUser(email.user), email: mapEmail(email) }) : null;
    },

    async consumeIdentityToken(input: ConsumeIdentityTokenInput) {
      const rows = await client.$queryRaw<IdentityTokenRecord[]>`
        UPDATE "identity_tokens" AS t
        SET "consumed_at" = ${requireDate('consumedAt', input.consumedAt)}
        FROM "user_emails" e
        INNER JOIN "users" u ON u."id" = e."user_id"
        WHERE t."user_email_id" = e."id"
          AND t."token_digest" = ${requireDigest('tokenDigest', input.tokenDigest)}
          AND t."purpose" = CAST(${validateTokenPurpose(input.purpose)} AS "identity_token_purpose")
          AND t."consumed_at" IS NULL
          AND t."invalidated_at" IS NULL
          AND t."expires_at" > ${input.consumedAt}
          AND t."issued_security_version" = u."security_version"
        RETURNING
          t."id",
          t."user_email_id" AS "userEmailId",
          t."purpose",
          t."token_digest" AS "tokenDigest",
          t."issued_security_version" AS "issuedSecurityVersion",
          t."issued_at" AS "issuedAt",
          t."expires_at" AS "expiresAt",
          t."consumed_at" AS "consumedAt",
          t."invalidated_at" AS "invalidatedAt",
          t."invalidation_code" AS "invalidationCode",
          t."replaced_by_token_id" AS "replacedByTokenId"`;
      return rows[0] ? Object.freeze(rows[0]) : null;
    },

    async confirmEmailVerification(input: ConfirmEmailVerificationInput) {
      const verifiedAt = requireDate('verifiedAt', input.verifiedAt);
      try {
        return await runInDatabaseTransaction(client, async (transaction) => {
        const token = await transaction.identityToken.findUnique({
          where: { tokenDigest: requireDigest('tokenDigest', input.tokenDigest) },
          include: { userEmail: { include: { user: true } } },
        });
        if (!token || token.purpose !== 'EMAIL_VERIFICATION' || token.consumedAt || token.invalidatedAt
          || token.expiresAt <= verifiedAt || token.issuedSecurityVersion !== token.userEmail.user.securityVersion
          || token.userEmail.retiredAt || token.userEmail.verifiedAt || !token.userEmail.primaryAt
          || token.userEmail.user.status !== 'PENDING_EMAIL') return null;
        const consumed = await transaction.identityToken.updateMany({
          where: { id: token.id, consumedAt: null, invalidatedAt: null, expiresAt: { gt: verifiedAt } },
          data: { consumedAt: verifiedAt },
        });
        if (consumed.count !== 1) return null;
        const emailUpdated = await transaction.userEmail.updateMany({
          where: { id: token.userEmailId, verifiedAt: null, retiredAt: null },
          data: { verifiedAt, updatedAt: verifiedAt },
        });
        const userUpdated = await transaction.user.updateMany({
          where: { id: token.userEmail.userId, status: 'PENDING_EMAIL', version: token.userEmail.user.version, securityVersion: token.issuedSecurityVersion },
          data: { status: 'ACTIVE', statusReasonCode: 'EMAIL_VERIFIED', version: { increment: 1 }, lastTransitionAt: verifiedAt, lastTransitionId: requireUuid('transitionId', input.transitionId), updatedAt: verifiedAt },
        });
        if (emailUpdated.count !== 1 || userUpdated.count !== 1) throw new IdentityProofAuthorityChangedError();
        await transaction.identityToken.updateMany({
          where: { userEmailId: token.userEmailId, purpose: 'EMAIL_VERIFICATION', id: { not: token.id }, consumedAt: null, invalidatedAt: null },
          data: { invalidatedAt: verifiedAt, invalidationCode: 'EMAIL_VERIFIED' },
        });
        let elevatedSessionId: string | null = null;
        if (input.presentedSessionTokenDigest) {
          const session = await transaction.session.findFirst({
            where: {
              tokenDigest: requireDigest('presentedSessionTokenDigest', input.presentedSessionTokenDigest),
              userId: token.userEmail.userId,
              status: 'ACTIVE',
              assurance: 'AUTHENTICATED',
              revokedAt: null,
              idleExpiresAt: { gt: verifiedAt },
              absoluteExpiresAt: { gt: verifiedAt },
              issuedSecurityVersion: token.issuedSecurityVersion,
            },
          });
          if (session) {
            const elevated = await transaction.session.updateMany({
              where: { id: session.id, version: session.version, assurance: 'AUTHENTICATED', revokedAt: null },
              data: { assurance: 'CONTACT_VERIFIED', version: { increment: 1 }, lastTransitionAt: verifiedAt, lastTransitionId: input.transitionId, updatedAt: verifiedAt },
            });
            if (elevated.count === 1) elevatedSessionId = session.id;
          }
        }
        await enqueueSecurityNotice(transaction, {
          eventId: input.noticeEventId,
          userEmailId: token.userEmailId,
          userVersion: token.userEmail.user.version + 1,
          eventCode: 'EMAIL_VERIFIED',
          correlationId: input.correlationId,
          occurredAt: verifiedAt,
        });
        return Object.freeze({ userId: token.userEmail.userId, emailId: token.userEmailId, elevatedSessionId });
        });
      } catch (error) {
        if (error instanceof IdentityProofAuthorityChangedError) return null;
        throw error;
      }
    },

    async preflightPasswordRecovery(tokenDigest: string, at: Date): Promise<PasswordRecoveryPreflight | null> {
      const instant = requireDate('at', at);
      const token = await client.identityToken.findUnique({
        where: { tokenDigest: requireDigest('tokenDigest', tokenDigest) },
        include: { userEmail: { include: { user: { include: { credentials: { where: { type: 'PASSWORD', revokedAt: null }, take: 1 } } } } } },
      });
      const credential = token?.userEmail.user.credentials[0];
      if (!token || !credential || token.purpose !== 'PASSWORD_RECOVERY' || token.consumedAt || token.invalidatedAt
        || token.expiresAt <= instant || token.issuedSecurityVersion !== token.userEmail.user.securityVersion
        || token.userEmail.retiredAt || !token.userEmail.primaryAt || !token.userEmail.verifiedAt
        || (token.userEmail.user.status !== 'ACTIVE' && token.userEmail.user.status !== 'RECOVERY_LOCKED')) return null;
      return Object.freeze({
        userId: token.userEmail.userId,
        emailId: token.userEmailId,
        credentialId: credential.id,
        credentialVersion: credential.version,
        userVersion: token.userEmail.user.version,
        securityVersion: token.userEmail.user.securityVersion,
      });
    },

    async completePasswordRecovery(input: CompletePasswordRecoveryInput) {
      const completedAt = requireDate('completedAt', input.completedAt);
      try {
        return await runInDatabaseTransaction(client, async (transaction) => {
        const token = await transaction.identityToken.findUnique({
          where: { tokenDigest: requireDigest('tokenDigest', input.tokenDigest) },
          include: { userEmail: { include: { user: true } } },
        });
        const credential = await transaction.credential.findUnique({ where: { id: requireUuid('credentialId', input.credentialId) } });
        if (!token || !credential || token.purpose !== 'PASSWORD_RECOVERY' || token.consumedAt || token.invalidatedAt
          || token.expiresAt <= completedAt || token.userEmailId !== input.emailId || token.userEmail.userId !== input.userId
          || token.issuedSecurityVersion !== input.securityVersion || token.userEmail.user.securityVersion !== input.securityVersion
          || token.userEmail.user.version !== input.userVersion || token.userEmail.retiredAt || !token.userEmail.primaryAt || !token.userEmail.verifiedAt
          || (token.userEmail.user.status !== 'ACTIVE' && token.userEmail.user.status !== 'RECOVERY_LOCKED')
          || credential.userId !== input.userId || credential.type !== 'PASSWORD' || credential.revokedAt || credential.version !== input.credentialVersion) return false;
        const consumed = await transaction.identityToken.updateMany({ where: { id: token.id, consumedAt: null, invalidatedAt: null, expiresAt: { gt: completedAt } }, data: { consumedAt: completedAt } });
        if (consumed.count !== 1) return false;
        const containment = await transaction.user.updateMany({
          where: { id: input.userId, version: input.userVersion, securityVersion: input.securityVersion, status: { in: ['ACTIVE', 'RECOVERY_LOCKED'] } },
          data: { status: 'RECOVERY_LOCKED', statusReasonCode: 'RECOVERY_PROOF_ACCEPTED', version: { increment: 1 }, lastTransitionAt: completedAt, lastTransitionId: requireUuid('containmentTransitionId', input.containmentTransitionId), updatedAt: completedAt },
        });
        if (containment.count !== 1) throw new IdentityProofAuthorityChangedError();
        const encodedHash = input.encodedHash.trim();
        if (encodedHash.length < 20) throw new Error('encodedHash must contain encoded hash metadata');
        const rotated = await transaction.credential.updateMany({
          where: { id: input.credentialId, userId: input.userId, type: 'PASSWORD', revokedAt: null, version: input.credentialVersion },
          data: { encodedHash, hashAlgorithm: requireCode('hashAlgorithm', input.hashAlgorithm), hashPolicyVersion: requirePositiveInteger('hashPolicyVersion', input.hashPolicyVersion), rotatedAt: completedAt, version: { increment: 1 } },
        });
        if (rotated.count !== 1) throw new IdentityProofAuthorityChangedError();
        await transaction.session.updateMany({
          where: { userId: input.userId, status: { in: ['ACTIVE', 'STEP_UP_REQUIRED'] }, revokedAt: null },
          data: { status: 'REVOKED', revokedAt: completedAt, revocationCode: 'PASSWORD_RECOVERED', statusReasonCode: 'PASSWORD_RECOVERED', version: { increment: 1 }, lastTransitionAt: completedAt, lastTransitionId: input.transitionId, updatedAt: completedAt },
        });
        await transaction.identityToken.updateMany({
          where: { userEmail: { userId: input.userId }, id: { not: token.id }, consumedAt: null, invalidatedAt: null },
          data: { invalidatedAt: completedAt, invalidationCode: 'SECURITY_VERSION_CHANGED' },
        });
        const completed = await transaction.user.updateMany({
          where: { id: input.userId, version: input.userVersion + 1, securityVersion: input.securityVersion, status: 'RECOVERY_LOCKED' },
          data: { status: 'ACTIVE', statusReasonCode: 'PASSWORD_RECOVERY_COMPLETED', version: { increment: 1 }, securityVersion: { increment: 1 }, lastTransitionAt: completedAt, lastTransitionId: requireUuid('transitionId', input.transitionId), updatedAt: completedAt },
        });
        if (completed.count !== 1) throw new IdentityProofAuthorityChangedError();
        await transaction.recoveryAttempt.create({
          data: {
            id: requireUuid('recoveryAttemptId', input.recoveryAttemptId), userId: input.userId,
            subjectDigest: requireDigest('subjectDigest', input.subjectDigest), correlationId: requireText('correlationId', input.correlationId, 200),
            methodCode: 'EMAIL_LINK', outcomeCode: 'RECOVERY_COMPLETED', assuranceEvidenceCode: 'ONE_TIME_EMAIL_PROOF', containmentCode: 'ALL_SESSIONS_REVOKED', occurredAt: completedAt,
          },
        });
        await enqueueSecurityNotice(transaction, {
          eventId: input.noticeEventId, userEmailId: input.emailId, userVersion: input.userVersion + 2,
          eventCode: 'PASSWORD_RECOVERED', correlationId: input.correlationId, occurredAt: completedAt,
        });
        return true;
        });
      } catch (error) {
        if (error instanceof IdentityProofAuthorityChangedError) return false;
        throw error;
      }
    },

    async recordRecoveryAttempt(input: RecordRecoveryAttemptInput) {
      const attempt = await client.recoveryAttempt.create({
        data: {
          id: requireUuid('recovery attempt id', input.id),
          userId: input.userId ? requireUuid('userId', input.userId) : null,
          subjectDigest: requireDigest('subjectDigest', input.subjectDigest),
          correlationId: requireText('correlationId', input.correlationId, 200),
          methodCode: requireCode('methodCode', input.methodCode),
          outcomeCode: requireCode('outcomeCode', input.outcomeCode),
          assuranceEvidenceCode: optionalCode('assuranceEvidenceCode', input.assuranceEvidenceCode),
          containmentCode: optionalCode('containmentCode', input.containmentCode),
          occurredAt: requireDate('occurredAt', input.occurredAt),
        },
      });
      return mapRecoveryAttempt(attempt);
    },
  });
}
