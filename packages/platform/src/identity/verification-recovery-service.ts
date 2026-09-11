import type {
  IdentityAuthRateLimiter,
  PasswordHasher,
  PasswordPolicy,
  SessionTokenIssuer,
} from './authentication.js';
import { AuthenticationFailure } from './authentication.js';
import type { IdentityPersistence, IdentityTokenPurpose } from './contracts.js';
import { normalizeIdentityEmail } from './normalization.js';

export interface IdentityProofTokenIssuer {
  issue(): Readonly<{ rawToken: string; tokenDigest: string }>;
  digest(rawToken: string): string;
}

export interface IdentityVerificationRecoveryOptions {
  readonly now?: () => Date;
  readonly nextUuid: () => string;
  readonly tokenTtlMilliseconds: number;
  readonly recordSecurityEvent?: (
    event: string,
    outcome: 'succeeded' | 'failed' | 'unavailable',
    fields?: Readonly<Record<string, string | number | boolean>>,
  ) => void;
}

export interface IdentityVerificationRecoveryPorts {
  readonly persistence: IdentityPersistence;
  readonly passwordPolicy: PasswordPolicy;
  readonly passwordHasher: PasswordHasher;
  readonly proofTokens: IdentityProofTokenIssuer;
  readonly sessionTokens: SessionTokenIssuer;
  readonly rateLimiter: IdentityAuthRateLimiter;
}

export class IdentityProofFailure extends Error {
  readonly code: 'VERIFICATION_LINK_INVALID' | 'RECOVERY_LINK_INVALID';
  constructor(code: IdentityProofFailure['code']) {
    super(code);
    this.name = 'IdentityProofFailure';
    this.code = code;
  }
}

export class IdentityVerificationRecoveryService {
  readonly #ports: IdentityVerificationRecoveryPorts;
  readonly #options: IdentityVerificationRecoveryOptions;

  constructor(ports: IdentityVerificationRecoveryPorts, options: IdentityVerificationRecoveryOptions) {
    if (!Number.isSafeInteger(options.tokenTtlMilliseconds) || options.tokenTtlMilliseconds !== 30 * 60_000) {
      throw new Error('identity proof TTL must be exactly 30 minutes');
    }
    this.#ports = ports;
    this.#options = options;
  }

  async requestEmailVerification(input: { readonly email: string; readonly networkSignal: string; readonly correlationId: string }): Promise<Readonly<{ status: 'REQUEST_ACCEPTED' }>> {
    await this.#request('EMAIL_VERIFICATION', input);
    return Object.freeze({ status: 'REQUEST_ACCEPTED' });
  }

  async requestPasswordRecovery(input: { readonly email: string; readonly networkSignal: string; readonly correlationId: string }): Promise<Readonly<{ status: 'REQUEST_ACCEPTED' }>> {
    await this.#request('PASSWORD_RECOVERY', input);
    return Object.freeze({ status: 'REQUEST_ACCEPTED' });
  }

  async confirmEmailVerification(input: { readonly rawToken: string; readonly networkSignal: string; readonly presentedSessionToken?: string }): Promise<Readonly<{ status: 'EMAIL_VERIFIED' }>> {
    let digest: string;
    try { digest = this.#ports.proofTokens.digest(input.rawToken); } catch { throw new IdentityProofFailure('VERIFICATION_LINK_INVALID'); }
    await this.#limit('EMAIL_VERIFICATION_CONFIRM', digest, input.networkSignal);
    const now = this.#now();
    let presentedSessionTokenDigest: string | undefined;
    if (input.presentedSessionToken) {
      try { presentedSessionTokenDigest = this.#ports.sessionTokens.digest(input.presentedSessionToken); } catch { presentedSessionTokenDigest = undefined; }
    }
    const result = await this.#ports.persistence.confirmEmailVerification({
      tokenDigest: digest,
      verifiedAt: now,
      transitionId: this.#options.nextUuid(),
      noticeEventId: this.#options.nextUuid(),
      correlationId: this.#options.nextUuid(),
      ...(presentedSessionTokenDigest ? { presentedSessionTokenDigest } : {}),
    });
    if (!result) {
      this.#record('identity.email_verification.failed', 'failed');
      throw new IdentityProofFailure('VERIFICATION_LINK_INVALID');
    }
    this.#record('identity.email_verification.completed', 'succeeded', { currentSessionElevated: Boolean(result.elevatedSessionId) });
    return Object.freeze({ status: 'EMAIL_VERIFIED' });
  }

  async completePasswordRecovery(input: { readonly rawToken: string; readonly newPassword: string; readonly networkSignal: string; readonly correlationId: string }): Promise<Readonly<{ status: 'PASSWORD_RECOVERED' }>> {
    let digest: string;
    try { digest = this.#ports.proofTokens.digest(input.rawToken); } catch { throw new IdentityProofFailure('RECOVERY_LINK_INVALID'); }
    await this.#limit('PASSWORD_RECOVERY_COMPLETE', digest, input.networkSignal);
    const preflight = await this.#ports.persistence.preflightPasswordRecovery(digest, this.#now());
    if (!preflight) {
      this.#record('identity.password_recovery.failed', 'failed');
      throw new IdentityProofFailure('RECOVERY_LINK_INVALID');
    }
    const password = this.#ports.passwordPolicy.validate(input.newPassword);
    const encodedHash = await this.#ports.passwordHasher.hash(password);
    const completedAt = this.#now();
    const completed = await this.#ports.persistence.completePasswordRecovery({
      ...preflight,
      tokenDigest: digest,
      encodedHash,
      hashAlgorithm: this.#ports.passwordHasher.algorithm,
      hashPolicyVersion: this.#ports.passwordHasher.policyVersion,
      completedAt,
      transitionId: this.#options.nextUuid(),
      containmentTransitionId: this.#options.nextUuid(),
      noticeEventId: this.#options.nextUuid(),
      recoveryAttemptId: this.#options.nextUuid(),
      subjectDigest: digest,
      correlationId: input.correlationId,
    });
    if (!completed) {
      this.#record('identity.password_recovery.failed', 'failed');
      throw new IdentityProofFailure('RECOVERY_LINK_INVALID');
    }
    this.#record('identity.password_recovery.completed', 'succeeded');
    return Object.freeze({ status: 'PASSWORD_RECOVERED' });
  }

  async #request(purpose: IdentityTokenPurpose, input: { readonly email: string; readonly networkSignal: string; readonly correlationId: string }): Promise<void> {
    const normalizedEmail = normalizeIdentityEmail(input.email);
    await this.#limit(purpose === 'EMAIL_VERIFICATION' ? 'EMAIL_VERIFICATION_REQUEST' : 'PASSWORD_RECOVERY_REQUEST', normalizedEmail, input.networkSignal);
    const occurredAt = this.#now();
    await this.#ports.persistence.requestIdentityDelivery({
      eventId: this.#options.nextUuid(),
      correlationId: input.correlationId,
      occurredAt,
      purpose,
      normalizedEmail,
    });
    this.#record(
      purpose === 'EMAIL_VERIFICATION' ? 'identity.email_verification.requested' : 'identity.password_recovery.requested',
      'succeeded',
    );
  }

  async #limit(action: Parameters<IdentityAuthRateLimiter['check']>[0]['action'], subject: string, networkSignal: string): Promise<void> {
    try {
      const decision = await this.#ports.rateLimiter.check({ action, normalizedEmail: subject, networkSignal });
      if (!decision.allowed) throw new AuthenticationFailure('AUTH_RATE_LIMITED', decision.retryAfterSeconds);
    } catch (error) {
      if (error instanceof AuthenticationFailure) throw error;
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
