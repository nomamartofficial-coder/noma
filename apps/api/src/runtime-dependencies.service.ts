import { Inject, Injectable, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import type { ServerRuntimeConfig } from '@noma/config/server';
import { createDatabaseClient, disconnectDatabaseClient, type DatabaseClient } from '@noma/database';
import type { DependencyHealth } from '@noma/contracts';
import { createRedisDependencyProbe, type RedisDependencyProbe } from '@noma/integrations';

export const API_RUNTIME_CONFIG = Symbol('API_RUNTIME_CONFIG');

@Injectable()
export class RuntimeDependenciesService implements OnApplicationBootstrap, OnApplicationShutdown {
  #database: DatabaseClient | undefined;
  #redis: RedisDependencyProbe | undefined;
  #probeTimer: NodeJS.Timeout | undefined;
  #shuttingDown = false;
  #databaseHealth: DependencyHealth = 'not-configured';
  #queueHealth: DependencyHealth = 'not-configured';

  constructor(@Inject(API_RUNTIME_CONFIG) readonly config: ServerRuntimeConfig) {}

  async onApplicationBootstrap(): Promise<void> {
    const databaseUrl = this.config.secrets.databaseUrl;
    const redisUrl = this.config.secrets.redisUrl;
    if (!databaseUrl && !redisUrl) return;
    if (!databaseUrl || !redisUrl) throw new Error('API database and Redis dependencies must be configured together');

    this.#database = createDatabaseClient({
      databaseUrl,
      applicationName: `noma_api_${this.config.applicationEnvironment}`,
      maxConnections: 10,
    });
    this.#redis = createRedisDependencyProbe({
      redisUrl,
      connectionName: `noma-${this.config.applicationEnvironment}-api-readiness`,
    });
    try {
      await this.#database.$queryRaw`SELECT 1`;
      this.#databaseHealth = 'ready';
      await this.#redis.connect();
      this.#queueHealth = 'ready';
      this.#scheduleProbe();
    } catch {
      await this.#closeDependencies();
      throw new Error('API runtime dependencies are unavailable');
    }
  }

  snapshot(): { readonly ready: boolean; readonly dependencies: Readonly<Record<string, DependencyHealth>> } {
    const dependencies = Object.freeze({ database: this.#databaseHealth, queue: this.#queueHealth });
    const configured = dependencies.database !== 'not-configured' || dependencies.queue !== 'not-configured';
    return Object.freeze({
      ready: configured ? dependencies.database === 'ready' && dependencies.queue === 'ready' : true,
      dependencies,
    });
  }

  async onApplicationShutdown(): Promise<void> {
    this.#shuttingDown = true;
    if (this.#probeTimer) clearTimeout(this.#probeTimer);
    await this.#closeDependencies();
  }

  async #closeDependencies(): Promise<void> {
    await this.#redis?.close();
    if (this.#database) await disconnectDatabaseClient(this.#database);
    this.#redis = undefined;
    this.#database = undefined;
    this.#databaseHealth = 'unavailable';
    this.#queueHealth = 'unavailable';
  }

  #scheduleProbe(): void {
    if (this.#shuttingDown) return;
    this.#probeTimer = setTimeout(() => {
      void this.#probe().finally(() => {
        if (!this.#shuttingDown) this.#scheduleProbe();
      });
    }, 1_000);
    this.#probeTimer.unref();
  }

  async #probe(): Promise<void> {
    if (!this.#database || !this.#redis) return;
    try {
      await this.#database.$queryRaw`SELECT 1`;
      this.#databaseHealth = 'ready';
    } catch {
      this.#databaseHealth = 'unavailable';
    }
    this.#queueHealth = (await this.#redis.ping()) ? 'ready' : 'unavailable';
  }
}
