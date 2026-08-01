import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from './generated/prisma/client.js';

const DEFAULT_MAX_CONNECTIONS = 10;
const DEFAULT_CONNECTION_TIMEOUT_MILLISECONDS = 5_000;
const DEFAULT_IDLE_TIMEOUT_MILLISECONDS = 30_000;
const DEFAULT_STATEMENT_TIMEOUT_MILLISECONDS = 15_000;

export interface DatabaseClientOptions {
  readonly databaseUrl: string;
  readonly applicationName: string;
  readonly maxConnections?: number;
  readonly connectionTimeoutMilliseconds?: number;
  readonly idleTimeoutMilliseconds?: number;
  readonly statementTimeoutMilliseconds?: number;
}

export type DatabaseClient = PrismaClient;

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

function requireApplicationName(value: string): string {
  const normalized = value.trim();
  if (!/^[a-z][a-z0-9_-]{1,62}$/i.test(normalized)) {
    throw new Error('database application name must be 2 to 63 safe characters');
  }
  return normalized;
}

function requirePostgreSqlUrl(value: string): string {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('database URL must be a valid PostgreSQL URL');
  }

  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error('database URL must use the postgres or postgresql protocol');
  }

  return value;
}

export function createDatabaseClient(options: DatabaseClientOptions): DatabaseClient {
  const adapter = new PrismaPg({
    connectionString: requirePostgreSqlUrl(options.databaseUrl),
    application_name: requireApplicationName(options.applicationName),
    max: requireIntegerInRange(
      'maxConnections',
      options.maxConnections ?? DEFAULT_MAX_CONNECTIONS,
      1,
      50,
    ),
    connectionTimeoutMillis: requireIntegerInRange(
      'connectionTimeoutMilliseconds',
      options.connectionTimeoutMilliseconds ?? DEFAULT_CONNECTION_TIMEOUT_MILLISECONDS,
      100,
      30_000,
    ),
    idleTimeoutMillis: requireIntegerInRange(
      'idleTimeoutMilliseconds',
      options.idleTimeoutMilliseconds ?? DEFAULT_IDLE_TIMEOUT_MILLISECONDS,
      1_000,
      120_000,
    ),
    statement_timeout: requireIntegerInRange(
      'statementTimeoutMilliseconds',
      options.statementTimeoutMilliseconds ?? DEFAULT_STATEMENT_TIMEOUT_MILLISECONDS,
      100,
      120_000,
    ),
  });

  return new PrismaClient({ adapter });
}

export async function disconnectDatabaseClient(client: DatabaseClient): Promise<void> {
  await client.$disconnect();
}
