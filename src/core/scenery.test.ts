import { describe, expect, it } from 'vitest';
import { SCENERY_KINDS, sceneryAria, sceneryLift, sceneryScale, sceneryUrl } from './scenery';

describe('scenery catalog', () => {
  it('offers exactly the V1 scenery set: tree, bush, rock', () => {
    expect([...SCENERY_KINDS].sort()).toEqual(['bush', 'rock', 'tree']);
  });
});

describe('sceneryUrl', () => {
  it('gives every kind a Kenney nature-kit model', () => {
    for (const kind of SCENERY_KINDS) {
      expect(sceneryUrl(kind)).toMatch(/^\/assets\/nature-kit\/[\w-]+\.glb$/);
    }
  });
});

describe('sceneryScale', () => {
  it('scales every kind into toy-table proportions', () => {
    for (const kind of SCENERY_KINDS) {
      const scale = sceneryScale(kind);
      expect(scale).toBeGreaterThan(0);
      expect(scale).toBeLessThan(2); // Decor never dwarfs the meadow cells.
      expect(Number.isFinite(scale)).toBe(true);
    }
  });
});

describe('sceneryLift', () => {
  it('keeps every kind sitting on the ground plane', () => {
    for (const kind of SCENERY_KINDS) {
      const lift = sceneryLift(kind);
      expect(lift).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(lift)).toBe(true);
    }
  });
});

describe('sceneryAria', () => {
  it('names every kind for the drawer buttons (icon-only UI)', () => {
    for (const kind of SCENERY_KINDS) {
      expect(sceneryAria(kind).length).toBeGreaterThan(0);
    }
  });
});
