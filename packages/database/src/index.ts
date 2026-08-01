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

export const databasePackage = { name: '@noma/database', boundary: 'server' } as const;
export type DatabasePackage = typeof databasePackage;
