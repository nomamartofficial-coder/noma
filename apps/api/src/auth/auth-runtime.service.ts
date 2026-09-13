import { randomBytes, randomUUID } from 'node:crypto';

import { Inject, Injectable, type OnApplicationShutdown, type OnModuleInit } from '@nestjs/common';
import type { ServerRuntimeConfig } from '@noma/config/server';
import { loadEncryptionEnvironment } from '@noma/config/encryption';
import { createDatabaseClient, createIdentityPersistence, createMfaAuthorityPersistence, disconnectDatabaseClient, type DatabaseClient } from '@noma/database';
import { createAwsKmsManagedKeyProvider, RedisIdentityAuthRateLimiter, type RedisIdentityAuthRateLimiter as RateLimiter } from '@noma/integrations';
import type { ServerObservability } from '@noma/observability/server';
import { IdentityAuthenticationService, IdentityVerificationRecoveryService, PrivilegedMfaService } from '@noma/platform/identity';
import { Argon2idPasswordHasher, OfflinePasswordPolicy, OpaqueSessionTokenIssuer, OneTimeIdentityTokenIssuer, SensitiveFieldProtector, createTotpSeed, matchTotpTimeStep, generateRecoveryCodes, digestRecoveryCode } from '@noma/security';

import { API_OBSERVABILITY, API_RUNTIME_CONFIG } from '../runtime-dependencies.service.js';

@Injectable()
export class AuthRuntimeService implements OnModuleInit, OnApplicationShutdown {
  #database: DatabaseClient | undefined;
  #rateLimiter: RateLimiter | undefined;
  #authentication: IdentityAuthenticationService | undefined;
  #verificationRecovery: IdentityVerificationRecoveryService | undefined;
  #mfa: PrivilegedMfaService | undefined;

  constructor(
    @Inject(API_RUNTIME_CONFIG) private readonly config: ServerRuntimeConfig,
    @Inject(API_OBSERVABILITY) private readonly observability: ServerObservability,
  ) {}

  async onModuleInit(): Promise<void> {
    const { databaseUrl, redisUrl, authCorrelationSecret } = this.config.secrets;
    if (!databaseUrl && !redisUrl) return;
    if (!databaseUrl || !redisUrl || !authCorrelationSecret) {
      throw new Error('authentication dependencies are incomplete');
    }
    this.#database = createDatabaseClient({
      databaseUrl,
      applicationName: 'noma_api_auth',
      maxConnections: 10,
    });
    await this.#database.$queryRaw`SELECT 1`;
    this.#rateLimiter = new RedisIdentityAuthRateLimiter({
      redisUrl,
      applicationEnvironment: this.config.applicationEnvironment,
      correlationSecret: authCorrelationSecret,
      policies: this.config.authentication.proofRateLimits,
    });
    const persistence = createIdentityPersistence(this.#database);
    const passwordPolicy = new OfflinePasswordPolicy();
    const passwordHasher = new Argon2idPasswordHasher();
    const sessionTokens = new OpaqueSessionTokenIssuer();
    const recordSecurityEvent = (event: string, outcome: 'succeeded' | 'failed' | 'unavailable', fields?: Readonly<Record<string, string | number | boolean>>) => {
      const level = outcome === 'succeeded' ? 'info' : 'warn';
      this.observability.logger[level](event, outcome, fields);
      if (event.startsWith('identity.auth_rate_limit.')) {
        this.observability.metrics.record({ name: 'noma.identity.auth_rate_limit.total', value: 1, attributes: { action: String(fields?.action ?? 'unknown').toLowerCase(), outcome } });
      } else if (event.startsWith('identity.registration.') || event.startsWith('identity.sign_in.')) {
        this.observability.metrics.record({ name: 'noma.identity.authentication.total', value: 1, attributes: { action: event.startsWith('identity.registration.') ? 'register' : 'sign_in', outcome } });
      } else if (event.startsWith('identity.email_verification.') || event.startsWith('identity.password_recovery.')) {
        this.observability.metrics.record({ name: 'noma.identity.proof_flow.total', value: 1, attributes: { action: event.includes('email_verification') ? 'email_verification' : 'password_recovery', outcome } });
      }
    };
    this.#authentication = await IdentityAuthenticationService.create({
      persistence,
      passwordPolicy,
      passwordHasher,
      sessionTokens,
      rateLimiter: this.#rateLimiter,
    }, {
      ...this.config.authentication,
      nextUuid: randomUUID,
      nextPublicReference: () => `NOMA-${randomBytes(6).toString('hex').toUpperCase()}`,
      recordSecurityEvent,
    });
    this.#verificationRecovery = new IdentityVerificationRecoveryService({
      persistence,
      passwordPolicy,
      passwordHasher,
      proofTokens: new OneTimeIdentityTokenIssuer(),
      sessionTokens,
      rateLimiter: this.#rateLimiter,
    }, {
      nextUuid: randomUUID,
      tokenTtlMilliseconds: 30 * 60_000,
      recordSecurityEvent,
    });
    const encryption = loadEncryptionEnvironment('api', process.env);
    if (encryption.mode === 'aws-kms') {
      if (!encryption.keyReference || !encryption.purposes.includes('noma:mfa-seed')) {
        throw new Error('MFA encryption capability is incomplete');
      }
      const protector = new SensitiveFieldProtector(
        createAwsKmsManagedKeyProvider({ keyReference: encryption.keyReference }),
        { principal: 'api', purpose: 'noma:mfa-seed', environment: encryption.environment, operations: ['encrypt', 'decrypt'] },
      );
      this.#mfa = new PrivilegedMfaService({
        persistence: createMfaAuthorityPersistence(this.#database, {
          ...(this.config.authentication.mfaPasswordFreshMilliseconds === undefined ? {} : { passwordFreshMilliseconds: this.config.authentication.mfaPasswordFreshMilliseconds }),
          ...(this.config.authentication.mfaFreshMilliseconds === undefined ? {} : { mfaFreshMilliseconds: this.config.authentication.mfaFreshMilliseconds }),
        }), passwordHasher,
        sessionTokens, rateLimiter: this.#rateLimiter, protector,
        codes: { createTotpSeed, matchTotpTimeStep, generateRecoveryCodes, digestRecoveryCode },
      }, { environment: encryption.environment, now: () => new Date(), nextUuid: randomUUID,
        ...(this.config.authentication.mfaPasswordFreshMilliseconds === undefined ? {} : { passwordFreshMilliseconds: this.config.authentication.mfaPasswordFreshMilliseconds }),
        ...(this.config.authentication.mfaFreshMilliseconds === undefined ? {} : { mfaFreshMilliseconds: this.config.authentication.mfaFreshMilliseconds }),
        ...(this.config.authentication.mfaChallengeMilliseconds === undefined ? {} : { challengeLifetimeMilliseconds: this.config.authentication.mfaChallengeMilliseconds }),
        ...(this.config.authentication.mfaEnrollmentMilliseconds === undefined ? {} : { enrollmentLifetimeMilliseconds: this.config.authentication.mfaEnrollmentMilliseconds }) });
    }
  }

  authentication(): IdentityAuthenticationService {
    if (!this.#authentication) throw new Error('authentication is not configured');
    return this.#authentication;
  }

  verificationRecovery(): IdentityVerificationRecoveryService {
    if (!this.#verificationRecovery) throw new Error('identity verification and recovery are not configured');
    return this.#verificationRecovery;
  }

  mfa(): PrivilegedMfaService {
    if (!this.#mfa) throw new Error('MFA is not configured');
    return this.#mfa;
  }

  mfaConfigured(): boolean { return Boolean(this.#mfa); }

  configured(): boolean {
    return Boolean(this.#authentication);
  }

  async onApplicationShutdown(): Promise<void> {
    await this.#rateLimiter?.close();
    if (this.#database) await disconnectDatabaseClient(this.#database);
    this.#authentication = undefined;
    this.#verificationRecovery = undefined;
    this.#mfa = undefined;
    this.#rateLimiter = undefined;
    this.#database = undefined;
  }
}
