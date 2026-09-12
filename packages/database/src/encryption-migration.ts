import type { PrismaClient } from './generated/prisma/client.js';
import type { DatabaseTransactionClient } from './transaction.js';

export type EncryptionMigrationRun = Awaited<ReturnType<PrismaClient['encryptionMigrationRun']['findUnique']>>;
export type SafeMigrationFailureCode = 'KEY_UNAVAILABLE' | 'RECORD_CONFLICT' | 'INVALID_ENVELOPE' | 'UNKNOWN_POLICY' | 'OPERATOR_REVIEW';

export class EncryptionMigrationConflict extends Error {
  constructor() { super('Encryption migration lease, cursor, version, or record changed'); this.name = 'EncryptionMigrationConflict'; }
}

function safeIdentity(value: string, maximum: number): string {
  if (value.length < 1 || value.length > maximum || !/^[A-Za-z0-9][A-Za-z0-9_.:-]*$/.test(value)) throw new Error('Invalid migration identity');
  return value;
}

export interface CreateEncryptionMigrationRunInput {
  readonly id: string;
  readonly consumerId: string;
  readonly environment: 'development' | 'test' | 'preview' | 'staging' | 'production';
  readonly sourcePolicyId: string;
  readonly targetPolicyId: string;
  readonly correlationId: string;
}

export async function createEncryptionMigrationRun(client: PrismaClient, input: CreateEncryptionMigrationRunInput) {
  if (input.sourcePolicyId === input.targetPolicyId) throw new Error('Migration policies must differ');
  return client.encryptionMigrationRun.create({ data: {
    id: input.id,
    consumerId: safeIdentity(input.consumerId, 120),
    environment: input.environment,
    sourcePolicyId: safeIdentity(input.sourcePolicyId, 160),
    targetPolicyId: safeIdentity(input.targetPolicyId, 160),
    correlationId: safeIdentity(input.correlationId, 160),
  } });
}

export async function claimEncryptionMigrationRun(
  client: PrismaClient,
  input: { readonly runId: string; readonly leaseOwner: string; readonly now: Date; readonly leaseMilliseconds?: number },
) {
  const owner = safeIdentity(input.leaseOwner, 160);
  const leaseMilliseconds = input.leaseMilliseconds ?? 30_000;
  if (!Number.isSafeInteger(leaseMilliseconds) || leaseMilliseconds < 1_000 || leaseMilliseconds > 300_000) throw new Error('Invalid migration lease');
  const result = await client.encryptionMigrationRun.updateMany({
    where: {
      id: input.runId,
      status: { in: ['PENDING', 'RUNNING'] },
      OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lte: input.now } }],
    },
    data: { status: 'RUNNING', leaseOwner: owner, leaseExpiresAt: new Date(input.now.getTime() + leaseMilliseconds), version: { increment: 1 } },
  });
  return result.count === 1 ? client.encryptionMigrationRun.findUniqueOrThrow({ where: { id: input.runId } }) : null;
}

export interface MigrationCheckpointInput {
  readonly runId: string;
  readonly leaseOwner: string;
  readonly expectedVersion: number;
  readonly expectedCursor: string | null;
  readonly nextCursor: string;
  readonly outcome: 'migrated' | 'already-current';
  readonly resolvesFailure?: boolean;
  readonly now: Date;
  /** Consumer-owned CAS update, executed in the same short transaction as the checkpoint. */
  readonly applyRecordCas?: (transaction: DatabaseTransactionClient) => Promise<boolean>;
}

/** No provider call belongs in this transaction. A failed consumer CAS rolls back the checkpoint. */
export async function checkpointEncryptionMigrationRecord(transaction: DatabaseTransactionClient, input: MigrationCheckpointInput) {
  safeIdentity(input.leaseOwner, 160);
  safeIdentity(input.nextCursor, 256);
  if (input.nextCursor === input.expectedCursor || !Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 0) throw new EncryptionMigrationConflict();
  if (input.outcome === 'migrated' && !input.applyRecordCas) throw new EncryptionMigrationConflict();
  const run = await transaction.encryptionMigrationRun.findUnique({ where: { id: input.runId } });
  if (!run || run.version !== input.expectedVersion || run.cursor !== input.expectedCursor || run.status !== 'RUNNING'
    || run.leaseOwner !== input.leaseOwner || !run.leaseExpiresAt || run.leaseExpiresAt <= input.now
    || (input.resolvesFailure && run.failedCount < 1n)) throw new EncryptionMigrationConflict();
  if (input.applyRecordCas && !(await input.applyRecordCas(transaction))) throw new EncryptionMigrationConflict();
  const updated = await transaction.encryptionMigrationRun.updateMany({
    where: { id: input.runId, version: input.expectedVersion, cursor: input.expectedCursor, status: 'RUNNING', leaseOwner: input.leaseOwner, leaseExpiresAt: { gt: input.now } },
    data: {
      cursor: input.nextCursor,
      discoveredCount: { increment: 1 },
      ...(input.outcome === 'migrated' ? { migratedCount: { increment: 1 } } : { alreadyCurrentCount: { increment: 1 } }),
      ...(input.resolvesFailure ? { failedCount: { decrement: 1 }, lastFailureCode: null } : {}),
      remainingCount: null,
      version: { increment: 1 },
    },
  });
  if (updated.count !== 1) throw new EncryptionMigrationConflict();
  return transaction.encryptionMigrationRun.findUniqueOrThrow({ where: { id: input.runId } });
}

export async function blockEncryptionMigrationRun(
  client: PrismaClient,
  input: { readonly runId: string; readonly leaseOwner: string; readonly expectedVersion: number; readonly failureCode: SafeMigrationFailureCode; readonly now: Date },
) {
  if (!['KEY_UNAVAILABLE', 'RECORD_CONFLICT', 'INVALID_ENVELOPE', 'UNKNOWN_POLICY', 'OPERATOR_REVIEW'].includes(input.failureCode)) throw new Error('Invalid safe migration failure code');
  const updated = await client.encryptionMigrationRun.updateMany({
    where: { id: input.runId, version: input.expectedVersion, status: 'RUNNING', leaseOwner: safeIdentity(input.leaseOwner, 160), leaseExpiresAt: { gt: input.now } },
    data: { status: 'BLOCKED', leaseOwner: null, leaseExpiresAt: null, failedCount: { increment: 1 }, lastFailureCode: input.failureCode, version: { increment: 1 } },
  });
  if (updated.count !== 1) throw new EncryptionMigrationConflict();
}

export async function resumeBlockedEncryptionMigrationRun(client: PrismaClient, input: { readonly runId: string; readonly expectedVersion: number }) {
  const updated = await client.encryptionMigrationRun.updateMany({
    where: { id: input.runId, version: input.expectedVersion, status: 'BLOCKED' },
    data: { status: 'PENDING', version: { increment: 1 } },
  });
  if (updated.count !== 1) throw new EncryptionMigrationConflict();
}

export interface ReconciliationProbe {
  /** Must read the consumer's authoritative table, not migration counters. */
  countOutdated(): Promise<bigint>;
  /** Consumer must already enforce target-policy encryption on new writes. */
  targetWritePolicyActive(): Promise<boolean>;
}

export async function reconcileEncryptionMigrationRun(
  client: PrismaClient,
  input: { readonly runId: string; readonly leaseOwner: string; readonly expectedVersion: number; readonly now: Date; readonly probe: ReconciliationProbe },
) {
  const [remaining, targetWritePolicyActive] = await Promise.all([input.probe.countOutdated(), input.probe.targetWritePolicyActive()]);
  if (remaining < 0n) throw new Error('Invalid reconciliation count');
  const run = await client.encryptionMigrationRun.findUnique({ where: { id: input.runId } });
  if (!run || run.version !== input.expectedVersion || run.status !== 'RUNNING' || run.leaseOwner !== input.leaseOwner
    || !run.leaseExpiresAt || run.leaseExpiresAt <= input.now) throw new EncryptionMigrationConflict();
  const completed = remaining === 0n && run.failedCount === 0n && targetWritePolicyActive;
  const updated = await client.encryptionMigrationRun.updateMany({
    where: { id: input.runId, version: input.expectedVersion, status: 'RUNNING', leaseOwner: safeIdentity(input.leaseOwner, 160), leaseExpiresAt: { gt: input.now } },
    data: {
      remainingCount: remaining,
      status: completed ? 'COMPLETED' : 'RUNNING',
      ...(completed ? { completedAt: input.now, leaseOwner: null, leaseExpiresAt: null } : {}),
      version: { increment: 1 },
    },
  });
  if (updated.count !== 1) throw new EncryptionMigrationConflict();
  return client.encryptionMigrationRun.findUniqueOrThrow({ where: { id: input.runId } });
}
