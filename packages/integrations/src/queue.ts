import {
  Queue,
  UnrecoverableError,
  Worker,
  type Job,
  type JobsOptions,
} from 'bullmq';
import { Redis } from 'ioredis';

import {
  createQueueJobEnvelope,
  parseQueueJobEnvelope,
  toSafeJobFailure,
  type QueueJobContract,
  type QueueJobEnvelopeV1,
  type QueueName,
  type SafeJobFailure,
} from '@noma/contracts';
import {
  createNoopQueueMetricRecorder,
  type ServerObservability,
  type QueueMetricRecorder,
} from '@noma/observability/server';

const PRODUCER_OPERATION_TIMEOUT_MILLISECONDS = 3_000;

function withProducerDeadline<T>(operation: Promise<T>, operationName: string): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(
      () => reject(new RetryableJobError(
        'QUEUE_PRODUCER_TIMEOUT',
        `Queue producer ${operationName} exceeded its fail-fast deadline`,
      )),
      PRODUCER_OPERATION_TIMEOUT_MILLISECONDS,
    );
    timeout.unref();
  });
  return Promise.race([operation, deadline]).finally(() => {
    if (timeout) clearTimeout(timeout);
  });
}

export interface QueueContractRegistration<TPayload = unknown> {
  readonly contract: QueueJobContract<TPayload>;
  readonly handler: (
    job: QueueJobEnvelopeV1<TPayload>,
    context: { readonly signal?: AbortSignal; readonly attemptsMade: number },
  ) => Promise<void>;
}

export interface QueueCountsSnapshot {
  readonly queueName: QueueName;
  readonly waiting: number;
  readonly active: number;
  readonly delayed: number;
  readonly completed: number;
  readonly failed: number;
}

export class RetryableJobError extends Error {
  readonly failure: SafeJobFailure;

  constructor(code: string, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'RetryableJobError';
    this.failure = toSafeJobFailure('retryable', code, message);
  }
}

export class PermanentJobError extends Error {
  readonly failure: SafeJobFailure;

  constructor(code: string, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'PermanentJobError';
    this.failure = toSafeJobFailure('permanent', code, message);
  }
}

function registryKey(queueName: string, jobName: string, version: number): string {
  return `${queueName}|${jobName}|${version}`;
}

function queuePrefix(applicationEnvironment: string): string {
  if (!/^[a-z][a-z0-9_-]{1,31}$/i.test(applicationEnvironment)) {
    throw new Error('queue environment must be 2 to 32 safe characters');
  }
  return `noma:${applicationEnvironment}`;
}

function requireRedisUrl(value: string): string {
  try {
    const url = new URL(value);
    if (!['redis:', 'rediss:'].includes(url.protocol)) throw new Error();
    return value;
  } catch {
    throw new Error('Redis URL must use the redis or rediss protocol');
  }
}

export class QueueContractRegistry {
  readonly #registrations = new Map<string, QueueContractRegistration>();

  constructor(registrations: readonly QueueContractRegistration[] = []) {
    for (const registration of registrations) this.register(registration);
  }

  register<TPayload>(registration: QueueContractRegistration<TPayload>): void {
    const key = registryKey(
      registration.contract.queueName,
      registration.contract.jobName,
      registration.contract.schemaVersion,
    );
    if (this.#registrations.has(key)) throw new Error('queue job contract is already registered');
    this.#registrations.set(key, registration as QueueContractRegistration);
  }

  find(queueName: string, jobName: string, version: number): QueueContractRegistration | undefined {
    return this.#registrations.get(registryKey(queueName, jobName, version));
  }

  registrations(): readonly QueueContractRegistration[] {
    return Object.freeze([...this.#registrations.values()]);
  }
}

export class BullMqPublisher {
  readonly #connection: Redis;
  readonly #queues = new Map<QueueName, Queue>();
  readonly #prefix: string;
  readonly #telemetry: ServerObservability | undefined;

  constructor(options: {
    readonly redisUrl: string;
    readonly applicationEnvironment: string;
    readonly telemetry?: ServerObservability;
  }) {
    this.#prefix = queuePrefix(options.applicationEnvironment);
    this.#connection = new Redis(requireRedisUrl(options.redisUrl), {
      commandTimeout: PRODUCER_OPERATION_TIMEOUT_MILLISECONDS,
      connectTimeout: PRODUCER_OPERATION_TIMEOUT_MILLISECONDS,
      connectionName: `noma-${options.applicationEnvironment}-outbox-publisher`,
      enableOfflineQueue: false,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
    this.#connection.on('error', () => undefined);
    this.#telemetry = options.telemetry;
  }

  async connect(): Promise<void> {
    if (this.#connection.status === 'wait') {
      await withProducerDeadline(this.#connection.connect(), 'connection');
    }
    await withProducerDeadline(this.#connection.ping(), 'health check');
  }

  async publish<TPayload>(
    contract: QueueJobContract<TPayload>,
    event: unknown,
  ): Promise<string> {
    const envelope = createQueueJobEnvelope(contract, event);
    let queue = this.#queues.get(contract.queueName);
    if (!queue) {
      queue = new Queue(contract.queueName, { connection: this.#connection, prefix: this.#prefix });
      queue.on('error', () => undefined);
      this.#queues.set(contract.queueName, queue);
    }
    const options: JobsOptions = {
      jobId: envelope.jobId,
      attempts: contract.retry.attempts,
      backoff: {
        type: contract.retry.backoff,
        delay: contract.retry.backoffDelayMilliseconds,
        jitter: contract.retry.jitter,
      },
      removeOnComplete: false,
      removeOnFail: false,
    };
    const publish = () => withProducerDeadline(queue.add(contract.jobName, envelope, options), 'publication');
    const job = this.#telemetry
      ? await this.#telemetry.withSpan(
          'noma.outbox.publish',
          { 'messaging.destination.name': contract.queueName, 'messaging.operation.name': contract.jobName },
          publish,
          envelope.event.telemetry?.traceContext,
        )
      : await publish();
    return job.id ?? envelope.jobId;
  }

  async ping(): Promise<boolean> {
    try {
      return (await withProducerDeadline(this.#connection.ping(), 'health check')) === 'PONG';
    } catch {
      return false;
    }
  }

  async readCounts(): Promise<readonly QueueCountsSnapshot[]> {
    const snapshots: QueueCountsSnapshot[] = [];
    for (const [queueName, queue] of this.#queues) {
      const counts = await queue.getJobCounts('waiting', 'active', 'delayed', 'completed', 'failed');
      snapshots.push(Object.freeze({
        queueName,
        waiting: counts.waiting ?? 0,
        active: counts.active ?? 0,
        delayed: counts.delayed ?? 0,
        completed: counts.completed ?? 0,
        failed: counts.failed ?? 0,
      }));
    }
    return Object.freeze(snapshots);
  }

  async close(): Promise<void> {
    await Promise.all([...this.#queues.values()].map((queue) => queue.close()));
    this.#queues.clear();
    if (this.#connection.status !== 'end') this.#connection.disconnect(false);
  }
}

function composeAbortSignals(parent: AbortSignal | undefined, timeoutMilliseconds: number): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMilliseconds);
  return parent ? AbortSignal.any([parent, timeout]) : timeout;
}

export interface BullMqWorkerHandle {
  waitUntilReady(): Promise<unknown>;
  close(): Promise<void>;
}

export function createBullMqWorkers(options: {
  readonly redisUrl: string;
  readonly applicationEnvironment: string;
  readonly workerIdentity: string;
  readonly registry: QueueContractRegistry;
  readonly metrics?: QueueMetricRecorder;
  readonly telemetry?: ServerObservability;
}): readonly BullMqWorkerHandle[] {
  const prefix = queuePrefix(options.applicationEnvironment);
  const metrics = options.metrics ?? createNoopQueueMetricRecorder();
  const registrationsByQueue = new Map<QueueName, QueueContractRegistration[]>();
  for (const registration of options.registry.registrations()) {
    const registrations = registrationsByQueue.get(registration.contract.queueName) ?? [];
    registrations.push(registration);
    registrationsByQueue.set(registration.contract.queueName, registrations);
  }

  return Object.freeze([...registrationsByQueue].map(([queueName]) => {
    const connection = new Redis(requireRedisUrl(options.redisUrl), {
      connectionName: `${options.workerIdentity}-${queueName}`,
      maxRetriesPerRequest: null,
    });
    connection.on('error', () => undefined);
    const worker = new Worker(
      queueName,
      async (bullJob: Job, _token?: string, parentSignal?: AbortSignal) => {
        const candidate = bullJob.data as Record<string, unknown>;
        const registration = options.registry.find(
          queueName,
          typeof candidate.jobName === 'string' ? candidate.jobName : '',
          typeof candidate.jobVersion === 'number' ? candidate.jobVersion : -1,
        );
        if (!registration) throw new UnrecoverableError('UNREGISTERED_JOB_CONTRACT');

        let envelope: QueueJobEnvelopeV1;
        try {
          envelope = parseQueueJobEnvelope(candidate, registration.contract);
        } catch {
          throw new UnrecoverableError('INVALID_JOB_ENVELOPE');
        }
        const started = performance.now();
        const signal = composeAbortSignals(parentSignal, registration.contract.retry.timeoutMilliseconds);
        try {
          const processJob = () => registration.handler(envelope, { signal, attemptsMade: bullJob.attemptsMade });
          if (options.telemetry) {
            await options.telemetry.withSpan(
              'noma.queue.process',
              {
                'messaging.destination.name': queueName,
                'messaging.operation.name': registration.contract.jobName,
                'messaging.operation.type': 'process',
              },
              processJob,
              envelope.event.telemetry?.traceContext,
            );
          } else {
            await processJob();
          }
          metrics.record({
            name: 'noma.queue.processing.duration_ms',
            value: performance.now() - started,
            attributes: { queue: queueName, job: registration.contract.jobName, outcome: 'completed' },
          });
        } catch (error) {
          const permanent = error instanceof PermanentJobError;
          metrics.record({
            name: permanent ? 'noma.queue.dead_letter.total' : 'noma.queue.retry.total',
            value: 1,
            attributes: {
              queue: queueName,
              job: registration.contract.jobName,
              ...(permanent ? { owner: registration.contract.deadLetter.owner } : {}),
            },
          });
          if (permanent) throw new UnrecoverableError(error.failure.code);
          throw error instanceof Error ? error : new Error('JOB_PROCESSING_FAILED');
        }
      },
      { connection, prefix },
    );
    worker.on('error', () => undefined);
    return Object.freeze({
      waitUntilReady: () => worker.waitUntilReady(),
      close: async (): Promise<void> => {
        await worker.close();
        if (connection.status !== 'end') connection.disconnect(false);
      },
    });
  }));
}
