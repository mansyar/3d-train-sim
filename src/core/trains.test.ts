import { describe, expect, it } from 'vitest';
import { TRAIN_KINDS, trainAria, trainIcon, trainModelUrl, trainWhistle } from './trains';

describe('train catalog', () => {
  it('offers exactly three distinct locomotives', () => {
    expect([...TRAIN_KINDS]).toEqual(['steam', 'diesel', 'tram']);
    expect(new Set(TRAIN_KINDS).size).toBe(3);
  });

  it('gives every train a local model, icon, label, and whistle personality', () => {
    for (const kind of TRAIN_KINDS) {
      expect(trainModelUrl(kind)).toMatch(/^\/assets\/train-kit\/[\w-]+\.glb$/);
      expect(trainIcon(kind).length).toBeGreaterThan(0);
      expect(trainAria(kind).length).toBeGreaterThan(0);
      expect(trainWhistle(kind).length).toBeGreaterThan(0);
    }
  });

  it('returns stable values for repeated catalog lookups', () => {
    for (const kind of TRAIN_KINDS) {
      expect(trainModelUrl(kind)).toBe(trainModelUrl(kind));
      expect(trainIcon(kind)).toBe(trainIcon(kind));
      expect(trainAria(kind)).toBe(trainAria(kind));
      expect(trainWhistle(kind)).toBe(trainWhistle(kind));
    }
  });
});
