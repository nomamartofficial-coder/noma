export interface ServerTelemetryEvent { readonly name: string; readonly correlationId: string; }
export const serverObservabilityBoundary = 'server-only' as const;

export const QUEUE_METRIC_NAMES = [
  'noma.outbox.pending',
  'noma.outbox.oldest_unpublished_seconds',
  'noma.outbox.dispatch.total',
  'noma.queue.jobs',
  'noma.queue.retry.total',
  'noma.queue.processing.duration_ms',
  'noma.queue.dead_letter.total',
  'noma.queue.dead_letter.open',
] as const;

export type QueueMetricName = (typeof QUEUE_METRIC_NAMES)[number];

export interface QueueMetricRecord {
  readonly name: QueueMetricName;
  readonly value: number;
  readonly attributes?: Readonly<Record<string, string>>;
}

export interface QueueMetricRecorder {
  record(metric: QueueMetricRecord): void;
}

export function createNoopQueueMetricRecorder(): QueueMetricRecorder {
  return Object.freeze({ record: () => undefined });
}

export function createInMemoryQueueMetricRecorder(): QueueMetricRecorder & {
  readonly snapshot: () => readonly QueueMetricRecord[];
} {
  const records: QueueMetricRecord[] = [];
  return Object.freeze({
    record(metric: QueueMetricRecord): void {
      if (!Number.isFinite(metric.value)) throw new Error('queue metric value must be finite');
      records.push(Object.freeze({
        ...metric,
        ...(metric.attributes ? { attributes: Object.freeze({ ...metric.attributes }) } : {}),
      }));
    },
    snapshot: () => Object.freeze([...records]),
  });
}
