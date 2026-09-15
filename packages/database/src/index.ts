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
export {
  containIdentitySessionsForAuthorityChange,
  createIdentityPersistence,
  type ContainIdentitySessionsForAuthorityChangeInput,
} from './identity.js';
export { createMfaAuthorityPersistence } from './mfa.js';
export {
  EncryptionMigrationConflict,
  blockEncryptionMigrationRun,
  checkpointEncryptionMigrationRecord,
  claimEncryptionMigrationRun,
  createEncryptionMigrationRun,
  reconcileEncryptionMigrationRun,
  resumeBlockedEncryptionMigrationRun,
  type CreateEncryptionMigrationRunInput,
  type MigrationCheckpointInput,
  type ReconciliationProbe,
  type SafeMigrationFailureCode,
} from './encryption-migration.js';
export {
  createAccessAuthorityPersistence,
  createAccessScope,
  lockActiveAuthorityFactForUse,
  type AccessAuthorityPersistence,
  type AccessSubject,
  type CreateAccessScopeInput,
  type CreateDraftRoleTemplateInput,
  type CreateServicePrincipalInput,
  type GrantRoleAssignmentInput,
  type RecordAccessApprovalDecisionInput,
  type RequestAccessApprovalInput,
} from './access.js';

export const databasePackage = { name: '@noma/database', boundary: 'server' } as const;
export type DatabasePackage = typeof databasePackage;
