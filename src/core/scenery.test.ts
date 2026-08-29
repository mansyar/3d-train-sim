import { describe, expect, it } from 'vitest';
import {
  SCENERY_KINDS,
  type SceneryKind,
  sceneryAria,
  sceneryCategory,
  sceneryLift,
  sceneryScale,
  sceneryUrl,
  sceneryVoice,
} from './scenery';

const NATURE_KINDS: readonly SceneryKind[] = ['tree', 'bush', 'rock'];
const TOWN_KINDS: readonly SceneryKind[] = ['house', 'cottage', 'station'];
const CRITTER_KINDS: readonly SceneryKind[] = ['bird', 'sheep', 'rabbit'];

describe('scenery catalog', () => {
  it('offers exactly nine toys: nature, town, and critters', () => {
    expect([...SCENERY_KINDS].sort()).toEqual(
      ['bird', 'bush', 'cottage', 'house', 'rabbit', 'rock', 'sheep', 'station', 'tree'].sort(),
    );
  });

  it('groups every kind into exactly one drawer category', () => {
    for (const kind of SCENERY_KINDS) {
      expect(['nature', 'town', 'critter']).toContain(sceneryCategory(kind));
    }
  });

  it('keeps the V1 nature set, adds the town set and the critter set', () => {
    for (const kind of NATURE_KINDS) expect(sceneryCategory(kind)).toBe('nature');
    for (const kind of TOWN_KINDS) expect(sceneryCategory(kind)).toBe('town');
    for (const kind of CRITTER_KINDS) expect(sceneryCategory(kind)).toBe('critter');
  });
});

describe('sceneryUrl', () => {
  it('keeps nature toys on the Kenney nature kit', () => {
    for (const kind of NATURE_KINDS) {
      expect(sceneryUrl(kind)).toMatch(/^\/assets\/nature-kit\/[\w-]+\.glb$/);
    }
  });

  it('serves town toys from the vendored Kenney fantasy town kit', () => {
    for (const kind of TOWN_KINDS) {
      expect(sceneryUrl(kind)).toMatch(/^\/assets\/fantasy-town-kit\/[\w-]+\.glb$/);
    }
  });

  it('serves critters from the vendored Kenney animal pack', () => {
    for (const kind of CRITTER_KINDS) {
      expect(sceneryUrl(kind)).toMatch(/^\/assets\/animal-pack\/[\w-]+\.glb$/);
    }
  });
});

describe('sceneryVoice', () => {
  it('gives every critter its own gentle voice id', () => {
    for (const kind of CRITTER_KINDS) {
      expect(sceneryVoice(kind)).toMatch(/^(chirp|baa|squeak)-[\w]+$/);
    }
  });

  it('gives non-critters no voice', () => {
    for (const kind of [...NATURE_KINDS, ...TOWN_KINDS]) {
      expect(sceneryVoice(kind)).toBeNull();
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
      expect(sceneryLift(kind)).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(sceneryLift(kind))).toBe(true);
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
