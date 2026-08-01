export type TestSeed = number | string;

function normalizeSeed(seed: TestSeed): number {
  if (typeof seed === 'number') {
    if (!Number.isSafeInteger(seed)) throw new RangeError('test seed must be a safe integer');
    return (seed >>> 0) || 0x6e6f6d61;
  }

  if (seed.length === 0 || seed.length > 200) {
    throw new RangeError('test seed string must contain 1 to 200 characters');
  }

  let hash = 0x811c9dc5;
  for (const character of seed) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) || 0x6e6f6d61;
}

export class SeededRandomSource {
  readonly seed: TestSeed;
  #state: number;

  constructor(seed: TestSeed = 6006) {
    this.seed = seed;
    this.#state = normalizeSeed(seed);
  }

  nextUint32(): number {
    let value = this.#state;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.#state = value >>> 0;
    return this.#state;
  }

  nextFloat(): number {
    return this.nextUint32() / 0x1_0000_0000;
  }

  nextBytes(length: number): Uint8Array {
    if (!Number.isSafeInteger(length) || length < 0 || length > 4096) {
      throw new RangeError('test byte length must be an integer from 0 to 4096');
    }
    const bytes = new Uint8Array(length);
    for (let index = 0; index < length; index += 1) {
      if (index % 4 === 0) this.nextUint32();
      bytes[index] = (this.#state >>> ((index % 4) * 8)) & 0xff;
    }
    return bytes;
  }
}

const PUBLIC_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export class DeterministicTestIds {
  readonly seed: TestSeed;
  readonly #random: SeededRandomSource;

  constructor(seed: TestSeed = 6006) {
    this.seed = seed;
    this.#random = new SeededRandomSource(seed);
  }

  nextUuid(): string {
    const bytes = this.#random.nextBytes(16);
    bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
    bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
    const hex = [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  nextPublicReference(prefix = 'TST', length = 12): string {
    if (!/^[A-Z][A-Z0-9]{1,9}$/.test(prefix)) {
      throw new Error('test reference prefix must contain 2 to 10 uppercase letters or digits');
    }
    if (!Number.isSafeInteger(length) || length < 6 || length > 40) {
      throw new RangeError('test reference length must be an integer from 6 to 40');
    }
    let value = '';
    while (value.length < length) {
      value += PUBLIC_ALPHABET[this.#random.nextUint32() % PUBLIC_ALPHABET.length];
    }
    return `${prefix}-${value}`;
  }

  nextTestToken(length = 32): string {
    if (!Number.isSafeInteger(length) || length < 16 || length > 128) {
      throw new RangeError('test token length must be an integer from 16 to 128');
    }
    const bytes = this.#random.nextBytes(Math.ceil(length / 2));
    const value = [...bytes].map((entry) => entry.toString(16).padStart(2, '0')).join('').slice(0, length);
    return `test_${value}`;
  }
}
