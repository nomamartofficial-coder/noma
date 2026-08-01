import { Prisma, type PrismaClient } from './generated/prisma/client.js';

export type DatabaseTransactionClient = Prisma.TransactionClient;
export type DatabaseTransactionIsolationLevel = Prisma.TransactionIsolationLevel;

export interface DatabaseTransactionOptions {
  readonly maxWaitMilliseconds?: number;
  readonly timeoutMilliseconds?: number;
  readonly isolationLevel?: DatabaseTransactionIsolationLevel;
}

export interface RetryableDatabaseTransactionOptions extends DatabaseTransactionOptions {
  readonly retryIdentity: string;
  readonly maxAttempts?: number;
  readonly baseDelayMilliseconds?: number;
  readonly maximumDelayMilliseconds?: number;
}

const DEFAULT_MAX_WAIT_MILLISECONDS = 2_000;
const DEFAULT_TIMEOUT_MILLISECONDS = 5_000;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MILLISECONDS = 25;
const DEFAULT_MAXIMUM_DELAY_MILLISECONDS = 250;

function requireIntegerInRange(
  name: string,
  value: number,
  minimum: number,
  maximum: number,
): number {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${name} must be an integer from ${minimum} to ${maximum}`);
  }
  return value;
}

function transactionOptions(options: DatabaseTransactionOptions) {
  return {
    maxWait: requireIntegerInRange(
      'maxWaitMilliseconds',
      options.maxWaitMilliseconds ?? DEFAULT_MAX_WAIT_MILLISECONDS,
      100,
      30_000,
    ),
    timeout: requireIntegerInRange(
      'timeoutMilliseconds',
      options.timeoutMilliseconds ?? DEFAULT_TIMEOUT_MILLISECONDS,
      100,
      120_000,
    ),
    isolationLevel:
      options.isolationLevel ?? Prisma.TransactionIsolationLevel.ReadCommitted,
  } as const;
}

export function isRetryableDatabaseTransactionError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const candidate = error as { readonly code?: unknown; readonly clientVersion?: unknown };
  return candidate.code === 'P2034' && typeof candidate.clientVersion === 'string';
}

export async function runInDatabaseTransaction<T>(
  client: PrismaClient,
  operation: (transaction: DatabaseTransactionClient) => Promise<T>,
  options: DatabaseTransactionOptions = {},
): Promise<T> {
  return client.$transaction(operation, transactionOptions(options));
}

function retryDelayMilliseconds(
  attempt: number,
  baseDelayMilliseconds: number,
  maximumDelayMilliseconds: number,
): number {
  const upperBound = Math.min(
    maximumDelayMilliseconds,
    baseDelayMilliseconds * 2 ** Math.max(0, attempt - 1),
  );
  return Math.floor(Math.random() * (upperBound + 1));
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function runRetryableSerializableDatabaseTransaction<T>(
  client: PrismaClient,
  operation: (transaction: DatabaseTransactionClient, attempt: number) => Promise<T>,
  options: RetryableDatabaseTransactionOptions,
): Promise<T> {
  const retryIdentity = options.retryIdentity.trim();
  if (!retryIdentity || retryIdentity.length > 200) {
    throw new Error('retryIdentity must be a non-empty value of at most 200 characters');
  }

  const maxAttempts = requireIntegerInRange(
    'maxAttempts',
    options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
    1,
    5,
  );
  const baseDelayMilliseconds = requireIntegerInRange(
    'baseDelayMilliseconds',
    options.baseDelayMilliseconds ?? DEFAULT_BASE_DELAY_MILLISECONDS,
    0,
    1_000,
  );
  const maximumDelayMilliseconds = requireIntegerInRange(
    'maximumDelayMilliseconds',
    options.maximumDelayMilliseconds ?? DEFAULT_MAXIMUM_DELAY_MILLISECONDS,
    baseDelayMilliseconds,
    5_000,
  );

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await runInDatabaseTransaction(
        client,
        (transaction) => operation(transaction, attempt),
        {
          ...options,
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      if (!isRetryableDatabaseTransactionError(error) || attempt === maxAttempts) throw error;
      await sleep(retryDelayMilliseconds(attempt, baseDelayMilliseconds, maximumDelayMilliseconds));
    }
  }

  throw new Error('database transaction retry loop ended unexpectedly');
}
