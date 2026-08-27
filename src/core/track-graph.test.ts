import { describe, expect, it } from 'vitest';
import {
  MAX_PIECES,
  MEADOW_CELLS,
  type PlacedPiece,
  type Rotation,
  type PieceType,
  connectionsFor,
  endpointEdgesFor,
  inBounds,
  validatePlacement,
} from './track-graph';

function piece(
  id: string,
  type: PieceType,
  x: number,
  y: number,
  rotation: Rotation,
): PlacedPiece {
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

describe('endpointEdgesFor', () => {
  it('maps straight endpoints to the cell-edges it bridges (north = -y)', () => {
    // North edge of (2,3) is the boundary shared with (2,2); south with (2,4).
    expect(endpointEdgesFor(piece('a', 'straight', 2, 3, 0))).toEqual([
      '2,2|2,3',
      '2,3|2,4',
    ]);
  });

  it('rotates straight endpoints 90° to run east–west', () => {
    expect(endpointEdgesFor(piece('a', 'straight', 2, 3, 90))).toEqual([
      '1,3|2,3',
      '2,3|3,3',
    ]);
  });

  it('maps corner endpoints to north and east edges at 0°', () => {
    expect(endpointEdgesFor(piece('a', 'corner', 2, 3, 0))).toEqual([
      '2,2|2,3',
      '2,3|3,3',
    ]);
  });

  it('walks the corner clockwise through all rotations', () => {
    expect(endpointEdgesFor(piece('a', 'corner', 2, 3, 90))).toEqual([
      '2,3|3,3',
      '2,3|2,4',
    ]);
    expect(endpointEdgesFor(piece('a', 'corner', 2, 3, 180))).toEqual([
      '2,3|2,4',
      '1,3|2,3',
    ]);
    expect(endpointEdgesFor(piece('a', 'corner', 2, 3, 270))).toEqual([
      '1,3|2,3',
      '2,2|2,3',
    ]);
  });
});

describe('connectionsFor', () => {
  it('connects two straights joined end-to-end', () => {
    const pieces = [
      piece('a', 'straight', 2, 3, 0),
      piece('b', 'straight', 2, 4, 0),
    ];
    expect(connectionsFor(pieces)).toEqual([
      { a: 'a', b: 'b', via: '2,3|2,4' },
    ]);
  });

  it("connects a corner's east end to a straight's west end", () => {
    const pieces = [
      piece('a', 'corner', 2, 3, 0),
      piece('b', 'straight', 3, 3, 90),
    ];
    expect(connectionsFor(pieces)).toEqual([
      { a: 'a', b: 'b', via: '2,3|3,3' },
    ]);
  });

  it('never connects pieces that merely sit side by side lengthwise', () => {
    const pieces = [
      piece('a', 'straight', 2, 3, 90),
      piece('b', 'straight', 2, 4, 90),
    ];
    expect(connectionsFor(pieces)).toEqual([]);
  });

  it('returns no connections for isolated pieces', () => {
    const pieces = [
      piece('a', 'straight', 0, 0, 0),
      piece('b', 'corner', 8, 8, 180),
    ];
    expect(connectionsFor(pieces)).toEqual([]);
  });
});
