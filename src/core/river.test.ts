import { describe, expect, it } from 'vitest';
import { isWater, riverDriftPath, riverWaterCells } from './river';
import { type Cell, MEADOW_CELLS } from './track-graph';

const allCells = (): Cell[] => {
  const cells: Cell[] = [];
  for (let y = 0; y < MEADOW_CELLS; y += 1) {
    for (let x = 0; x < MEADOW_CELLS; x += 1) cells.push({ x, y });
  }
  return cells;
};

/** Contiguous run lengths of land left and right of the water in one row. */
function bankWidths(y: number): [number, number] {
  const water = [...Array(MEADOW_CELLS).keys()].filter((x) => isWater({ x, y }));
  const first = water[0];
  const last = water[water.length - 1];
  if (first === undefined || last === undefined) return [0, 0];
  return [first, MEADOW_CELLS - 1 - last];
}

describe('river water set', () => {
  it('flows edge to edge: every row has water', () => {
    for (let y = 0; y < MEADOW_CELLS; y += 1) {
      const count = [...Array(MEADOW_CELLS).keys()].filter((x) => isWater({ x, y })).length;
      expect(count, `row ${y} has no water`).toBeGreaterThan(0);
    }
  });

  it('is a ~3 cell band: each row holds 2–4 contiguous water cells', () => {
    for (let y = 0; y < MEADOW_CELLS; y += 1) {
      const water = [...Array(MEADOW_CELLS).keys()].filter((x) => isWater({ x, y }));
      expect(water.length, `row ${y} width`).toBeGreaterThanOrEqual(2);
      expect(water.length, `row ${y} width`).toBeLessThanOrEqual(4);
      for (let i = 1; i < water.length; i += 1) {
        expect(water[i], `row ${y} contiguity`).toBe((water[i - 1] ?? 0) + 1);
      }
    }
  });

  it('meanders as an S: bank centers drift across the meadow', () => {
    const centers = [...Array(MEADOW_CELLS).keys()].map((y) => {
      const water = [...Array(MEADOW_CELLS).keys()].filter((x) => isWater({ x, y }));
      return (water[0] ?? 0) + (water.length - 1) / 2;
    });
    const drift = (centers[centers.length - 1] ?? 0) - (centers[0] ?? 0);
    expect(Math.abs(drift), 'S-curve must travel across the meadow').toBeGreaterThanOrEqual(6);
  });

  it('leaves generous build banks: ≥3 contiguous land cells on both sides', () => {
    for (let y = 0; y < MEADOW_CELLS; y += 1) {
      const [west, east] = bankWidths(y);
      expect(west, `row ${y} west bank`).toBeGreaterThanOrEqual(3);
      expect(east, `row ${y} east bank`).toBeGreaterThanOrEqual(3);
    }
  });

  it('is dry outside the meadow bounds', () => {
    expect(isWater({ x: -1, y: 8 })).toBe(false);
    expect(isWater({ x: 16, y: 8 })).toBe(false);
    expect(isWater({ x: 8, y: -1 })).toBe(false);
    expect(isWater({ x: 8, y: 16 })).toBe(false);
  });
});

describe('river drift path', () => {
  const path = riverDriftPath();

  it('is a long ordered walk of water cells', () => {
    expect(path.length).toBeGreaterThanOrEqual(MEADOW_CELLS);
    for (const cell of path) expect(isWater(cell), `${cell.x},${cell.y}`).toBe(true);
  });

  it('moves smoothly: each step to an adjacent or diagonal cell (≤ king move)', () => {
    for (let i = 1; i < path.length; i += 1) {
      const a = path[i - 1];
      const b = path[i];
      if (!a || !b) {
        expect.unreachable('path gap');
        continue;
      }
      const dist = Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
      expect(dist, `step ${i}`).toBe(1);
    }
  });

  it('traverses the meadow from one edge to the other', () => {
    const ys = path.map((c) => c.y);
    expect(Math.min(...ys)).toBe(0);
    expect(Math.max(...ys)).toBe(MEADOW_CELLS - 1);
  });

  it('is stable across calls (cached, not recomputed)', () => {
    expect(riverDriftPath()).toBe(path);
  });
});

describe('river water cells', () => {
  it('lists exactly the cells isWater marks, in row order', () => {
    const cells = riverWaterCells();
    expect(cells.length).toBeGreaterThan(0);
    for (const cell of cells) expect(isWater(cell)).toBe(true);
    // Row order: y never decreases, and x increases within each row.
    for (let i = 1; i < cells.length; i += 1) {
      const a = cells[i - 1];
      const b = cells[i];
      if (!a || !b) {
        expect.unreachable('cell gap');
        continue;
      }
      expect(b.y).toBeGreaterThanOrEqual(a.y);
      if (b.y === a.y) expect(b.x).toBeGreaterThan(a.x);
    }
    expect(riverWaterCells()).toBe(cells); // cached, not recomputed
  });
});

describe('water cells inventory', () => {
  it('keeps the river a modest share of the meadow (≤ 40%)', () => {
    const wet = allCells().filter((c) => isWater(c)).length;
    expect(wet / (MEADOW_CELLS * MEADOW_CELLS)).toBeLessThanOrEqual(0.4);
  });
});
