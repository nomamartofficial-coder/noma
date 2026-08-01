import {
  claimOutboxEvents,
  deadLetterOutboxEvent,
  markOutboxDispatched,
  releaseOutboxForRetry,
  type DatabaseClient,
} from '@noma/database';
import { toSafeJobFailure } from '@noma/contracts';
import {
  BullMqPublisher,
  QueueContractRegistry,
} from '@noma/integrations';
import type { QueueMetricRecorder } from '@noma/observability/server';

const DEFAULT_POLL_MILLISECONDS = 250;
const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_LEASE_MILLISECONDS = 30_000;
const DEFAULT_RECOVERY_MILLISECONDS = 30_000;
const MAXIMUM_RETRY_MILLISECONDS = 60_000;
const UNREGISTERED_ATTENTION_MILLISECONDS = 15 * 60_000;

export interface OutboxDispatcherOptions {
  readonly database: DatabaseClient;
  readonly publisher: BullMqPublisher;
  readonly registry: QueueContractRegistry;
  readonly metrics: QueueMetricRecorder;
  readonly identity: string;
  readonly pollMilliseconds?: number;
  readonly batchSize?: number;
  readonly leaseMilliseconds?: number;
  readonly recoveryAfterMilliseconds?: number;
  readonly random?: () => number;
  readonly onDatabaseHealth?: (ready: boolean) => void;
  readonly onQueueHealth?: (ready: boolean) => void;
}

export class OutboxDispatcher {
  readonly #options: OutboxDispatcherOptions;
  #active = false;
  #timer: NodeJS.Timeout | undefined;
  #running: Promise<void> | undefined;

  constructor(options: OutboxDispatcherOptions) {
    this.#options = options;
  }

  start(): void {
    if (this.#active) return;
    this.#active = true;
    this.#schedule(0);
  }

  async stop(): Promise<void> {
    this.#active = false;
    if (this.#timer) clearTimeout(this.#timer);
    await this.#running;
  }

  async dispatchOnce(now = new Date()): Promise<number> {
    let events;
    try {
      events = await claimOutboxEvents(this.#options.database, {
        leaseOwner: this.#options.identity,
        batchSize: this.#options.batchSize ?? DEFAULT_BATCH_SIZE,
        leaseMilliseconds: this.#options.leaseMilliseconds ?? DEFAULT_LEASE_MILLISECONDS,
        recoveryAfterMilliseconds:
          this.#options.recoveryAfterMilliseconds ?? DEFAULT_RECOVERY_MILLISECONDS,
        now,
      });
      this.#options.onDatabaseHealth?.(true);
    } catch (error) {
      this.#options.onDatabaseHealth?.(false);
      throw error;
    }

    for (const claimed of events) {
      const registration = this.#options.registry.find(
        claimed.queueName,
        claimed.jobName,
        claimed.jobVersion,
      );
      if (!registration) {
        await deadLetterOutboxEvent(this.#options.database, {
          eventId: claimed.id,
          leaseOwner: this.#options.identity,
          failure: toSafeJobFailure(
            'permanent',
            'UNREGISTERED_JOB_CONTRACT',
            'No compatible queue job contract is registered',
          ),
          owner: 'operations',
          attentionDeadlineAt: new Date(now.getTime() + UNREGISTERED_ATTENTION_MILLISECONDS),
          now,
        });
        this.#options.metrics.record({
          name: 'noma.queue.dead_letter.total',
          value: 1,
          attributes: { queue: claimed.queueName, job: claimed.jobName, owner: 'operations' },
        });
        continue;
      }

      try {
        await this.#options.publisher.publish(registration.contract, claimed.event);
        this.#options.onQueueHealth?.(true);
        await markOutboxDispatched(this.#options.database, {
          eventId: claimed.id,
          leaseOwner: this.#options.identity,
          now,
        });
        this.#options.metrics.record({
          name: 'noma.outbox.dispatch.total',
          value: 1,
          attributes: { outcome: 'published', queue: claimed.queueName },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Queue publication failed';
        const validationFailure = /event|payload|contract|privacy/i.test(message);
        if (validationFailure) {
          await deadLetterOutboxEvent(this.#options.database, {
            eventId: claimed.id,
            leaseOwner: this.#options.identity,
            failure: toSafeJobFailure('permanent', 'INVALID_OUTBOX_EVENT', message),
            owner: registration.contract.deadLetter.owner,
            attentionDeadlineAt: new Date(
              now.getTime() + registration.contract.deadLetter.attentionAfterMilliseconds,
            ),
            now,
          });
        } else {
          this.#options.onQueueHealth?.(false);
          const attempt = claimed.dispatchAttempts + 1;
          const maximum = Math.min(MAXIMUM_RETRY_MILLISECONDS, 1_000 * 2 ** Math.min(attempt - 1, 16));
          const retryMilliseconds = Math.floor((this.#options.random ?? Math.random)() * (maximum + 1));
          await releaseOutboxForRetry(this.#options.database, {
            eventId: claimed.id,
            leaseOwner: this.#options.identity,
            retryAt: new Date(now.getTime() + retryMilliseconds),
            failure: toSafeJobFailure('retryable', 'QUEUE_PUBLICATION_FAILED', message),
          });
        }
        this.#options.metrics.record({
          name: 'noma.outbox.dispatch.total',
          value: 1,
          attributes: { outcome: validationFailure ? 'dead-lettered' : 'retry', queue: claimed.queueName },
        });
      }
    }
    return events.length;
  }

  #schedule(delay: number): void {
    if (!this.#active) return;
    this.#timer = setTimeout(() => {
      this.#running = this.dispatchOnce()
        .then(() => undefined)
        .catch(() => undefined)
        .finally(() => {
          this.#running = undefined;
          this.#schedule(this.#options.pollMilliseconds ?? DEFAULT_POLL_MILLISECONDS);
        });
    }, delay);
    this.#timer.unref();
  }
}
