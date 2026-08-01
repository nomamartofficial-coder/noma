import {
  beginJobExecution,
  completeJobExecution,
  deadLetterJobExecution,
  recordRetryableJobFailure,
  type DatabaseClient,
  type DatabaseTransactionClient,
} from '@noma/database';
import { toSafeJobFailure, type QueueJobContract } from '@noma/contracts';
import {
  PermanentJobError,
  RetryableJobError,
  type QueueContractRegistration,
} from '@noma/integrations';

export function runQueueOperationWithSignal<T>(
  signal: AbortSignal | undefined,
  operation: () => Promise<T>,
): Promise<T> {
  if (!signal) return operation();
  if (signal.aborted) {
    return Promise.reject(new RetryableJobError('JOB_TIMEOUT', 'The job processing deadline elapsed'));
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = (): void => {
      reject(new RetryableJobError('JOB_TIMEOUT', 'The job processing deadline elapsed'));
    };
    signal.addEventListener('abort', onAbort, { once: true });
    operation().then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort));
  });
}

export function createDatabaseBackedQueueHandler<TPayload>(options: {
  readonly database: DatabaseClient;
  readonly workerIdentity: string;
  readonly contract: QueueJobContract<TPayload>;
  readonly operation: (
    transaction: DatabaseTransactionClient,
    payload: TPayload,
    signal?: AbortSignal,
  ) => Promise<void>;
}): QueueContractRegistration<TPayload> {
  return {
    contract: options.contract,
    handler: async (job, context) => {
      const acquisition = await beginJobExecution(options.database, {
        job,
        workerIdentity: options.workerIdentity,
        leaseMilliseconds: options.contract.retry.timeoutMilliseconds + 5_000,
      });
      if (acquisition.disposition === 'already-completed') return;
      if (acquisition.disposition === 'busy') {
        throw new RetryableJobError('JOB_EXECUTION_BUSY', 'The job execution lease is currently owned');
      }
      if (acquisition.disposition === 'dead-lettered') {
        throw new PermanentJobError('JOB_ALREADY_DEAD_LETTERED', 'The job requires owned intervention');
      }

      try {
        await completeJobExecution(
          options.database,
          acquisition,
          (transaction) => runQueueOperationWithSignal(
            context.signal,
            () => options.operation(transaction, job.event.payload, context.signal),
          ),
        );
      } catch (error) {
        const permanent = error instanceof PermanentJobError;
        const lastAttempt = acquisition.attemptNumber >= options.contract.retry.attempts;
        if (permanent || lastAttempt) {
          const failure = permanent
            ? error.failure
            : toSafeJobFailure(
                'permanent',
                'JOB_ATTEMPTS_EXHAUSTED',
                error instanceof Error ? error.message : 'Job attempts exhausted',
              );
          await deadLetterJobExecution(
            options.database,
            acquisition,
            failure,
            options.contract.deadLetter,
          );
          throw new PermanentJobError(failure.code, failure.message, { cause: error });
        }

        const failure = error instanceof RetryableJobError
          ? error.failure
          : toSafeJobFailure(
              'retryable',
              'JOB_PROCESSING_FAILED',
              error instanceof Error ? error.message : 'Job processing failed',
            );
        await recordRetryableJobFailure(options.database, acquisition, failure);
        throw new RetryableJobError(failure.code, failure.message, { cause: error });
      }
    },
  };
}
