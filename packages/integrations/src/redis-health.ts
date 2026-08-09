import { Redis } from 'ioredis';

const DEFAULT_TIMEOUT_MILLISECONDS = 3_000;

function requireRedisUrl(value: string): string {
  const parsed = new URL(value);
  if (!['redis:', 'rediss:'].includes(parsed.protocol)) {
    throw new Error('Redis health URL must use redis or rediss');
  }
  return value;
}

export interface RedisDependencyProbe {
  connect(): Promise<void>;
  ping(): Promise<boolean>;
  close(): Promise<void>;
}

export function createRedisDependencyProbe(options: {
  readonly redisUrl: string;
  readonly connectionName: string;
  readonly timeoutMilliseconds?: number;
}): RedisDependencyProbe {
  const timeoutMilliseconds = options.timeoutMilliseconds ?? DEFAULT_TIMEOUT_MILLISECONDS;
  const connection = new Redis(requireRedisUrl(options.redisUrl), {
    commandTimeout: timeoutMilliseconds,
    connectTimeout: timeoutMilliseconds,
    connectionName: options.connectionName,
    enableOfflineQueue: false,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });
  connection.on('error', () => undefined);

  return Object.freeze({
    async connect(): Promise<void> {
      if (connection.status === 'wait') await connection.connect();
      if ((await connection.ping()) !== 'PONG') throw new Error('Redis dependency did not acknowledge health probe');
    },
    async ping(): Promise<boolean> {
      try {
        return (await connection.ping()) === 'PONG';
      } catch {
        return false;
      }
    },
    async close(): Promise<void> {
      if (connection.status !== 'end') connection.disconnect(false);
    },
  });
}
