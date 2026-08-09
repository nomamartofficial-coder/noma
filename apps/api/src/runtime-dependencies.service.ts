import { Inject, Injectable, Optional, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import type { ServerRuntimeConfig } from '@noma/config/server';
import { createDatabaseClient, disconnectDatabaseClient, type DatabaseClient } from '@noma/database';
import type { DependencyHealth } from '@noma/contracts';
import { createRedisDependencyProbe, type RedisDependencyProbe } from '@noma/integrations';
import type { ServerObservability } from '@noma/observability/server';

export const API_RUNTIME_CONFIG = Symbol('API_RUNTIME_CONFIG');
export const API_OBSERVABILITY = Symbol('API_OBSERVABILITY');

@Injectable()
export class RuntimeDependenciesService implements OnApplicationBootstrap, OnApplicationShutdown {
  #database: DatabaseClient | undefined;
  #redis: RedisDependencyProbe | undefined;
  #probeTimer: NodeJS.Timeout | undefined;
  #shuttingDown = false;
  #databaseHealth: DependencyHealth = 'not-configured';
  #queueHealth: DependencyHealth = 'not-configured';

  constructor(
    @Inject(API_RUNTIME_CONFIG) readonly config: ServerRuntimeConfig,
    @Optional() @Inject(API_OBSERVABILITY) private readonly observability?: ServerObservability,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const databaseUrl = this.config.secrets.databaseUrl;
    const redisUrl = this.config.secrets.redisUrl;
    if (!databaseUrl && !redisUrl) return;
    if (!databaseUrl || !redisUrl) throw new Error('API database and Redis dependencies must be configured together');

    this.#database = createDatabaseClient({
      databaseUrl,
      applicationName: `noma_api_${this.config.applicationEnvironment}`,
      maxConnections: 10,
      connectionTimeoutMilliseconds: 2_000,
      statementTimeoutMilliseconds: 2_000,
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
    const started = performance.now();
    try {
      const probeDatabase = () => this.#database!.$queryRaw`SELECT 1`;
      if (this.observability) {
        await this.observability.withSpan('noma.dependency.probe', { 'noma.dependency': 'database' }, probeDatabase);
      } else {
        await probeDatabase();
      }
      this.#databaseHealth = 'ready';
      this.observability?.metrics.record({ name: 'noma.dependency.probe.total', value: 1, attributes: { dependency: 'database', outcome: 'succeeded' } });
    } catch {
      this.#databaseHealth = 'unavailable';
      this.observability?.metrics.record({ name: 'noma.dependency.probe.total', value: 1, attributes: { dependency: 'database', outcome: 'failed' } });
    }
    this.#queueHealth = (await this.#redis.ping()) ? 'ready' : 'unavailable';
    this.observability?.metrics.record({ name: 'noma.dependency.probe.total', value: 1, attributes: { dependency: 'queue', outcome: this.#queueHealth === 'ready' ? 'succeeded' : 'failed' } });
    this.observability?.metrics.record({ name: 'noma.dependency.probe.duration_ms', value: performance.now() - started, attributes: { dependency: 'all', outcome: this.snapshot().ready ? 'succeeded' : 'failed' } });
  }
}
