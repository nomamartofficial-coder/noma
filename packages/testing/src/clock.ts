export type TestInstant = Date | number | string;

const DEFAULT_TEST_INSTANT = '2026-08-01T00:00:00.000Z';

function timestamp(value: TestInstant): number {
  const result = value instanceof Date ? value.getTime() : new Date(value).getTime();
  if (!Number.isFinite(result)) throw new TypeError('test instant must be a valid date');
  return result;
}

export class ManualTestClock {
  #milliseconds: number;

  constructor(initialInstant: TestInstant = DEFAULT_TEST_INSTANT) {
    this.#milliseconds = timestamp(initialInstant);
  }

  now(): Date {
    return new Date(this.#milliseconds);
  }

  instant(): string {
    return this.now().toISOString();
  }

  set(instant: TestInstant): Date {
    this.#milliseconds = timestamp(instant);
    return this.now();
  }

  advanceBy(milliseconds: number): Date {
    if (!Number.isSafeInteger(milliseconds)) {
      throw new RangeError('clock advancement must be a safe integer number of milliseconds');
    }
    this.#milliseconds += milliseconds;
    return this.now();
  }

  clone(): ManualTestClock {
    return new ManualTestClock(this.#milliseconds);
  }
}
