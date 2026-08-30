import { describe, expect, it } from 'vitest';
import { skyColorsAt } from './sky-palette';
import { waterColorAt } from './water-palette';

describe('water-palette', () => {
  it('recolors with the day cycle — noon water differs from night water', () => {
    const noon = waterColorAt(skyColorsAt(0.525), 0);
    const night = waterColorAt(skyColorsAt(0.86), 0);
    expect(noon).not.toBe(night);
  });

  it('reflects the sky — dawn water carries the ember horizon tint', () => {
    const noon = waterColorAt(skyColorsAt(0.525), 0);
    const dawn = waterColorAt(skyColorsAt(0.06), 0);
    const dusk = waterColorAt(skyColorsAt(0.66), 0);
    // All three moments read differently — the water follows the sky, not a
    // fixed toy-water constant.
    expect(new Set([noon, dawn, dusk]).size).toBe(3);
  });

  it('pales to ice as snow settles — frozen water is much brighter', () => {
    const unfrozen = waterColorAt(skyColorsAt(0.525), 0);
    const frozen = waterColorAt(skyColorsAt(0.525), 1);
    const luminance = (hex: number): number =>
      (0.299 * ((hex >> 16) & 0xff) + 0.587 * ((hex >> 8) & 0xff) + 0.114 * (hex & 0xff)) / 255;
    expect(luminance(frozen)).toBeGreaterThan(luminance(unfrozen) + 0.2);
  });

  it('ramps monotonically — half snow sits between dry and frozen', () => {
    const dry = waterColorAt(skyColorsAt(0.525), 0);
    const half = waterColorAt(skyColorsAt(0.525), 0.5);
    const frozen = waterColorAt(skyColorsAt(0.525), 1);
    const luminance = (hex: number): number =>
      0.299 * ((hex >> 16) & 0xff) + 0.587 * ((hex >> 8) & 0xff) + 0.114 * (hex & 0xff);
    expect(luminance(half)).toBeGreaterThan(luminance(dry));
    expect(luminance(half)).toBeLessThan(luminance(frozen));
  });

  it('melts back — snow 0 restores the exact unfrozen color', () => {
    const before = waterColorAt(skyColorsAt(0.525), 0);
    waterColorAt(skyColorsAt(0.525), 1);
    const after = waterColorAt(skyColorsAt(0.525), 0);
    expect(after).toBe(before);
  });

  it('clamps out-of-range snow — negative reads dry, huge reads frozen', () => {
    const sky = skyColorsAt(0.525);
    expect(waterColorAt(sky, -3)).toBe(waterColorAt(sky, 0));
    expect(waterColorAt(sky, 9)).toBe(waterColorAt(sky, 1));
  });

  it('is deterministic — the same sky and snow give the same color', () => {
    const sky = skyColorsAt(0.33);
    expect(waterColorAt(sky, 0.4)).toBe(waterColorAt(sky, 0.4));
  });
});
