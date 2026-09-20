import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import {
  createAccessAuthorityPersistence,
  createAccessScope,
  createDatabaseClient,
  createIdentityPersistence,
  disconnectDatabaseClient,
  readAccessAssignmentSummarySource,
  runInDatabaseTransaction,
  type DatabaseClient,
} from '@noma/database';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { startPostgreSqlTestHarness, type PostgreSqlTestHarness } from '../src/containers.js';
import { DeterministicTestIds } from '../src/random.js';

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname, '../../..');
const databaseDirectory = resolve(root, 'packages/database');
const prismaCli = createRequire(resolve(databaseDirectory, 'package.json')).resolve('prisma/build/index.js');
const ids = new DeterministicTestIds('iam-007-minimum-read');
const at = new Date('2026-09-15T12:00:00.000Z');

describe.sequential('IAM-007 PostgreSQL minimum Access read model', () => {
  let harness: PostgreSqlTestHarness;
  let database: DatabaseClient;

  beforeAll(async () => {
    harness = await startPostgreSqlTestHarness({ seed: 'iam-007-postgresql', environmentSource: { NOMA_ENV: 'test', NOMA_CREDENTIAL_ENVIRONMENT: 'test' } });
    await execFileAsync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
      cwd: databaseDirectory,
      env: { ...process.env, NOMA_ENV: 'test', NOMA_CREDENTIAL_ENVIRONMENT: 'test', DATABASE_URL: harness.connection.databaseUrl },
      timeout: 120_000,
      windowsHide: true,
    });
    database = createDatabaseClient({ databaseUrl: harness.connection.databaseUrl, applicationName: 'iam007_tests' });
  }, 180_000);

  afterAll(async () => {
    if (database) await disconnectDatabaseClient(database);
    if (harness) await harness.stop();
  });

  test('returns only selected columns for the exact scope; wrong scope sees no record', async () => {
    const identity = createIdentityPersistence(database);
    const created = await identity.registerPasswordIdentity({
      id: ids.nextUuid(), publicReference: ids.nextPublicReference('NOMA', 16),
      displayName: 'Synthetic IAM-007 actor', transitionId: ids.nextUuid(), occurredAt: at,
      email: { id: ids.nextUuid(), displayEmail: 'iam007-synthetic@noma.test', primary: true },
      credential: { id: ids.nextUuid(), encodedHash: '$argon2id$synthetic-iam007-hash-value', hashAlgorithm: 'ARGON2ID', hashPolicyVersion: 1, createdAt: at },
    });
    await database.userEmail.update({ where: { id: created.email.id }, data: { verifiedAt: at } });
    await database.user.update({ where: { id: created.user.id }, data: { status: 'ACTIVE', updatedAt: at } });
    const scopeId = ids.nextUuid();
    await runInDatabaseTransaction(database, (tx) => createAccessScope(tx, { id: scopeId, type: 'SELF', userId: created.user.id, createdAt: at }));
    const access = createAccessAuthorityPersistence(database, { environment: 'test' });
    const templateId = ids.nextUuid();
    await access.createDraftRoleTemplate({
      id: templateId, code: 'access.iam007-reader', version: 1, displayName: 'Synthetic IAM-007 reader',
      privilegeClass: 'ORDINARY', requireContactVerified: false, allowedScopes: ['SELF'], allowedSubjects: ['HUMAN'],
      capabilityCodes: ['access.assignment.read'], createdAt: at,
    });
    await access.activateRoleTemplate(templateId, at);
    const assignment = await access.grantRoleAssignment({
      id: ids.nextUuid(), subject: { subjectType: 'HUMAN', userId: created.user.id }, roleTemplateId: templateId,
      scopeId, scopeType: 'SELF', validFrom: at, grantedByUserId: created.user.id,
      grantReason: 'synthetic-restricted-grant-reason', grantedAt: at, containmentTransitionId: ids.nextUuid(),
    });
    const source = await runInDatabaseTransaction(database, (tx) => readAccessAssignmentSummarySource(tx, assignment.id, scopeId));
    expect(source).toEqual({
      id: assignment.id, subjectType: 'HUMAN', scopeType: 'SELF', validFrom: at, validUntil: null, revokedAt: null,
    });
    expect(JSON.stringify(source)).not.toContain('synthetic-restricted-grant-reason');
    expect(JSON.stringify(source)).not.toContain(created.user.id);
    const wrongScope = await runInDatabaseTransaction(database, (tx) => readAccessAssignmentSummarySource(tx, assignment.id, ids.nextUuid()));
    expect(wrongScope).toBeNull();
  });
});
