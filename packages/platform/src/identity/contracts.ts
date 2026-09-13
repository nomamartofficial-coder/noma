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

export interface RegisterPasswordIdentityInput extends CreateUserIdentityInput {
  readonly credential: Omit<StorePasswordCredentialInput, 'userId'>;
  readonly verificationDelivery?: IdentityDeliveryIntent;
}

export interface RegisteredPasswordIdentity {
  readonly user: UserIdentityRecord;
  readonly email: UserEmailRecord;
  readonly credential: PasswordCredentialRecord;
}

export interface PasswordAuthenticationCandidate {
  readonly user: UserIdentityRecord;
  readonly credential: PasswordCredentialRecord;
  readonly emailVerified: boolean;
}

export interface ReplacePasswordCredentialHashInput {
  readonly credentialId: string;
  readonly expectedVersion: number;
  readonly encodedHash: string;
  readonly hashAlgorithm: string;
  readonly hashPolicyVersion: number;
  readonly rotatedAt: Date;
}

export interface SessionRecord {
  readonly id: string;
  readonly userId: string;
  readonly tokenDigest: string;
  readonly status: SessionStatus;
  readonly assurance: AuthenticationAssurance;
  readonly issuedSecurityVersion: number;
  readonly passwordAuthenticatedAt?: Date | null;
  readonly mfaVerifiedAt?: Date | null;
  readonly mfaMethod?: 'TOTP' | 'RECOVERY_CODE' | null;
  readonly mfaFactorId?: string | null;
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

export interface RotatePasswordSessionInput {
  readonly session: CreateSessionInput;
  readonly replacedTokenDigest?: string;
  readonly revokedAt: Date;
  readonly revocationTransitionId: string;
}

export interface TouchSessionInput {
  readonly sessionId: string;
  readonly expectedVersion: number;
  readonly touchedAt: Date;
  readonly idleExpiresAt: Date;
  readonly transitionId: string;
}

export interface AuthenticatedSessionRecord {
  readonly session: SessionRecord;
  readonly user: UserIdentityRecord;
  readonly contactVerified?: boolean;
  readonly activeMfaFactorId?: string | null;
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

export interface IdentityDeliveryIntent {
  readonly eventId: string;
  readonly correlationId: string;
  readonly occurredAt: Date;
  readonly purpose: IdentityTokenPurpose;
}

export interface RequestIdentityDeliveryInput extends IdentityDeliveryIntent {
  readonly normalizedEmail: string;
}

export interface IdentityDeliveryCandidate {
  readonly user: UserIdentityRecord;
  readonly email: UserEmailRecord;
}

export interface IdentityEmailContact {
  readonly user: UserIdentityRecord;
  readonly email: UserEmailRecord;
}

export interface IssueReplacementIdentityTokenInput extends IssueIdentityTokenInput {}

export type IssueReplacementIdentityTokenResult =
  | { readonly disposition: 'issued'; readonly token: IdentityTokenRecord; readonly recipientAddress: string; readonly locale: string }
  | { readonly disposition: 'already-issued' }
  | { readonly disposition: 'superseded' }
  | { readonly disposition: 'ineligible' };

export interface ConfirmEmailVerificationInput {
  readonly tokenDigest: string;
  readonly verifiedAt: Date;
  readonly transitionId: string;
  readonly noticeEventId: string;
  readonly correlationId: string;
  readonly presentedSessionTokenDigest?: string;
}

export interface ConfirmEmailVerificationResult {
  readonly userId: string;
  readonly emailId: string;
  readonly elevatedSessionId: string | null;
}

export interface PasswordRecoveryPreflight {
  readonly userId: string;
  readonly emailId: string;
  readonly credentialId: string;
  readonly credentialVersion: number;
  readonly userVersion: number;
  readonly securityVersion: number;
}

export interface CompletePasswordRecoveryInput extends PasswordRecoveryPreflight {
  readonly tokenDigest: string;
  readonly encodedHash: string;
  readonly hashAlgorithm: string;
  readonly hashPolicyVersion: number;
  readonly completedAt: Date;
  readonly transitionId: string;
  readonly containmentTransitionId: string;
  readonly noticeEventId: string;
  readonly recoveryAttemptId: string;
  readonly subjectDigest: string;
  readonly correlationId: string;
}

export interface IdentityPersistence {
  createUserIdentity(input: CreateUserIdentityInput): Promise<{
    readonly user: UserIdentityRecord;
    readonly email: UserEmailRecord;
  }>;
  findUserById(userId: string): Promise<UserIdentityRecord | null>;
  findUserByNormalizedEmail(email: string): Promise<UserIdentityRecord | null>;
  storePasswordCredential(input: StorePasswordCredentialInput): Promise<PasswordCredentialRecord>;
  readActivePasswordCredential(userId: string): Promise<PasswordCredentialRecord | null>;
  registerPasswordIdentity(input: RegisterPasswordIdentityInput): Promise<RegisteredPasswordIdentity>;
  readPasswordAuthenticationCandidate(normalizedEmail: string): Promise<PasswordAuthenticationCandidate | null>;
  replacePasswordCredentialHash(input: ReplacePasswordCredentialHashInput): Promise<PasswordCredentialRecord | null>;
  createSession(input: CreateSessionInput): Promise<SessionRecord>;
  resolveActiveSessionCandidate(tokenDigest: string, at: Date): Promise<SessionRecord | null>;
  resolveAuthenticatedSession(tokenDigest: string, at: Date): Promise<AuthenticatedSessionRecord | null>;
  rotatePasswordSession(input: RotatePasswordSessionInput): Promise<SessionRecord>;
  touchSession(input: TouchSessionInput): Promise<SessionRecord | null>;
  revokeSessionByTokenDigest(tokenDigest: string, revokedAt: Date, revocationCode: string, transitionId: string): Promise<boolean>;
  revokeSession(input: RevokeSessionInput): Promise<SessionRecord | null>;
  issueIdentityToken(input: IssueIdentityTokenInput): Promise<IdentityTokenRecord>;
  requestIdentityDelivery(input: RequestIdentityDeliveryInput): Promise<boolean>;
  readIdentityDeliveryCandidate(userEmailId: string, purpose: IdentityTokenPurpose): Promise<IdentityDeliveryCandidate | null>;
  issueReplacementIdentityToken(input: IssueReplacementIdentityTokenInput): Promise<IssueReplacementIdentityTokenResult>;
  invalidateIdentityToken(tokenId: string, invalidatedAt: Date, code: string): Promise<boolean>;
  readIdentityEmailContact(userEmailId: string): Promise<IdentityEmailContact | null>;
  consumeIdentityToken(input: ConsumeIdentityTokenInput): Promise<IdentityTokenRecord | null>;
  confirmEmailVerification(input: ConfirmEmailVerificationInput): Promise<ConfirmEmailVerificationResult | null>;
  preflightPasswordRecovery(tokenDigest: string, at: Date): Promise<PasswordRecoveryPreflight | null>;
  completePasswordRecovery(input: CompletePasswordRecoveryInput): Promise<boolean>;
  recordRecoveryAttempt(input: RecordRecoveryAttemptInput): Promise<RecoveryAttemptRecord>;
}
