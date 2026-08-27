import { describe, expect, it } from 'vitest';
import { snapToGrid } from './grid';

describe('snapToGrid', () => {
  it('snaps a coordinate to the nearest multiple (ties round up)', () => {
    expect(snapToGrid(20, 32)).toBe(32);
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
