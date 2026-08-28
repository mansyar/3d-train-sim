import { describe, expect, it } from 'vitest';
import { solvePath } from './pathing';
import { endpointsFor } from './pieces';
import type { PieceType, PlacedPiece, Rotation } from './track-graph';

function piece(id: string, type: PieceType, x: number, y: number, rotation: Rotation): PlacedPiece {
  return { id, type, cell: { x, y }, rotation };
}

function placedOf(pieces: readonly PlacedPiece[], id: string): PlacedPiece {
  const found = pieces.find((p) => p.id === id);
  if (!found) throw new Error(`step references unknown piece ${id}`);
  return found;
}

const STEP_TO = {
  north: { x: 0, y: -1 },
  east: { x: 1, y: 0 },
  south: { x: 0, y: 1 },
  west: { x: -1, y: 0 },
} as const;

function neighbourOf(cell: { x: number; y: number }, edge: keyof typeof STEP_TO) {
  const delta = STEP_TO[edge];
  return { x: cell.x + delta.x, y: cell.y + delta.y };
}

describe('solvePath — closed loops', () => {
  it('traverses a 2×2 corner loop and closes back on the start', () => {
    const pieces = [
      piece('nw', 'corner', 0, 0, 90),
      piece('ne', 'corner', 1, 0, 180),
      piece('se', 'corner', 1, 1, 270),
      piece('sw', 'corner', 0, 1, 0),
    ];

    const path = solvePath(pieces);

    expect(path.closed).toBe(true);
    expect(path.steps.map((s) => s.pieceId)).toEqual(['nw', 'ne', 'se', 'sw']);

    for (const step of path.steps) {
      const placed = placedOf(pieces, step.pieceId);
      // from/to are exactly the piece's two real endpoints at its rotation.
      expect([step.from, step.to].sort()).toEqual(
        [...endpointsFor(placed.type, placed.rotation)].sort(),
      );
    }

    // Consecutive steps are physically connected: exiting one piece lands on
    // the cell whose piece the next step enters through.
    for (let i = 1; i < path.steps.length; i++) {
      const prev = path.steps[i - 1];
      const cur = path.steps[i];
      if (!prev || !cur) throw new Error('step missing from traversal');
      const prevPlaced = placedOf(pieces, prev.pieceId);
      const curPlaced = placedOf(pieces, cur.pieceId);
      expect(neighbourOf(prevPlaced.cell, prev.to)).toEqual(curPlaced.cell);
      expect(neighbourOf(curPlaced.cell, cur.from)).toEqual(prevPlaced.cell);
    }

    // The loop wraps: the last exit lands back on the first piece's cell.
    const first = path.steps[0];
    const last = path.steps[path.steps.length - 1];
    if (!first || !last) throw new Error('loop traversal incomplete');
    const firstPlaced = placedOf(pieces, first.pieceId);
    const lastPlaced = placedOf(pieces, last.pieceId);
    expect(neighbourOf(lastPlaced.cell, last.to)).toEqual(firstPlaced.cell);
    expect(neighbourOf(firstPlaced.cell, first.from)).toEqual(lastPlaced.cell);
  });

  it('traverses a loop with straight sides (8-piece rectangle)', () => {
    const pieces = [
      piece('nw', 'corner', 0, 0, 90),
      piece('top-1', 'straight', 1, 0, 90),
      piece('top-2', 'straight', 2, 0, 90),
      piece('ne', 'corner', 3, 0, 180),
      piece('se', 'corner', 3, 1, 270),
      piece('bottom-2', 'straight', 2, 1, 90),
      piece('bottom-1', 'straight', 1, 1, 90),
      piece('sw', 'corner', 0, 1, 0),
    ];

    const path = solvePath(pieces);

    expect(path.closed).toBe(true);
    expect(path.steps).toHaveLength(8);
    expect(new Set(path.steps.map((s) => s.pieceId))).toEqual(new Set(pieces.map((p) => p.id)));
  });

  it('is deterministic: same input, same traversal (start rule, not array luck)', () => {
    const pieces = [
      piece('nw', 'corner', 0, 0, 90),
      piece('ne', 'corner', 1, 0, 180),
      piece('se', 'corner', 1, 1, 270),
      piece('sw', 'corner', 0, 1, 0),
    ];

    const first = solvePath(pieces);
    expect(solvePath(pieces)).toEqual(first);

    // Placement order in the array must not change the chosen traversal.
    const reversed = solvePath([...pieces].reverse());
    expect(reversed).toEqual(first);
  });
});

describe('solvePath — open layouts (zero dead ends, guaranteed ride)', () => {
  it('rides a two-piece straight line from one dead end to the other', () => {
    const pieces = [piece('a', 'straight', 0, 0, 90), piece('b', 'straight', 1, 0, 90)];

    const path = solvePath(pieces);

    expect(path.closed).toBe(false);
    expect(path.steps.map((s) => s.pieceId)).toEqual(['a', 'b']);
    // The ride starts at a dead end, entering through the piece's open end.
    expect(path.steps[0]).toEqual({ pieceId: 'a', from: 'west', to: 'east' });
    expect(path.steps[1]).toEqual({ pieceId: 'b', from: 'west', to: 'east' });
  });

  it('rides an L-shaped dead-end path through a corner', () => {
    const pieces = [
      piece('elbow-a', 'corner', 0, 0, 90), // east+south
      piece('mid', 'straight', 1, 0, 90), // east+west
      piece('elbow-b', 'corner', 2, 0, 180), // south+west
      piece('tail', 'straight', 2, 1, 0), // north+south
    ];

    const path = solvePath(pieces);

    expect(path.closed).toBe(false);
    expect(path.steps.map((s) => s.pieceId)).toEqual(['elbow-a', 'mid', 'elbow-b', 'tail']);
    // Enters the first piece through its unconnected open end (south).
    expect(path.steps[0]?.from).toBe('south');
    // Exits the last piece through its unconnected open end (south).
    expect(path.steps[3]?.to).toBe('south');
  });

  it('shuttles a single lone piece (one step, open)', () => {
    const pieces = [piece('lonely', 'corner', 3, 4, 0)];

    const path = solvePath(pieces);

    expect(path.closed).toBe(false);
    expect(path.steps).toEqual([{ pieceId: 'lonely', from: 'north', to: 'east' }]);
  });

  it('returns a no-op path for an empty meadow', () => {
    expect(solvePath([])).toEqual({ steps: [], closed: false });
  });

  it('rides the deterministic component when two separate tracks exist', () => {
    const pieces = [
      piece('far', 'corner', 5, 5, 0),
      piece('a', 'straight', 0, 0, 90),
      piece('b', 'straight', 1, 0, 90),
    ];

    const path = solvePath(pieces);

    // The component anchored at the smallest cell wins; the lone piece waits.
    expect(path.steps.map((s) => s.pieceId)).toEqual(['a', 'b']);
    expect(path.closed).toBe(false);
  });

  it('reverses direction through a dead-end spur (ride layer shuttles back)', () => {
    // Three-piece line with the smallest cell in the MIDDLE: the solver must
    // still start at a dead end, not at the smallest cell.
    const pieces = [
      piece('head', 'straight', 0, 0, 90),
      piece('mid', 'straight', 1, 0, 90),
      piece('tail', 'straight', 2, 0, 90),
    ];

    const path = solvePath(pieces);

    expect(path.closed).toBe(false);
    // Endpoints are head and tail; the tail sits on the smaller cell (0,0 is
    // head) — start must be a degree-1 endpoint riding inward, open end first.
    expect(path.steps[0]?.from).toBe('west');
    expect(path.steps[2]?.to).toBe('east');
    expect(path.steps.map((s) => s.pieceId)).toEqual(['head', 'mid', 'tail']);
  });
});
