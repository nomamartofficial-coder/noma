import {
  createQueueJobEnvelope,
  defineQueueJobContract,
  parseOutboxEventEnvelope,
  type OutboxEventEnvelopeV1,
  type QueueJobContract,
  type QueueJobEnvelopeV1,
} from '@noma/contracts';

import { ManualTestClock, type TestInstant } from './clock.js';
import {
  DeterministicTestIds,
  SeededRandomSource,
  type TestSeed,
} from './random.js';

export interface FixtureContext {
  readonly fixtureVersion: 1;
  readonly seed: TestSeed;
  readonly runId: string;
  readonly clock: ManualTestClock;
  readonly random: SeededRandomSource;
  readonly ids: DeterministicTestIds;
}

export interface CreateFixtureContextOptions {
  readonly seed?: TestSeed;
  readonly now?: TestInstant;
  readonly runId?: string;
}

const SECRET_KEY_PATTERN = /(?:password|secret|authorization|credential|private.?key|access.?token|refresh.?token)/i;
const MAX_SYNTHETIC_FIXTURE_STRING_LENGTH = 4_096;
const UNSAFE_VALUE_PATTERNS = [
  /\bsk_live_[a-z0-9_-]+/i,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
];
const CREDENTIAL_URL_SCHEMES = ['postgresql://', 'postgres://', 'rediss://', 'redis://'] as const;

function containsCredentialUrl(value: string): boolean {
  let state: 'none' | 'username' | 'password' = 'none';
  let usernameLength = 0;
  let passwordLength = 0;

  for (let index = 0; index < value.length; index += 1) {
    const scheme = state === 'none'
      ? CREDENTIAL_URL_SCHEMES.find((candidate) => value.slice(index, index + candidate.length).toLowerCase() === candidate)
      : undefined;
    if (scheme !== undefined) {
      state = 'username';
      usernameLength = 0;
      passwordLength = 0;
      index += scheme.length - 1;
      continue;
    }

    const character = value.charAt(index);
    if (state === 'username') {
      if (character === ':' && usernameLength > 0) {
        state = 'password';
      } else if (character === '/' || character === ':' || character.trim() === '') {
        state = 'none';
      } else {
        usernameLength += 1;
      }
    } else if (state === 'password') {
      if (character === '@') {
        if (passwordLength > 0) return true;
        state = 'none';
      } else if (character.trim() === '') {
        state = 'none';
      } else {
        passwordLength += 1;
      }
    }
  }
  return false;
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) return value;
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return Object.freeze(value);
}

export function assertSyntheticFixture(value: unknown, path = 'fixture', depth = 0): void {
  if (depth > 12) throw new Error(`${path} exceeds the synthetic fixture nesting limit`);
  if (typeof value === 'string') {
    if (value.length > MAX_SYNTHETIC_FIXTURE_STRING_LENGTH) {
      throw new Error('synthetic fixture string size limit exceeded');
    }
    for (const pattern of UNSAFE_VALUE_PATTERNS) {
      if (pattern.test(value)) throw new Error(`${path} contains prohibited production-like data`);
    }
    if (containsCredentialUrl(value)) throw new Error(`${path} contains prohibited production-like data`);
    return;
  }
  if (value === null || typeof value === 'number' || typeof value === 'boolean' || value === undefined) return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertSyntheticFixture(entry, `${path}[${index}]`, depth + 1));
    return;
  }
  if (typeof value !== 'object') throw new Error(`${path} must contain serializable fixture values`);
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (key.length > MAX_SYNTHETIC_FIXTURE_STRING_LENGTH) {
      throw new Error('synthetic fixture key size limit exceeded');
    }
    if (SECRET_KEY_PATTERN.test(key) && !(typeof child === 'string' && child.startsWith('test_'))) {
      throw new Error(`${path}.${key} is a prohibited credential-bearing fixture field`);
    }
    assertSyntheticFixture(child, `${path}.${key}`, depth + 1);
  }
}

export function createFixtureContext(options: CreateFixtureContextOptions = {}): FixtureContext {
  const seed = options.seed ?? 6006;
  const ids = new DeterministicTestIds(seed);
  const runId = options.runId ?? ids.nextPublicReference('RUN', 10);
  if (!/^[A-Z0-9][A-Z0-9_-]{2,79}$/i.test(runId)) {
    throw new Error('fixture runId must contain 3 to 80 safe characters');
  }
  return Object.freeze({
    fixtureVersion: 1,
    seed,
    runId,
    clock: new ManualTestClock(options.now),
    random: new SeededRandomSource(seed),
    ids,
  });
}

export type FixtureFactory<TOverrides, TResult> = (
  context: FixtureContext,
  overrides?: TOverrides,
) => TResult;

export function defineFixtureFactory<TOverrides, TResult>(
  builder: (context: FixtureContext, overrides: TOverrides | undefined) => TResult,
): FixtureFactory<TOverrides, TResult> {
  return (context, overrides) => {
    const result = builder(context, overrides);
    assertSyntheticFixture(result);
    return deepFreeze(result);
  };
}

export function createOutboxEventFixture<TPayload = Readonly<Record<string, unknown>>>(
  context: FixtureContext,
  overrides: Partial<OutboxEventEnvelopeV1<TPayload>> = {},
): OutboxEventEnvelopeV1<TPayload> {
  const occurredAt = context.clock.instant();
  const defaultPayload = Object.freeze({ probeId: context.ids.nextPublicReference('PROBE', 10) });
  const event = {
    schemaVersion: 1,
    eventId: context.ids.nextUuid(),
    eventType: 'foundation.process-probe-requested',
    eventVersion: 1,
    aggregate: Object.freeze({
      type: 'foundation-probe',
      id: context.ids.nextPublicReference('AGG', 10),
      version: '1',
    }),
    payload: defaultPayload as TPayload,
    privacyClassification: 'audit',
    servicePrincipal: 'noma_worker',
    correlationId: context.ids.nextUuid(),
    occurredAt,
    availableAt: occurredAt,
    ...overrides,
  };
  assertSyntheticFixture(event);
  return parseOutboxEventEnvelope(event) as OutboxEventEnvelopeV1<TPayload>;
}

function defaultQueueContract<TPayload>(): QueueJobContract<TPayload> {
  return defineQueueJobContract({
    queueName: 'maintenance',
    jobName: 'foundation.process-probe',
    schemaVersion: 1,
    privacyClassification: 'audit',
    authorizedServicePrincipals: ['noma_worker'],
    idempotency: {
      identity: 'outbox-event-id',
      completedDelivery: 'no-op',
      effectCommit: 'same-database-transaction',
    },
    successEvidence: { store: 'postgresql-job-executions', outcome: 'completed' },
    observabilityAttributes: ['queue', 'job', 'outcome'],
    retry: {
      attempts: 3,
      backoff: 'exponential',
      backoffDelayMilliseconds: 1_000,
      jitter: 0.5,
      timeoutMilliseconds: 10_000,
    },
    deadLetter: {
      owner: 'operations',
      attentionAfterMilliseconds: 60_000,
      recoveryAction: 'review-and-replay',
    },
    parsePayload: (value) => value as TPayload,
  });
}

export function createQueueJobFixture<TPayload = Readonly<Record<string, unknown>>>(
  context: FixtureContext,
  options: {
    readonly contract?: QueueJobContract<TPayload>;
    readonly event?: Partial<OutboxEventEnvelopeV1<TPayload>>;
  } = {},
): QueueJobEnvelopeV1<TPayload> {
  const contract = options.contract ?? defaultQueueContract<TPayload>();
  const event = createOutboxEventFixture(context, {
    privacyClassification: contract.privacyClassification,
    servicePrincipal: contract.authorizedServicePrincipals[0] ?? 'noma_worker',
    ...options.event,
  });
  return createQueueJobEnvelope(contract, event);
}
