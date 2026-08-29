export const ACCOUNT_STATUSES = [
  'PENDING_EMAIL',
  'ACTIVE',
  'RECOVERY_LOCKED',
  'COMPROMISED_LOCKED',
  'SUSPENDED',
  'DEACTIVATION_REQUESTED',
  'DEACTIVATED',
] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const SESSION_STATUSES = ['ACTIVE', 'STEP_UP_REQUIRED', 'REVOKED', 'EXPIRED'] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const AUTHENTICATION_ASSURANCE_LEVELS = [
  'ANONYMOUS',
  'AUTHENTICATED',
  'CONTACT_VERIFIED',
  'RECENTLY_AUTHENTICATED',
  'MFA_VERIFIED',
  'PRIVILEGED_MFA_RECENT',
] as const;
export type AuthenticationAssurance = (typeof AUTHENTICATION_ASSURANCE_LEVELS)[number];

export const IDENTITY_TOKEN_PURPOSES = ['EMAIL_VERIFICATION', 'PASSWORD_RECOVERY'] as const;
export type IdentityTokenPurpose = (typeof IDENTITY_TOKEN_PURPOSES)[number];

export interface UserIdentityRecord {
  readonly id: string;
  readonly publicReference: string;
  readonly status: AccountStatus;
  readonly displayName: string;
  readonly locale: string;
  readonly version: number;
  readonly securityVersion: number;
  readonly lastTransitionAt: Date;
  readonly lastTransitionId: string;
  readonly statusReasonCode: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deactivatedAt: Date | null;
}

export interface UserEmailRecord {
  readonly id: string;
  readonly userId: string;
  readonly displayEmail: string;
  readonly normalizedEmail: string;
  readonly verifiedAt: Date | null;
  readonly primaryAt: Date | null;
  readonly retiredAt: Date | null;
}

export interface CreateUserIdentityInput {
  readonly id: string;
  readonly publicReference: string;
  readonly displayName: string;
  readonly locale?: string;
  readonly transitionId: string;
  readonly occurredAt: Date;
  readonly email: {
    readonly id: string;
    readonly displayEmail: string;
    readonly primary: boolean;
  };
}

export interface PasswordCredentialRecord {
  readonly id: string;
  readonly userId: string;
  readonly encodedHash: string;
  readonly hashAlgorithm: string;
  readonly hashPolicyVersion: number;
  readonly version: number;
  readonly createdAt: Date;
  readonly rotatedAt: Date | null;
  readonly revokedAt: Date | null;
}

export interface StorePasswordCredentialInput {
  readonly id: string;
  readonly userId: string;
  readonly encodedHash: string;
  readonly hashAlgorithm: string;
  readonly hashPolicyVersion: number;
  readonly createdAt: Date;
}

export interface SessionRecord {
  readonly id: string;
  readonly userId: string;
  readonly tokenDigest: string;
  readonly status: SessionStatus;
  readonly assurance: AuthenticationAssurance;
  readonly issuedSecurityVersion: number;
  readonly issuedAt: Date;
  readonly lastUsedAt: Date;
  readonly idleExpiresAt: Date;
  readonly absoluteExpiresAt: Date;
  readonly revokedAt: Date | null;
  readonly revocationCode: string | null;
  readonly deviceLabel: string;
  readonly clientFamily: string | null;
  readonly version: number;
  readonly lastTransitionAt: Date;
  readonly lastTransitionId: string;
}

export interface CreateSessionInput {
  readonly id: string;
  readonly userId: string;
  readonly tokenDigest: string;
  readonly assurance: Exclude<AuthenticationAssurance, 'ANONYMOUS'>;
  readonly issuedSecurityVersion: number;
  readonly issuedAt: Date;
  readonly idleExpiresAt: Date;
  readonly absoluteExpiresAt: Date;
  readonly deviceLabel: string;
  readonly clientFamily?: string;
  readonly transitionId: string;
}

export interface RevokeSessionInput {
  readonly sessionId: string;
  readonly expectedVersion: number;
  readonly revokedAt: Date;
  readonly revocationCode: string;
  readonly transitionId: string;
}

export interface IdentityTokenRecord {
  readonly id: string;
  readonly userEmailId: string;
  readonly purpose: IdentityTokenPurpose;
  readonly tokenDigest: string;
  readonly issuedSecurityVersion: number;
  readonly issuedAt: Date;
  readonly expiresAt: Date;
  readonly consumedAt: Date | null;
  readonly invalidatedAt: Date | null;
  readonly invalidationCode: string | null;
  readonly replacedByTokenId: string | null;
}

export interface IssueIdentityTokenInput {
  readonly id: string;
  readonly userEmailId: string;
  readonly purpose: IdentityTokenPurpose;
  readonly tokenDigest: string;
  readonly issuedSecurityVersion: number;
  readonly issuedAt: Date;
  readonly expiresAt: Date;
}

export interface ConsumeIdentityTokenInput {
  readonly tokenDigest: string;
  readonly purpose: IdentityTokenPurpose;
  readonly consumedAt: Date;
}

export interface RecoveryAttemptRecord {
  readonly id: string;
  readonly userId: string | null;
  readonly subjectDigest: string;
  readonly correlationId: string;
  readonly methodCode: string;
  readonly outcomeCode: string;
  readonly assuranceEvidenceCode: string | null;
  readonly containmentCode: string | null;
  readonly occurredAt: Date;
}

export type RecordRecoveryAttemptInput = RecoveryAttemptRecord;

export interface IdentityPersistence {
  createUserIdentity(input: CreateUserIdentityInput): Promise<{
    readonly user: UserIdentityRecord;
    readonly email: UserEmailRecord;
  }>;
  findUserById(userId: string): Promise<UserIdentityRecord | null>;
  findUserByNormalizedEmail(email: string): Promise<UserIdentityRecord | null>;
  storePasswordCredential(input: StorePasswordCredentialInput): Promise<PasswordCredentialRecord>;
  readActivePasswordCredential(userId: string): Promise<PasswordCredentialRecord | null>;
  createSession(input: CreateSessionInput): Promise<SessionRecord>;
  resolveActiveSessionCandidate(tokenDigest: string, at: Date): Promise<SessionRecord | null>;
  revokeSession(input: RevokeSessionInput): Promise<SessionRecord | null>;
  issueIdentityToken(input: IssueIdentityTokenInput): Promise<IdentityTokenRecord>;
  consumeIdentityToken(input: ConsumeIdentityTokenInput): Promise<IdentityTokenRecord | null>;
  recordRecoveryAttempt(input: RecordRecoveryAttemptInput): Promise<RecoveryAttemptRecord>;
}
