import { ManualTestClock } from './clock.js';

export interface ManualTestScheduler {
  wait(milliseconds: number, signal?: AbortSignal): Promise<void>;
}

export function createManualTestScheduler(clock: ManualTestClock): ManualTestScheduler {
  return Object.freeze({
    async wait(milliseconds: number, signal?: AbortSignal): Promise<void> {
      if (!Number.isSafeInteger(milliseconds) || milliseconds < 0) {
        throw new RangeError('manual scheduler delay must be a non-negative safe integer');
      }
      if (signal?.aborted) throw new Error('manual scheduler was aborted');
      clock.advanceBy(milliseconds);
      await Promise.resolve();
      if (signal?.aborted) throw new Error('manual scheduler was aborted');
    },
  });
}
