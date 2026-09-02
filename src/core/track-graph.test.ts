import { describe, expect, it } from 'vitest';
import { isWater } from './river';
import {
  type Cell,
  connectionsFor,
  endpointEdgesFor,
  inBounds,
  MAX_PIECES,
  MEADOW_CELLS,
  type PieceType,
  type PlacedPiece,
  type Rotation,
  validatePlacement,
} from './track-graph';

function piece(id: string, type: PieceType, x: number, y: number, rotation: Rotation): PlacedPiece {
  return { id, type, cell: { x, y }, rotation };
}

describe('meadow geometry', () => {
  it('is a 16×16 grid allowing 64 pieces', () => {
    expect(MEADOW_CELLS).toBe(16);
    expect(MAX_PIECES).toBe(64);
  });

  it('accepts cells inside the meadow only', () => {
    expect(inBounds({ x: 0, y: 0 })).toBe(true);
    expect(inBounds({ x: 15, y: 15 })).toBe(true);
    expect(inBounds({ x: -1, y: 5 })).toBe(false);
    expect(inBounds({ x: 5, y: 16 })).toBe(false);
  });
});

describe('validatePlacement', () => {
  it('accepts a free cell inside the meadow', () => {
    const pieces = [piece('a', 'straight', 2, 3, 0)];
    expect(validatePlacement(pieces, { x: 8, y: 8 })).toBeNull();
  });

  it('rejects cells outside the meadow', () => {
    expect(validatePlacement([], { x: 16, y: 5 })).toBe('out-of-bounds');
    expect(validatePlacement([], { x: -1, y: 0 })).toBe('out-of-bounds');
  });

  it('rejects occupied cells', () => {
    const pieces = [piece('a', 'straight', 2, 3, 0)];
    expect(validatePlacement(pieces, { x: 2, y: 3 })).toBe('occupied');
  });

  it('rejects the 65th piece — the cap dims the toybox, never errors', () => {
    const pieces = Array.from({ length: MAX_PIECES }, (_, i) =>
      piece(`p${i}`, 'straight', i % MEADOW_CELLS, Math.floor(i / MEADOW_CELLS), 0),
    );
    expect(validatePlacement(pieces, { x: 15, y: 15 })).toBe('capacity');
  });
});

describe('validatePlacement terrain rules (piece type given)', () => {
  const row = MEADOW_CELLS >> 1; // A row the river always crosses.
  const water = [...Array(MEADOW_CELLS).keys()].map((x) => ({ x, y: row })).find((c) => isWater(c));
  const land = [...Array(MEADOW_CELLS).keys()].map((x) => ({ x, y: row })).find((c) => !isWater(c));

  it('rejects track pieces on river water', () => {
    expect(validatePlacement([], (water ?? { x: 8, y: 8 }) as Cell, 'straight')).toBe('water');
    expect(validatePlacement([], (water ?? { x: 8, y: 8 }) as Cell, 'corner')).toBe('water');
    expect(validatePlacement([], (water ?? { x: 8, y: 8 }) as Cell, 'crossing')).toBe('water');
  });

  it('accepts a bridge on water — the one piece that spans the river', () => {
    expect(validatePlacement([], (water ?? { x: 8, y: 8 }) as Cell, 'bridge')).toBeNull();
  });

  it('rejects a bridge on dry land — water-only toy', () => {
    expect(validatePlacement([], (land ?? { x: 0, y: 8 }) as Cell, 'bridge')).toBe('water');
  });

  it('rejects the tunnel on river water — dry-land toy like every non-bridge piece', () => {
    expect(validatePlacement([], (water ?? { x: 8, y: 8 }) as Cell, 'tunnel')).toBe('water');
  });

  it('accepts a tunnel on dry land', () => {
    expect(validatePlacement([], (land ?? { x: 0, y: 8 }) as Cell, 'tunnel')).toBeNull();
  });

  it('rejects the hill run on river water — dry-land toys like every non-bridge piece', () => {
    expect(validatePlacement([], (water ?? { x: 8, y: 8 }) as Cell, 'slope-up')).toBe('water');
    expect(validatePlacement([], (water ?? { x: 8, y: 8 }) as Cell, 'hill')).toBe('water');
    expect(validatePlacement([], (water ?? { x: 8, y: 8 }) as Cell, 'slope-down')).toBe('water');
  });

  it('accepts the hill run on dry land', () => {
    expect(validatePlacement([], (land ?? { x: 0, y: 8 }) as Cell, 'slope-up')).toBeNull();
    expect(validatePlacement([], (land ?? { x: 0, y: 8 }) as Cell, 'hill')).toBeNull();
    expect(validatePlacement([], (land ?? { x: 0, y: 8 }) as Cell, 'slope-down')).toBeNull();
  });

  it('keeps the older rule order: bounds and occupancy win over terrain', () => {
    expect(validatePlacement([], { x: -1, y: row }, 'bridge')).toBe('out-of-bounds');
    const pieces = [piece('a', 'straight', (water ?? { x: 8, y: 8 }).x, row, 0)];
    expect(validatePlacement(pieces, (water ?? { x: 8, y: 8 }) as Cell, 'bridge')).toBe('occupied');
  });

  it('stays terrain-blind without a piece type (older callers unchanged)', () => {
    expect(validatePlacement([], (water ?? { x: 8, y: 8 }) as Cell)).toBeNull();
  });
});

describe('endpointEdgesFor', () => {
  it('maps straight endpoints to the cell-edges it bridges (north = -y)', () => {
    // North edge of (2,3) is the boundary shared with (2,2); south with (2,4).
    expect(endpointEdgesFor(piece('a', 'straight', 2, 3, 0))).toEqual(['2,2|2,3', '2,3|2,4']);
  });

  it('rotates straight endpoints 90° to run east–west', () => {
    expect(endpointEdgesFor(piece('a', 'straight', 2, 3, 90))).toEqual(['2,3|3,3', '1,3|2,3']);
  });

  it('maps corner endpoints to north and east edges at 0°', () => {
    expect(endpointEdgesFor(piece('a', 'corner', 2, 3, 0))).toEqual(['2,2|2,3', '2,3|3,3']);
  });

  it('walks the corner clockwise through all rotations', () => {
    expect(endpointEdgesFor(piece('a', 'corner', 2, 3, 90))).toEqual(['2,3|3,3', '2,3|2,4']);
    expect(endpointEdgesFor(piece('a', 'corner', 2, 3, 180))).toEqual(['2,3|2,4', '1,3|2,3']);
    expect(endpointEdgesFor(piece('a', 'corner', 2, 3, 270))).toEqual(['1,3|2,3', '2,2|2,3']);
  });
});

describe('endpointEdgesFor — crossing', () => {
  it('bridges all four cell edges at 0°', () => {
    expect(endpointEdgesFor(piece('x', 'crossing', 2, 3, 0))).toEqual([
      '2,2|2,3', // north
      '2,3|3,3', // east
      '2,3|2,4', // south
      '1,3|2,3', // west
    ]);
  });

  it('is rotation-invariant: the same four boundaries at every rotation', () => {
    const atZero = endpointEdgesFor(piece('x', 'crossing', 2, 3, 0))
      .slice()
      .sort();
    for (const rotation of [90, 180, 270] as const) {
      expect(
        endpointEdgesFor(piece('x', 'crossing', 2, 3, rotation))
          .slice()
          .sort(),
      ).toEqual(atZero);
    }
  });
});

describe('tunnel endpoints and connections', () => {
  it('bridges the same cell edges as the straight it mirrors, at every rotation', () => {
    // endpointEdgesFor keeps base order with advanced labels (180° reads
    // south-first), unlike endpointsFor's canonical filtering.
    expect(endpointEdgesFor(piece('t', 'tunnel', 2, 3, 0))).toEqual(['2,2|2,3', '2,3|2,4']);
    expect(endpointEdgesFor(piece('t', 'tunnel', 2, 3, 90))).toEqual(['2,3|3,3', '1,3|2,3']);
    expect(endpointEdgesFor(piece('t', 'tunnel', 2, 3, 180))).toEqual(['2,3|2,4', '2,2|2,3']);
    expect(endpointEdgesFor(piece('t', 'tunnel', 2, 3, 270))).toEqual(['1,3|2,3', '2,3|3,3']);
  });

  it('connects two tunnels joined end-to-end — the seam of a long tunnel', () => {
    const pieces = [piece('a', 'tunnel', 2, 3, 0), piece('b', 'tunnel', 2, 4, 0)];
    expect(connectionsFor(pieces)).toEqual([{ a: 'a', b: 'b', via: '2,3|2,4' }]);
  });

  it('connects a tunnel to a plain straight exactly as two straights would', () => {
    const pieces = [piece('a', 'tunnel', 2, 3, 0), piece('b', 'straight', 2, 4, 0)];
    expect(connectionsFor(pieces)).toEqual([{ a: 'a', b: 'b', via: '2,3|2,4' }]);
  });
});

describe('connectionsFor', () => {
  it('connects two straights joined end-to-end', () => {
    const pieces = [piece('a', 'straight', 2, 3, 0), piece('b', 'straight', 2, 4, 0)];
    expect(connectionsFor(pieces)).toEqual([{ a: 'a', b: 'b', via: '2,3|2,4' }]);
  });

  it("connects a corner's east end to a straight's west end", () => {
    const pieces = [piece('a', 'corner', 2, 3, 0), piece('b', 'straight', 3, 3, 90)];
    expect(connectionsFor(pieces)).toEqual([{ a: 'a', b: 'b', via: '2,3|3,3' }]);
  });

  it('never connects pieces that merely sit side by side lengthwise', () => {
    const pieces = [piece('a', 'straight', 2, 3, 90), piece('b', 'straight', 2, 4, 90)];
    expect(connectionsFor(pieces)).toEqual([]);
  });

  it('returns no connections for isolated pieces', () => {
    const pieces = [piece('a', 'straight', 0, 0, 0), piece('b', 'corner', 8, 8, 180)];
    expect(connectionsFor(pieces)).toEqual([]);
  });

  it('connects a crossing to neighbors on all four sides', () => {
    const pieces = [
      piece('x', 'crossing', 2, 3, 0),
      piece('n', 'straight', 2, 2, 0), // south edge meets crossing north
      piece('e', 'straight', 3, 3, 90), // west edge meets crossing east
      piece('s', 'straight', 2, 4, 0), // north edge meets crossing south
      piece('w', 'straight', 1, 3, 90), // east edge meets crossing west
    ];
    const connections = connectionsFor(pieces).map((c) => [c.a, c.b, c.via]);
    expect(connections).toHaveLength(4);
    expect(connections).toContainEqual(['x', 'n', '2,2|2,3']);
    expect(connections).toContainEqual(['x', 'e', '2,3|3,3']);
    expect(connections).toContainEqual(['x', 's', '2,3|2,4']);
    expect(connections).toContainEqual(['x', 'w', '1,3|2,3']);
  });

  it('connects a rotated crossing identically (4-fold symmetry)', () => {
    const pieces = [
      piece('x', 'crossing', 2, 3, 270),
      piece('n', 'straight', 2, 2, 0),
      piece('e', 'straight', 3, 3, 90),
      piece('s', 'straight', 2, 4, 0),
      piece('w', 'straight', 1, 3, 90),
    ];
    const connections = connectionsFor(pieces).map((c) => [c.a, c.b, c.via]);
    expect(connections).toHaveLength(4);
    expect(connections).toContainEqual(['x', 'n', '2,2|2,3']);
    expect(connections).toContainEqual(['x', 'e', '2,3|3,3']);
    expect(connections).toContainEqual(['x', 's', '2,3|2,4']);
    expect(connections).toContainEqual(['x', 'w', '1,3|2,3']);
  });
});
