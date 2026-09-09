import type { AccountStatus, AuthenticatedSessionRecord, IdentityPersistence } from './contracts.js';
import { normalizeIdentityEmail } from './normalization.js';

export const PASSWORD_SIGN_IN_ACCOUNT_STATUSES = ['PENDING_EMAIL', 'ACTIVE'] as const satisfies readonly AccountStatus[];
export const AUTH_RATE_LIMIT_ACTIONS = ['REGISTER', 'SIGN_IN'] as const;
export type AuthRateLimitAction = (typeof AUTH_RATE_LIMIT_ACTIONS)[number];

export interface PasswordPolicy {
  validate(password: string): string;
}

export interface PasswordHasher {
  readonly algorithm: 'ARGON2ID';
  readonly policyVersion: number;
  hash(password: string): Promise<string>;
  verify(encodedHash: string, password: string): Promise<boolean>;
  needsRehash(encodedHash: string, storedPolicyVersion: number): boolean;
}

export interface SessionTokenPair {
  readonly rawToken: string;
  readonly tokenDigest: string;
}

export interface SessionTokenIssuer {
  issue(): SessionTokenPair;
  digest(rawToken: string): string;
}

export interface IdentityAuthRateLimitInput {
  readonly action: AuthRateLimitAction;
  readonly normalizedEmail: string;
  readonly networkSignal: string;
}

export interface IdentityAuthRateLimitDecision {
  readonly allowed: boolean;
  readonly retryAfterSeconds: number;
}

export interface IdentityAuthRateLimiter {
  check(input: IdentityAuthRateLimitInput): Promise<IdentityAuthRateLimitDecision>;
  close(): Promise<void>;
}

export interface AuthenticationPrincipal {
  readonly userId: string;
  readonly sessionId: string;
  readonly accountStatus: AccountStatus;
  readonly assurance: AuthenticatedSessionRecord['session']['assurance'];
  readonly issuedAt: Date;
  readonly idleExpiresAt: Date;
  readonly absoluteExpiresAt: Date;
}

export interface IdentityAuthenticationPorts {
  readonly persistence: IdentityPersistence;
  readonly passwordPolicy: PasswordPolicy;
  readonly passwordHasher: PasswordHasher;
  readonly sessionTokens: SessionTokenIssuer;
  readonly rateLimiter: IdentityAuthRateLimiter;
}

export class IdentityRegistrationConflictError extends Error {
  constructor() {
    super('an identity already owns the normalized email');
    this.name = 'IdentityRegistrationConflictError';
  }
}

export type AuthenticationFailureCode =
  | 'AUTH_RATE_LIMITED'
  | 'AUTH_DEPENDENCY_UNAVAILABLE'
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_UNAVAILABLE'
  | 'INVALID_SESSION';

export class AuthenticationFailure extends Error {
  readonly code: AuthenticationFailureCode;
  readonly retryAfterSeconds: number | undefined;

  constructor(code: AuthenticationFailureCode, retryAfterSeconds?: number) {
    super(code);
    this.name = 'AuthenticationFailure';
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export interface IdentityAuthenticationOptions {
  readonly idleMilliseconds: number;
  readonly absoluteMilliseconds: number;
  readonly touchAfterMilliseconds: number;
  readonly now?: () => Date;
  readonly nextUuid: () => string;
  readonly nextPublicReference: () => string;
  readonly recordSecurityEvent?: (
    event: string,
    outcome: 'succeeded' | 'failed' | 'unavailable',
    fields?: Readonly<Record<string, string | number | boolean>>,
  ) => void;
}

export interface RegisterPasswordInput {
  readonly email: string;
  readonly password: string;
  readonly displayName: string;
  readonly locale?: string;
  readonly networkSignal: string;
}

export interface SignInPasswordInput {
  readonly email: string;
  readonly password: string;
  readonly networkSignal: string;
  readonly presentedSessionToken?: string;
  readonly deviceLabel: string;
  readonly clientFamily?: string;
}

export interface SignInPasswordResult {
  readonly rawSessionToken: string;
  readonly principal: AuthenticationPrincipal;
}

export class IdentityAuthenticationService {
  readonly #ports: IdentityAuthenticationPorts;
  readonly #options: IdentityAuthenticationOptions;
  readonly #dummyEncodedHash: string;

  private constructor(ports: IdentityAuthenticationPorts, options: IdentityAuthenticationOptions, dummyEncodedHash: string) {
    this.#ports = ports;
    this.#options = options;
    this.#dummyEncodedHash = dummyEncodedHash;
  }

  static async create(ports: IdentityAuthenticationPorts, options: IdentityAuthenticationOptions): Promise<IdentityAuthenticationService> {
    if (options.idleMilliseconds < 60_000 || options.absoluteMilliseconds < options.idleMilliseconds) {
      throw new Error('session duration policy is invalid');
    }
    if (options.touchAfterMilliseconds < 60_000 || options.touchAfterMilliseconds >= options.idleMilliseconds) {
      throw new Error('session touch policy is invalid');
    }
    const dummyEncodedHash = await ports.passwordHasher.hash('synthetic unknown identity verifier 2026');
    return new IdentityAuthenticationService(ports, options, dummyEncodedHash);
  }

  async register(input: RegisterPasswordInput): Promise<Readonly<{ status: 'REQUEST_ACCEPTED' }>> {
    const normalizedEmail = normalizeIdentityEmail(input.email);
    await this.#enforceRateLimit('REGISTER', normalizedEmail, input.networkSignal);
    const password = this.#ports.passwordPolicy.validate(input.password);
    const encodedHash = await this.#ports.passwordHasher.hash(password);
    const occurredAt = this.#now();
    try {
      await this.#ports.persistence.registerPasswordIdentity({
        id: this.#options.nextUuid(),
        publicReference: this.#options.nextPublicReference(),
        displayName: input.displayName,
        ...(input.locale ? { locale: input.locale } : {}),
        transitionId: this.#options.nextUuid(),
        occurredAt,
        email: { id: this.#options.nextUuid(), displayEmail: input.email, primary: true },
        credential: {
          id: this.#options.nextUuid(),
          encodedHash,
          hashAlgorithm: this.#ports.passwordHasher.algorithm,
          hashPolicyVersion: this.#ports.passwordHasher.policyVersion,
          createdAt: occurredAt,
        },
      });
      this.#record('identity.registration.accepted', 'succeeded');
    } catch (error) {
      if (!(error instanceof IdentityRegistrationConflictError)) throw error;
      this.#record('identity.registration.accepted', 'succeeded', { duplicateSuppressed: true });
    }
    return Object.freeze({ status: 'REQUEST_ACCEPTED' });
  }

  async signIn(input: SignInPasswordInput): Promise<SignInPasswordResult> {
    const normalizedEmail = normalizeIdentityEmail(input.email);
    await this.#enforceRateLimit('SIGN_IN', normalizedEmail, input.networkSignal);
    const candidate = await this.#ports.persistence.readPasswordAuthenticationCandidate(normalizedEmail);
    const validPassword = await this.#ports.passwordHasher.verify(
      candidate?.credential.encodedHash ?? this.#dummyEncodedHash,
      input.password.normalize('NFC'),
    );
    if (!candidate || !validPassword) {
      this.#record('identity.sign_in.failed', 'failed', { reason: 'INVALID_CREDENTIALS' });
      throw new AuthenticationFailure('INVALID_CREDENTIALS');
    }
    if (!accountAllowsPasswordSignIn(candidate.user.status)) {
      this.#record('identity.sign_in.failed', 'failed', { reason: 'ACCOUNT_UNAVAILABLE' });
      throw new AuthenticationFailure('ACCOUNT_UNAVAILABLE');
    }

    if (this.#ports.passwordHasher.needsRehash(candidate.credential.encodedHash, candidate.credential.hashPolicyVersion)) {
      const replacement = await this.#ports.passwordHasher.hash(input.password.normalize('NFC'));
      await this.#ports.persistence.replacePasswordCredentialHash({
        credentialId: candidate.credential.id,
        expectedVersion: candidate.credential.version,
        encodedHash: replacement,
        hashAlgorithm: this.#ports.passwordHasher.algorithm,
        hashPolicyVersion: this.#ports.passwordHasher.policyVersion,
        rotatedAt: this.#now(),
      });
    }

    const issuedAt = this.#now();
    const token = this.#ports.sessionTokens.issue();
    const absoluteExpiresAt = new Date(issuedAt.getTime() + this.#options.absoluteMilliseconds);
    const idleExpiresAt = new Date(Math.min(
      issuedAt.getTime() + this.#options.idleMilliseconds,
      absoluteExpiresAt.getTime(),
    ));
    const session = await this.#ports.persistence.rotatePasswordSession({
      session: {
        id: this.#options.nextUuid(),
        userId: candidate.user.id,
        tokenDigest: token.tokenDigest,
        assurance: 'AUTHENTICATED',
        issuedSecurityVersion: candidate.user.securityVersion,
        issuedAt,
        idleExpiresAt,
        absoluteExpiresAt,
        deviceLabel: input.deviceLabel,
        ...(input.clientFamily ? { clientFamily: input.clientFamily } : {}),
        transitionId: this.#options.nextUuid(),
      },
      ...(input.presentedSessionToken ? { replacedTokenDigest: this.#ports.sessionTokens.digest(input.presentedSessionToken) } : {}),
      revokedAt: issuedAt,
      revocationTransitionId: this.#options.nextUuid(),
    });
    this.#record('identity.sign_in.succeeded', 'succeeded');
    return Object.freeze({
      rawSessionToken: token.rawToken,
      principal: Object.freeze({
        userId: candidate.user.id,
        sessionId: session.id,
        accountStatus: candidate.user.status,
        assurance: session.assurance,
        issuedAt: session.issuedAt,
        idleExpiresAt: session.idleExpiresAt,
        absoluteExpiresAt: session.absoluteExpiresAt,
      }),
    });
  }

  async resolveSession(rawToken: string): Promise<AuthenticationPrincipal> {
    let tokenDigest: string;
    try {
      tokenDigest = this.#ports.sessionTokens.digest(rawToken);
    } catch {
      throw new AuthenticationFailure('INVALID_SESSION');
    }
    const now = this.#now();
    let record = await this.#ports.persistence.resolveAuthenticatedSession(tokenDigest, now);
    if (!record) throw new AuthenticationFailure('INVALID_SESSION');
    if (now.getTime() - record.session.lastUsedAt.getTime() >= this.#options.touchAfterMilliseconds) {
      const idleExpiresAt = new Date(Math.min(
        now.getTime() + this.#options.idleMilliseconds,
        record.session.absoluteExpiresAt.getTime(),
      ));
      const touched = await this.#ports.persistence.touchSession({
        sessionId: record.session.id,
        expectedVersion: record.session.version,
        touchedAt: now,
        idleExpiresAt,
        transitionId: this.#options.nextUuid(),
      });
      if (!touched) {
        record = await this.#ports.persistence.resolveAuthenticatedSession(tokenDigest, now);
        if (!record) throw new AuthenticationFailure('INVALID_SESSION');
      } else {
        record = Object.freeze({ ...record, session: touched });
      }
    }
    return toAuthenticationPrincipal(record);
  }

  async signOut(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    try {
      await this.#ports.persistence.revokeSessionByTokenDigest(
        this.#ports.sessionTokens.digest(rawToken),
        this.#now(),
        'USER_SIGN_OUT',
        this.#options.nextUuid(),
      );
      this.#record('identity.session.revoked', 'succeeded');
    } catch (error) {
      if (error instanceof Error && error.message === 'session token is malformed') return;
      throw error;
    }
  }

  async #enforceRateLimit(action: AuthRateLimitAction, normalizedEmail: string, networkSignal: string): Promise<void> {
    try {
      const decision = await this.#ports.rateLimiter.check({ action, normalizedEmail, networkSignal });
      if (!decision.allowed) {
        this.#record('identity.auth_rate_limit.triggered', 'failed', { action });
        throw new AuthenticationFailure('AUTH_RATE_LIMITED', decision.retryAfterSeconds);
      }
    } catch (error) {
      if (error instanceof AuthenticationFailure) throw error;
      this.#record('identity.auth_rate_limit.unavailable', 'unavailable', { action });
      throw new AuthenticationFailure('AUTH_DEPENDENCY_UNAVAILABLE');
    }
  }

  #now(): Date {
    const value = this.#options.now?.() ?? new Date();
    return new Date(value.getTime());
  }

  #record(event: string, outcome: 'succeeded' | 'failed' | 'unavailable', fields?: Readonly<Record<string, string | number | boolean>>): void {
    this.#options.recordSecurityEvent?.(event, outcome, fields);
  }
}

export function accountAllowsPasswordSignIn(status: AccountStatus): boolean {
  return PASSWORD_SIGN_IN_ACCOUNT_STATUSES.includes(status as 'PENDING_EMAIL' | 'ACTIVE');
}

export function toAuthenticationPrincipal(record: AuthenticatedSessionRecord): AuthenticationPrincipal {
  return Object.freeze({
    userId: record.user.id,
    sessionId: record.session.id,
    accountStatus: record.user.status,
    assurance: record.session.assurance,
    issuedAt: record.session.issuedAt,
    idleExpiresAt: record.session.idleExpiresAt,
    absoluteExpiresAt: record.session.absoluteExpiresAt,
  });
}
