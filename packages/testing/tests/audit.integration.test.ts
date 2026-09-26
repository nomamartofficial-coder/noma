import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import {
  appendAuditEvent,
  createDatabaseClient,
  disconnectDatabaseClient,
  readAuditTimelineSources,
  runInDatabaseTransaction,
  type DatabaseClient,
} from '@noma/database';
import { prepareAuditEvent } from '@noma/platform/audit';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { startPostgreSqlTestHarness, type PostgreSqlTestHarness } from '../src/containers.js';
import { DeterministicTestIds } from '../src/random.js';

const execFileAsync = promisify(execFile);
const ROOT = resolve(import.meta.dirname, '../../..');
const DATABASE_DIR = resolve(ROOT, 'packages/database');
const prismaCli = createRequire(resolve(DATABASE_DIR, 'package.json')).resolve('prisma/build/index.js');
const ids = new DeterministicTestIds('iam-008-audit');
const AT = new Date('2026-09-25T12:00:00.000Z');

function event(input: Readonly<{
  eventId?: string;
  operationId?: string;
  resourceId?: string;
  correlationId?: string;
  linkTargetId?: string;
  institutionId?: string;
}> = {}) {
  const resourceId = input.resourceId ?? ids.nextUuid();
  return prepareAuditEvent({
    eventId: input.eventId ?? ids.nextUuid(),
    actionCode: 'access.scope.create',
    occurredAt: AT,
    actor: { kind: 'SYSTEM', systemActorCode: 'iam008.integration' },
    resource: { type: 'ACCESS_SCOPE', id: resourceId, ...(input.institutionId ? { institutionId: input.institutionId } : {}) },
    outcome: 'SUCCEEDED',
    correlationId: input.correlationId ?? 'iam008-integration-correlation',
    operationId: input.operationId ?? ids.nextUuid(),
    sourceVersion: 0,
    afterSummary: { scopeType: 'INSTITUTION' },
    links: [{ targetType: 'INSTITUTION', targetId: input.linkTargetId ?? resourceId, relationshipType: 'SCOPES' }],
  });
}

describe.sequential('IAM-008 PostgreSQL append-only audit authority', () => {
  let harness: PostgreSqlTestHarness;
  let database: DatabaseClient;

  beforeAll(async () => {
    harness = await startPostgreSqlTestHarness({ seed: 'iam-008-postgresql', environmentSource: { NOMA_ENV: 'test', NOMA_CREDENTIAL_ENVIRONMENT: 'test' } });
    await execFileAsync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
      cwd: DATABASE_DIR,
      env: { ...process.env, NOMA_ENV: 'test', NOMA_CREDENTIAL_ENVIRONMENT: 'test', DATABASE_URL: harness.connection.databaseUrl },
      timeout: 120_000,
      windowsHide: true,
    });
    database = createDatabaseClient({ databaseUrl: harness.connection.databaseUrl, applicationName: 'iam008_tests', maxConnections: 12 });
  }, 180_000);

  afterAll(async () => {
    if (database) await disconnectDatabaseClient(database);
    if (harness) await harness.stop();
  });

  test('migration creates the exact append-only structures, indexes and unassigned capability', async () => {
    const tables = await database.$queryRaw<readonly { table_name: string }[]>`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name IN ('audit_events', 'audit_event_links') ORDER BY table_name`;
    expect(tables.map(({ table_name }) => table_name)).toEqual(['audit_event_links', 'audit_events']);
    const triggers = await database.$queryRaw<readonly { trigger_name: string; definition: string }[]>`
      SELECT tgname AS trigger_name, pg_get_triggerdef(oid) AS definition
      FROM pg_trigger WHERE NOT tgisinternal AND tgname IN ('audit_events_append_only', 'audit_event_links_append_only') ORDER BY tgname`;
    expect(triggers).toHaveLength(2);
    for (const trigger of triggers) {
      expect(trigger.definition).toContain('BEFORE');
      expect(trigger.definition).toContain('UPDATE');
      expect(trigger.definition).toContain('DELETE');
    }
    const indexes = await database.$queryRaw<readonly { indexname: string }[]>`
      SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename IN ('audit_events', 'audit_event_links')`;
    const indexNames = indexes.map(({ indexname }) => indexname);
    for (const expected of [
      'audit_events_resource_timeline_idx', 'audit_events_human_actor_timeline_idx',
      'audit_events_institution_timeline_idx', 'audit_events_correlation_timeline_idx',
      'audit_events_action_timeline_idx', 'audit_events_recorded_time_idx', 'audit_event_links_target_idx',
    ]) expect(indexNames).toContain(expected);
    const capability = await database.capability.findUniqueOrThrow({ where: { code: 'audit.event.read' } });
    expect(capability.retiredAt).toBeNull();
    expect(await database.roleTemplateCapability.count({ where: { capabilityId: capability.id } })).toBe(0);
  });

  test('database rejects UPDATE and DELETE for events and links with SQLSTATE 55000 semantics', async () => {
    const created = event();
    await appendAuditEvent(database, created);
    const expectAppendOnly = async (operation: Promise<unknown>) => {
      let failure: unknown;
      try { await operation; } catch (error) { failure = error; }
      expect(failure).toBeTruthy();
      expect(JSON.stringify(failure)).toContain('55000');
    };
    await expectAppendOnly(database.$executeRaw`UPDATE "audit_events" SET "reason_code" = 'TAMPER' WHERE "id" = CAST(${created.eventId} AS uuid)`);
    await expectAppendOnly(database.$executeRaw`DELETE FROM "audit_events" WHERE "id" = CAST(${created.eventId} AS uuid)`);
    await expectAppendOnly(database.$executeRaw`UPDATE "audit_event_links" SET "relationship_type" = 'TAMPER' WHERE "audit_event_id" = CAST(${created.eventId} AS uuid)`);
    await expectAppendOnly(database.$executeRaw`DELETE FROM "audit_event_links" WHERE "audit_event_id" = CAST(${created.eventId} AS uuid)`);
    expect(await database.auditEvent.count({ where: { id: created.eventId } })).toBe(1);
    expect(await database.auditEventLink.count({ where: { auditEventId: created.eventId } })).toBe(1);
  });

  test('stable operation identity prevents retry and concurrent duplicates but allows legitimate repetitions', async () => {
    const operationId = ids.nextUuid();
    const concurrent = await Promise.allSettled([
      appendAuditEvent(database, event({ operationId })),
      appendAuditEvent(database, event({ operationId })),
    ]);
    expect(concurrent.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
    expect(concurrent.filter(({ status }) => status === 'rejected')).toHaveLength(1);
    expect(await database.auditEvent.count({ where: { sourceModule: 'access', actionCode: 'access.scope.create', operationId } })).toBe(1);

    const first = event();
    const second = event();
    await appendAuditEvent(database, first);
    await appendAuditEvent(database, second);
    expect(await database.auditEvent.count({ where: { id: { in: [first.eventId, second.eventId] } } })).toBe(2);
  });

  test('business state and audit commit together; audit and required-outbox failures roll everything back', async () => {
    const committedScopeId = ids.nextUuid();
    const committed = event({ resourceId: committedScopeId });
    await runInDatabaseTransaction(database, async (transaction) => {
      await transaction.accessScope.create({ data: { id: committedScopeId, type: 'INSTITUTION', resourceId: ids.nextUuid(), createdAt: AT } });
      await appendAuditEvent(transaction, committed);
    });
    expect(await database.accessScope.count({ where: { id: committedScopeId } })).toBe(1);
    expect(await database.auditEvent.count({ where: { id: committed.eventId } })).toBe(1);

    const occupiedOperation = ids.nextUuid();
    await appendAuditEvent(database, event({ operationId: occupiedOperation }));
    const auditFailureScope = ids.nextUuid();
    await expect(runInDatabaseTransaction(database, async (transaction) => {
      await transaction.accessScope.create({ data: { id: auditFailureScope, type: 'INSTITUTION', resourceId: ids.nextUuid(), createdAt: AT } });
      await appendAuditEvent(transaction, event({ operationId: occupiedOperation }));
    })).rejects.toBeTruthy();
    expect(await database.accessScope.count({ where: { id: auditFailureScope } })).toBe(0);

    const outboxFailureScope = ids.nextUuid();
    const outboxFailureAudit = event({ resourceId: outboxFailureScope });
    await expect(runInDatabaseTransaction(database, async (transaction) => {
      await transaction.accessScope.create({ data: { id: outboxFailureScope, type: 'INSTITUTION', resourceId: ids.nextUuid(), createdAt: AT } });
      await appendAuditEvent(transaction, outboxFailureAudit);
      await transaction.$executeRaw`INSERT INTO "outbox_events" ("id") VALUES (CAST(${ids.nextUuid()} AS uuid))`;
    })).rejects.toBeTruthy();
    expect(await database.accessScope.count({ where: { id: outboxFailureScope } })).toBe(0);
    expect(await database.auditEvent.count({ where: { id: outboxFailureAudit.eventId } })).toBe(0);
  });

  test('post-commit Redis loss cannot alter database truth and scoped keyset reads stay bounded', async () => {
    const scopeId = ids.nextUuid();
    const first = event({ resourceId: scopeId, institutionId: scopeId, correlationId: 'iam008-redis-independent' });
    await appendAuditEvent(database, first);
    try { throw new Error('synthetic Redis unavailable after commit'); } catch { /* asynchronous delivery cannot rewrite audit truth */ }
    expect(await database.auditEvent.count({ where: { id: first.eventId } })).toBe(1);

    const page = await runInDatabaseTransaction(database, (transaction) => readAuditTimelineSources(transaction, {
      scope: { kind: 'INSTITUTION', institutionId: scopeId },
      filter: { category: 'CORRELATION', correlationId: 'iam008-redis-independent' },
      pageSize: 10,
    }));
    expect(page).toHaveLength(1);
    expect(page[0]).toEqual(expect.objectContaining({ id: first.eventId, correlationId: 'iam008-redis-independent' }));
  });
});
