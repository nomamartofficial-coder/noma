import type { SessionRecord, UserIdentityRecord } from './contracts.js';

export type MfaProofMethod = 'TOTP' | 'RECOVERY_CODE';
export type MfaStepUpRequirement = 'RECENT_AUTH' | 'MFA' | 'MFA_AND_RECENT';
export type MfaFactorState = 'PENDING_ENROLLMENT' | 'ACTIVE' | 'REPLACED' | 'REVOKED';

export interface MfaFactorRecord {
  readonly id: string;
  readonly userId: string;
  readonly status: MfaFactorState;
  readonly encryptedSeedEnvelope: unknown;
  readonly algorithm: 'SHA1';
  readonly digits: 6;
  readonly periodSeconds: 30;
  readonly lastAcceptedTimeStep: bigint | null;
  readonly enrollmentExpiresAt: Date;
  readonly activatedAt: Date | null;
  readonly version: number;
}

export interface MfaSessionContext {
  readonly user: UserIdentityRecord;
  readonly session: SessionRecord;
  readonly verifiedEmailId: string | null;
  readonly passwordCredential: Readonly<{ encodedHash: string; version: number }> | null;
  readonly activeFactor: MfaFactorRecord | null;
  readonly pendingFactor: MfaFactorRecord | null;
}

export interface MfaStepUpChallengeRecord {
  readonly id: string;
  readonly sessionId: string;
  readonly requirement: MfaStepUpRequirement;
  readonly contextCode: string;
  readonly issuedSecurityVersion: number;
  readonly passwordProvenAt: Date | null;
  readonly mfaProvenAt: Date | null;
  readonly mfaMethod: MfaProofMethod | null;
  readonly mfaFactorId: string | null;
  readonly issuedAt: Date;
  readonly expiresAt: Date;
  readonly completedAt: Date | null;
  readonly invalidatedAt: Date | null;
  readonly version: number;
}

export interface MfaAuthorityPersistence {
  readSession(tokenDigest: string, at: Date): Promise<MfaSessionContext | null>;
  recordPasswordProof(input: { readonly tokenDigest: string; readonly userId: string; readonly securityVersion: number; readonly credentialVersion: number; readonly at: Date; readonly transitionId: string }): Promise<boolean>;
  startPendingFactor(input: {
    readonly factorId: string; readonly tokenDigest: string; readonly userId: string;
    readonly securityVersion: number; readonly encryptedSeedEnvelope: unknown;
    readonly at: Date; readonly expiresAt: Date;
  }): Promise<boolean>;
  confirmPendingFactor(input: {
    readonly factorId: string; readonly factorVersion: number; readonly tokenDigest: string;
    readonly userId: string; readonly securityVersion: number; readonly matchedTimeStep: bigint;
    readonly at: Date; readonly successorSessionId: string; readonly successorTokenDigest: string;
    readonly transitionId: string; readonly recoveryBatchId: string;
    readonly recoveryCodes: readonly Readonly<{ id: string; digest: string }>[];
    readonly noticeEventId: string; readonly correlationId: string;
  }): Promise<boolean>;
  createStepUpChallenge(input: {
    readonly challengeId: string; readonly tokenDigest: string; readonly userId: string;
    readonly securityVersion: number; readonly requirement: MfaStepUpRequirement;
    readonly contextCode: string; readonly at: Date; readonly expiresAt: Date;
    readonly transitionId: string;
  }): Promise<MfaStepUpChallengeRecord | null>;
  readStepUpChallenge(sessionId: string, at: Date): Promise<MfaStepUpChallengeRecord | null>;
  recordTotpProof(input: {
    readonly tokenDigest: string; readonly userId: string; readonly securityVersion: number;
    readonly factorId: string; readonly factorVersion: number; readonly matchedTimeStep: bigint;
    readonly at: Date; readonly transitionId: string;
  }): Promise<boolean>;
  consumeRecoveryCodeProof(input: {
    readonly tokenDigest: string; readonly userId: string; readonly securityVersion: number;
    readonly factorId: string; readonly codeDigest: string; readonly at: Date; readonly transitionId: string;
  }): Promise<boolean>;
  completeStepUpChallenge(input: {
    readonly tokenDigest: string; readonly userId: string; readonly securityVersion: number;
    readonly challengeId: string; readonly challengeVersion: number;
    readonly successorSessionId: string; readonly successorTokenDigest: string;
    readonly at: Date; readonly transitionId: string;
  }): Promise<boolean>;
  removeActiveFactor(input: {
    readonly tokenDigest: string; readonly userId: string; readonly securityVersion: number;
    readonly factorId: string; readonly factorVersion: number; readonly at: Date;
    readonly transitionId: string; readonly noticeEventId: string; readonly correlationId: string;
  }): Promise<boolean>;
  regenerateRecoveryCodeBatch(input: {
    readonly tokenDigest: string; readonly userId: string; readonly securityVersion: number;
    readonly factorId: string; readonly factorVersion: number; readonly at: Date;
    readonly successorSessionId: string; readonly successorTokenDigest: string;
    readonly transitionId: string; readonly batchId: string;
    readonly codes: readonly Readonly<{ id: string; digest: string }>[];
    readonly noticeEventId: string; readonly correlationId: string;
  }): Promise<boolean>;
}
