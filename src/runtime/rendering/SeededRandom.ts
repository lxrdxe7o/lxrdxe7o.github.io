const UINT32_MAX_PLUS_ONE = 0x1_0000_0000;

export function hashSeed(value: string | number): number {
  if (typeof value === 'number') return value >>> 0 || 0x6d2b79f5;
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0 || 0x6d2b79f5;
}

export class SeededRandom {
  private state: number;

  constructor(seed: string | number) {
    this.state = hashSeed(seed);
  }

  nextUint32(): number {
    let value = (this.state += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    const result = (value ^ (value >>> 14)) >>> 0;
    this.state = this.state >>> 0;
    return result;
  }

  next(): number {
    return this.nextUint32() / UINT32_MAX_PLUS_ONE;
  }

  range(minimum: number, maximum: number): number {
    if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || maximum < minimum) {
      throw new RangeError('SeededRandom.range requires finite ascending bounds.');
    }
    return minimum + (maximum - minimum) * this.next();
  }

  signed(magnitude = 1): number {
    if (!Number.isFinite(magnitude) || magnitude < 0) {
      throw new RangeError('SeededRandom.signed requires a finite non-negative magnitude.');
    }
    return this.range(-magnitude, magnitude);
  }

  integer(minimum: number, maximumExclusive: number): number {
    if (!Number.isInteger(minimum) || !Number.isInteger(maximumExclusive)) {
      throw new RangeError('SeededRandom.integer requires integer bounds.');
    }
    if (maximumExclusive <= minimum) {
      throw new RangeError('SeededRandom.integer requires a non-empty range.');
    }
    return Math.floor(this.range(minimum, maximumExclusive));
  }

  fork(label: string): SeededRandom {
    return new SeededRandom(hashSeed(`${this.nextUint32()}:${label}`));
  }
}
