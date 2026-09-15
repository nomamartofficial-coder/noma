import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

import {
  createAccessAuthorityPersistence,
  createAccessScope,
  createDatabaseClient,
  createIdentityPersistence,
  disconnectDatabaseClient,
  loadActiveAuthorityFactForUse,
  lockAuthenticatedSessionForAuthorization,
  runInDatabaseTransaction,
  type AccessAuthorityPersistence,
  type DatabaseClient,
} from '@noma/database';
import {
  authorizationPolicyRegistry,
  createTrustedAuthorizationContext,
  evaluateAuthorization,
} from '@noma/platform/access';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { startPostgreSqlTestHarness, type PostgreSqlTestHarness } from '../src/containers.js';
import { DeterministicTestIds } from '../src/random.js';

const execFileAsync = promisify(execFile);
const ROOT = resolve(import.meta.dirname, '../../..');
const DATABASE_DIR = resolve(ROOT, 'packages/database');
const prismaCli = createRequire(resolve(DATABASE_DIR, 'package.json')).resolve('prisma/build/index.js');
const ids = new DeterministicTestIds('iam-006-authorization');
const AT = new Date('2026-09-15T12:00:00.000Z');

async function deployMigrations(databaseUrl: string): Promise<void> {
  await execFileAsync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
    cwd: DATABASE_DIR,
    env: { ...process.env, NOMA_ENV: 'test', NOMA_CREDENTIAL_ENVIRONMENT: 'test', DATABASE_URL: databaseUrl },
    timeout: 120_000,
    windowsHide: true,
  });
}

describe.sequential('IAM-006 PostgreSQL authorization linearization', () => {
  let harness: PostgreSqlTestHarness;
  let database: DatabaseClient;
  let access: AccessAuthorityPersistence;
  let actorId: string;
  let grantorId: string;
  let scopeId: string;
  let templateId: string;
  let sessionDigest: string;

  async function activeUser(label: string): Promise<string> {
    const identity = createIdentityPersistence(database);
    const created = await identity.registerPasswordIdentity({
      id: ids.nextUuid(), publicReference: ids.nextPublicReference('NOMA', 16), displayName: `Synthetic ${label}`,
      transitionId: ids.nextUuid(), occurredAt: AT,
      email: { id: ids.nextUuid(), displayEmail: `${label}-${ids.nextPublicReference('MAIL', 8).toLowerCase()}@noma.test`, primary: true },
      credential: { id: ids.nextUuid(), encodedHash: '$argon2id$synthetic-iam006-hash-value', hashAlgorithm: 'ARGON2ID', hashPolicyVersion: 1, createdAt: AT },
    });
    await database.userEmail.update({ where: { id: created.email.id }, data: { verifiedAt: AT } });
    await database.user.update({ where: { id: created.user.id }, data: { status: 'ACTIVE', updatedAt: AT } });
    return created.user.id;
  }

  async function assignmentFor(userId: string) {
    return access.grantRoleAssignment({
      id: ids.nextUuid(), subject: { subjectType: 'HUMAN', userId }, roleTemplateId: templateId,
      scopeId, scopeType: 'SELF', validFrom: AT, grantedByUserId: grantorId,
      grantReason: 'Synthetic policy integration grant', grantedAt: AT, containmentTransitionId: ids.nextUuid(),
    });
  }

  beforeAll(async () => {
    harness = await startPostgreSqlTestHarness({ seed: 'iam-006-postgresql', environmentSource: { NOMA_ENV: 'test', NOMA_CREDENTIAL_ENVIRONMENT: 'test' } });
    await deployMigrations(harness.connection.databaseUrl);
    database = createDatabaseClient({ databaseUrl: harness.connection.databaseUrl, applicationName: 'iam006_tests', maxConnections: 16 });
    access = createAccessAuthorityPersistence(database, { environment: 'test' });
    [actorId, grantorId] = await Promise.all([activeUser('authorization-actor'), activeUser('authorization-grantor')]);
    const identity = createIdentityPersistence(database);
    sessionDigest = createHash('sha256').update('synthetic-iam006-session').digest('hex');
    const actor = await database.user.findUniqueOrThrow({ where: { id: actorId } });
    await identity.createSession({
      id: ids.nextUuid(), userId: actorId, tokenDigest: sessionDigest, assurance: 'CONTACT_VERIFIED',
      issuedSecurityVersion: actor.securityVersion, issuedAt: AT, idleExpiresAt: new Date(AT.getTime() + 3_600_000),
      absoluteExpiresAt: new Date(AT.getTime() + 7_200_000), deviceLabel: 'Synthetic IAM-006 browser', transitionId: ids.nextUuid(),
    });
    scopeId = ids.nextUuid();
    await runInDatabaseTransaction(database, (transaction) => createAccessScope(transaction, { id: scopeId, type: 'SELF', userId: actorId, createdAt: AT }));
    templateId = ids.nextUuid();
    await access.createDraftRoleTemplate({
      id: templateId, code: 'access.iam006-reader', version: 1, displayName: 'Synthetic IAM-006 reader',
      privilegeClass: 'ORDINARY', requireContactVerified: false, allowedScopes: ['SELF'], allowedSubjects: ['HUMAN'],
      capabilityCodes: ['access.assignment.read'], createdAt: AT,
    });
    await access.activateRoleTemplate(templateId, AT);
    await database.$executeRawUnsafe('CREATE TABLE iam006_synthetic_effects (id uuid PRIMARY KEY, assignment_id uuid NOT NULL, created_at timestamptz NOT NULL)');
  }, 180_000);

  afterAll(async () => {
    if (database) await disconnectDatabaseClient(database);
    if (harness) await harness.stop();
  });

  test('commits a protected effect before a later revocation, with one assignment fact and current session', async () => {
    const assignment = await assignmentFor(actorId);
    const effectId = ids.nextUuid();
    let release!: () => void;
    const mayFinish = new Promise<void>((resolveRelease) => { release = resolveRelease; });
    let authorized!: () => void;
    const isAuthorized = new Promise<void>((resolveAuthorized) => { authorized = resolveAuthorized; });
    const use = runInDatabaseTransaction(database, async (transaction) => {
      await transaction.$queryRawUnsafe('SELECT id FROM access_scopes WHERE id = $1::uuid FOR UPDATE', scopeId);
      const authority = await loadActiveAuthorityFactForUse(transaction, { assignmentId: assignment.id, subject: { subjectType: 'HUMAN', userId: actorId }, capabilityCode: 'access.assignment.read', environment: 'test', at: AT });
      const authenticated = await lockAuthenticatedSessionForAuthorization(transaction, { tokenDigest: sessionDigest, at: AT });
      const decision = evaluateAuthorization(authorizationPolicyRegistry, 'access.assignment.read.v1', createTrustedAuthorizationContext({
        actionId: 'access.assignment.read', actor: { actorType: 'HUMAN', userId: actorId, session: authenticated },
        resource: { resourceType: 'access-assignment', resourceId: assignment.id, authorityScopeId: scopeId, authorityScopeType: 'SELF' },
        environment: 'test', evaluatedAt: AT, authorityFacts: authority ? [authority] : [], relationshipFacts: [], businessFacts: [], featureFacts: [], restrictionFacts: [], emergencyFacts: [], approvalExpectation: null, approvalFact: null,
      }));
      expect(decision.decision).toBe('ALLOW');
      authorized();
      await mayFinish;
      await transaction.$executeRawUnsafe('INSERT INTO iam006_synthetic_effects (id, assignment_id, created_at) VALUES ($1::uuid, $2::uuid, $3)', effectId, assignment.id, AT);
    }, { timeoutMilliseconds: 30_000 });
    await isAuthorized;
    const revoke = access.revokeRoleAssignment(assignment.id, assignment.version, grantorId, 'Synthetic concurrent revoke', new Date(AT.getTime() + 1), ids.nextUuid());
    release();
    await use;
    await revoke;
    expect(await database.$queryRawUnsafe('SELECT id FROM iam006_synthetic_effects WHERE id = $1::uuid', effectId)).toEqual([{ id: effectId }]);
    expect((await database.roleAssignment.findUniqueOrThrow({ where: { id: assignment.id } })).revokedAt).not.toBeNull();
  }, 60_000);

  test('denies without an effect when revocation linearizes first', async () => {
    const assignment = await assignmentFor(actorId);
    await access.revokeRoleAssignment(assignment.id, assignment.version, grantorId, 'Synthetic prior revoke', AT, ids.nextUuid());
    const effectId = ids.nextUuid();
    const decision = await runInDatabaseTransaction(database, async (transaction) => {
      const authority = await loadActiveAuthorityFactForUse(transaction, { assignmentId: assignment.id, subject: { subjectType: 'HUMAN', userId: actorId }, capabilityCode: 'access.assignment.read', environment: 'test', at: new Date(AT.getTime() + 1) });
      const authenticated = await lockAuthenticatedSessionForAuthorization(transaction, { tokenDigest: sessionDigest, at: new Date(AT.getTime() + 1) });
      const result = evaluateAuthorization(authorizationPolicyRegistry, 'access.assignment.read.v1', createTrustedAuthorizationContext({
        actionId: 'access.assignment.read', actor: { actorType: 'HUMAN', userId: actorId, session: authenticated },
        resource: { resourceType: 'access-assignment', resourceId: assignment.id, authorityScopeId: scopeId, authorityScopeType: 'SELF' },
        environment: 'test', evaluatedAt: new Date(AT.getTime() + 1), authorityFacts: authority ? [authority] : [], relationshipFacts: [], businessFacts: [], featureFacts: [], restrictionFacts: [], emergencyFacts: [], approvalExpectation: null, approvalFact: null,
      }));
      if (result.decision === 'ALLOW') await transaction.$executeRawUnsafe('INSERT INTO iam006_synthetic_effects (id, assignment_id, created_at) VALUES ($1::uuid, $2::uuid, $3)', effectId, assignment.id, AT);
      return result;
    });
    expect(decision).toEqual(expect.objectContaining({ decision: 'DENY', reasonCode: 'AUTHORITY_MISSING' }));
    expect(await database.$queryRawUnsafe('SELECT id FROM iam006_synthetic_effects WHERE id = $1::uuid', effectId)).toEqual([]);
  }, 60_000);
});
