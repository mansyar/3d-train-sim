import { describe, expect, it } from 'vitest';
import { snapToGrid } from './grid';

describe('snapToGrid', () => {
  it('snaps a coordinate to the nearest multiple, with exact ties rounding up', () => {
    // 16/32 === 0.5 is an exact tie; Math.round(0.5) === 1 rounds up.
    expect(snapToGrid(16, 32)).toBe(32);
    expect(snapToGrid(20, 32)).toBe(32);
    // Math.round(-0.5) === -0 — the tie still rounds up toward zero.
    expect(snapToGrid(-16, 32)).toBe(0);
  });

  it('snaps a coordinate to the nearest upper multiple when closer', () => {
    expect(snapToGrid(50, 32)).toBe(64);
  });

  it('keeps coordinates already on the grid unchanged', () => {
    expect(snapToGrid(96, 32)).toBe(96);
  });

  it('snaps negative coordinates to the nearest multiple', () => {
    expect(snapToGrid(-10, 32)).toBe(0);
    expect(snapToGrid(-70, 32)).toBe(-64);
  });

  it('works with arbitrary cell sizes', () => {
    expect(snapToGrid(7, 5)).toBe(5);
    expect(snapToGrid(13, 5)).toBe(15);
  });
});
