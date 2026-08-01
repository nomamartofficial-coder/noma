import { Inject, Injectable, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import type { ServerRuntimeConfig } from '@noma/config/server';
import {
  createDatabaseClient,
  disconnectDatabaseClient,
  readOutboxMetrics,
  type DatabaseClient,
} from '@noma/database';
import type { DependencyHealth } from '@noma/contracts';
import {
  BullMqPublisher,
  QueueContractRegistry,
  createBullMqWorkers,
} from '@noma/integrations';
import {
  createInMemoryQueueMetricRecorder,
  type QueueMetricRecord,
} from '@noma/observability/server';
import { OutboxDispatcher } from './outbox-dispatcher.js';

export const WORKER_RUNTIME_CONFIG = Symbol('WORKER_RUNTIME_CONFIG');

@Injectable()
export class QueueRuntimeService implements OnApplicationBootstrap, OnApplicationShutdown {
  readonly #metrics = createInMemoryQueueMetricRecorder();
  readonly #registry = new QueueContractRegistry();
  #database: DatabaseClient | undefined;
  #publisher: BullMqPublisher | undefined;
  #dispatcher: OutboxDispatcher | undefined;
  #workers: ReturnType<typeof createBullMqWorkers> = [];
  #probeTimer: NodeJS.Timeout | undefined;
  #databaseHealth: DependencyHealth = 'not-configured';
  #queueHealth: DependencyHealth = 'not-configured';

  constructor(
    @Inject(WORKER_RUNTIME_CONFIG) private readonly config: ServerRuntimeConfig,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const databaseUrl = this.config.secrets.databaseUrl;
    const redisUrl = this.config.secrets.redisUrl;
    if (!databaseUrl && !redisUrl) return;
    if (!databaseUrl || !redisUrl) throw new Error('Worker database and Redis dependencies must be configured together');

    this.#database = createDatabaseClient({
      databaseUrl,
      applicationName: `noma_worker_${this.config.applicationEnvironment}`,
      maxConnections: 10,
    });
    this.#publisher = new BullMqPublisher({
      redisUrl,
      applicationEnvironment: this.config.applicationEnvironment,
    });
    await this.#database.$queryRaw`SELECT 1`;
    this.#databaseHealth = 'ready';
    await this.#publisher.connect();
    this.#queueHealth = 'ready';

    const workerIdentity = `noma_worker_${this.config.applicationEnvironment}`;
    this.#workers = createBullMqWorkers({
      redisUrl,
      applicationEnvironment: this.config.applicationEnvironment,
      workerIdentity,
      registry: this.#registry,
      metrics: this.#metrics,
    });
    this.#dispatcher = new OutboxDispatcher({
      database: this.#database,
      publisher: this.#publisher,
      registry: this.#registry,
      metrics: this.#metrics,
      identity: workerIdentity,
      onDatabaseHealth: (ready) => { this.#databaseHealth = ready ? 'ready' : 'unavailable'; },
      onQueueHealth: (ready) => { this.#queueHealth = ready ? 'ready' : 'unavailable'; },
    });
    this.#dispatcher.start();
    this.#scheduleProbe();
  }

  health(): { readonly ready: boolean; readonly dependencies: Readonly<Record<string, DependencyHealth>> } {
    const dependencies = this.dependencies();
    const configured = dependencies.database !== 'not-configured' || dependencies.queue !== 'not-configured';
    return Object.freeze({
      ready: configured
        ? dependencies.database === 'ready' && dependencies.queue === 'ready'
        : true,
      dependencies,
    });
  }

  dependencies(): Readonly<Record<string, DependencyHealth>> {
    return Object.freeze({ database: this.#databaseHealth, queue: this.#queueHealth });
  }

  metricRecords(): readonly QueueMetricRecord[] {
    return this.#metrics.snapshot();
  }

  async refreshMetrics(): Promise<void> {
    if (!this.#database || !this.#publisher) return;
    const outbox = await readOutboxMetrics(this.#database);
    this.#metrics.record({ name: 'noma.outbox.pending', value: outbox.pending });
    this.#metrics.record({
      name: 'noma.outbox.oldest_unpublished_seconds',
      value: outbox.oldestUnpublishedAgeSeconds,
    });
    for (const [owner, count] of Object.entries(outbox.deadLetteredByOwner)) {
      this.#metrics.record({
        name: 'noma.queue.dead_letter.open',
        value: count,
        attributes: { owner },
      });
    }
    for (const counts of await this.#publisher.readCounts()) {
      for (const state of ['waiting', 'active', 'delayed', 'completed', 'failed'] as const) {
        this.#metrics.record({
          name: 'noma.queue.jobs',
          value: counts[state],
          attributes: { queue: counts.queueName, state },
        });
      }
    }
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.#probeTimer) clearTimeout(this.#probeTimer);
    await this.#dispatcher?.stop();
    await Promise.all(this.#workers.map((worker) => worker.close()));
    await this.#publisher?.close();
    if (this.#database) await disconnectDatabaseClient(this.#database);
    this.#databaseHealth = 'unavailable';
    this.#queueHealth = 'unavailable';
  }

  #scheduleProbe(): void {
    this.#probeTimer = setTimeout(() => {
      void this.#probe().finally(() => this.#scheduleProbe());
    }, 1_000);
    this.#probeTimer.unref();
  }

  async #probe(): Promise<void> {
    if (!this.#database || !this.#publisher) return;
    try {
      await this.#database.$queryRaw`SELECT 1`;
      this.#databaseHealth = 'ready';
    } catch {
      this.#databaseHealth = 'unavailable';
    }
    this.#queueHealth = (await this.#publisher.ping()) ? 'ready' : 'unavailable';
    try {
      await this.refreshMetrics();
    } catch {
      // Dependency health already records the actionable failure without exposing credentials.
    }
  }
}
