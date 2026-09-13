import {
  SafeEncryptionError,
  SensitiveFieldProtector,
  fullyReencryptSensitiveField,
  type EncryptedEnvelopeV1,
  type SensitiveFieldContext,
} from './encryption.js';

/** Every future consumer owns its table, ordering, and authoritative CAS predicate. */
export interface EncryptedFieldMigrationRecord {
  readonly cursor: string;
  readonly policy: 'source' | 'target' | 'unsupported';
  readonly envelope: unknown;
  readonly context: SensitiveFieldContext;
}

export interface EncryptedFieldMigrationConsumer<TTransaction> {
  readonly consumerId: string;
  readAfter(cursor: string | null, limit: number): Promise<readonly EncryptedFieldMigrationRecord[]>;
  compareAndSwap(record: EncryptedFieldMigrationRecord, replacement: EncryptedEnvelopeV1, transaction: TTransaction): Promise<boolean>;
  countOutdated(): Promise<bigint>;
  targetWritePolicyActive(): Promise<boolean>;
}

export interface MigrationBatchRun {
  readonly id: string;
  readonly consumerId: string;
  readonly cursor: string | null;
  readonly version: number;
  readonly leaseOwner: string;
}

export interface MigrationBatchStore<TTransaction> {
  checkpoint(input: {
    readonly runId: string;
    readonly leaseOwner: string;
    readonly expectedVersion: number;
    readonly expectedCursor: string | null;
    readonly nextCursor: string;
    readonly outcome: 'migrated' | 'already-current';
    readonly now: Date;
    readonly applyRecordCas?: (transaction: TTransaction) => Promise<boolean>;
  }): Promise<{ readonly version: number; readonly cursor: string | null }>;
  block(input: { readonly runId: string; readonly leaseOwner: string; readonly expectedVersion: number; readonly failureCode: 'KEY_UNAVAILABLE' | 'INVALID_ENVELOPE' | 'UNKNOWN_POLICY'; readonly now: Date }): Promise<void>;
}

export interface EncryptionMigrationBatchOptions<TTransaction> {
  readonly run: MigrationBatchRun;
  readonly consumer: EncryptedFieldMigrationConsumer<TTransaction>;
  readonly store: MigrationBatchStore<TTransaction>;
  readonly source: SensitiveFieldProtector;
  readonly target: SensitiveFieldProtector;
  readonly mode: 'rewrap' | 'full-reencrypt';
  readonly now: () => Date;
  readonly batchSize?: number;
  readonly signal?: AbortSignal;
}

/** Cryptography runs outside the short consumer-CAS/checkpoint transaction. */
export async function migrateEncryptedFieldBatch<TTransaction>(options: EncryptionMigrationBatchOptions<TTransaction>): Promise<{ readonly processed: number; readonly cursor: string | null; readonly version: number }> {
  const { run, consumer, store, source, target, mode, now, signal } = options;
  const limit = options.batchSize ?? 50;
  if (limit < 1 || limit > 50 || !Number.isSafeInteger(limit) || run.consumerId !== consumer.consumerId) throw new SafeEncryptionError('INVALID_INPUT');
  const records = await consumer.readAfter(run.cursor, limit);
  if (records.length > limit) throw new SafeEncryptionError('INVALID_INPUT');
  let cursor = run.cursor;
  let version = run.version;
  let processed = 0;
  for (const record of records) {
    if (signal?.aborted) throw new SafeEncryptionError('KEY_UNAVAILABLE');
    if (!record.cursor || record.cursor === cursor) throw new SafeEncryptionError('INVALID_INPUT');
    let replacement: EncryptedEnvelopeV1 | undefined;
    if (record.policy === 'unsupported') {
      await store.block({ runId: run.id, leaseOwner: run.leaseOwner, expectedVersion: version, failureCode: 'UNKNOWN_POLICY', now: now() });
      break;
    }
    if (record.policy === 'source') {
      try {
        replacement = mode === 'rewrap'
          ? await source.rewrap(record.envelope, record.context, target.provider.keyReference, signal)
          : await fullyReencryptSensitiveField(source, target, record.envelope, record.context, record.context, signal);
      } catch (error) {
        const failureCode = error instanceof SafeEncryptionError && error.code === 'INVALID_ENVELOPE' ? 'INVALID_ENVELOPE' : 'KEY_UNAVAILABLE';
        await store.block({ runId: run.id, leaseOwner: run.leaseOwner, expectedVersion: version, failureCode, now: now() });
        break;
      }
    }
    const checkpoint = await store.checkpoint({
      runId: run.id,
      leaseOwner: run.leaseOwner,
      expectedVersion: version,
      expectedCursor: cursor,
      nextCursor: record.cursor,
      outcome: replacement ? 'migrated' : 'already-current',
      now: now(),
      ...(replacement ? { applyRecordCas: (transaction) => consumer.compareAndSwap(record, replacement, transaction) } : {}),
    });
    version = checkpoint.version;
    cursor = checkpoint.cursor;
    processed += 1;
  }
  return Object.freeze({ processed, cursor, version });
}
