export type ScriptedOutcome<T> =
  | { readonly kind: 'resolve'; readonly value: T }
  | { readonly kind: 'reject'; readonly error: unknown }
  | { readonly kind: 'block-until-aborted' };

export class ScriptedOutcomeAbortedError extends Error {
  constructor() {
    super('scripted outcome was aborted');
    this.name = 'ScriptedOutcomeAbortedError';
  }
}

export class ScriptedOutcomeController<T> {
  readonly #initialOutcomes: readonly ScriptedOutcome<T>[];
  readonly #outcomes: ScriptedOutcome<T>[];
  #consumed = 0;

  constructor(outcomes: readonly ScriptedOutcome<T>[]) {
    this.#initialOutcomes = [...outcomes];
    this.#outcomes = [...outcomes];
  }

  get consumed(): number {
    return this.#consumed;
  }

  get remaining(): number {
    return this.#outcomes.length;
  }

  async next(signal?: AbortSignal): Promise<T> {
    const outcome = this.#outcomes.shift();
    if (!outcome) throw new Error('scripted outcome plan is exhausted');
    this.#consumed += 1;
    if (outcome.kind === 'resolve') return outcome.value;
    if (outcome.kind === 'reject') throw outcome.error;
    if (!signal) throw new Error('block-until-aborted outcome requires an AbortSignal');
    if (signal.aborted) throw new ScriptedOutcomeAbortedError();
    return new Promise<T>((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new ScriptedOutcomeAbortedError()), { once: true });
    });
  }

  reset(): void {
    this.#outcomes.splice(0, this.#outcomes.length, ...this.#initialOutcomes);
    this.#consumed = 0;
  }
}
