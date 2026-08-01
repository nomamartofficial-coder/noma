export {
  createDatabaseClient,
  disconnectDatabaseClient,
  type DatabaseClient,
  type DatabaseClientOptions,
} from './client.js';
export {
  isRetryableDatabaseTransactionError,
  runInDatabaseTransaction,
  runRetryableSerializableDatabaseTransaction,
  type DatabaseTransactionClient,
  type DatabaseTransactionIsolationLevel,
  type DatabaseTransactionOptions,
  type RetryableDatabaseTransactionOptions,
} from './transaction.js';
export {
  claimOutboxEvents,
  createOutboxEvent,
  createOutboxEventEnvelope,
  deadLetterOutboxEvent,
  markOutboxDispatched,
  markOutboxProcessed,
  readOutboxMetrics,
  releaseOutboxForRetry,
  type ClaimedOutboxEvent,
  type ClaimOutboxEventsOptions,
  type CreateOutboxEventInput,
  type OutboxMetricsSnapshot,
} from './outbox.js';
export {
  beginJobExecution,
  completeJobExecution,
  deadLetterJobExecution,
  listDeadJobExecutions,
  recordRetryableJobFailure,
  type BeginJobExecutionResult,
  type JobExecutionLease,
} from './job-execution.js';

export const databasePackage = { name: '@noma/database', boundary: 'server' } as const;
export type DatabasePackage = typeof databasePackage;
