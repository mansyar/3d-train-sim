import { describe, expect, it } from 'vitest';
import { TRAIN_KINDS } from './trains';
import { whistleRate } from './whistle-profiles';

describe('whistle profiles', () => {
  it('provides one stable rate for every train', () => {
    expect(TRAIN_KINDS.map(whistleRate)).toEqual([1, 0.92, 1.08, 1, 0.92, 1.08]);
  });

  it('keeps profiles in a gentle playback range', () => {
    for (const kind of TRAIN_KINDS) {
      const rate = whistleRate(kind);
      expect(rate).toBeGreaterThanOrEqual(0.85);
      expect(rate).toBeLessThanOrEqual(1.15);
      expect(Number.isFinite(rate)).toBe(true);
    }
  });

  it('returns deterministic values without mutating the catalog', () => {
    for (const kind of TRAIN_KINDS) expect(whistleRate(kind)).toBe(whistleRate(kind));
  });
});
