import { createHmac } from 'node:crypto';

import type {
  AuthRateLimitAction,
  IdentityAuthRateLimitDecision,
  IdentityAuthRateLimitInput,
  IdentityAuthRateLimiter,
} from '@noma/platform/identity';
import { Redis } from 'ioredis';

const RATE_LIMIT_SCRIPT = `
local blocked = 0
local retry = 0
for index = 1, #KEYS do
  local count = redis.call('INCR', KEYS[index])
  if count == 1 then redis.call('PEXPIRE', KEYS[index], ARGV[1]) end
  if count > tonumber(ARGV[index + 1]) then
    blocked = 1
    local ttl = redis.call('PTTL', KEYS[index])
    if ttl > retry then retry = ttl end
  end
end
return {blocked, retry}`;

const DEFAULTS = Object.freeze({
  REGISTER: Object.freeze({ windowMilliseconds: 60 * 60_000, identity: 5, pair: 10, network: 100 }),
  SIGN_IN: Object.freeze({ windowMilliseconds: 15 * 60_000, identity: 10, pair: 20, network: 200 }),
});

export class AuthRateLimiterUnavailableError extends Error {
  constructor() {
    super('authentication rate limiter is unavailable');
    this.name = 'AuthRateLimiterUnavailableError';
  }
}

function safeEnvironment(value: string): string {
  const normalized = value.trim();
  if (!/^[a-z][a-z0-9_-]{1,31}$/i.test(normalized)) throw new Error('rate-limit environment is invalid');
  return normalized;
}

function requireRedisUrl(value: string): string {
  const url = new URL(value);
  if (!['redis:', 'rediss:'].includes(url.protocol)) throw new Error('Redis URL must use redis or rediss');
  return value;
}

function requireSecret(value: string): Buffer {
  if (value.length < 32) throw new Error('authentication correlation secret must contain at least 32 characters');
  return Buffer.from(value, 'utf8');
}

function normalizeNetworkSignal(value: string): string {
  const normalized = value.trim();
  return normalized && normalized.length <= 200 ? normalized : 'unknown-network';
}

export class RedisIdentityAuthRateLimiter implements IdentityAuthRateLimiter {
  readonly #redis: Redis;
  readonly #secret: Buffer;
  readonly #prefix: string;

  constructor(options: { readonly redisUrl: string; readonly applicationEnvironment: string; readonly correlationSecret: string }) {
    const environment = safeEnvironment(options.applicationEnvironment);
    this.#prefix = `noma:${environment}:auth-rate`;
    this.#secret = requireSecret(options.correlationSecret);
    this.#redis = new Redis(requireRedisUrl(options.redisUrl), {
      commandTimeout: 2_000,
      connectTimeout: 2_000,
      connectionName: `noma-${environment}-auth-rate-limiter`,
      enableOfflineQueue: false,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
    this.#redis.on('error', () => undefined);
  }

  async check(input: IdentityAuthRateLimitInput): Promise<IdentityAuthRateLimitDecision> {
    const policy = DEFAULTS[input.action];
    const identity = this.#correlate(`identity|${input.normalizedEmail}`);
    const network = this.#correlate(`network|${normalizeNetworkSignal(input.networkSignal)}`);
    const pair = this.#correlate(`pair|${input.normalizedEmail}|${normalizeNetworkSignal(input.networkSignal)}`);
    const keys = [
      `${this.#prefix}:${input.action}:identity:${identity}`,
      `${this.#prefix}:${input.action}:pair:${pair}`,
      `${this.#prefix}:${input.action}:network:${network}`,
    ];
    try {
      if (this.#redis.status === 'wait') await this.#redis.connect();
      const result = await this.#redis.eval(
        RATE_LIMIT_SCRIPT,
        keys.length,
        ...keys,
        String(policy.windowMilliseconds),
        String(policy.identity),
        String(policy.pair),
        String(policy.network),
      ) as [number, number];
      return Object.freeze({
        allowed: result[0] === 0,
        retryAfterSeconds: result[0] === 0 ? 0 : Math.max(1, Math.ceil(result[1] / 1_000)),
      });
    } catch {
      throw new AuthRateLimiterUnavailableError();
    }
  }

  async close(): Promise<void> {
    if (this.#redis.status !== 'end') this.#redis.disconnect(false);
  }

  #correlate(value: string): string {
    return createHmac('sha256', this.#secret).update(value, 'utf8').digest('hex');
  }
}
