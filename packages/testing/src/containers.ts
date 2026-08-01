import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer, type StartedRedisContainer } from '@testcontainers/redis';
import { Wait, type ExecResult } from 'testcontainers';

import { DeterministicTestIds, type TestSeed } from './random.js';

export const NOMA_TEST_POSTGRES_IMAGE =
  'postgres:18.4-alpine3.23@sha256:996d0920e4ff9df1fc19dacb904492f3c1ec0ec1cc338f0ad7123be7731c5f5e';
export const NOMA_TEST_REDIS_IMAGE =
  'redis:8.8.1-alpine3.23@sha256:8096655e437712b07503796fb64d81359256cfcff0ab29d95a7da72863786efb';

type EnvironmentSource = Readonly<Record<string, string | undefined>>;

export interface TestHarnessOptions {
  readonly seed?: TestSeed;
  readonly startupTimeoutMilliseconds?: number;
  readonly environmentSource?: EnvironmentSource;
}

export interface PostgreSqlTestConnection {
  readonly host: string;
  readonly port: number;
  readonly database: string;
  readonly username: string;
  readonly databaseUrl: string;
  toJSON(): Readonly<Record<string, unknown>>;
}

export interface RedisTestConnection {
  readonly host: string;
  readonly port: number;
  readonly redisUrl: string;
  toJSON(): Readonly<Record<string, unknown>>;
}

export interface SafeHarnessDescription {
  readonly kind: 'postgresql' | 'redis' | 'noma-infrastructure';
  readonly configured: true;
  readonly host: string;
  readonly ports: Readonly<Record<string, number>>;
  readonly credentials: 'synthetic-test-only';
}

export interface PostgreSqlTestHarness {
  readonly connection: PostgreSqlTestConnection;
  execute(command: readonly string[]): Promise<ExecResult>;
  stop(): Promise<void>;
  toJSON(): SafeHarnessDescription;
}

export interface RedisTestHarness {
  readonly connection: RedisTestConnection;
  executeCli(...arguments_: string[]): Promise<ExecResult>;
  stop(): Promise<void>;
  toJSON(): SafeHarnessDescription;
}

export interface NomaTestRuntimeEnvironment {
  readonly NOMA_ENV: 'test';
  readonly NOMA_CREDENTIAL_ENVIRONMENT: 'test';
  readonly DATABASE_URL: string;
  readonly REDIS_URL: string;
  readonly PUBLIC_WEB_ORIGIN: 'http://127.0.0.1:3000';
  readonly API_PUBLIC_URL: 'http://127.0.0.1:3001';
  toJSON(): Readonly<Record<string, unknown>>;
}

export interface NomaInfrastructureHarness {
  readonly postgres: PostgreSqlTestHarness;
  readonly redis: RedisTestHarness;
  readonly runtimeEnvironment: NomaTestRuntimeEnvironment;
  stop(): Promise<void>;
  toJSON(): SafeHarnessDescription;
}

export interface NomaInfrastructureHarnessOptions extends TestHarnessOptions {
  readonly prepareDatabase?: (connection: PostgreSqlTestConnection) => Promise<void>;
}

const PROHIBITED_ENVIRONMENTS = new Set(['preview', 'staging', 'production']);

function assertSafeTestEnvironment(source: EnvironmentSource): void {
  const applicationEnvironment = source.NOMA_ENV?.trim().toLowerCase();
  const credentialEnvironment = source.NOMA_CREDENTIAL_ENVIRONMENT?.trim().toLowerCase();
  if (applicationEnvironment && PROHIBITED_ENVIRONMENTS.has(applicationEnvironment)) {
    throw new Error('Testcontainers harness is prohibited outside development or test');
  }
  if (credentialEnvironment && PROHIBITED_ENVIRONMENTS.has(credentialEnvironment)) {
    throw new Error('Testcontainers harness cannot use remote-environment credentials');
  }
  if (source.DATABASE_URL || source.REDIS_URL) {
    throw new Error('Testcontainers harness refuses pre-existing database or Redis URLs');
  }
  for (const value of Object.values(source)) {
    if (value?.startsWith('sk_live_')) {
      throw new Error('Testcontainers harness refuses live provider credentials');
    }
  }
}

function startupTimeout(value: number | undefined): number {
  const timeout = value ?? 120_000;
  if (!Number.isSafeInteger(timeout) || timeout < 5_000 || timeout > 300_000) {
    throw new RangeError('container startup timeout must be an integer from 5000 to 300000 milliseconds');
  }
  return timeout;
}

function password(seed: TestSeed, service: string): string {
  return new DeterministicTestIds(`${seed}:${service}`).nextTestToken(40);
}

function redact(value: unknown, secrets: readonly string[]): Error {
  let message = value instanceof Error ? value.message : String(value);
  for (const secret of secrets) message = message.replaceAll(secret, '[REDACTED]');
  message = message
    .replace(/(?:redis|rediss|postgres|postgresql):\/\/\S+/gi, '[REDACTED_URL]')
    .replace(/(password|secret|token|authorization)=?\s*\S+/gi, '$1=[REDACTED]');
  return new Error(`test infrastructure failed: ${message}`, { cause: value });
}

class StartedPostgreSqlHarness implements PostgreSqlTestHarness {
  readonly connection: PostgreSqlTestConnection;
  readonly #container: StartedPostgreSqlContainer;
  #stopped = false;

  constructor(container: StartedPostgreSqlContainer) {
    this.#container = container;
    const connection = {
      host: container.getHost(),
      port: container.getPort(),
      database: container.getDatabase(),
      username: container.getUsername(),
    } as PostgreSqlTestConnection;
    Object.defineProperties(connection, {
      databaseUrl: { enumerable: false, value: container.getConnectionUri() },
      toJSON: {
        enumerable: false,
        value: () => Object.freeze({
          host: connection.host,
          port: connection.port,
          database: connection.database,
          username: connection.username,
          databaseUrl: '[REDACTED_URL]',
        }),
      },
    });
    this.connection = Object.freeze(connection);
  }

  execute(command: readonly string[]): Promise<ExecResult> {
    return this.#container.exec([...command]);
  }

  async stop(): Promise<void> {
    if (this.#stopped) return;
    this.#stopped = true;
    await this.#container.stop({ timeout: 10_000, remove: true, removeVolumes: true });
  }

  toJSON(): SafeHarnessDescription {
    return Object.freeze({
      kind: 'postgresql',
      configured: true,
      host: this.connection.host,
      ports: Object.freeze({ postgresql: this.connection.port }),
      credentials: 'synthetic-test-only',
    });
  }
}

class StartedRedisHarness implements RedisTestHarness {
  readonly connection: RedisTestConnection;
  readonly #container: StartedRedisContainer;
  readonly #password: string;
  #stopped = false;

  constructor(container: StartedRedisContainer, redisPassword: string) {
    this.#container = container;
    this.#password = redisPassword;
    const connection = {
      host: container.getHost(),
      port: container.getPort(),
    } as RedisTestConnection;
    Object.defineProperties(connection, {
      redisUrl: { enumerable: false, value: container.getConnectionUrl() },
      toJSON: {
        enumerable: false,
        value: () => Object.freeze({
          host: connection.host,
          port: connection.port,
          redisUrl: '[REDACTED_URL]',
        }),
      },
    });
    this.connection = Object.freeze(connection);
  }

  executeCli(...arguments_: string[]): Promise<ExecResult> {
    return this.#container.exec([
      'redis-cli',
      '--no-auth-warning',
      '-a',
      this.#password,
      ...arguments_,
    ]);
  }

  async stop(): Promise<void> {
    if (this.#stopped) return;
    this.#stopped = true;
    await this.#container.stop({ timeout: 10_000, remove: true, removeVolumes: true });
  }

  toJSON(): SafeHarnessDescription {
    return Object.freeze({
      kind: 'redis',
      configured: true,
      host: this.connection.host,
      ports: Object.freeze({ redis: this.connection.port }),
      credentials: 'synthetic-test-only',
    });
  }
}

export async function startPostgreSqlTestHarness(
  options: TestHarnessOptions = {},
): Promise<PostgreSqlTestHarness> {
  const source = options.environmentSource ?? process.env;
  assertSafeTestEnvironment(source);
  const seed = options.seed ?? 6006;
  const databasePassword = password(seed, 'postgresql');
  try {
    const container = await new PostgreSqlContainer(NOMA_TEST_POSTGRES_IMAGE)
      .withDatabase('noma_test')
      .withUsername('noma_test')
      .withPassword(databasePassword)
      .withEnvironment({
        POSTGRES_INITDB_ARGS: '--auth-host=scram-sha-256 --data-checksums --encoding=UTF8 --locale=C.UTF-8',
      })
      .withCommand([
        'postgres',
        '-c',
        'timezone=UTC',
        '-c',
        'log_timezone=UTC',
        '-c',
        'password_encryption=scram-sha-256',
      ])
      .withHealthCheck({
        test: ['CMD-SHELL', 'test "$(head -n 1 "$PGDATA/postmaster.pid")" = "1" && pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"'],
        interval: 1_000,
        timeout: 3_000,
        retries: 60,
        startPeriod: 3_000,
      })
      .withWaitStrategy(Wait.forHealthCheck())
      .withStartupTimeout(startupTimeout(options.startupTimeoutMilliseconds))
      .start();
    return new StartedPostgreSqlHarness(container);
  } catch (error) {
    throw redact(error, [databasePassword]);
  }
}

export async function startRedisTestHarness(
  options: TestHarnessOptions = {},
): Promise<RedisTestHarness> {
  const source = options.environmentSource ?? process.env;
  assertSafeTestEnvironment(source);
  const seed = options.seed ?? 6006;
  const redisPassword = password(seed, 'redis');
  try {
    const container = await new RedisContainer(NOMA_TEST_REDIS_IMAGE)
      .withPassword(redisPassword)
      .withEnvironment({ REDISCLI_AUTH: redisPassword })
      .withCommand([
        'redis-server',
        '--appendonly',
        'yes',
        '--appendfsync',
        'everysec',
        '--maxmemory-policy',
        'noeviction',
        '--requirepass',
        redisPassword,
      ])
      .withHealthCheck({
        test: ['CMD-SHELL', 'redis-cli --no-auth-warning ping | grep -qx PONG'],
        interval: 1_000,
        timeout: 3_000,
        retries: 60,
        startPeriod: 2_000,
      })
      .withWaitStrategy(Wait.forHealthCheck())
      .withStartupTimeout(startupTimeout(options.startupTimeoutMilliseconds))
      .start();
    return new StartedRedisHarness(container, redisPassword);
  } catch (error) {
    throw redact(error, [redisPassword]);
  }
}

export async function startNomaInfrastructureHarness(
  options: NomaInfrastructureHarnessOptions = {},
): Promise<NomaInfrastructureHarness> {
  const source = options.environmentSource ?? process.env;
  assertSafeTestEnvironment(source);
  const starts = await Promise.allSettled([
    startPostgreSqlTestHarness(options),
    startRedisTestHarness(options),
  ]);
  const postgres = starts[0]?.status === 'fulfilled' ? starts[0].value : undefined;
  const redis = starts[1]?.status === 'fulfilled' ? starts[1].value : undefined;
  const failures = starts.filter((result) => result.status === 'rejected');
  if (!postgres || !redis || failures.length > 0) {
    await Promise.allSettled([postgres?.stop(), redis?.stop()]);
    throw redact(failures[0]?.reason ?? 'container startup did not return both dependencies', []);
  }

  try {
    await options.prepareDatabase?.(postgres.connection);
  } catch (error) {
    await Promise.allSettled([postgres.stop(), redis.stop()]);
    throw redact(error, [postgres.connection.databaseUrl, redis.connection.redisUrl]);
  }

  const runtimeEnvironment = {
    NOMA_ENV: 'test',
    NOMA_CREDENTIAL_ENVIRONMENT: 'test',
    PUBLIC_WEB_ORIGIN: 'http://127.0.0.1:3000',
    API_PUBLIC_URL: 'http://127.0.0.1:3001',
  } as NomaTestRuntimeEnvironment;
  Object.defineProperties(runtimeEnvironment, {
    DATABASE_URL: { enumerable: false, value: postgres.connection.databaseUrl },
    REDIS_URL: { enumerable: false, value: redis.connection.redisUrl },
    toJSON: {
      enumerable: false,
      value: () => Object.freeze({
        NOMA_ENV: 'test',
        NOMA_CREDENTIAL_ENVIRONMENT: 'test',
        DATABASE_URL: '[REDACTED_URL]',
        REDIS_URL: '[REDACTED_URL]',
        PUBLIC_WEB_ORIGIN: runtimeEnvironment.PUBLIC_WEB_ORIGIN,
        API_PUBLIC_URL: runtimeEnvironment.API_PUBLIC_URL,
      }),
    },
  });
  Object.freeze(runtimeEnvironment);
  let stopped = false;
  return Object.freeze({
    postgres,
    redis,
    runtimeEnvironment,
    stop: async () => {
      if (stopped) return;
      stopped = true;
      const results = await Promise.allSettled([redis.stop(), postgres.stop()]);
      const errors = results.filter((result) => result.status === 'rejected');
      if (errors.length > 0) throw new AggregateError(errors.map((result) => result.reason), 'test infrastructure cleanup failed');
    },
    toJSON: () => Object.freeze({
      kind: 'noma-infrastructure' as const,
      configured: true as const,
      host: postgres.connection.host,
      ports: Object.freeze({
        postgresql: postgres.connection.port,
        redis: redis.connection.port,
      }),
      credentials: 'synthetic-test-only' as const,
    }),
  });
}
