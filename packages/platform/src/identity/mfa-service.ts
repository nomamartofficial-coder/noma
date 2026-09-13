import type { EncryptionEnvironment } from '../encryption.js';
import { DEFAULT_ASSURANCE_FRESHNESS } from './assurance.js';
import type { IdentityAuthRateLimiter, PasswordHasher, SessionTokenIssuer } from './authentication.js';
import type { MfaAuthorityPersistence, MfaSessionContext, MfaStepUpRequirement } from './mfa-contracts.js';

export type MfaFailureCode = 'MFA_PROOF_FAILED' | 'MFA_AUTHORITY_CHANGED' | 'MFA_UNAVAILABLE' | 'MFA_RATE_LIMITED' | 'MFA_RECOVERY_REVIEW_REQUIRED';

export class MfaFailure extends Error {
  constructor(readonly code: MfaFailureCode) {
    super(`MFA operation failed: ${code}`);
    this.name = 'MfaFailure';
  }
}

export interface MfaSeedProtector {
  encrypt(plaintext: Uint8Array, context: {
    readonly purpose: string; readonly environment: EncryptionEnvironment;
    readonly bindings: Readonly<Record<string, string>>;
  }): Promise<unknown>;
  decrypt(envelope: unknown, context: {
    readonly purpose: string; readonly environment: EncryptionEnvironment;
    readonly bindings: Readonly<Record<string, string>>;
  }): Promise<Buffer>;
}

export interface MfaCodeSource {
  createTotpSeed(): { readonly bytes: Buffer; readonly provisioningUri: string };
  matchTotpTimeStep(seed: Uint8Array, token: string, at: Date): bigint | null;
  generateRecoveryCodes(): readonly string[];
  digestRecoveryCode(code: string): string | null;
}

export interface MfaServicePorts {
  readonly persistence: MfaAuthorityPersistence;
  readonly passwordHasher: Pick<PasswordHasher, 'verify'>;
  readonly sessionTokens: SessionTokenIssuer;
  readonly rateLimiter: IdentityAuthRateLimiter;
  readonly protector: MfaSeedProtector;
  readonly codes: MfaCodeSource;
}

export interface MfaServiceOptions {
  readonly environment: EncryptionEnvironment;
  readonly now: () => Date;
  readonly nextUuid: () => string;
  readonly enrollmentLifetimeMilliseconds?: number;
  readonly challengeLifetimeMilliseconds?: number;
  readonly passwordFreshMilliseconds?: number;
  readonly mfaFreshMilliseconds?: number;
}

function seedContext(environment: EncryptionEnvironment, userId: string, factorId: string) {
  return Object.freeze({
    purpose: 'noma:mfa-seed', environment,
    bindings: Object.freeze({ userId, factorId, factorType: 'TOTP' }),
  });
}

function fresh(at: Date | null | undefined, now: Date, maxAge: number): boolean {
  if (!at) return false;
  const age = now.getTime() - at.getTime();
  return age >= 0 && age < maxAge;
}

export class PrivilegedMfaService {
  readonly #passwordFreshMs: number;
  readonly #mfaConfigurationFreshMs: number;
  constructor(readonly ports: MfaServicePorts, readonly options: MfaServiceOptions) {
    if (!['development', 'test', 'staging', 'production'].includes(options.environment)) throw new MfaFailure('MFA_UNAVAILABLE');
    this.#passwordFreshMs = options.passwordFreshMilliseconds ?? DEFAULT_ASSURANCE_FRESHNESS.passwordMaxAgeMilliseconds;
    const mfaFreshMs = options.mfaFreshMilliseconds ?? DEFAULT_ASSURANCE_FRESHNESS.mfaMaxAgeMilliseconds;
    if (!Number.isSafeInteger(this.#passwordFreshMs) || this.#passwordFreshMs < 60_000 || this.#passwordFreshMs > DEFAULT_ASSURANCE_FRESHNESS.passwordMaxAgeMilliseconds
      || !Number.isSafeInteger(mfaFreshMs) || mfaFreshMs < 60_000 || mfaFreshMs > DEFAULT_ASSURANCE_FRESHNESS.mfaMaxAgeMilliseconds) throw new MfaFailure('MFA_UNAVAILABLE');
    this.#mfaConfigurationFreshMs = Math.min(mfaFreshMs, 10 * 60_000);
  }

  async reauthenticatePassword(input: { readonly rawSessionToken: string; readonly password: string; readonly networkSignal: string }): Promise<void> {
    const { context, tokenDigest, now } = await this.#session(input.rawSessionToken);
    await this.#limit('PASSWORD_REAUTH', context, input.networkSignal);
    const credential = context.passwordCredential;
    if (!credential || !await this.ports.passwordHasher.verify(credential.encodedHash, input.password)) throw new MfaFailure('MFA_PROOF_FAILED');
    const recorded = await this.ports.persistence.recordPasswordProof({
      tokenDigest, userId: context.user.id, securityVersion: context.user.securityVersion,
      credentialVersion: credential.version, at: now, transitionId: this.options.nextUuid(),
    });
    if (!recorded) throw new MfaFailure('MFA_AUTHORITY_CHANGED');
  }

  /** Also handles controlled replacement when an active factor exists. */
  async startTotpEnrollment(input: { readonly rawSessionToken: string; readonly networkSignal: string }): Promise<Readonly<{ factorId: string; provisioningUri: string; expiresAt: string }>> {
    const { context, tokenDigest, now } = await this.#session(input.rawSessionToken);
    await this.#limit('MFA_FACTOR_REPLACE', context, input.networkSignal);
    if (!context.verifiedEmailId || !fresh(context.session.passwordAuthenticatedAt, now, this.#passwordFreshMs)) throw new MfaFailure('MFA_PROOF_FAILED');
    if (context.activeFactor && (context.session.mfaFactorId !== context.activeFactor.id
      || !fresh(context.session.mfaVerifiedAt, now, this.#mfaConfigurationFreshMs))) throw new MfaFailure('MFA_PROOF_FAILED');
    const factorId = this.options.nextUuid();
    const material = this.ports.codes.createTotpSeed();
    const expiresAt = new Date(now.getTime() + (this.options.enrollmentLifetimeMilliseconds ?? 10 * 60_000));
    try {
      let encryptedSeedEnvelope: unknown;
      try {
        encryptedSeedEnvelope = await this.ports.protector.encrypt(material.bytes, seedContext(this.options.environment, context.user.id, factorId));
      } catch {
        throw new MfaFailure('MFA_UNAVAILABLE');
      }
      const started = await this.ports.persistence.startPendingFactor({
        factorId, tokenDigest, userId: context.user.id, securityVersion: context.user.securityVersion,
        encryptedSeedEnvelope, at: now, expiresAt,
      });
      if (!started) throw new MfaFailure('MFA_AUTHORITY_CHANGED');
      return Object.freeze({ factorId, provisioningUri: material.provisioningUri, expiresAt: expiresAt.toISOString() });
    } finally {
      material.bytes.fill(0);
    }
  }

  async confirmTotpEnrollment(input: { readonly rawSessionToken: string; readonly factorId: string; readonly token: string; readonly networkSignal: string }): Promise<Readonly<{ rawSessionToken: string; recoveryCodes: readonly string[] }>> {
    const { context, tokenDigest, now } = await this.#session(input.rawSessionToken);
    await this.#limit('TOTP_ENROLLMENT_CONFIRM', context, input.networkSignal, input.factorId);
    const factor = context.pendingFactor;
    if (!factor || factor.id !== input.factorId || factor.enrollmentExpiresAt <= now) throw new MfaFailure('MFA_PROOF_FAILED');
    const seed = await this.#decrypt(context.user.id, factor.id, factor.encryptedSeedEnvelope);
    let step: bigint | null;
    try {
      step = this.ports.codes.matchTotpTimeStep(seed, input.token, now);
    } finally {
      seed.fill(0);
    }
    if (step === null) throw new MfaFailure('MFA_PROOF_FAILED');
    const recoveryCodes = this.ports.codes.generateRecoveryCodes();
    const recoveryEntries = recoveryCodes.map((code) => ({ id: this.options.nextUuid(), digest: this.ports.codes.digestRecoveryCode(code) }));
    if (recoveryEntries.some((entry) => !entry.digest)) throw new MfaFailure('MFA_UNAVAILABLE');
    const successor = this.ports.sessionTokens.issue();
    const committed = await this.ports.persistence.confirmPendingFactor({
      factorId: factor.id, factorVersion: factor.version, tokenDigest,
      userId: context.user.id, securityVersion: context.user.securityVersion,
      matchedTimeStep: step, at: now,
      successorSessionId: this.options.nextUuid(), successorTokenDigest: successor.tokenDigest,
      transitionId: this.options.nextUuid(), recoveryBatchId: this.options.nextUuid(),
      recoveryCodes: recoveryEntries as readonly { readonly id: string; readonly digest: string }[],
      noticeEventId: this.options.nextUuid(), correlationId: this.options.nextUuid(),
    });
    if (!committed) throw new MfaFailure('MFA_AUTHORITY_CHANGED');
    return Object.freeze({ rawSessionToken: successor.rawToken, recoveryCodes });
  }

  async startTotpReplacement(input: { readonly rawSessionToken: string; readonly networkSignal: string }) {
    const { context } = await this.#session(input.rawSessionToken);
    if (!context.activeFactor) throw new MfaFailure('MFA_PROOF_FAILED');
    return this.startTotpEnrollment(input);
  }

  async removeTotpFactor(input: { readonly rawSessionToken: string; readonly networkSignal: string }): Promise<void> {
    const { context, tokenDigest, now } = await this.#session(input.rawSessionToken);
    await this.#limit('MFA_FACTOR_REMOVE', context, input.networkSignal);
    const factor = this.#requireStrongEvidence(context, now);
    const removed = await this.ports.persistence.removeActiveFactor({
      tokenDigest, userId: context.user.id, securityVersion: context.user.securityVersion,
      factorId: factor.id, factorVersion: factor.version, at: now,
      transitionId: this.options.nextUuid(), noticeEventId: this.options.nextUuid(),
      correlationId: this.options.nextUuid(),
    });
    if (!removed) throw new MfaFailure('MFA_AUTHORITY_CHANGED');
  }

  async regenerateRecoveryCodes(input: { readonly rawSessionToken: string; readonly networkSignal: string }): Promise<Readonly<{ rawSessionToken: string; recoveryCodes: readonly string[] }>> {
    const { context, tokenDigest, now } = await this.#session(input.rawSessionToken);
    await this.#limit('MFA_RECOVERY_CODES_REGENERATE', context, input.networkSignal);
    const factor = this.#requireStrongEvidence(context, now);
    const recoveryCodes = this.ports.codes.generateRecoveryCodes();
    const entries = recoveryCodes.map((code) => ({ id: this.options.nextUuid(), digest: this.ports.codes.digestRecoveryCode(code) }));
    if (entries.some((entry) => !entry.digest)) throw new MfaFailure('MFA_UNAVAILABLE');
    const successor = this.ports.sessionTokens.issue();
    const committed = await this.ports.persistence.regenerateRecoveryCodeBatch({
      tokenDigest, userId: context.user.id, securityVersion: context.user.securityVersion,
      factorId: factor.id, factorVersion: factor.version, at: now,
      successorSessionId: this.options.nextUuid(), successorTokenDigest: successor.tokenDigest,
      transitionId: this.options.nextUuid(), batchId: this.options.nextUuid(),
      codes: entries as readonly { readonly id: string; readonly digest: string }[],
      noticeEventId: this.options.nextUuid(), correlationId: this.options.nextUuid(),
    });
    if (!committed) throw new MfaFailure('MFA_AUTHORITY_CHANGED');
    return Object.freeze({ rawSessionToken: successor.rawToken, recoveryCodes });
  }

  /** Server-only authority. No browser/API route accepts a caller-selected requirement. */
  async requireSessionStepUp(input: { readonly rawSessionToken: string; readonly requirement: MfaStepUpRequirement; readonly contextCode: string }): Promise<Readonly<{ challengeId: string; requirement: MfaStepUpRequirement; expiresAt: string }>> {
    if (!/^[A-Z][A-Z0-9_]{1,79}$/.test(input.contextCode)) throw new MfaFailure('MFA_PROOF_FAILED');
    const { context, tokenDigest, now } = await this.#session(input.rawSessionToken);
    const expiresAt = new Date(now.getTime() + (this.options.challengeLifetimeMilliseconds ?? DEFAULT_ASSURANCE_FRESHNESS.challengeLifetimeMilliseconds));
    const challenge = await this.ports.persistence.createStepUpChallenge({
      challengeId: this.options.nextUuid(), tokenDigest, userId: context.user.id,
      securityVersion: context.user.securityVersion, requirement: input.requirement,
      contextCode: input.contextCode, at: now, expiresAt, transitionId: this.options.nextUuid(),
    });
    if (!challenge) throw new MfaFailure('MFA_AUTHORITY_CHANGED');
    return Object.freeze({ challengeId: challenge.id, requirement: challenge.requirement, expiresAt: challenge.expiresAt.toISOString() });
  }

  async submitPasswordStepUp(input: { readonly rawSessionToken: string; readonly password: string; readonly networkSignal: string }) {
    const { context, now } = await this.#session(input.rawSessionToken);
    if (!await this.ports.persistence.readStepUpChallenge(context.session.id, now)) throw new MfaFailure('MFA_PROOF_FAILED');
    await this.reauthenticatePassword(input);
    return this.#completeIfReady(input.rawSessionToken);
  }

  async submitTotpStepUp(input: { readonly rawSessionToken: string; readonly token: string; readonly networkSignal: string }) {
    const { context, tokenDigest, now } = await this.#session(input.rawSessionToken);
    await this.#limit('TOTP_STEP_UP', context, input.networkSignal);
    const factor = context.activeFactor;
    if (!factor) throw new MfaFailure('MFA_RECOVERY_REVIEW_REQUIRED');
    const challenge = await this.ports.persistence.readStepUpChallenge(context.session.id, now);
    if (!challenge || challenge.requirement === 'RECENT_AUTH') throw new MfaFailure('MFA_PROOF_FAILED');
    const seed = await this.#decrypt(context.user.id, factor.id, factor.encryptedSeedEnvelope);
    let step: bigint | null;
    try {
      step = this.ports.codes.matchTotpTimeStep(seed, input.token, now);
    } finally {
      seed.fill(0);
    }
    if (step === null) throw new MfaFailure('MFA_PROOF_FAILED');
    const recorded = await this.ports.persistence.recordTotpProof({
      tokenDigest, userId: context.user.id, securityVersion: context.user.securityVersion,
      factorId: factor.id, factorVersion: factor.version, matchedTimeStep: step,
      at: now, transitionId: this.options.nextUuid(),
    });
    if (!recorded) throw new MfaFailure('MFA_PROOF_FAILED');
    return this.#completeIfReady(input.rawSessionToken);
  }

  async submitRecoveryCodeStepUp(input: { readonly rawSessionToken: string; readonly code: string; readonly networkSignal: string }) {
    const { context, tokenDigest, now } = await this.#session(input.rawSessionToken);
    await this.#limit('MFA_RECOVERY_CODE', context, input.networkSignal);
    const factor = context.activeFactor;
    if (!factor) throw new MfaFailure('MFA_RECOVERY_REVIEW_REQUIRED');
    const codeDigest = this.ports.codes.digestRecoveryCode(input.code);
    if (!codeDigest) throw new MfaFailure('MFA_PROOF_FAILED');
    const recorded = await this.ports.persistence.consumeRecoveryCodeProof({
      tokenDigest, userId: context.user.id, securityVersion: context.user.securityVersion,
      factorId: factor.id, codeDigest, at: now, transitionId: this.options.nextUuid(),
    });
    if (!recorded) throw new MfaFailure('MFA_PROOF_FAILED');
    return this.#completeIfReady(input.rawSessionToken);
  }

  async #completeIfReady(rawSessionToken: string): Promise<Readonly<{ status: 'PENDING' | 'COMPLETE'; rawSessionToken?: string }>> {
    const { context, tokenDigest, now } = await this.#session(rawSessionToken);
    const challenge = await this.ports.persistence.readStepUpChallenge(context.session.id, now);
    if (!challenge) return Object.freeze({ status: 'PENDING' });
    const successor = this.ports.sessionTokens.issue();
    const complete = await this.ports.persistence.completeStepUpChallenge({
      tokenDigest, userId: context.user.id, securityVersion: context.user.securityVersion,
      challengeId: challenge.id, challengeVersion: challenge.version,
      successorSessionId: this.options.nextUuid(), successorTokenDigest: successor.tokenDigest,
      at: now, transitionId: this.options.nextUuid(),
    });
    return complete ? Object.freeze({ status: 'COMPLETE', rawSessionToken: successor.rawToken }) : Object.freeze({ status: 'PENDING' });
  }

  async #session(rawSessionToken: string) {
    let tokenDigest: string;
    try { tokenDigest = this.ports.sessionTokens.digest(rawSessionToken); }
    catch { throw new MfaFailure('MFA_PROOF_FAILED'); }
    const now = new Date(this.options.now().getTime());
    let context: MfaSessionContext | null;
    try { context = await this.ports.persistence.readSession(tokenDigest, now); }
    catch { throw new MfaFailure('MFA_UNAVAILABLE'); }
    if (!context) throw new MfaFailure('MFA_PROOF_FAILED');
    return { context, tokenDigest, now };
  }

  #requireStrongEvidence(context: MfaSessionContext, now: Date) {
    const factor = context.activeFactor;
    if (!factor || !context.verifiedEmailId || context.session.status !== 'ACTIVE'
      || context.session.mfaFactorId !== factor.id
      || !fresh(context.session.passwordAuthenticatedAt, now, this.#passwordFreshMs)
      || !fresh(context.session.mfaVerifiedAt, now, this.#mfaConfigurationFreshMs)) {
      throw new MfaFailure('MFA_PROOF_FAILED');
    }
    return factor;
  }

  async #limit(action: Parameters<IdentityAuthRateLimiter['check']>[0]['action'], context: MfaSessionContext, networkSignal: string, factorId?: string): Promise<void> {
    try {
      const decision = await this.ports.rateLimiter.check({
        action, normalizedEmail: `${context.user.id}|${factorId ?? 'none'}`, networkSignal,
      });
      if (!decision.allowed) throw new MfaFailure('MFA_RATE_LIMITED');
    } catch (error) {
      if (error instanceof MfaFailure) throw error;
      throw new MfaFailure('MFA_UNAVAILABLE');
    }
  }

  async #decrypt(userId: string, factorId: string, envelope: unknown): Promise<Buffer> {
    try { return await this.ports.protector.decrypt(envelope, seedContext(this.options.environment, userId, factorId)); }
    catch { throw new MfaFailure('MFA_UNAVAILABLE'); }
  }
}
