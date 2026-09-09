import { randomBytes, randomUUID } from 'node:crypto';

import { Inject, Injectable, type OnApplicationShutdown, type OnModuleInit } from '@nestjs/common';
import type { ServerRuntimeConfig } from '@noma/config/server';
import { createDatabaseClient, createIdentityPersistence, disconnectDatabaseClient, type DatabaseClient } from '@noma/database';
import { RedisIdentityAuthRateLimiter, type RedisIdentityAuthRateLimiter as RateLimiter } from '@noma/integrations';
import type { ServerObservability } from '@noma/observability/server';
import { IdentityAuthenticationService } from '@noma/platform/identity';
import { Argon2idPasswordHasher, OfflinePasswordPolicy, OpaqueSessionTokenIssuer } from '@noma/security';

import { API_OBSERVABILITY, API_RUNTIME_CONFIG } from '../runtime-dependencies.service.js';

@Injectable()
export class AuthRuntimeService implements OnModuleInit, OnApplicationShutdown {
  #database: DatabaseClient | undefined;
  #rateLimiter: RateLimiter | undefined;
  #authentication: IdentityAuthenticationService | undefined;

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
    });
    this.#authentication = await IdentityAuthenticationService.create({
      persistence: createIdentityPersistence(this.#database),
      passwordPolicy: new OfflinePasswordPolicy(),
      passwordHasher: new Argon2idPasswordHasher(),
      sessionTokens: new OpaqueSessionTokenIssuer(),
      rateLimiter: this.#rateLimiter,
    }, {
      ...this.config.authentication,
      nextUuid: randomUUID,
      nextPublicReference: () => `NOMA-${randomBytes(6).toString('hex').toUpperCase()}`,
      recordSecurityEvent: (event, outcome, fields) => {
        const level = outcome === 'succeeded' ? 'info' : 'warn';
        this.observability.logger[level](event, outcome, fields);
        if (event.startsWith('identity.auth_rate_limit.')) {
          this.observability.metrics.record({
            name: 'noma.identity.auth_rate_limit.total', value: 1,
            attributes: { action: String(fields?.action ?? 'unknown').toLowerCase(), outcome },
          });
        } else if (event.startsWith('identity.registration.') || event.startsWith('identity.sign_in.')) {
          this.observability.metrics.record({
            name: 'noma.identity.authentication.total', value: 1,
            attributes: { action: event.startsWith('identity.registration.') ? 'register' : 'sign_in', outcome },
          });
        }
      },
    });
  }

  authentication(): IdentityAuthenticationService {
    if (!this.#authentication) throw new Error('authentication is not configured');
    return this.#authentication;
  }

  configured(): boolean {
    return Boolean(this.#authentication);
  }

  async onApplicationShutdown(): Promise<void> {
    await this.#rateLimiter?.close();
    if (this.#database) await disconnectDatabaseClient(this.#database);
    this.#authentication = undefined;
    this.#rateLimiter = undefined;
    this.#database = undefined;
  }
}
