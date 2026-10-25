/**
 * Deterministic Pseudorandom Number Generator (Mulberry32)
 * Provides reproducible random streams from an integer seed.
 * Meets hackathon defense tech requirement for deterministic replayable simulations.
 */

export class SeededRNG {
  private initialSeed: number;
  private state: number;

  constructor(seed: number = 1337) {
    this.initialSeed = seed | 0;
    this.state = this.initialSeed;
  }

  public reset(seed?: number): void {
    if (seed !== undefined) {
      this.initialSeed = seed | 0;
    }
    this.state = this.initialSeed;
  }

  public getSeed(): number {
    return this.initialSeed;
  }

  public getState(): number {
    return this.state;
  }

  public setState(s: number): void {
    this.state = s | 0;
  }

  /**
   * Generates a 32-bit pseudorandom float in [0, 1)
   */
  public next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generates a float in [min, max)
   */
  public range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /**
   * Generates an integer in [min, max]
   */
  public intRange(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /**
   * Selects a random element from an array
   */
  public choice<T>(items: T[]): T {
    if (items.length === 0) {
      throw new Error('Cannot choose from empty array');
    }
    return items[Math.floor(this.next() * items.length)];
  }

  /**
   * Returns a boolean with given probability of true (default 0.5)
   */
  public boolean(probTrue: number = 0.5): boolean {
    return this.next() < probTrue;
  }

  /**
   * Box-Muller transform for gaussian distribution
   */
  public gaussian(mean: number = 0, stdev: number = 1): number {
    const u1 = Math.max(1e-7, this.next());
    const u2 = this.next();
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + z * stdev;
  }
}
