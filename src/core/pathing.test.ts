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
