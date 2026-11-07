import { describe, expect, it } from 'vitest';
import { CELL_SIZE, cellToWorld, GROUND_SIZE, type PickedItem } from './meadow-grid';
import { MEADOW_CELLS } from './track-graph';

/** The mat's edge, in world units, and the cell centre's inset from it. */
const HALF = GROUND_SIZE / 2;
const INSET = CELL_SIZE / 2;
const LAST = MEADOW_CELLS - 1;

describe('CELL_SIZE', () => {
  it('splits the mat into the meadow grid', () => {
    expect(CELL_SIZE).toBe(GROUND_SIZE / MEADOW_CELLS);
    // 60 / 16 — pinned so a mat or grid change cannot pass unnoticed.
    expect(CELL_SIZE).toBe(3.75);
  });
});

describe('cellToWorld', () => {
  it('maps the four corners to the inset cell centres', () => {
    expect(cellToWorld({ x: 0, y: 0 })).toEqual({ x: -HALF + INSET, z: -HALF + INSET });
    expect(cellToWorld({ x: LAST, y: 0 })).toEqual({ x: HALF - INSET, z: -HALF + INSET });
    expect(cellToWorld({ x: 0, y: LAST })).toEqual({ x: -HALF + INSET, z: HALF - INSET });
    expect(cellToWorld({ x: LAST, y: LAST })).toEqual({ x: HALF - INSET, z: HALF - INSET });
    // The north-west corner centre is inset by half a cell from each edge.
    expect(cellToWorld({ x: 0, y: 0 })).toEqual({ x: -28.125, z: -28.125 });
  });

  it('straddles the world origin between the two middle cells', () => {
    const low = cellToWorld({ x: MEADOW_CELLS / 2 - 1, y: MEADOW_CELLS / 2 - 1 });
    const high = cellToWorld({ x: MEADOW_CELLS / 2, y: MEADOW_CELLS / 2 });
    expect(low).toEqual({ x: -INSET, z: -INSET });
    expect(high).toEqual({ x: INSET, z: INSET });
  });

  it('steps one cell at a time along an axis', () => {
    let previous = cellToWorld({ x: 0, y: 0 });
    for (let x = 1; x < MEADOW_CELLS; x += 1) {
      const at = cellToWorld({ x, y: 0 });
      expect(at.z).toBe(previous.z);
      expect(at.x - previous.x).toBeCloseTo(CELL_SIZE, 10);
      previous = at;
    }
  });

  it('maps every one of the 16 × 16 cells by the same formula', () => {
    let checked = 0;
    for (let y = 0; y < MEADOW_CELLS; y += 1) {
      for (let x = 0; x < MEADOW_CELLS; x += 1) {
        expect(cellToWorld({ x, y })).toEqual({
          x: -HALF + (x + 0.5) * CELL_SIZE,
          z: -HALF + (y + 0.5) * CELL_SIZE,
        });
        checked += 1;
      }
    }
    // The exhaustive claim AC-3 asks for, not a sample of the grid.
    expect(checked).toBe(MEADOW_CELLS ** 2);
  });

  it('extrapolates to negative cells without clamping', () => {
    expect(cellToWorld({ x: -1, y: 0 })).toEqual({ x: -HALF - INSET, z: -HALF + INSET });
    expect(cellToWorld({ x: 0, y: -1 })).toEqual({ x: -HALF + INSET, z: -HALF - INSET });
  });

  it('extrapolates past the meadow without clamping', () => {
    expect(cellToWorld({ x: MEADOW_CELLS, y: 0 })).toEqual({ x: HALF + INSET, z: -HALF + INSET });
    expect(cellToWorld({ x: 0, y: MEADOW_CELLS })).toEqual({ x: -HALF + INSET, z: HALF + INSET });
  });
});

describe('PickedItem', () => {
  it('accepts both a picked piece and a picked scenery toy', () => {
    const piece: PickedItem = {
      kind: 'piece',
      id: 'piece-1',
      type: 'straight',
      rotation: 0,
      cell: { x: 1, y: 2 },
    };
    const scenery: PickedItem = {
      kind: 'scenery',
      id: 'scenery-1',
      scenery: 'windmill',
      rotation: 90,
      cell: { x: 3, y: 4 },
    };
    // The `kind` discriminator lets the UI choose the store mutation.
    expect(piece.kind).toBe('piece');
    expect(scenery.kind).toBe('scenery');
    if (scenery.kind === 'scenery') expect(scenery.scenery).toBe('windmill');
  });
});
