import { performance } from 'node:perf_hooks';
import { setTimeout as delay } from 'node:timers/promises';

export class BarrierBrokenError extends Error {
  constructor(message = 'asynchronous barrier was broken') {
    super(message);
    this.name = 'BarrierBrokenError';
  }
}

export class AsyncBarrier {
  readonly participants: number;
  #arrived = 0;
  #settled = false;
  readonly #waiters: Array<{ resolve: () => void; reject: (error: unknown) => void }> = [];

  constructor(participants: number) {
    if (!Number.isSafeInteger(participants) || participants < 1 || participants > 1_000) {
      throw new RangeError('barrier participants must be an integer from 1 to 1000');
    }
    this.participants = participants;
  }

  arriveAndWait(signal?: AbortSignal): Promise<void> {
    if (this.#settled) throw new BarrierBrokenError('asynchronous barrier has already settled');
    if (signal?.aborted) {
      this.break(new BarrierBrokenError('asynchronous barrier participant was aborted'));
      return Promise.reject(new BarrierBrokenError('asynchronous barrier participant was aborted'));
    }

    this.#arrived += 1;
    const promise = new Promise<void>((resolve, reject) => this.#waiters.push({ resolve, reject }));
    signal?.addEventListener(
      'abort',
      () => this.break(new BarrierBrokenError('asynchronous barrier participant was aborted')),
      { once: true },
    );
    if (this.#arrived === this.participants) {
      this.#settled = true;
      this.#waiters.splice(0).forEach(({ resolve }) => resolve());
    } else if (this.#arrived > this.participants) {
      this.break(new BarrierBrokenError('too many asynchronous barrier participants arrived'));
    }
    return promise;
  }

  break(error: unknown = new BarrierBrokenError()): void {
    if (this.#settled) return;
    this.#settled = true;
    this.#waiters.splice(0).forEach(({ reject }) => reject(error));
  }
}

export interface PollUntilOptions {
  readonly description: string;
  readonly timeoutMilliseconds?: number;
  readonly intervalMilliseconds?: number;
  readonly signal?: AbortSignal;
  readonly now?: () => number;
  readonly wait?: (milliseconds: number, signal?: AbortSignal) => Promise<void>;
}

function safeDescription(value: string): string {
  return value
    .replace(/(?:redis|rediss|postgres|postgresql):\/\/\S+/gi, '[REDACTED_URL]')
    .replace(/(password|secret|token|authorization)=?\s*\S+/gi, '$1=[REDACTED]');
}

async function defaultWait(milliseconds: number, signal?: AbortSignal): Promise<void> {
  await delay(milliseconds, undefined, signal ? { signal } : undefined);
}

export async function pollUntil(
  check: () => boolean | Promise<boolean>,
  options: PollUntilOptions,
): Promise<void> {
  const timeout = options.timeoutMilliseconds ?? 5_000;
  const interval = options.intervalMilliseconds ?? 25;
  if (!Number.isSafeInteger(timeout) || timeout < 1 || timeout > 600_000) {
    throw new RangeError('poll timeout must be an integer from 1 to 600000 milliseconds');
  }
  if (!Number.isSafeInteger(interval) || interval < 1 || interval > timeout) {
    throw new RangeError('poll interval must be a positive integer no greater than its timeout');
  }
  const now = options.now ?? (() => performance.now());
  const wait = options.wait ?? defaultWait;
  const deadline = now() + timeout;
  let lastError: unknown;
  while (now() <= deadline) {
    if (options.signal?.aborted) throw new Error(`poll aborted: ${safeDescription(options.description)}`);
    try {
      if (await check()) return;
      lastError = undefined;
    } catch (error) {
      lastError = error;
    }
    if (now() >= deadline) break;
    await wait(interval, options.signal);
  }
  const detail = lastError instanceof Error ? `; last error: ${safeDescription(lastError.message)}` : '';
  throw new Error(`poll timed out: ${safeDescription(options.description)}${detail}`);
}

export type TestResourceDisposer = () => void | Promise<void>;

export class TestResourceScope {
  readonly #disposers: TestResourceDisposer[] = [];
  #disposed = false;

  defer(disposer: TestResourceDisposer): void {
    if (this.#disposed) throw new Error('test resource scope is already disposed');
    this.#disposers.push(disposer);
  }

  use<T>(resource: T, disposer: (resource: T) => void | Promise<void>): T {
    this.defer(() => disposer(resource));
    return resource;
  }

  async dispose(): Promise<void> {
    if (this.#disposed) return;
    this.#disposed = true;
    const errors: unknown[] = [];
    for (const disposer of this.#disposers.reverse()) {
      try {
        await disposer();
      } catch (error) {
        errors.push(error);
      }
    }
    this.#disposers.length = 0;
    if (errors.length > 0) throw new AggregateError(errors, 'test resource cleanup failed');
  }
}
