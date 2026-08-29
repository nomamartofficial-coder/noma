import {
  normalizeIdentityEmail,
  type ConsumeIdentityTokenInput,
  type CreateSessionInput,
  type CreateUserIdentityInput,
  type IdentityPersistence,
  type IdentityTokenPurpose,
  type IdentityTokenRecord,
  type IssueIdentityTokenInput,
  type PasswordCredentialRecord,
  type RecordRecoveryAttemptInput,
  type RecoveryAttemptRecord,
  type RevokeSessionInput,
  type SessionRecord,
  type StorePasswordCredentialInput,
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
import { runInDatabaseTransaction } from './transaction.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,79}$/;
const PUBLIC_REFERENCE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{5,31}$/;

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

function validateTokenPurpose(value: IdentityTokenPurpose): IdentityTokenPurpose {
  if (value !== 'EMAIL_VERIFICATION' && value !== 'PASSWORD_RECOVERY') {
    throw new Error('identity token purpose is unsupported');
  }
  return value;
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

    async createSession(input: CreateSessionInput) {
      const issuedAt = requireDate('issuedAt', input.issuedAt);
      const idleExpiresAt = requireDate('idleExpiresAt', input.idleExpiresAt);
      const absoluteExpiresAt = requireDate('absoluteExpiresAt', input.absoluteExpiresAt);
      if (idleExpiresAt <= issuedAt || absoluteExpiresAt < idleExpiresAt) {
        throw new Error('session expiry instants are inconsistent');
      }
      const session = await client.session.create({
        data: {
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
        },
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
