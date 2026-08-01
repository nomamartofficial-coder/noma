import { describe, expect, test } from 'vitest';

import {
  AsyncBarrier,
  DeterministicTestIds,
  ManualTestClock,
  ScriptedOutcomeAbortedError,
  ScriptedOutcomeController,
  SeededRandomSource,
  TestResourceScope,
  createFixtureContext,
  createOutboxEventFixture,
  createQueueJobFixture,
  createSyntheticPersona,
  defineFixtureFactory,
  pollUntil,
} from '../src/index.js';

describe('deterministic clocks, randomness, and fixtures', () => {
  test('manual clock supports exact before, at, and after boundaries', () => {
    const clock = new ManualTestClock('2026-08-01T10:00:00.000Z');
    clock.advanceBy(999);
    expect(clock.instant()).toBe('2026-08-01T10:00:00.999Z');
    clock.advanceBy(1);
    expect(clock.instant()).toBe('2026-08-01T10:00:01.000Z');
    clock.advanceBy(1);
    expect(clock.instant()).toBe('2026-08-01T10:00:01.001Z');
    const returned = clock.now();
    returned.setUTCFullYear(2030);
    expect(clock.instant()).toBe('2026-08-01T10:00:01.001Z');
  });

  test('same seed reproduces random sequences and valid UUID identities', () => {
    const first = new SeededRandomSource('noma-seed');
    const second = new SeededRandomSource('noma-seed');
    expect([first.nextUint32(), first.nextUint32(), first.nextFloat()])
      .toEqual([second.nextUint32(), second.nextUint32(), second.nextFloat()]);

    const firstIds = new DeterministicTestIds('noma-ids');
    const secondIds = new DeterministicTestIds('noma-ids');
    const uuid = firstIds.nextUuid();
    expect(uuid).toBe(secondIds.nextUuid());
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(new DeterministicTestIds('different').nextUuid()).not.toBe(uuid);
  });

  test('fixture factories are immutable, privacy-safe, and reproducible', () => {
    const first = createFixtureContext({ seed: 6006, now: '2026-08-01T12:00:00.000Z' });
    const second = createFixtureContext({ seed: 6006, now: '2026-08-01T12:00:00.000Z' });
    expect(first.runId).toBe(second.runId);
    expect(createOutboxEventFixture(first)).toEqual(createOutboxEventFixture(second));

    const factory = defineFixtureFactory((context, overrides: { name?: string } | undefined) => ({
      fixtureVersion: 1,
      synthetic: true,
      id: context.ids.nextUuid(),
      name: overrides?.name ?? 'Synthetic fixture',
    }));
    expect(Object.isFrozen(factory(createFixtureContext(), { name: 'Named override' }))).toBe(true);
    expect(() => defineFixtureFactory(() => ({ password: 'production-like-value' }))(createFixtureContext()))
      .toThrow(/credential-bearing/);
  });

  test('technical queue fixtures preserve deterministic outbox identity', () => {
    const job = createQueueJobFixture(createFixtureContext({ seed: 'queue-fixture' }));
    expect(job.jobId).toBe(job.event.eventId);
    expect(job.jobId).not.toContain(':');
    expect(job.queueName).toBe('maintenance');
  });

  test('privileged personas require explicit opt-in and remain schema-neutral', () => {
    const context = createFixtureContext({ seed: 'personas' });
    const buyer = createSyntheticPersona(context, 'verified-covenant-buyer');
    expect(buyer.email).toBe('verified-covenant-buyer@noma.test');
    expect(() => createSyntheticPersona(context, 'super-admin')).toThrow(/explicit/);
    const privileged = createSyntheticPersona(context, 'super-admin', { allowPrivileged: true });
    expect(privileged.privileged).toBe(true);
    expect(privileged).not.toHaveProperty('capabilities');
  });
});

describe('controlled asynchronous behaviour', () => {
  test('scripted outcomes resolve, reject, block for abort, and fail when exhausted', async () => {
    const expected = new Error('synthetic failure');
    const controller = new ScriptedOutcomeController<number>([
      { kind: 'resolve', value: 42 },
      { kind: 'reject', error: expected },
      { kind: 'block-until-aborted' },
    ]);
    await expect(controller.next()).resolves.toBe(42);
    await expect(controller.next()).rejects.toBe(expected);
    const abort = new AbortController();
    const blocked = controller.next(abort.signal);
    abort.abort();
    await expect(blocked).rejects.toBeInstanceOf(ScriptedOutcomeAbortedError);
    await expect(controller.next()).rejects.toThrow(/exhausted/);
  });

  test('barrier releases only after every participant arrives', async () => {
    const barrier = new AsyncBarrier(2);
    let firstReleased = false;
    const first = barrier.arriveAndWait().then(() => { firstReleased = true; });
    await Promise.resolve();
    expect(firstReleased).toBe(false);
    await Promise.all([first, barrier.arriveAndWait()]);
    expect(firstReleased).toBe(true);
  });

  test('polling uses an injected deadline scheduler instead of wall-clock sleeps', async () => {
    let now = 0;
    let checks = 0;
    await pollUntil(
      () => {
        checks += 1;
        return checks === 3;
      },
      {
        description: 'deterministic probe',
        timeoutMilliseconds: 100,
        intervalMilliseconds: 10,
        now: () => now,
        wait: async (milliseconds) => { now += milliseconds; },
      },
    );
    expect(checks).toBe(3);
    expect(now).toBe(20);
  });

  test('resource cleanup is idempotent and runs in reverse acquisition order', async () => {
    const order: number[] = [];
    const scope = new TestResourceScope();
    scope.defer(() => { order.push(1); });
    scope.defer(() => { order.push(2); });
    await scope.dispose();
    await scope.dispose();
    expect(order).toEqual([2, 1]);
  });
});
